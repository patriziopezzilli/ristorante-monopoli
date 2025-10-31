import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { contentCache } from '../src/contentCache';

interface I18nContextType {
  t: (key: string) => any;
  language: 'it' | 'en';
  setLanguage: (lang: 'it' | 'en') => void;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<'it' | 'en'>(() => {
    const stored = localStorage.getItem('language');
    return (stored as 'it' | 'en') || 'it';
  });
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const content = await contentCache.getContent(language);
        setTranslations(content);
      } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to basic translations
        setTranslations({
          nav: { home: "Home", about: "About", menu: "Menu", gallery: "Gallery", contact: "Contact" },
          hero: { title: "RISTORANTE PIZZERIA MONOPOLI", subtitle: "Loading...", button: "Loading..." },
          menu: { title: "Menu", subtitle: "Loading menu..." }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();

    // Listen for content updates
    const handleContentUpdate = (event: CustomEvent) => {
      const { language: updatedLanguage } = event.detail;
      console.log('📡 I18nContext received contentUpdated event for language:', updatedLanguage, 'current language:', language);
      if (updatedLanguage === language) {
        console.log('🔄 Reloading translations for language:', language);
        loadTranslations();
      }
    };

    window.addEventListener('contentUpdated', handleContentUpdate as EventListener);

    return () => {
      window.removeEventListener('contentUpdated', handleContentUpdate as EventListener);
    };
  }, [language]);

  const setLanguage = (lang: 'it' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);

    // Dispatch custom event for components that need to react to language changes
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  };

  const t = (key: string): any => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key; // Return key if translation not found
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
};