import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const buttonClasses = (lang: 'it' | 'en') =>
    `font-semibold uppercase tracking-wider transition-colors ${
      language === lang ? 'text-inherit' : 'text-gray-400 hover:text-inherit'
    }`;

  return (
    <div className="flex items-center space-x-2">
      <button onClick={() => setLanguage('it')} className={buttonClasses('it')}>
        IT
      </button>
      <span className="text-gray-400">/</span>
      <button onClick={() => setLanguage('en')} className={buttonClasses('en')}>
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
