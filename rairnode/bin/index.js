require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const mongoose = require('mongoose');
const Socket = require('socket.io');
const morgan = require('morgan');
const session = require('express-session');
const RedisStorage = require('connect-redis')(session);
const redis = require('redis');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const seedDB = require('./seeds');
const log = require('./utils/logger')(module);
const StartHLS = require('./hls-starter');
const models = require('./models');
const redisService = require('./services/redis');
const streamRoute = require('./routes/stream');
const apiV1Routes = require('./routes');

const port = process.env.PORT;

const {
  appSecretManager,
  vaultAppRoleTokenManager,
} = require('./vault');

const config = require('./config');
const gcp = require('./integrations/gcp');
const {
  getMongoConnectionStringURI,
} = require('./shared_backend_code_generated/mongo/mongoUtils');
const {
  mongoConnectionManager
} = require('./mongooseConnect');

const mongoConfig = require('./shared_backend_code_generated/config/mongoConfig');

async function main() {
  const mediaDirectories = ['./bin/Videos', './bin/Videos/Thumbnails'];

  // Create Redis client
  const client = redis.createClient({
    url: `redis://${config.redis.connection.host}:${config.redis.connection.port}`,
    legacyMode: true,
  });

  client.connect().catch(log.error);

  mediaDirectories.forEach((folder) => {
    if (!fs.existsSync(folder)) {
      log.info(folder, 'doesn\'t exist, creating it now!');
      fs.mkdirSync(folder);
    }
  });
  
  // const mongoConnectionString = await getMongoConnectionStringURI({ appSecretManager });

  const _mongoose = await mongoConnectionManager.getMongooseConnection({});

  // Connecting to Mongo DB instance
  // await mongoose.connect(mongoConnectionString, {
  //   useNewUrlParser: true,
  //   useUnifiedTopology: true,
  // })
  //   .then((c) => {
  //     if (process.env.PRODUCTION === 'true') {
  //       log.info('DB Connected!');
  //     } else {
  //       log.info('Development DB Connected!');
  //     }
  //     return c;
  //   })
  //   .catch((e) => {
  //     log.error('DB Not Connected!');
  //     log.error(`Reason: ${e.message}`);
  //   });

  mongoose.set('useFindAndModify', false);

  const app = express();

  /* CORS */
  const origin = `https://${process.env.SERVICE_HOST}`;

  app.use(cors({ origin }));

  const hls = await StartHLS();

  // XSS sanitizer
  const { window } = new JSDOM('');
  const textPurify = createDOMPurify(window);

  const context = {
    hls,
    db: models,
    config,
    gcp: gcp(config),
    textPurify,
    redis: {
      client,
    },
  };

  // connect redisService
  context.redis.redisService = redisService(context);

  await seedDB(context);

  app.use(morgan('dev'));
  app.use(bodyParser.raw());
  app.use(bodyParser.json());
  app.use(
    session({
      store: new RedisStorage({
        client,
        ttl: (config.session.ttl * 60 * 60), // default 12 hours
      }),
      secret: config.session.secret,
      saveUninitialized: true,
      resave: false,
      name: 'id',
      cookie: {
        path: '/',
        httpOnly: true,
        // secure: true,
        // maxAge:  (12 * 60 * 60 * 1000)  // 12 hours
      },
    }),
  );

  app.use('/thumbnails', express.static(path.join(__dirname, 'Videos/Thumbnails')));
  app.use('/stream', streamRoute(context));
  app.use('/api', apiV1Routes(context));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((err, req, res) => {
    log.error(err);
    res.status(500).json({ success: false, error: true, message: err.message });
  });

  const server = app.listen(port, () => {
    log.info(`Decrypt node service listening at http://localhost:${port}`);
  });

  const io = Socket(server);
  const sockets = {};

  io.on('connection', (socket) => {
    log.info(`Client connected: ${socket.id}`);
    socket.on('init', (sessionId) => {
      log.info(`Opened connection: ${sessionId}`);

      sockets[sessionId] = socket.id;
      app.set('sockets', sockets);
    });

    socket.on('end', (sessionId) => {
      delete sockets[sessionId];

      socket.disconnect(0);
      app.set('sockets', sockets);

      log.info(`Close connection ${sessionId}`);
    });
  });

  app.set('io', io);
}

(async () => {
  // Login with vault app role creds first
  await vaultAppRoleTokenManager.initialLogin();

  // Get app secrets from Vault
  await appSecretManager.getAppSecrets({
    vaultToken: vaultAppRoleTokenManager.getToken(),
    listOfSecretsToFetch: [
      mongoConfig.VAULT_MONGO_USER_PASS_SECRET_KEY,
      mongoConfig.VAULT_MONGO_x509_SECRET_KEY
    ]
  });

  // fire up the rest of the app
  await main();
})().catch((e) => {
  log.error(e);
  process.exit();
});
