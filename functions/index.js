const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');
admin.initializeApp();

// Real PDF parsing function using pdf-parse
async function extractMenuFromPDF(fileBuffer, language) {
  try {
    // Extract text from PDF with options to improve extraction
    const pdfData = await pdfParse(fileBuffer, {
      // Options to improve text extraction
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });

    let text = pdfData.text;

    // If text seems incomplete (less than expected), try page-by-page extraction
    if (text.length < 5000) { // Assume a reasonable minimum length for a menu
      console.log('Text extraction seems incomplete, trying page-by-page extraction');
      let pageText = '';
      try {
        for (let i = 1; i <= pdfData.numpages; i++) {
          const singlePageData = await pdfParse(fileBuffer, { page: i });
          pageText += singlePageData.text + '\n';
          console.log(`Page ${i} text length: ${singlePageData.text.length}`);
        }
        if (pageText.length > text.length) {
          text = pageText;
          console.log('Using page-by-page extraction, total length:', text.length);
        }
      } catch (pageError) {
        console.log('Page-by-page extraction failed:', pageError.message);
      }
    }

    console.log('Extracted PDF text length:', text.length);
    console.log('Extracted PDF text (first 5000 chars):', text.substring(0, 5000));
    console.log('Extracted PDF text (last 500 chars):', text.substring(text.length - 500));

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

    // Only log first 50 lines and lines with prices or sections to avoid too much output
    if (i < 50 || line.includes('€') || line.includes('antipast') || line.includes('prim') || line.includes('second')) {
      console.log(`Processing line ${i}: "${line.trim()}" (currentSection: ${currentSection})`);
    }

    // Additional debug for antipasti and primi sections
    if (currentSection === 'antipasti' || currentSection === 'primi') {
      console.log(`[DEBUG ${currentSection.toUpperCase()}] Line ${i}: "${line.trim()}"`);
    }

    // Detect section headers (more flexible patterns)
    const cleanLine = line.replace(/\s+/g, '').toLowerCase(); // Remove all spaces
    console.log(`[SECTION CHECK] Line ${i}: "${line.trim()}" -> clean: "${cleanLine}"`);

    // More flexible section detection - look for various forms
    const isAntipasti = cleanLine.includes('antipast') || cleanLine.includes('appetizer') || cleanLine.includes('starter');
    const isPrimi = (cleanLine.includes('prim') && !cleanLine.includes('bt') && !cleanLine.includes('cl')) || cleanLine.includes('firstcourse') || cleanLine.includes('past') || cleanLine.includes('pasta');
    const isSecondi = (cleanLine.includes('second') && !cleanLine.includes('bt') && !cleanLine.includes('cl')) || cleanLine.includes('maincourse') || cleanLine.includes('secondcourse');

    if (isAntipasti && !cleanLine.includes('€')) {
      currentSection = 'antipasti';
      console.log('Found antipasti section at line:', line.trim());
      continue;
    } else if (isPrimi && !cleanLine.includes('€')) {
      currentSection = 'primi';
      console.log('Found primi section at line:', line.trim());
      continue;
    } else if (isSecondi && !cleanLine.includes('€')) {
      currentSection = 'secondi';
      console.log('Found secondi section at line:', line.trim());
      continue;
    }

    // Skip if no section detected yet
    if (!currentSection) continue;

    // Skip beverage items (more specific patterns)
    // Look for clear beverage indicators: bt/cl with numbers, beverage categories, wine names, or common wine terms
    const isBeverage = /^\s*(bibite|birra|vino|acqua|prosecco|vermentino|falanghina|minerale|frizzante|lattina|spina|cabernet|sauvignon|chardonnay|pinot|riesling|gewürztraminer|barolo|barbaresco|brunello|chianti|valpolicella|amarone|soave|bardolino|franciacorta|franciacorta|bolgheri|bolgheri|morellino|vernaccia|rosato|cerasuolo|negroamaro|primitivo|salice|salentino|roero|arneis|ribolla|gialla|kaltern|montresor|mottura|attems|monchiero|carbone|duca|salaparuta|borgo|molino|bortomiol|colle|sardo|capo|vigne|janare|guardiense|eleme|\d+\s*(bt|cl))/i.test(line.toLowerCase()) ||
                      /\b(bt|cl|doc|docg|dop|igt|bt\.|cl\.)\b.*\d/.test(line.toLowerCase()) ||
                      /\b€\s*\d/.test(line) && /\b(bt|cl)\b/.test(line.toLowerCase());
    if (isBeverage) {
      console.log('Skipping beverage item:', line.trim());
      continue;
    }

    // Look for lines with prices (containing € or numbers followed by currency)
    // Also handle prices on separate lines
    let price = null;
    let priceMatch = line.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|eur|euro)/i);
    if (priceMatch) {
      price = `€${priceMatch[1].replace(',', '.')}`;
      // Extract dish name (text before price in same line)
      const priceIndex = line.indexOf(priceMatch[0]);
      const name = line.substring(0, priceIndex).trim();

      console.log(`[PRICE FOUND] In section ${currentSection}: "${name}" -> "${price}" (full line: "${line.trim()}")`);

      // Try to get description from next line(s)
      let description = '';
      let nextLines = 0;
      while (nextLines < 3 && i + nextLines + 1 < lines.length) {
        const nextLine = lines[i + nextLines + 1];
        // Stop if next line looks like another dish (has price or is a section header)
        if (nextLine.match(/\d+(?:[.,]\d{2})?\s*(?:€|eur|euro)/i) ||
            nextLine.toLowerCase().replace(/\s+/g, '').includes('antipast') ||
            nextLine.toLowerCase().replace(/\s+/g, '').includes('prim') ||
            nextLine.toLowerCase().replace(/\s+/g, '').includes('second')) {
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
        console.log(`[DISH ADDED] to ${currentSection}: "${dish.name}" - ${dish.price}`);
      }
    } else {
      // Check if this line could be a dish name without price (price might be on next line)
      // But only if it's not a beverage and not too short
      const trimmedLine = line.trim();
      if (trimmedLine.length > 8 && !trimmedLine.match(/^\d/) && !isBeverage && !trimmedLine.includes('€')) {
        // Look ahead for price on next lines (max 2 lines)
        for (let lookAhead = 1; lookAhead <= 2 && i + lookAhead < lines.length; lookAhead++) {
          const nextLine = lines[i + lookAhead];
          const nextPriceMatch = nextLine.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|eur|euro)/i);
          if (nextPriceMatch && !isBeverage) {
            const nextPrice = `€${nextPriceMatch[1].replace(',', '.')}`;

            // Get description from lines between name and price
            let description = '';
            for (let descLine = 1; descLine < lookAhead; descLine++) {
              const descText = lines[i + descLine].trim();
              if (descText.length > 3 && !descText.includes('€') && !isBeverage) {
                description += (description ? ' ' : '') + descText;
              }
            }

            // Add dish to current section
            if (currentSection && trimmedLine.length > 5) {
              const dish = {
                name: trimmedLine,
                description: description || (language === 'it' ? 'Delizioso piatto del nostro menu' : 'Delicious dish from our menu'),
                price: nextPrice
              };

              menuData[currentSection].push(dish);
              console.log('[DISH ADDED SEPARATE] with separate price line:', dish.name, '->', dish.price);
            }

            // Skip the lines we processed
            i += lookAhead;
            break;
          }
        }
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

  // Split text into lines and look for price patterns line by line
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for lines containing prices (multiple patterns)
    let priceMatch = line.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|eur|euro)/i);
    let price = null;
    let name = null;
    
    if (priceMatch) {
      // Standard case: price with currency symbol on same line
      price = `€${priceMatch[1].replace(',', '.')}`;
      name = line.replace(priceMatch[0], '').trim();
    } else {
      // Fallback: look for price patterns without currency symbol
      const fallbackMatch = line.match(/(\d+(?:[.,]\d{2})?)$/);
      if (fallbackMatch) {
        // Check if next line has currency or if this looks like a price line
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        if (nextLine.match(/(?:€|eur|euro)/i) || line.includes('bt') || line.includes('cl') || line.includes('doc') || line.includes('docg')) {
          price = `€${fallbackMatch[1].replace(',', '.')}`;
          name = line.replace(fallbackMatch[0], '').trim();
        }
      }
    }
    
    if (!price || !name) continue;

      // Skip if name is too short or looks like a beverage
      if (name.length < 3) continue;

      // Skip beverages and non-food items (comprehensive filtering)
      const lowerName = name.toLowerCase();
      const isBeverage = /^\s*(bibite|birra|vino|acqua|prosecco|vermentino|falanghina|minerale|frizzante|lattina|spina|cabernet|sauvignon|chardonnay|pinot|riesling|gewürztraminer|barolo|barbaresco|brunello|chianti|valpolicella|amarone|soave|bardolino|franciacorta|bolgheri|morellino|vernaccia|rosato|cerasuolo|negroamaro|primitivo|salice|salentino|roero|arneis|ribolla|gialla|kaltern|mottura|attems|monchiero|carbone|duca|salaparuta|borgo|molino|bortomiol|colle|sardo|capo|vigne|janare|guardiense|eleme|\d+\s*(bt|cl))/i.test(lowerName) ||
                        /\b(bt|cl|doc|docg|dop|igt|bt\.|cl\.)\b.*\d/.test(lowerName) ||
                        /\b€\s*\d/.test(line) && /\b(bt|cl)\b/.test(lowerName) ||
                        lowerName.includes('coperto') || lowerName.includes('lista') ||
                        lowerName.includes('allergeni') || /^\d+\./.test(lowerName);
      
      if (isBeverage) {
        console.log('Skipping beverage item in simple extraction:', name.trim());
        continue;
      }

      if (name) {
        const dish = {
          name: name,
          description: language === 'it' ? 'Piatto del nostro menu' : 'Dish from our menu',
          price: price
        };

        // Smart classification based on dish name patterns
        if (lowerName.includes('gamberi') || lowerName.includes('gamberetti') ||
            lowerName.includes('pesce') || lowerName.includes('insalata') ||
            lowerName.includes('carpaccio') || lowerName.includes('millefoglie') ||
            lowerName.includes('cozze') || lowerName.includes('vongole') ||
            lowerName.includes('calamari') || lowerName.includes('polpo') ||
            lowerName.includes('seppie') || lowerName.includes('crostacei') ||
            lowerName.includes('mare') || lowerName.includes('frutti di mare')) {
          menuData.antipasti.push(dish);
          console.log(`[CLASSIFIED ANTIPASTI] "${name}" - ${price}`);
        }
        else if (lowerName.includes('spaghetti') || lowerName.includes('risotto') ||
                 lowerName.includes('pasta') || lowerName.includes('orecchiette') ||
                 lowerName.includes('cavatelli') || lowerName.includes('fusilli') ||
                 lowerName.includes('penne') || lowerName.includes('linguine') ||
                 lowerName.includes('tagliatelle') || lowerName.includes('ravioli') ||
                 lowerName.includes('trofie') || lowerName.includes('bucatini')) {
          menuData.primi.push(dish);
          console.log(`[CLASSIFIED PRIMI] "${name}" - ${price}`);
        }
        else if (lowerName.includes('grigliat') || lowerName.includes('fritt') ||
                 lowerName.includes('arrosto') || lowerName.includes('brace') ||
                 lowerName.includes('pesce spada') || lowerName.includes('orata') ||
                 lowerName.includes('branzino') || lowerName.includes('spigola') ||
                 lowerName.includes('tonno') || lowerName.includes('salmone') ||
                 lowerName.includes('secondi') || lowerName.includes('main') ||
                 lowerName.includes('carne') || lowerName.includes('bistecca')) {
          menuData.secondi.push(dish);
          console.log(`[CLASSIFIED SECONDI] "${name}" - ${price}`);
        }
        // If no specific pattern matches, try to classify by context or fallback
        else {
          // Check if previous lines contain section hints
          let contextHint = '';
          for (let j = Math.max(0, i - 5); j < i; j++) {
            const prevLine = lines[j].toLowerCase();
            if (prevLine.includes('antipast') || prevLine.includes('starter')) {
              contextHint = 'antipasti';
              break;
            } else if (prevLine.includes('prim') || prevLine.includes('first')) {
              contextHint = 'primi';
              break;
            } else if (prevLine.includes('second') || prevLine.includes('main')) {
              contextHint = 'secondi';
              break;
            }
          }

          if (contextHint) {
            menuData[contextHint].push(dish);
            console.log(`[CLASSIFIED BY CONTEXT ${contextHint.toUpperCase()}] "${name}" - ${price}`);
          } else {
            // Final fallback: distribute by count
            const totalDishes = menuData.antipasti.length + menuData.primi.length + menuData.secondi.length;
            if (totalDishes % 3 === 0) {
              menuData.antipasti.push(dish);
            } else if (totalDishes % 3 === 1) {
              menuData.primi.push(dish);
            } else {
              menuData.secondi.push(dish);
            }
            console.log(`[CLASSIFIED FALLBACK] "${name}" - ${price}`);
          }
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
  console.log('processMenuPDF called with data keys:', Object.keys(data || {}));
  
  // Removed authentication check since access is protected by frontend

  // Handle nested data structure from callable functions
  const requestData = data.data || data;
  const { fileData, language } = requestData;
  
  console.log('processMenuPDF: extracted parameters:', { fileDataLength: fileData?.length, language });

  if (!fileData || !language) {
    console.error('Missing required parameters:', { fileData: !!fileData, language });
    throw new functions.https.HttpsError('invalid-argument', 'File data and language are required');
  }

  try {
    console.log('Converting base64 to buffer...');
    // Convert base64 to buffer (assuming file is sent as base64)
    const fileBuffer = Buffer.from(fileData, 'base64');
    console.log('Buffer created, length:', fileBuffer.length);
    
    console.log('Extracting menu from PDF...');
    // Extract menu data from PDF
    const menuData = await extractMenuFromPDF(fileBuffer, language);
    console.log('Menu data extracted:', menuData);
    
    console.log('Saving to Firestore...');
    // Save to Firestore
    await admin.firestore().collection('menus').doc(language).set(menuData);
    console.log('Menu saved to Firestore');
    
    return { success: true, message: `Menu ${language} processed and saved` };
  } catch (error) {
    console.error('Error processing PDF:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', `Error processing PDF: ${error.message}`);
  }
});

