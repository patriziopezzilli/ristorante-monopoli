const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');
admin.initializeApp();

// Real PDF parsing function using pdf-parse
async function extractMenuFromPDF(fileBuffer, language) {
  try {
    // Extract text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text;

    console.log('Extracted PDF text:', text.substring(0, 500)); // Log first 500 chars for debugging

    // Parse the extracted text into menu structure
    const menuData = parseMenuText(text, language);

    return menuData;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    // Fallback to mock data if PDF parsing fails
    return getFallbackMenuData(language);
  }
}

// Parse menu text into structured data
function parseMenuText(text, language) {
  const menuData = {
    antipasti: [],
    primi: [],
    secondi: []
  };

  // Split text into lines and clean up
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers (case insensitive)
    if (line.toLowerCase().includes('antipast') || line.toLowerCase().includes('starter')) {
      currentSection = 'antipasti';
      continue;
    } else if (line.toLowerCase().includes('prim') || line.toLowerCase().includes('first') || line.toLowerCase().includes('pasta')) {
      currentSection = 'primi';
      continue;
    } else if (line.toLowerCase().includes('second') || line.toLowerCase().includes('main') || line.toLowerCase().includes('meat') || line.toLowerCase().includes('fish')) {
      currentSection = 'secondi';
      continue;
    }

    // Skip if no section detected yet
    if (!currentSection) continue;

    // Look for lines with prices (containing € or numbers followed by currency)
    const priceMatch = line.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|eur|euro)/i);
    if (priceMatch) {
      const price = `€${priceMatch[1].replace(',', '.')}`;

      // Extract dish name (text before price)
      const priceIndex = line.indexOf(priceMatch[0]);
      const name = line.substring(0, priceIndex).trim();

      // Try to get description from next line(s)
      let description = '';
      let nextLines = 0;
      while (nextLines < 3 && i + nextLines + 1 < lines.length) {
        const nextLine = lines[i + nextLines + 1];
        // Stop if next line looks like another dish (has price or is a section header)
        if (nextLine.match(/\d+(?:[.,]\d{2})?\s*(?:€|eur|euro)/i) ||
            nextLine.toLowerCase().includes('antipast') ||
            nextLine.toLowerCase().includes('prim') ||
            nextLine.toLowerCase().includes('second')) {
          break;
        }
        if (nextLine.length > 10 && !nextLine.match(/^\d/)) { // Avoid pure numbers or short lines
          description += (description ? ' ' : '') + nextLine;
          nextLines++;
        } else {
          break;
        }
      }

      // Skip lines we used for description
      i += nextLines;

      // Add dish to current section
      if (name && currentSection) {
        const dish = {
          name: name,
          description: description || (language === 'it' ? 'Delizioso piatto del nostro menu' : 'Delicious dish from our menu'),
          price: price
        };

        menuData[currentSection].push(dish);
      }
    }
  }

  // If no dishes found, try a simpler approach - split by common separators
  if (menuData.antipasti.length === 0 && menuData.primi.length === 0 && menuData.secondi.length === 0) {
    console.log('No structured menu found, trying simple text extraction');
    return extractSimpleMenu(text, language);
  }

  return menuData;
}

// Simple fallback extraction when structured parsing fails
function extractSimpleMenu(text, language) {
  const menuData = {
    antipasti: [],
    primi: [],
    secondi: []
  };

  // Split by common separators and look for price patterns
  const items = text.split(/[•·\-*]/).filter(item => item.trim().length > 5);

  let currentSection = 'antipasti';
  let dishCount = 0;

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    // Check for price pattern
    const priceMatch = trimmed.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|eur|euro)/i);
    if (priceMatch) {
      const price = `€${priceMatch[1].replace(',', '.')}`;
      const name = trimmed.replace(priceMatch[0], '').trim();

      if (name) {
        const dish = {
          name: name,
          description: language === 'it' ? 'Piatto del nostro menu' : 'Dish from our menu',
          price: price
        };

        // Distribute dishes across sections
        if (dishCount < 3) {
          menuData.antipasti.push(dish);
        } else if (dishCount < 6) {
          menuData.primi.push(dish);
        } else {
          menuData.secondi.push(dish);
        }
        dishCount++;
      }
    }
  }

  return menuData;
}

// Fallback mock data if PDF parsing completely fails
function getFallbackMenuData(language) {
  return {
    antipasti: [
      {
        name: language === 'it' ? 'Menu non elaborabile' : 'Menu not processable',
        description: language === 'it'
          ? 'Il PDF potrebbe avere un formato non supportato. Contatta l\'amministratore.'
          : 'The PDF might have an unsupported format. Contact the administrator.',
        price: '€0'
      }
    ],
    primi: [],
    secondi: []
  };
}

