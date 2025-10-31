import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { analyticsService } from '../src/analytics';

const Menu: React.FC = () => {
  const { t } = useI18n();

  React.useEffect(() => {
    // Track menu view
    analyticsService.trackMenuView('menu_section');
  }, []);

  return (
    <section id="menu" className="py-20 bg-black font-sans">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-white">{t('menu.title')}</h2>
          <div className="w-20 h-0.5 bg-white mx-auto mt-4"></div>
           <p className="mt-6 max-w-2xl mx-auto text-gray-300">
            {t('menu.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-8">
            <a
              href="/menu.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-md text-base uppercase tracking-wider transition duration-300 ease-in-out transform hover:scale-105 border-2 border-white"
            >
              {t('menu.pdfButton')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Menu;
