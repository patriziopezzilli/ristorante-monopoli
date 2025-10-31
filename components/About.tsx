import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const About: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="about" className="py-20 bg-white font-sans">
      <div className="w-full px-0 sm:px-6 lg:px-8">
        <div className="text-center mb-12 px-4 sm:px-0">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-black">{t('about.title')}</h2>
          <div className="w-20 h-0.5 bg-black mx-auto mt-4"></div>
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 w-full">
            <img src="https://www.ristorantemonopoli.com/assets/images/risto_2.png" alt="Ristorante Monopoli" className="w-full h-64 md:h-80 object-cover object-center" />
          </div>
          <div className="lg:w-1/2 text-lg text-gray-700 space-y-6 px-4 sm:px-0">
            <p>{t('about.p1')}</p>
            <p>{t('about.p2')}</p>
            <p>{t('about.p3')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
