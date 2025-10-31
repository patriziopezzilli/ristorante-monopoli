import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

const CookieDisclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    // For GDPR compliance, we should still allow basic functionality
    // but disable non-essential cookies
    localStorage.setItem('cookiesDeclined', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-4 z-50 shadow-lg">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 md:mr-4">
          <p className="text-sm">
            🍪 Utilizziamo cookie tecnici necessari per il funzionamento del sito.
            Continuando la navigazione, accetti l'uso dei cookie.
            Per maggiori informazioni consulta la nostra{' '}
            <a href="#" className="underline hover:text-gray-300">Privacy Policy</a>.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={declineCookies}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            Rifiuta
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 bg-black hover:bg-black text-white text-sm rounded-md transition-colors"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieDisclaimer;