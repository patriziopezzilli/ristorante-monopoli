import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const Footer: React.FC = () => {
  const { t } = useI18n();

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-semibold">{t('hero.title')}</h3>
            <p className="text-gray-400">{t('footer.subtitle')}</p>
          </div>
          <div className="flex space-x-4 mb-4 md:mb-0">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-facebook-f"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-instagram"></i></a>
            <a href="https://tripadvisor.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-tripadvisor"></i></a>
          </div>
          <div>
            <a href="#" onClick={scrollToTop} className="text-gray-400 hover:text-white transition-colors">
              {t('footer.backToTop')} <i className="fas fa-arrow-up ml-1"></i>
            </a>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {t('hero.title')}. {t('footer.copyright')}</p>
          <p>{t('footer.credit')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
