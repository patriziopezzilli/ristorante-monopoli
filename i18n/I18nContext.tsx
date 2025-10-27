import React, { createContext, useState, useContext, ReactNode } from 'react';

const it = {
  "nav": {
    "home": "Home",
    "about": "Chi Siamo",
    "menu": "Menu",
    "gallery": "Galleria",
    "contact": "Contatti"
  },
  "hero": {
    "title": "RISTORANTE PIZZERIA MONOPOLI",
    "subtitle": "Dove la tradizione incontra il sapore del mare.",
    "button": "Scopri il Menu"
  },
  "about": {
    "title": "La Nostra Storia",
    "p1": "Nel cuore di Monopoli, il nostro ristorante nasce dalla passione per la cucina autentica pugliese e l'amore per il mare. Da generazioni, la nostra famiglia si dedica a portare in tavola solo il pesce più fresco e gli ingredienti più genuini, selezionati dai migliori produttori locali.",
    "p2": "La nostra filosofia è semplice: celebrare i sapori della nostra terra con ricette che rispettano la tradizione, ma con un tocco di creatività che le rende uniche. Ogni piatto è un viaggio sensoriale, un'esperienza che vogliamo condividere con voi.",
    "p3": "Vi invitiamo a scoprire il nostro mondo, fatto di gusto, passione e ospitalità."
  },
  "menu": {
    "title": "Il Nostro Menu",
    "subtitle": "Assapora il meglio del mare con i nostri piatti preparati con pesce freschissimo e ingredienti di prima qualità.",
    "button": "Visualizza il Menu Completo",
    "modalTitle": "Il Nostro Menu Completo",
    "categories": {
      "antipasti": "Antipasti",
      "primi": "Primi Piatti",
      "secondi": "Secondi Piatti"
    },
    "data": {
      "antipasti": [
        { "name": "Insalata di Mare", "description": "Polpo, seppie, gamberi e cozze con verdure fresche", "price": "€14" },
        { "name": "Carpaccio di Spada", "description": "Pesce spada affumicato con rucola, pomodorini e scaglie di grana", "price": "€16" },
        { "name": "Cozze Gratinate", "description": "Cozze al forno con pangrattato aromatizzato", "price": "€12" }
      ],
      "primi": [
        { "name": "Spaghetti ai Frutti di Mare", "description": "Un classico con vongole, cozze, gamberi e calamari", "price": "€18" },
        { "name": "Risotto alla Pescatora", "description": "Riso Carnaroli mantecato con il meglio del pescato del giorno", "price": "€20" },
        { "name": "Cavatelli con Cime di Rapa e Vongole", "description": "Pasta fresca pugliese con un connubio di terra e mare", "price": "€17" }
      ],
      "secondi": [
        { "name": "Grigliata Mista di Pesce", "description": "Pesce spada, gamberoni, seppie e scampi alla griglia", "price": "€25" },
        { "name": "Frittura di Paranza", "description": "Pesce fresco di piccola taglia fritto croccante", "price": "€22" },
        { "name": "Orata al Sale", "description": "Orata fresca cotta in crosta di sale per preservarne la morbidezza", "price": "€24" }
      ]
    }
  },
  "gallery": {
    "title": "Galleria"
  },
  "contact": {
    "title": "Contattaci",
    "addressTitle": "Indirizzo",
    "addressLine1": "Via Porto, 43/45",
    "addressLine2": "70043 Monopoli (BA)",
    "mapLink": "Visualizza sulla Mappa",
    "hoursTitle": "Orari di Apertura",
    "hoursLine1": "Pranzo: 12:30 - 15:00",
    "hoursLine2": "Cena: 19:30 - 23:00",
    "hoursLine3": "Chiuso il Martedì",
    "reservationsTitle": "Prenotazioni",
    "reservationsLine1": "Chiamaci al"
  },
  "footer": {
    "subtitle": "Ristorante di Pesce a Monopoli",
    "backToTop": "Torna su",
    "copyright": "Tutti i diritti riservati.",
    "credit": "Sito web realizzato con amore"
  }
};

