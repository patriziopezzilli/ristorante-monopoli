import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const Hero: React.FC = () => {
  const { t } = useI18n();

  const scrollToMenu = () => {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative h-screen flex items-center justify-center text-center text-white bg-cover bg-center bg-fixed font-sans" style={{ backgroundImage: "url('https://www.ristorantemonopoli.com/assets/images/restaurant/1900x1200/img_1.png')" }}>
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative z-10 p-4">
        <h1 className="text-5xl md:text-7xl font-semibold mb-4 drop-shadow-lg animate-fade-in-down">{t('hero.title')}</h1>
        <p className="text-lg md:text-2xl mb-8 max-w-2xl mx-auto drop-shadow-md animate-fade-in-up">{t('hero.subtitle')}</p>
        <button
          onClick={scrollToMenu}
          className="bg-black hover:bg-black text-white font-semibold py-3 px-8 rounded-md text-base uppercase tracking-wider transition duration-300 ease-in-out transform hover:scale-105"
        >
          {t('hero.button')}
        </button>
      </div>
    </section>
  );
};

export default Hero;
