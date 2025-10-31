import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-black text-white font-sans">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center">
          <div className="flex space-x-6">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors text-2xl"><i className="fab fa-facebook-f"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors text-2xl"><i className="fab fa-instagram"></i></a>
            <a href="https://tripadvisor.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors text-2xl"><i className="fab fa-tripadvisor"></i></a>
          </div>
        </div>
        <div className="text-center mt-6 text-gray-300 text-sm">
          <p>© 2026 Ristorante Pizzeria Monopoli. All Rights Reserved. Designed by Patrizio Pezzilli</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
