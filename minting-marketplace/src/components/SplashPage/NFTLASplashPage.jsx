import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import "./SplashPageTemplate/AuthorCard/AuthorCard.css";
import "./../AboutPage/AboutPageNew/AboutPageNew.css";

/* importing images*/
import NFTLA1_rounded from './images/NFT-LA-Dig-V01-modified.png';
import NFTLA1 from './images/NFT-LA-Dig-V01.jpg';
import NFTLA2 from './images/NFT-LA-Dig-V02.png';
import NFTLA3 from './images/NFT-LA-Dig-V03.png';

/* importing Components*/
import TeamMeet from "./TeamMeet/TeamMeetList";
import AuthorCard from "./SplashPageTemplate/AuthorCard/AuthorCard";
import setTitle from '../../utils/setTitle';
import NotCommercialTemplate from "./NotCommercial/NotCommercialTemplate";
import Carousel from "./SplashPageTemplate/Carousel/Carousel";

// Google Analytics
//const TRACKING_ID = 'UA-209450870-5'; // YOUR_OWN_TRACKING_ID
//ReactGA.initialize(TRACKING_ID);

const splashData = {
  title: "#nftla",
  description: "Connect your wallet to receive a free airdrop. Unlock exclusive encrypted streams",
  backgroundImage: NFTLA1_rounded,
  buttonColor: "#A4396F",
  buttonLabel: "Submit with Form",
  NFTName: "NFT art",
  carouselData: [
    {
      title: "Horizon",
      img: NFTLA1
    },
    {
      title: "Dark",
      img: NFTLA2
    },
    {
      title: "Palm",
      img: NFTLA3
    }
  ]
}



const NFTLASplashPage = ({ loginDone }) => {
  const { primaryColor } = useSelector((store) => store.colorStore);
  const carousel_match = window.matchMedia('(min-width: 600px)')
  const [carousel, setCarousel] = useState(carousel_match.matches)
  window.addEventListener("resize", () => setCarousel(carousel_match.matches))
  
  useEffect(() => {
    setTitle(`NFTLA`);
  }, [])

  const formHyperlink = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLSeSoeMejqA_DntWIJTcJQA4UbWSSUaYfXrj4hFKPPkyzDuByw/viewform',
      '_blank'
    );  
  }

  return (
    <div className="wrapper-splash-page">
      <div className="home-splash-page">
        <AuthorCard formHyperlink={formHyperlink} splashData={splashData}/>
        <Carousel carousel={!carousel} carouselData={splashData.carouselData}/>
        <TeamMeet primaryColor={primaryColor} arraySplash={"immersiverse"} />
        <NotCommercialTemplate primaryColor={primaryColor} NFTName={splashData.NFTName}/> 
      </div>
    </div>
  );
};

export default NFTLASplashPage;