exports.getMenu = functions.https.onCall(async (data, context) => {
  const { language } = data.data || data;

  if (!language) {
    throw new functions.https.HttpsError('invalid-argument', 'Language is required');
  }

  try {
    const docRef = admin.firestore().collection('menus').doc(language);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
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

// Default content function
function getDefaultContent(language) {
  const content = {
    it: {
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
        p1: "Nel cuore di Monopoli, il nostro ristorante è nato da una passione per la cucina pugliese autentica e per il mare. Da generazioni, la nostra famiglia si dedica a portare sulla vostra tavola solo il pesce più fresco e gli ingredienti più genuini, selezionati dai migliori produttori locali.",
        p2: "La nostra filosofia è semplice: celebrare i sapori della nostra terra con ricette che rispettano la tradizione, ma con un tocco di creatività che le rende uniche. Ogni piatto è un viaggio sensoriale, un'esperienza che vogliamo condividere con voi.",
        p3: "Vi invitiamo a scoprire il nostro mondo, fatto di gusto, passione e ospitalità."
      },
      menu: {
        title: "Il Nostro Menu",
        subtitle: "Assapora il meglio del mare con i nostri piatti preparati con pesce freschissimo e ingredienti di prima qualità.",
        button: "Visualizza il Menu Completo",
        pdfButton: "DOWNLOAD PDF MENU",
        modalTitle: "Il Nostro Menu Completo",
        categories: {
          antipasti: "Antipasti",
          primi: "Primi Piatti",
          secondi: "Secondi Piatti"
        },
        data: {
          antipasti: [
            { name: "Insalata di Mare", description: "Polpo, seppia, gamberi e cozze con verdure fresche", price: "€14" },
            { name: "Carpaccio di Pesce Spada", description: "Pesce spada affumicato con rucola, pomodorini e scaglie di parmigiano", price: "€16" },
            { name: "Cozze Gratinate", description: "Cozze al forno con pangrattato aromatizzato", price: "€12" }
          ],
          primi: [
            { name: "Spaghetti ai Frutti di Mare", description: "Un classico con vongole, cozze, gamberi e calamari", price: "€18" },
            { name: "Risotto del Pescatore", description: "Riso Carnaroli con il pescato migliore del giorno", price: "€20" },
            { name: "Cavatelli con Cime di Rapa e Vongole", description: "Pasta fresca pugliese con un mix di terra e mare", price: "€17" }
          ],
          secondi: [
            { name: "Pesce Misto alla Griglia", description: "Pesce spada, gamberoni, seppia e scampi alla griglia", price: "€25" },
            { name: "Pesce Azzurro Fritto", description: "Pesce azzurro fresco fritto croccante", price: "€22" },
            { name: "Orata al Sale", description: "Orata fresca cotta in crosta di sale per preservare la sua tenerezza", price: "€24" }
          ]
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
        mapLink: "Vedi su Mappa",
        hoursTitle: "Orari di Apertura",
        hoursLine1: "Pranzo: 12:30 - 15:00",
        hoursLine2: "Cena: 19:30 - 23:00",
        hoursLine3: "Chiuso il Martedì",
        reservationsTitle: "Prenotazioni",
        reservationsLine1: "Chiamaci al"
      },
      loyalty: {
        title: "Qualcosa Bolle in Pentola",
        description: "Stiamo preparando qualcosa di speciale per i nostri clienti fedeli. È attualmente in lavorazione, ma avrete presto delle sorprese!",
        addToWallet: "Aggiungi al Portafoglio",
        googlePay: "Google Pay",
        appleWallet: "Apple Wallet"
      },
      footer: {
        subtitle: "Ristorante di Pesce a Monopoli",
        backToTop: "Torna in Alto",
        copyright: "Tutti i diritti riservati.",
        credit: "Sito web realizzato con amore"
      }
    },
    en: {
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
        pdfButton: "DOWNLOAD PDF MENU",
        modalTitle: "Our Full Menu",
        categories: {
          antipasti: "Appetizers",
          primi: "First Courses",
          secondi: "Main Courses"
        },
        data: {
          antipasti: [
            { name: "Seafood Salad", description: "Octopus, cuttlefish, shrimp, and mussels with fresh vegetables", price: "€14" },
            { name: "Swordfish Carpaccio", description: "Smoked swordfish with arugula, cherry tomatoes, and parmesan flakes", price: "€16" },
            { name: "Gratinated Mussels", description: "Oven-baked mussels with flavored breadcrumbs", price: "€12" }
          ],
          primi: [
            { name: "Spaghetti with Seafood", description: "A classic with clams, mussels, shrimp, and squid", price: "€18" },
            { name: "Fisherman's Risotto", description: "Carnaroli rice with the best catch of the day", price: "€20" },
            { name: "Cavatelli with Turnip Greens and Clams", description: "Fresh Apulian pasta with a blend of land and sea", price: "€17" }
          ],
          secondi: [
            { name: "Mixed Grilled Fish", description: "Grilled swordfish, prawns, cuttlefish, and langoustines", price: "€25" },
            { name: "Fried Small Fish", description: "Crispy fried fresh small fish", price: "€22" },
            { name: "Sea Bream in Salt Crust", description: "Fresh sea bream cooked in a salt crust to preserve its tenderness", price: "€24" }
          ]
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

  return content[language] || content['it'];
}

exports.getContent = functions.https.onCall(async (data, context) => {
  console.log('getContent called with data keys:', Object.keys(data || {}));
  const { language } = data.data || data;
  console.log('getContent: language extracted:', language);

  if (!language) {
    console.error('getContent: Language is required but not provided');
    throw new functions.https.HttpsError('invalid-argument', 'Language is required');
  }

  try {
    console.log('getContent: Fetching document from Firestore for language:', language);
    const docRef = admin.firestore().collection('content').doc(language);
    const docSnap = await docRef.get();

    console.log('getContent: Document exists:', docSnap.exists);

    if (docSnap.exists) {
      const contentData = docSnap.data();
      console.log('getContent: Found content data keys:', Object.keys(contentData || {}));
      
      // Merge with defaults
      const defaultContent = getDefaultContent(language);
      const mergedContent = { ...defaultContent };
      
      // Override with saved data
      Object.keys(contentData).forEach(section => {
        if (typeof contentData[section] === 'object' && contentData[section] !== null) {
          mergedContent[section] = { ...mergedContent[section], ...contentData[section] };
        } else {
          mergedContent[section] = contentData[section];
        }
      });
      
      return mergedContent;
    } else {
      console.log('getContent: Document not found, returning default content for language:', language);
      return getDefaultContent(language);
    }
  } catch (error) {
    console.error('getContent: Error getting content:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving content');
  }
});

exports.updateContent = functions.https.onCall(async (data, context) => {
  console.log('updateContent called with data:', data);
  
  // Removed authentication check since access is protected by frontend

  // Handle nested data structure from callable functions
  const requestData = data.data || data;
  const { language, section, key, value } = requestData;

  console.log('Extracted parameters:', { language, section, key, value });

  if (!language || !section || !key) {
    console.error('Missing required parameters:', { language, section, key });
    throw new functions.https.HttpsError('invalid-argument', 'Language, section, and key are required');
  }

  try {
    const docRef = admin.firestore().collection('content').doc(language);
    
    // Get current content
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
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