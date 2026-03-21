import React from 'react';
import Hero from './Hero';
import Services from './Services';
import QuoteSection from './QuoteSection';
import SiteFooter from './SiteFooter';

function Home() {
  return (
    <div className="home-container">
      <Hero />
      <Services />
      <QuoteSection />
      <SiteFooter />
    </div>
  );
}

export default Home;