exports.processMenuPDF = functions.https.onCall(async (data, context) => {
  // Verify authentication (optional but recommended)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { fileData, language } = data;

  if (!fileData || !language) {
    throw new functions.https.HttpsError('invalid-argument', 'File data and language are required');
  }

  try {
    // Convert base64 to buffer (assuming file is sent as base64)
    const fileBuffer = Buffer.from(fileData, 'base64');
    
    // Extract menu data from PDF
    const menuData = await extractMenuFromPDF(fileBuffer, language);
    
    // Save to Firestore
    await admin.firestore().collection('menus').doc(language).set(menuData);
    
    return { success: true, message: `Menu ${language} processed and saved` };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new functions.https.HttpsError('internal', 'Error processing PDF');
  }
});

exports.getMenu = functions.https.onCall(async (data, context) => {
  const { language } = data;

  if (!language) {
    throw new functions.https.HttpsError('invalid-argument', 'Language is required');
  }

  try {
    const docRef = admin.firestore().collection('menus').doc(language);
    const docSnap = await docRef.get();

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return default menu data if not found
      return {
        antipasti: [
          {
            name: language === 'it' ? 'Insalata di Mare' : 'Sea Salad',
            description: language === 'it' 
              ? 'Polpo, seppie, gamberi e cozze con verdure fresche' 
              : 'Octopus, squid, shrimp and mussels with fresh vegetables',
            price: '€14'
          }
        ],
        primi: [
          {
            name: language === 'it' ? 'Spaghetti ai Frutti di Mare' : 'Seafood Spaghetti',
            description: language === 'it'
              ? 'Un classico con vongole, cozze, gamberi e calamari'
              : 'A classic with clams, mussels, shrimp and squid',
            price: '€18'
          }
        ],
        secondi: [
          {
            name: language === 'it' ? 'Grigliata Mista di Pesce' : 'Mixed Grilled Fish',
            description: language === 'it'
              ? 'Pesce spada, gamberoni, seppie e scampi alla griglia'
              : 'Swordfish, prawns, squid and scampi grilled',
            price: '€25'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error getting menu:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving menu');
  }
});

exports.migrateContent = functions.https.onCall(async (data, context) => {
  // One-time migration function to move existing content to Firestore
  const contentData = {
    it: {
      version: 1,
      nav: {
        home: "Home",
        about: "Chi Siamo",
        menu: "Menu",
        gallery: "Galleria",
        contact: "Contatti"
      },
      hero: {
        title: "RISTORANTE PIZZERIA MONOPOLI",
        subtitle: "Dove la tradizione incontra il sapore del mare.",
        button: "Scopri il Menu"
      },
      about: {
        title: "La Nostra Storia",
        p1: "Nel cuore di Monopoli, il nostro ristorante nasce dalla passione per la cucina autentica pugliese e l'amore per il mare. Da generazioni, la nostra famiglia si dedica a portare in tavola solo il pesce più fresco e gli ingredienti più genuini, selezionati dai migliori produttori locali.",
        p2: "La nostra filosofia è semplice: celebrare i sapori della nostra terra con ricette che rispettano la tradizione, ma con un tocco di creatività che le rendono uniche. Ogni piatto è un viaggio sensoriale, un'esperienza che vogliamo condividere con voi.",
        p3: "Vi invitiamo a scoprire il nostro mondo, fatto di gusto, passione e ospitalità."
      },
      menu: {
        title: "Il Nostro Menu",
        subtitle: "Assapora il meglio del mare con i nostri piatti preparati con pesce freschissimo e ingredienti di prima qualità.",
        button: "Visualizza il Menu Completo",
        pdfButton: "OPEN PDF MENU",
        modalTitle: "Il Nostro Menu Completo",
        categories: {
          antipasti: "Antipasti",
          primi: "Primi Piatti",
          secondi: "Secondi Piatti"
        }
      },
      gallery: {
        title: "Galleria"
      },
      contact: {
        title: "Contattaci",
        addressTitle: "Indirizzo",
        addressLine1: "Via Porto, 43/45",
        addressLine2: "70043 Monopoli (BA)",
        mapLink: "Visualizza sulla Mappa",
        hoursTitle: "Orari di Apertura",
        hoursLine1: "Pranzo: 12:30 - 15:00",
        hoursLine2: "Cena: 19:30 - 23:00",
        hoursLine3: "Chiuso il Martedì",
        reservationsTitle: "Prenotazioni",
        reservationsLine1: "Chiamaci al"
      },
      loyalty: {
        title: "Qualcosa Bolle in Pentola",
        description: "Stiamo preparando qualcosa di speciale per i nostri clienti fedeli. Al momento è work in progress, ma presto avrete delle sorprese!",
        addToWallet: "Aggiungi al Wallet",
        googlePay: "Google Pay",
        appleWallet: "Apple Wallet"
      },
      footer: {
        subtitle: "Ristorante di Pesce a Monopoli",
        backToTop: "Torna su",
        copyright: "Tutti i diritti riservati.",
        credit: "Sito web realizzato con amore"
      }
    },
    en: {
      version: 1,
      nav: {
        home: "Home",
        about: "About Us",
        menu: "Menu",
        gallery: "Gallery",
        contact: "Contact"
      },
      hero: {
        title: "RISTORANTE PIZZERIA MONOPOLI",
        subtitle: "Where tradition meets the flavor of the sea.",
        button: "Discover the Menu"
      },
      about: {
        title: "Our Story",
        p1: "In the heart of Monopoli, our restaurant was born from a passion for authentic Apulian cuisine and a love for the sea. For generations, our family has been dedicated to bringing only the freshest fish and most genuine ingredients to your table, selected from the best local producers.",
        p2: "Our philosophy is simple: to celebrate the flavors of our land with recipes that respect tradition, but with a touch of creativity that makes them unique. Every dish is a sensory journey, an experience we want to share with you.",
        p3: "We invite you to discover our world, made of taste, passion, and hospitality."
      },
      menu: {
        title: "Our Menu",
        subtitle: "Savor the best of the sea with our dishes prepared with the freshest fish and highest quality ingredients.",
        button: "View Full Menu",
        pdfButton: "OPEN PDF MENU",
        modalTitle: "Our Full Menu",
        categories: {
          antipasti: "Appetizers",
          primi: "First Courses",
          secondi: "Main Courses"
        }
      },
      gallery: {
        title: "Gallery"
      },
      contact: {
        title: "Contact Us",
        addressTitle: "Address",
        addressLine1: "Via Porto, 43/45",
        addressLine2: "70043 Monopoli (BA)",
        mapLink: "View on Map",
        hoursTitle: "Opening Hours",
        hoursLine1: "Lunch: 12:30 - 15:00",
        hoursLine2: "Dinner: 19:30 - 23:00",
        hoursLine3: "Closed on Tuesday",
        reservationsTitle: "Reservations",
        reservationsLine1: "Call us at"
      },
      loyalty: {
        title: "Something's Cooking",
        description: "We're preparing something special for our loyal customers. It's currently work in progress, but you'll have surprises soon!",
        addToWallet: "Add to Wallet",
        googlePay: "Google Pay",
        appleWallet: "Apple Wallet"
      },
      footer: {
        subtitle: "Seafood Restaurant in Monopoli",
        backToTop: "Back to Top",
        copyright: "All rights reserved.",
        credit: "Website made with love"
      }
    }
  };

  try {
    // Save both languages
    await admin.firestore().collection('content').doc('it').set(contentData.it);
    await admin.firestore().collection('content').doc('en').set(contentData.en);
    
    return { success: true, message: 'Content migrated successfully' };
  } catch (error) {
    console.error('Error migrating content:', error);
    throw new functions.https.HttpsError('internal', 'Error migrating content');
  }
});

exports.getContent = functions.https.onCall(async (data, context) => {
  const { language } = data;

  if (!language) {
    throw new functions.https.HttpsError('invalid-argument', 'Language is required');
  }

  try {
    const docRef = admin.firestore().collection('content').doc(language);
    const docSnap = await docRef.get();

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new functions.https.HttpsError('not-found', 'Content not found');
    }
  } catch (error) {
    console.error('Error getting content:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving content');
  }
});

exports.updateContent = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { language, section, key, value } = data;

  if (!language || !section || !key) {
    throw new functions.https.HttpsError('invalid-argument', 'Language, section, and key are required');
  }

  try {
    const docRef = admin.firestore().collection('content').doc(language);
    
    // Get current content
    const docSnap = await docRef.get();
    if (!docSnap.exists()) {
      throw new functions.https.HttpsError('not-found', 'Content not found');
    }

    const currentData = docSnap.data();
    
    // Update version for cache invalidation
    const updateData = {
      ...currentData,
      version: (currentData.version || 1) + 1
    };

    // Update the specific field
    if (!updateData[section]) {
      updateData[section] = {};
    }
    updateData[section][key] = value;

    await docRef.set(updateData);
    
    return { success: true, message: 'Content updated successfully', newVersion: updateData.version };
  } catch (error) {
    console.error('Error updating content:', error);
    throw new functions.https.HttpsError('internal', 'Error updating content');
  }
});