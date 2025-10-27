import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const Contact: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="contact" className="py-20 bg-white text-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider">{t('contact.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mt-4"></div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8 text-center">
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-8 rounded-lg h-full border border-gray-200 flex flex-col justify-center">
              <i className="fas fa-map-marker-alt text-3xl text-gray-800 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">{t('contact.addressTitle')}</h3>
              <p className="text-gray-600">{t('contact.addressLine1')}<br/>{t('contact.addressLine2')}</p>
              <a href="https://www.google.com/maps/search/?api=1&query=Via+Porto,+43/45,+70043+Monopoli+BA,+Italy" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-gray-800 font-semibold hover:text-black transition-colors">
                {t('contact.mapLink')} <i className="fas fa-arrow-right ml-1 text-sm"></i>
              </a>
            </div>
          </div>
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-8 rounded-lg h-full border border-gray-200">
              <i className="fas fa-clock text-3xl text-gray-800 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">{t('contact.hoursTitle')}</h3>
              <p className="text-gray-600">
                {t('contact.hoursLine1')}<br/>
                {t('contact.hoursLine2')}<br/>
                {t('contact.hoursLine3')}
              </p>
            </div>
          </div>
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-8 rounded-lg h-full border border-gray-200">
              <i className="fas fa-phone-alt text-3xl text-gray-800 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">{t('contact.reservationsTitle')}</h3>
              <p className="text-gray-600">
                {t('contact.reservationsLine1')}<br/>
                <a href="tel:+390809371764" className="text-lg text-gray-900 hover:text-black transition-colors">+39 080 937 1764</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
