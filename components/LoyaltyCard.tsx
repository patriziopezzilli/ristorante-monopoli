import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const LoyaltyCard: React.FC = () => {
  const { t } = useI18n();

  const addToGooglePay = () => {
    // Placeholder: In a real implementation, this would generate or link to a Google Pay pass
    alert('Questa funzionalità è ancora in sviluppo. Qualcosa di speciale sta arrivando presto! 🍳');
  };

  const addToAppleWallet = () => {
    // Placeholder: In a real implementation, this would generate or link to an Apple Wallet pass
    alert('Questa funzionalità è ancora in sviluppo. Qualcosa di speciale sta arrivando presto! 🍳');
  };

  return (
    <section id="loyalty" className="py-16 bg-gray-50 md:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wider text-gray-800 mb-4">{t('loyalty.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">{t('loyalty.description')}</p>
          
          <div className="text-center">
            <div className="inline-block bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="text-4xl mb-4">🍳</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Work in Progress</h3>
              <p className="text-gray-600 text-sm">Qualcosa di speciale sta arrivando presto...</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyCard;