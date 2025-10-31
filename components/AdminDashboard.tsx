import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../src/firebase';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase';
import { contentCache } from '../src/contentCache';
import { analyticsService } from '../src/analytics';

interface MenuUpload {
  language: 'it' | 'en';
  file: File | null;
  lastUpload: string | null;
  fileName: string | null;
}

const AdminDashboard: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [menuUploads, setMenuUploads] = useState<MenuUpload[]>([
    { language: 'it', file: null, lastUpload: null, fileName: null },
    { language: 'en', file: null, lastUpload: null, fileName: null }
  ]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [contentLanguage, setContentLanguage] = useState<'it' | 'en'>('it');
  const [contentSection, setContentSection] = useState<string>('menu');
  const [contentStatus, setContentStatus] = useState<string>('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentContents, setCurrentContents] = useState<Record<string, string>>({});

  // Modal states
  const [showContentModal, setShowContentModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Wallet card states
  const [walletCards, setWalletCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [posMode, setPosMode] = useState(false); // true = POS mode, false = normal detail mode
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPoints, setQuickPoints] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scannedCardId, setScannedCardId] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{cardId: string, field: 'balance' | 'fidelityPoints', value: number, operation: string} | null>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [showWalletSuccessAnimation, setShowWalletSuccessAnimation] = useState(false);

  const sectionKeys: Record<string, string[]> = {
    nav: ['home', 'about', 'menu', 'gallery', 'contact'],
    hero: ['title', 'subtitle', 'button'],
    about: ['title', 'p1', 'p2', 'p3'],
    menu: ['title', 'subtitle', 'button', 'pdfButton', 'modalTitle'],
    contact: ['title', 'addressTitle', 'addressLine1', 'addressLine2', 'mapLink', 'hoursTitle', 'hoursLine1', 'hoursLine2', 'hoursLine3', 'reservationsTitle', 'reservationsLine1'],
    footer: ['text']
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  // Load saved upload data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('menuUploads');
    if (saved) {
      const parsed = JSON.parse(saved);
      setMenuUploads(parsed);
    }
  }, []);

  const [metrics, setMetrics] = useState({
    totalVisits: 0,
    menuViews: 0
  });

  // Load real metrics on component mount
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const realMetrics = await analyticsService.getMetrics();
        setMetrics({
          totalVisits: realMetrics.page_views || 0,
          menuViews: realMetrics.menu_views || 0
        });
      } catch (error) {
        console.warn('Failed to load metrics:', error);
      }
    };

    loadMetrics();
  }, []);

  const handleFileSelect = (language: 'it' | 'en', file: File | null) => {
    if (file && file.type !== 'application/pdf') {
      setUploadStatus('Errore: Seleziona solo file PDF');
      return;
    }

    setMenuUploads(prev => prev.map(upload => 
      upload.language === language 
        ? { 
            ...upload, 
            file, 
            fileName: file?.name || null,
            lastUpload: file ? new Date().toLocaleString('it-IT') : upload.lastUpload
          }
        : upload
    ));
    setUploadStatus('');
  };

  const handleUpload = async (language: 'it' | 'en') => {
    const upload = menuUploads.find(u => u.language === language);
    if (!upload?.file) {
      setUploadStatus('Seleziona un file prima di caricare');
      return;
    }

    // Show loading overlay
    setIsLoading(true);
    setUploadStatus('Analisi del PDF in corso...');
    
    try {
      // Extract menu data from PDF (mock implementation)
      console.log('Extracting menu from PDF...');
      const menuData = extractMenuFromPDF(upload.file, language);
      console.log('Menu data extracted:', menuData);
      
      // Save menu data directly to Firebase
      console.log('Saving menu data to Firebase...');
      const menuDocRef = doc(db, 'menu', language);
      await setDoc(menuDocRef, {
        ...menuData,
        lastUpdated: new Date().toISOString(),
        version: Date.now() // For cache invalidation
      });
      console.log('Menu data saved to Firebase');
      
      // Update uploads
      const updatedUploads = menuUploads.map(u => 
        u.language === language 
          ? { ...u, file: null }
          : u
      );
      
      setMenuUploads(updatedUploads);
      localStorage.setItem('menuUploads', JSON.stringify(updatedUploads));
      setUploadStatus(`Menu ${language === 'it' ? 'italiano' : 'inglese'} estratto e salvato con successo!`);
      
      // Track menu upload
      analyticsService.trackMenuUpload(upload.file.name, upload.file.size);
      
      // Dispatch event to update menu
      window.dispatchEvent(new CustomEvent('menuUpdated', { detail: { language } }));
      
      // Clear status after 5 seconds
      setTimeout(() => setUploadStatus(''), 5000);
    } catch (error) {
      console.error('Error uploading menu:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      setUploadStatus(`Errore nel caricamento del menu: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContent = async (key: string, value: string) => {
    console.log('🔥 handleUpdateContent CALLED with:', { key, value, contentLanguage, contentSection });
    
    if (!currentUser) {
      setContentStatus('Utente non autenticato. Effettua nuovamente il login.');
      return;
    }

    if (!contentLanguage || !contentSection || !key) {
      console.error('❌ Missing required parameters:', { contentLanguage, contentSection, key });
      setContentStatus('Errore: parametri mancanti per aggiornare il contenuto');
      return;
    }

    // Show loading overlay
    setIsLoading(true);
    setContentStatus('Aggiornamento in corso...');

    try {
      const docRef = doc(db, 'content', contentLanguage);
      
      // Get current content
      const docSnap = await getDoc(docRef);
      let updateData: any = {};
      
      if (docSnap.exists()) {
        updateData = docSnap.data();
      }

      // Update version for cache invalidation
      updateData.version = (updateData.version || 1) + 1;

      // Update the specific field
      if (!updateData[contentSection]) {
        updateData[contentSection] = {};
      }
      updateData[contentSection][key] = value;

      // Use updateDoc for partial updates (more secure than setDoc)
      const updatePath = `${contentSection}.${key}`;
      const updateObject = {
        [updatePath]: value,
        version: updateData.version
      };
      
      await updateDoc(docRef, updateObject);

      // Update local state
      setCurrentContents(prev => ({ ...prev, [key]: value }));

      // Invalidate cache for this language
      contentCache.invalidateCache(contentLanguage);

      // Dispatch event to update content across the app
      window.dispatchEvent(new CustomEvent('contentUpdated', { detail: { language: contentLanguage } }));

      // Track content edit
      analyticsService.trackContentEdit(contentSection, 'update');

      // Reset content status and show success animation
      setContentStatus('');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);
    } catch (error) {
      console.error('Error updating content:', error);
      setContentStatus(`Errore nell'aggiornamento: ${error.message}`);
      setTimeout(() => setContentStatus(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentContents = async () => {
    console.log('📥 Loading contents for language:', contentLanguage, 'section:', contentSection);
    try {
      const docRef = doc(db, 'content', contentLanguage);
      const docSnap = await getDoc(docRef);

      let contentData: Record<string, Record<string, string>> = {};

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults if needed, but for simplicity, use the data directly
        contentData = data as Record<string, Record<string, string>>;
      }

      console.log('📄 Loaded content data:', contentData);
      console.log('📋 Setting current contents for section:', contentSection, 'data:', contentData[contentSection] || {});
      setCurrentContents(contentData[contentSection] || {});
    } catch (error) {
      console.error('Error loading content:', error);
      // No fallback, leave empty
      setCurrentContents({});
    }
  };

  // Load contents when language or section changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - contentLanguage:', contentLanguage, 'contentSection:', contentSection);
    loadCurrentContents();
  }, [contentLanguage, contentSection]);

  // Load contents when content modal opens
  useEffect(() => {
    if (showContentModal) {
      console.log('🔄 Modal opened - loading contents for language:', contentLanguage, 'section:', contentSection);
      loadCurrentContents();
    }
  }, [showContentModal, contentLanguage, contentSection]);

  // Load wallet cards when wallet modal opens
  useEffect(() => {
    if (showWalletModal) {
      loadWalletCards();
    }
  }, [showWalletModal]);

  // Sync selectedCard when walletCards changes
  useEffect(() => {
    if (selectedCard && walletCards.length > 0) {
      const updatedCard = walletCards.find(card => card.id === selectedCard.id);
      if (updatedCard && (updatedCard.balance !== selectedCard.balance || updatedCard.fidelityPoints !== selectedCard.fidelityPoints)) {
        setSelectedCard(updatedCard);
      }
    }
  }, [walletCards, selectedCard]);

  // Load wallet cards from Firestore directly
  const loadWalletCards = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'walletCards'));
      const cards = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated),
          transactions: data.transactions?.map((tx: any) => ({
            ...tx,
            timestamp: tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp)
          })) || []
        };
      });

      setWalletCards(cards);
      console.log(`Loaded ${cards.length} wallet cards`);
    } catch (error) {
      console.error('Error loading wallet cards:', error);
      setWalletCards([]);
    }
  };

  // Create new wallet card directly in Firestore
  const createWalletCard = async () => {
    try {
      const cardId = crypto.randomUUID();
      const newCardData = {
        id: cardId,
        name: '',
        email: '',
        balance: 0,
        fidelityPoints: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
        transactions: []
      };

      await setDoc(doc(db, 'walletCards', cardId), newCardData);

      setWalletCards(prev => [newCardData, ...prev]);

      alert(`Carta creata con successo!\nID: ${cardId}\n\nQuesto ID corrisponde al QR code della carta.`);
    } catch (error) {
      console.error('Error creating wallet card:', error);
      alert('Errore nella creazione della carta');
    }
  };

  // Update card balance or points using direct Firestore operations
  const updateCard = async (cardId: string, field: 'balance' | 'fidelityPoints', value: number, operation: string) => {
    try {
      const cardRef = doc(db, 'walletCards', cardId);
      const cardDoc = await getDoc(cardRef);

      if (!cardDoc.exists()) {
        throw new Error('Carta non trovata');
      }

      const currentData = cardDoc.data();
      const currentValue = currentData[field] || 0;

      // Check for insufficient balance/points
      if (operation === 'subtract' && currentValue < value) {
        const fieldName = field === 'balance' ? 'saldo' : 'punti fedeltà';
        throw new Error(`Saldo ${fieldName} insufficiente. Disponibile: ${field === 'balance' ? '€' : ''}${currentValue}${field === 'fidelityPoints' ? ' punti' : ''}`);
      }

      const newValue = operation === 'add' ? currentValue + value : currentValue - value;

      // Create transaction record
      const transaction = {
        type: operation === 'add' ? `Aggiunta ${field === 'balance' ? 'saldo' : 'punti'}` : `Rimozione ${field === 'balance' ? 'saldo' : 'punti'}`,
        amount: operation === 'add' ? value : -value,
        timestamp: new Date(),
        field: field
      };

      const updateData = {
        [field]: newValue,
        lastUpdated: new Date(),
        transactions: [...(currentData.transactions || []), transaction]
      };

      await updateDoc(cardRef, updateData);

      const updatedCard = {
        ...currentData,
        ...updateData,
        id: cardId,
        createdAt: currentData.createdAt?.toDate ? currentData.createdAt.toDate() : new Date(currentData.createdAt),
        lastUpdated: new Date(),
        transactions: [...(currentData.transactions || []), transaction]
      };

      setWalletCards(prev => prev.map(c =>
        c.id === cardId ? updatedCard : c
      ));

      console.log(`Card ${cardId} updated: ${field} = ${newValue}`);
    } catch (error: any) {
      console.error('Error updating card:', error);
      if (error.message?.includes('insufficiente') || error.message?.includes('Insufficient')) {
        alert(error.message);
      } else {
        alert('Errore nell\'aggiornamento della carta');
      }
      throw error; // Re-throw to be handled by confirmCardUpdate
    }
  };

  // Handle card update with confirmation
  const handleCardUpdate = (cardId: string, field: 'balance' | 'fidelityPoints', value: number, operation: string) => {
    setPendingUpdate({ cardId, field, value, operation });
    setShowConfirmDialog(true);
    setSliderPosition(0); // Reset slider
  };

  // Handle slider drag
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const sliderContainer = e.currentTarget.parentElement;
    if (!sliderContainer) return;

    const rect = sliderContainer.getBoundingClientRect();
    const newPosition = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPosition(newPosition);

    // If slider reaches 90% or more, confirm the operation
    if (newPosition >= 90) {
      confirmCardUpdate();
    }
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    // If not completed, reset slider
    if (sliderPosition < 90) {
      setSliderPosition(0);
    }
  };

  // Add global mouse event listeners for better drag experience
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const sliderContainer = document.querySelector('.slider-container');
      if (!sliderContainer) return;

      const rect = sliderContainer.getBoundingClientRect();
      const newPosition = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      setSliderPosition(newPosition);

      // If slider reaches 90% or more, confirm the operation
      if (newPosition >= 90) {
        confirmCardUpdate();
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      // If not completed, reset slider
      if (sliderPosition < 90) {
        setSliderPosition(0);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, sliderPosition]);

  // Confirm card update
  const confirmCardUpdate = async () => {
    if (pendingUpdate) {
      setIsUpdatingCard(true);
      setShowConfirmDialog(false);

      try {
        await updateCard(pendingUpdate.cardId, pendingUpdate.field, pendingUpdate.value, pendingUpdate.operation);

        // Reload wallet cards to get updated data including new transactions
        await loadWalletCards();

        // Force update selectedCard after a longer delay to ensure walletCards is updated
        setTimeout(() => {
          const updatedCard = walletCards.find(c => c.id === pendingUpdate.cardId);
          if (updatedCard) {
            setSelectedCard({ ...updatedCard }); // Force re-render with spread
          }
          setIsUpdatingCard(false);
          setShowWalletSuccessAnimation(true);
          
          // Hide success animation after 2.5 seconds
          setTimeout(() => {
            setShowWalletSuccessAnimation(false);
          }, 2500);
        }, 500);
      } catch (error) {
        console.error('Error updating card:', error);
        setIsUpdatingCard(false);
        setSliderPosition(0);
        alert('Errore nell\'aggiornamento della carta');
        return;
      }

      // Clear input fields after successful operation
      if (pendingUpdate.field === 'balance') {
        const balanceInput = document.getElementById('balance-amount') as HTMLInputElement;
        if (balanceInput) balanceInput.value = '';
      } else if (pendingUpdate.field === 'fidelityPoints') {
        const pointsInput = document.getElementById('points-amount') as HTMLInputElement;
        if (pointsInput) pointsInput.value = '';
      }

      setPendingUpdate(null);
      setSliderPosition(0);
    }
  };

  // Scan QR code (simulated)
  const scanQRCode = () => {
    setScanMode(true);
    // In a real implementation, this would open the camera
    setTimeout(() => {
      const mockCardId = prompt('Simulazione scanner QR - Inserisci ID carta (o lascia vuoto per test):');
      if (mockCardId) {
        setScannedCardId(mockCardId);
        findCardById(mockCardId);
      }
      setScanMode(false);
    }, 1000);
  };

  // Find card by ID (used for scanning)
  const findCardById = (cardId: string) => {
    const card = walletCards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
      setPosMode(true); // Always open POS mode when scanning
    } else {
      alert('Carta non trovata. Verifica l\'ID e riprova.');
    }
  };

  // POS Mode functions
  const addBalance = async (amount: number) => {
    if (!selectedCard) return;
    handleCardUpdate(selectedCard.id, 'balance', amount, 'add');
    setQuickAmount('');
  };

  const removeBalance = async (amount: number) => {
    if (!selectedCard) return;
    handleCardUpdate(selectedCard.id, 'balance', amount, 'subtract');
    setQuickAmount('');
  };

  const addPoints = async (points: number) => {
    if (!selectedCard) return;
    handleCardUpdate(selectedCard.id, 'fidelityPoints', points, 'add');
    setQuickPoints('');
  };

  const removePoints = async (points: number) => {
    if (!selectedCard) return;
    handleCardUpdate(selectedCard.id, 'fidelityPoints', points, 'subtract');
    setQuickPoints('');
  };

  // Simulate PDF parsing - extract menu data from PDF
  const extractMenuFromPDF = (file: File, language: 'it' | 'en') => {
    // In a real implementation, this would use a PDF parsing library
    // For demo, generate mock data based on file name or content
    
    const mockData = {
      antipasti: [
        {
          name: language === 'it' ? 'Insalata di Mare' : 'Sea Salad',
          description: language === 'it' 
            ? 'Polpo, seppie, gamberi e cozze con verdure fresche' 
            : 'Octopus, squid, shrimp and mussels with fresh vegetables',
          price: '€14'
        },
        {
          name: language === 'it' ? 'Carpaccio di Spada' : 'Swordfish Carpaccio',
          description: language === 'it'
            ? 'Pesce spada affumicato con rucola, pomodorini e scaglie di grana'
            : 'Smoked swordfish with rocket, cherry tomatoes and parmesan shavings',
          price: '€16'
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

    return mockData;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 md:h-16">
            <div className="flex items-center">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="hidden sm:inline">Logout</span>
                <i className="fas fa-sign-out-alt sm:hidden"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Ristorante Pizzeria Monopoli</h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Gestisci contenuti e monitora le performance del tuo ristorante</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs md:text-sm text-gray-500">Ultimo aggiornamento</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">{new Date().toLocaleDateString('it-IT')}</p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Servizi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Content Management Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setShowContentModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-edit text-xl md:text-2xl text-blue-600"></i>
                  </div>
                </div>
                <div className="ml-3 md:ml-4 flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">Contenuti Sito</h3>
                  <p className="text-gray-600 text-sm">Gestisci testi, immagini e contenuti del sito web</p>
                </div>
                <div className="ml-2 md:ml-auto flex-shrink-0">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>

            {/* PDF Menu Upload Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-green-300 transition-colors cursor-pointer" onClick={() => setShowMenuModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-pdf text-xl md:text-2xl text-green-600"></i>
                  </div>
                </div>
                <div className="ml-3 md:ml-4 flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">Caricamento PDF Menu</h3>
                  <p className="text-gray-600 text-sm">Carica e aggiorna il menu del ristorante</p>
                </div>
                <div className="ml-2 md:ml-auto flex-shrink-0">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>

            {/* Performance Metrics Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-purple-300 transition-colors cursor-pointer" onClick={() => setShowMetricsModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-xl md:text-2xl text-purple-600"></i>
                  </div>
                </div>
                <div className="ml-3 md:ml-4 flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">Performance</h3>
                  <p className="text-gray-600 text-sm">Monitora visite e statistiche del sito</p>
                </div>
                <div className="ml-2 md:ml-auto flex-shrink-0">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>

            {/* Wallet Cards Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-orange-300 transition-colors cursor-pointer" onClick={() => setShowWalletModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-credit-card text-xl md:text-2xl text-orange-600"></i>
                  </div>
                </div>
                <div className="ml-3 md:ml-4 flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">Wallet Cards</h3>
                  <p className="text-gray-600 text-sm">Gestisci carte fedeltà digitali</p>
                </div>
                <div className="ml-2 md:ml-auto flex-shrink-0">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Wallet Cards Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto border border-gray-200">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3 md:mr-4">
                    <i className="fas fa-credit-card text-xl md:text-2xl text-orange-600"></i>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Gestione Wallet Cards</h2>
                    <p className="text-gray-600 text-sm">Sistema digitale carte fedeltà</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 self-end sm:self-auto"
                >
                  <i className="fas fa-times text-lg md:text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-8">
              {/* Header con azioni */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 bg-white rounded-xl p-4 md:p-6 shadow-lg border border-orange-100">
                <div className="mb-4 sm:mb-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Carte Attive</h3>
                  <p className="text-gray-600 text-sm">Totale carte: <span className="font-semibold text-orange-600">{walletCards.length}</span></p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <button
                    onClick={scanQRCode}
                    disabled={scanMode}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 md:px-6 py-3 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                  >
                    {scanMode ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2 md:mr-3"></i>
                        <span className="hidden sm:inline">Scansionando...</span>
                        <span className="sm:hidden">Scan...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-qrcode mr-2 md:mr-3 text-lg"></i>
                        <span className="hidden sm:inline">Scanner QR</span>
                        <span className="sm:hidden">QR Scan</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={createWalletCard}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-3 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors"
                  >
                    <i className="fas fa-plus mr-2 md:mr-3 text-lg"></i>
                    <span className="hidden sm:inline">Crea Carta</span>
                    <span className="sm:hidden">Crea</span>
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="mb-8">
                {walletCards.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <div className="w-24 h-24 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-credit-card text-4xl text-orange-600"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessuna carta creata</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">Inizia creando la tua prima carta digitale con QR code. Ogni carta avrà un ID univoco per Apple Wallet e Android Wallet.</p>
                    <button
                      onClick={createWalletCard}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                    >
                      <i className="fas fa-plus mr-3"></i>
                      Crea Prima Carta
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {walletCards.map((card) => (
                      <div key={card.id} className="bg-white border border-gray-200 rounded-lg hover:border-orange-300 transition-colors overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-orange-50 border-b border-orange-200 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-credit-card text-orange-600"></i>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm">Carta #{card.id.slice(-6)}</h4>
                                <p className="text-xs text-gray-600">ID: {card.id}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedCard(card);
                                setShowCardDetail(true);
                              }}
                              className="text-orange-600 hover:text-orange-800 transition-colors p-2 hover:bg-orange-50 rounded-lg"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6">
                          <div className="space-y-4">
                            {/* Balance */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <i className="fas fa-euro-sign text-green-600"></i>
                                  <span className="text-sm font-medium text-gray-700">Saldo</span>
                                </div>
                                <span className="font-bold text-xl text-green-600">€{card.balance.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Fidelity Points */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <i className="fas fa-star text-blue-600"></i>
                                  <span className="text-sm font-medium text-gray-700">Punti Fedeltà</span>
                                </div>
                                <span className="font-bold text-xl text-blue-600">{card.fidelityPoints}</span>
                              </div>
                            </div>

                            {/* Last Updated */}
                            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 text-center">
                              <i className="fas fa-clock mr-1"></i>
                              Ultimo agg.: {card.lastUpdated ? card.lastUpdated.toLocaleString('it-IT') : 'Mai'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-info text-orange-600"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-bold text-gray-900 mb-3">💳 Sistema Wallet Cards Digitale</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <i className="fas fa-qrcode w-4 md:w-5 text-center mr-2 text-blue-600"></i>
                          <span>ID univoco per QR code</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-mobile-alt w-4 md:w-5 text-center mr-2 text-green-600"></i>
                          <span>Compatibile Apple/Android Wallet</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <i className="fas fa-history w-4 md:w-5 text-center mr-2 text-purple-600"></i>
                          <span>Cronologia operazioni completa</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-shield-alt w-4 md:w-5 text-center mr-2 text-red-600"></i>
                          <span>Conferma per ogni modifica</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Mode Modal - Mobile Optimized */}
      {posMode && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-95 backdrop-blur-sm flex items-center justify-center p-2 z-[70]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[95vh] flex flex-col border-4 border-orange-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white relative overflow-hidden rounded-t-3xl">
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <i className="fas fa-mobile-alt text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">POS Mode</h2>
                    <p className="text-orange-100 text-xs">Carta #{selectedCard.id.slice(-6)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPosMode(false)}
                  className="text-white hover:text-orange-200 transition-all duration-200 hover:scale-105"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Balance & Points Display */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    €{selectedCard.balance.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-700 font-medium">Saldo Disponibile</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {selectedCard.fidelityPoints}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Punti Fedeltà</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800 text-center">Operazioni Rapide</h3>

                {/* Balance Operations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Saldo (€)</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      className="w-32 px-3 py-2 text-lg border-2 border-gray-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => quickAmount && addBalance(parseFloat(quickAmount))}
                      disabled={!quickAmount || isUpdatingCard}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 text-lg"
                    >
                      <i className="fas fa-plus text-lg"></i>
                      <span>Aggiungi</span>
                    </button>
                    <button
                      onClick={() => quickAmount && removeBalance(parseFloat(quickAmount))}
                      disabled={!quickAmount || isUpdatingCard}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 text-lg"
                    >
                      <i className="fas fa-minus text-lg"></i>
                      <span>Rimuovi</span>
                    </button>
                  </div>
                </div>

                {/* Points Operations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Punti</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={quickPoints}
                      onChange={(e) => setQuickPoints(e.target.value)}
                      className="w-32 px-3 py-2 text-lg border-2 border-gray-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => quickPoints && addPoints(parseInt(quickPoints))}
                      disabled={!quickPoints || isUpdatingCard}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 text-lg"
                    >
                      <i className="fas fa-plus text-lg"></i>
                      <span>Aggiungi</span>
                    </button>
                    <button
                      onClick={() => quickPoints && removePoints(parseInt(quickPoints))}
                      disabled={!quickPoints || isUpdatingCard}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 text-lg"
                    >
                      <i className="fas fa-minus text-lg"></i>
                      <span>Rimuovi</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Amounts - Separated by type */}
              <div className="space-y-4">
                {/* Balance Preset Amounts */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 text-center flex items-center justify-center">
                    <i className="fas fa-euro-sign mr-2 text-green-600"></i>
                    Importi Saldo (€)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15, 20, 25, 50].map(amount => (
                      <button
                        key={`balance-${amount}`}
                        onClick={() => addBalance(amount)}
                        disabled={isUpdatingCard}
                        className="bg-green-100 hover:bg-green-200 disabled:bg-green-50 text-green-800 font-bold py-3 px-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none text-sm border-2 border-green-200"
                      >
                        €{amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points Preset Amounts */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 text-center flex items-center justify-center">
                    <i className="fas fa-star mr-2 text-blue-600"></i>
                    Importi Punti
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 25, 50, 100, 250, 500].map(points => (
                      <button
                        key={`points-${points}`}
                        onClick={() => addPoints(points)}
                        disabled={isUpdatingCard}
                        className="bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 text-blue-800 font-bold py-3 px-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none text-sm border-2 border-blue-200"
                      >
                        {points} pts
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <i className="fas fa-history mr-2"></i>
                  Ultime Operazioni
                </h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {selectedCard.transactions && selectedCard.transactions.slice(-3).reverse().map((transaction: any, index: number) => (
                    <div key={index} className="text-xs text-gray-600 bg-white rounded p-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{transaction.type}</span>
                        <span className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {new Date(transaction.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  {(!selectedCard.transactions || selectedCard.transactions.length === 0) && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      Nessuna operazione recente
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    setPosMode(false);
                    setShowCardDetail(true);
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-info-circle"></i>
                  <span>Vista Dettagliata</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {showCardDetail && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto border border-orange-200">
            {/* Header */}
            <div className="bg-orange-600 p-4 md:p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black bg-opacity-10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <i className="fas fa-credit-card text-2xl"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Dettaglio Carta #{selectedCard.id.slice(-6)}</h2>
                    <p className="text-orange-100 text-sm">ID: {selectedCard.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCardDetail(false)}
                  className="text-white hover:text-orange-200 transition-all duration-200 hover:scale-110"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-8">
              {/* Card Overview */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 md:p-6 mb-8">
                <div className="flex flex-col lg:flex-row items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 lg:mb-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-credit-card text-2xl md:text-3xl text-white"></i>
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Carta Fedeltà Digitale</h3>
                      <p className="text-gray-600 text-sm">ID univoco: <span className="font-mono font-semibold">{selectedCard.id}</span></p>
                    </div>
                  </div>
                  <div className="flex space-x-4 md:space-x-8">
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1">€{selectedCard.balance.toFixed(2)}</div>
                      <div className="text-xs md:text-sm text-gray-600">Saldo Attuale</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{selectedCard.fidelityPoints}</div>
                      <div className="text-xs md:text-sm text-gray-600">Punti Fedeltà</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-8">
                {/* Balance Operations */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-euro-sign text-green-600"></i>
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-gray-900">Gestione Saldo</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        placeholder="Importo"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        id="balance-amount"
                        step="0.01"
                        min="0"
                        disabled={isUpdatingCard}
                      />
                      <span className="text-gray-600 font-medium">€</span>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => {
                          const amount = parseFloat((document.getElementById('balance-amount') as HTMLInputElement).value) || 0;
                          if (amount > 0) {
                            handleCardUpdate(selectedCard.id, 'balance', amount, 'add');
                          } else if (amount === 0) {
                            alert('Inserisci un importo valido');
                          }
                        }}
                        disabled={isUpdatingCard}
                        className={`flex-1 ${isUpdatingCard ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center`}
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Aggiungi €
                      </button>
                      <button
                        onClick={() => {
                          const amount = parseFloat((document.getElementById('balance-amount') as HTMLInputElement).value) || 0;
                          if (amount > 0) {
                            if (selectedCard.balance >= amount) {
                              handleCardUpdate(selectedCard.id, 'balance', amount, 'subtract');
                            } else {
                              alert(`Saldo insufficiente. Saldo attuale: €${selectedCard.balance.toFixed(2)}`);
                            }
                          } else if (amount === 0) {
                            alert('Inserisci un importo valido');
                          }
                        }}
                        disabled={isUpdatingCard}
                        className={`flex-1 ${isUpdatingCard ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center`}
                      >
                        <i className="fas fa-minus mr-2"></i>
                        Rimuovi €
                      </button>
                    </div>
                  </div>
                </div>

                {/* Points Operations */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-star text-blue-600"></i>
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-gray-900">Gestione Punti</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        placeholder="Punti"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        id="points-amount"
                        min="0"
                        disabled={isUpdatingCard}
                      />
                      <span className="text-gray-600 font-medium">pts</span>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => {
                          const points = parseInt((document.getElementById('points-amount') as HTMLInputElement).value) || 0;
                          if (points > 0) {
                            handleCardUpdate(selectedCard.id, 'fidelityPoints', points, 'add');
                          } else if (points === 0) {
                            alert('Inserisci un numero di punti valido');
                          }
                        }}
                        disabled={isUpdatingCard}
                        className={`flex-1 ${isUpdatingCard ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center`}
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Aggiungi Punti
                      </button>
                      <button
                        onClick={() => {
                          const points = parseInt((document.getElementById('points-amount') as HTMLInputElement).value) || 0;
                          if (points > 0) {
                            if (selectedCard.fidelityPoints >= points) {
                              handleCardUpdate(selectedCard.id, 'fidelityPoints', points, 'subtract');
                            } else {
                              alert(`Punti insufficienti. Punti attuali: ${selectedCard.fidelityPoints}`);
                            }
                          } else if (points === 0) {
                            alert('Inserisci un numero di punti valido');
                          }
                        }}
                        disabled={isUpdatingCard}
                        className={`flex-1 ${isUpdatingCard ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center`}
                      >
                        <i className="fas fa-minus mr-2"></i>
                        Rimuovi Punti
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-history text-purple-600"></i>
                  </div>
                  <h4 className="text-lg md:text-xl font-bold text-gray-900">Cronologia Operazioni</h4>
                </div>

                {selectedCard.transactions && selectedCard.transactions.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedCard.transactions.slice().reverse().map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'creation' ? 'bg-green-100 text-green-600' :
                            transaction.type === 'balance_update' ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <i className={`fas fa-${
                              transaction.type === 'creation' ? 'plus' :
                              transaction.type === 'balance_update' ? 'euro-sign' :
                              'star'
                            }`}></i>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{transaction.description}</p>
                            <p className="text-xs text-gray-600">
                              <i className="fas fa-clock mr-1"></i>
                              {transaction.timestamp.toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {transaction.field === 'balance' && (
                            <span className={`font-bold text-sm ${
                              transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                            </span>
                          )}
                          {transaction.field === 'fidelityPoints' && (
                            <span className={`font-bold text-sm ${
                              transaction.amount >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {transaction.amount >= 0 ? '+' : ''}{transaction.amount} pts
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-inbox text-3xl mb-3 text-gray-300"></i>
                    <p>Nessuna operazione registrata</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Update Loading Overlay */}
      {isUpdatingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900">Aggiornamento Carta...</h3>
            <p className="text-gray-600 mt-2">Stiamo aggiornando il saldo e salvando l'operazione.</p>
          </div>
        </div>
      )}

      {/* Wallet Success Animation Overlay */}
      {showWalletSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[85]">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="success-checkmark mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-check text-3xl text-green-600"></i>
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2 animate-fade-in">Operazione Completata!</h3>
            <p className="text-gray-600 animate-fade-in animation-delay-100">La carta è stata aggiornata con successo.</p>
            <div className="mt-6 flex justify-center animate-fade-in animation-delay-150">
              <div className="w-32 h-2 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full animate-progress"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog with Slider */}
      {showConfirmDialog && pendingUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-orange-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-shield-alt text-2xl text-white"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Conferma Operazione</h3>
              <p className="text-gray-700 mb-8 text-lg">
                Trascina lo slider fino alla fine per confermare
              </p>

              {/* Slider */}
              <div className="relative mb-6 slider-container">
                <div className="w-full h-12 bg-gray-200 rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${sliderPosition}%` }}
                  ></div>
                  <div
                    className="absolute top-0 h-full w-12 bg-white border-2 border-orange-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center transform transition-transform duration-200"
                    style={{ left: `max(0px, calc(${sliderPosition}% - 24px))` }}
                    onMouseDown={handleSliderMouseDown}
                  >
                    <i className="fas fa-arrow-right text-orange-600"></i>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Annulla</span>
                  <span>Conferma</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingUpdate(null);
                  setSliderPosition(0);
                  setIsDragging(false);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Management Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Gestione Contenuti Sito</h2>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <i className="fas fa-times text-lg md:text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {/* Error Status */}
              {contentStatus && !showSuccessAnimation && (
                <div className="mb-4 p-4 rounded-md bg-blue-50 border border-blue-200">
                  <p className="text-blue-800">{contentStatus}</p>
                </div>
              )}

              {/* Language Toggle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Lingua</label>
                <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setContentLanguage('it')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      contentLanguage === 'it'
                        ? 'bg-white text-gray-900 border border-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Italiano
                  </button>
                  <button
                    onClick={() => setContentLanguage('en')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      contentLanguage === 'en'
                        ? 'bg-white text-gray-900 border border-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Section Select */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sezione</label>
                <select
                  value={contentSection}
                  onChange={(e) => {
                    console.log('📝 Section changed to:', e.target.value);
                    setContentSection(e.target.value);
                  }}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="nav">Navigazione</option>
                  <option value="hero">Hero</option>
                  <option value="about">Chi Siamo</option>
                  <option value="menu">Menu</option>
                  <option value="contact">Contatti</option>
                  <option value="footer">Footer</option>
                </select>
              </div>

              {/* Content Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionKeys[contentSection]?.map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </label>
                    <input
                      type="text"
                      value={currentContents[key] || ''}
                      onChange={(e) => {
                        const newContents = { ...currentContents };
                        newContents[key] = e.target.value;
                        setCurrentContents(newContents);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Inserisci il testo per ${key}...`}
                    />
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    setContentStatus('Aggiornamento in corso...');
                    
                    try {
                      // Save all fields for current section and language
                      const promises = sectionKeys[contentSection]?.map(key => {
                        const value = currentContents[key] || '';
                        if (value.trim()) {
                          return handleUpdateContent(key, value);
                        }
                        return Promise.resolve();
                      }).filter(Boolean) || [];

                      await Promise.all(promises);
                      
                      setContentStatus('');
                      setShowSuccessAnimation(true);
                      setTimeout(() => {
                        setShowSuccessAnimation(false);
                        setShowContentModal(false);
                      }, 2000);
                    } catch (error) {
                      console.error('Error saving content:', error);
                      setContentStatus('Errore durante il salvataggio');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition duration-200 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Salva Modifiche
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Sistema Cache</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Cache automatica: 15 giorni di durata</li>
                  <li>• Invalidazione: Quando modifichi, la cache si aggiorna</li>
                  <li>• Versioning: Ogni modifica incrementa la versione per forzare aggiornamenti</li>
                  <li>• Fallback: Se offline, usa dati cached anche se scaduti</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Upload Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Caricamento Menu PDF</h2>
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <i className="fas fa-times text-lg md:text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {uploadStatus && (
                <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
                  <p className="text-green-800">{uploadStatus}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menuUploads.map((upload) => (
                  <div key={upload.language} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Menu {upload.language === 'it' ? 'Italiano' : 'English'}
                    </h3>

                    {upload.lastUpload && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Ultimo caricamento:</strong> {upload.lastUpload}
                        </p>
                        {upload.fileName && (
                          <p className="text-sm text-blue-600 mt-1">
                            File: {upload.fileName}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleziona file PDF
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(upload.language, e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>

                      <button
                        onClick={() => handleUpload(upload.language)}
                        disabled={!menuUploads.find(u => u.language === upload.language)?.file}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition duration-200"
                      >
                        Carica Menu {upload.language === 'it' ? 'Italiano' : 'Inglese'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Come Funziona</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Carica un PDF del menu per italiano o inglese</li>
                  <li>• Il sistema estrae automaticamente le voci del menu</li>
                  <li>• I dati vengono salvati e il sito si aggiorna in tempo reale</li>
                  <li>• Gli utenti vedranno il nuovo menu senza refresh</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Performance e Statistiche</h2>
                <button
                  onClick={() => setShowMetricsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <i className="fas fa-times text-lg md:text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Total Visits Tile */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visite Totali</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.totalVisits.toLocaleString()}</p>
                      <p className="text-sm text-green-600 mt-1">
                        <i className="fas fa-arrow-up mr-1"></i>
                        +12% questo mese
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-eye text-2xl text-blue-600"></i>
                    </div>
                  </div>
                  {/* Simple chart bars */}
                  <div className="mt-4 flex items-end space-x-1">
                    {[40, 60, 45, 80, 65, 90, 75].map((height, index) => (
                      <div key={index} className="flex-1">
                        <div 
                          className="bg-blue-200 rounded-t" 
                          style={{ height: `${height}%`, minHeight: '20px' }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Menu Views Tile */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visualizzazioni Menu</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.menuViews.toLocaleString()}</p>
                      <p className="text-sm text-green-600 mt-1">
                        <i className="fas fa-arrow-up mr-1"></i>
                        +8% questo mese
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-utensils text-2xl text-green-600"></i>
                    </div>
                  </div>
                  {/* Simple chart bars */}
                  <div className="mt-4 flex items-end space-x-1">
                    {[30, 50, 35, 70, 55, 80, 65].map((height, index) => (
                      <div key={index} className="flex-1">
                        <div 
                          className="bg-green-200 rounded-t" 
                          style={{ height: `${height}%`, minHeight: '20px' }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
                <h4 className="text-sm font-medium text-purple-800 mb-2">📊 Metriche in Tempo Reale</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Visite totali: Numero di sessioni uniche sul sito</li>
                  <li>• Visualizzazioni menu: Quante volte gli utenti hanno visto la sezione menu</li>
                  <li>• Dati aggiornati: Ogni azione dell'utente viene tracciata automaticamente</li>
                  <li>• Analytics: Integrazione con Firebase Analytics per insights dettagliati</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="success-animation mb-4">
              <div className="checkmark-circle">
                <div className="checkmark"></div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Salvato con Successo!</h3>
            <p className="text-gray-600">Le modifiche sono state applicate e il sito è stato aggiornato.</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900">Aggiornamento in corso...</h3>
            <p className="text-gray-600 mt-2">Stiamo salvando le tue modifiche.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;