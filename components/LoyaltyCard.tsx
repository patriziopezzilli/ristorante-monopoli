import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const LoyaltyCard: React.FC = () => {
  const { t } = useI18n();

  const addToGooglePay = () => {
    // Placeholder: In a real implementation, this would generate or link to a Google Pay pass
    alert('Funzionalità Google Pay in sviluppo. Contatta il ristorante per iscriverti al programma fedeltà.');
  };

  const addToAppleWallet = () => {
    // Placeholder: In a real implementation, this would generate or link to an Apple Wallet pass
    alert('Funzionalità Apple Wallet in sviluppo. Contatta il ristorante per iscriverti al programma fedeltà.');
  };

  return (
    <section id="loyalty" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{t('loyalty.title')}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('loyalty.description')}</p>
        </div>

        <div className="flex justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold mb-2">Carta Fedeltà</h3>
                <p className="text-sm opacity-90">Raccogli punti per ogni visita</p>
                <div className="mt-4 text-2xl font-bold">0 Punti</div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={addToGooglePay}
                className="w-full bg-black text-white py-3 px-4 rounded-md font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {t('loyalty.googlePay')}
              </button>

              <button
                onClick={addToAppleWallet}
                className="w-full bg-black text-white py-3 px-4 rounded-md font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                {t('loyalty.appleWallet')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyCard;