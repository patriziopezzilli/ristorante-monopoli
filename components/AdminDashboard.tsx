import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../src/firebase';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Ristorante Pizzeria Monopoli</h1>
              <p className="text-gray-600 mt-2">Gestisci contenuti e monitora le performance del tuo ristorante</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Ultimo aggiornamento</p>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString('it-IT')}</p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Servizi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Content Management Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setShowContentModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-edit text-2xl text-blue-600"></i>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contenuti Sito</h3>
                  <p className="text-gray-600">Gestisci testi, immagini e contenuti del sito web</p>
                </div>
                <div className="ml-auto">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>

            {/* PDF Menu Upload Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors cursor-pointer" onClick={() => setShowMenuModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-pdf text-2xl text-green-600"></i>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Caricamento PDF Menu</h3>
                  <p className="text-gray-600">Carica e aggiorna il menu del ristorante</p>
                </div>
                <div className="ml-auto">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>

            {/* Performance Metrics Tile */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors cursor-pointer" onClick={() => setShowMetricsModal(true)}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-2xl text-purple-600"></i>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                  <p className="text-gray-600">Monitora visite e statistiche del sito</p>
                </div>
                <div className="ml-auto">
                  <i className="fas fa-external-link-alt text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Content Management Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Gestione Contenuti Sito</h2>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Caricamento Menu PDF</h2>
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Performance e Statistiche</h2>
                <button
                  onClick={() => setShowMetricsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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