const en = {
  "nav": {
    "home": "Home",
    "about": "About Us",
    "menu": "Menu",
    "gallery": "Gallery",
    "contact": "Contact"
  },
  "hero": {
    "title": "RISTORANTE PIZZERIA MONOPOLI",
    "subtitle": "Where tradition meets the flavor of the sea.",
    "button": "Discover the Menu"
  },
  "about": {
    "title": "Our Story",
    "p1": "In the heart of Monopoli, our restaurant was born from a passion for authentic Apulian cuisine and a love for the sea. For generations, our family has been dedicated to bringing only the freshest fish and most genuine ingredients to your table, selected from the best local producers.",
    "p2": "Our philosophy is simple: to celebrate the flavors of our land with recipes that respect tradition, but with a touch of creativity that makes them unique. Every dish is a sensory journey, an experience we want to share with you.",
    "p3": "We invite you to discover our world, made of taste, passion, and hospitality."
  },
  "menu": {
    "title": "Our Menu",
    "subtitle": "Savor the best of the sea with our dishes prepared with the freshest fish and top-quality ingredients.",
    "button": "View Full Menu",
    "modalTitle": "Our Full Menu",
    "categories": {
      "antipasti": "Appetizers",
      "primi": "First Courses",
      "secondi": "Main Courses"
    },
    "data": {
      "antipasti": [
        { "name": "Seafood Salad", "description": "Octopus, cuttlefish, shrimp, and mussels with fresh vegetables", "price": "€14" },
        { "name": "Swordfish Carpaccio", "description": "Smoked swordfish with arugula, cherry tomatoes, and parmesan flakes", "price": "€16" },
        { "name": "Gratinated Mussels", "description": "Oven-baked mussels with flavored breadcrumbs", "price": "€12" }
      ],
      "primi": [
        { "name": "Spaghetti with Seafood", "description": "A classic with clams, mussels, shrimp, and squid", "price": "€18" },
        { "name": "Fisherman's Risotto", "description": "Carnaroli rice with the best catch of the day", "price": "€20" },
        { "name": "Cavatelli with Turnip Greens and Clams", "description": "Fresh Apulian pasta with a blend of land and sea", "price": "€17" }
      ],
      "secondi": [
        { "name": "Mixed Grilled Fish", "description": "Grilled swordfish, prawns, cuttlefish, and langoustines", "price": "€25" },
        { "name": "Fried Small Fish", "description": "Crispy fried fresh small fish", "price": "€22" },
        { "name": "Sea Bream in Salt Crust", "description": "Fresh sea bream cooked in a salt crust to preserve its tenderness", "price": "€24" }
      ]
    }
  },
  "gallery": {
    "title": "Gallery"
  },
  "contact": {
    "title": "Contact Us",
    "addressTitle": "Address",
    "addressLine1": "Via Porto, 43/45",
    "addressLine2": "70043 Monopoli (BA)",
    "mapLink": "View on Map",
    "hoursTitle": "Opening Hours",
    "hoursLine1": "Lunch: 12:30 PM - 3:00 PM",
    "hoursLine2": "Dinner: 7:30 PM - 11:00 PM",
    "hoursLine3": "Closed on Tuesday",
    "reservationsTitle": "Reservations",
    "reservationsLine1": "Call us at"
  },
  "footer": {
    "subtitle": "Seafood Restaurant in Monopoli",
    "backToTop": "Back to Top",
    "copyright": "All rights reserved.",
    "credit": "Website made with love"
  }
};

type Language = 'it' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => any;
}

const translations: { [key in Language]: any } = { it, en };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'it' ? 'it' : 'en';
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('i18n-lang', lang);
    // Emit custom event for components that need to react to language changes
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang } }));
  };

  const t = (key: string): any => {
    return key.split('.').reduce((obj, k) => obj && obj[k], translations[language]);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};