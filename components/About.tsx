import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const About: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-gray-800">{t('about.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mt-4"></div>
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <img src="https://picsum.photos/seed/chef/600/400" alt="Chef" className="rounded-lg shadow-lg w-full object-cover" />
          </div>
          <div className="lg:w-1/2 text-lg text-gray-600 space-y-6">
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
