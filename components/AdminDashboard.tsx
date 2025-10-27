import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../src/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
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
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuUploads, setMenuUploads] = useState<MenuUpload[]>([
    { language: 'it', file: null, lastUpload: null, fileName: null },
    { language: 'en', file: null, lastUpload: null, fileName: null }
  ]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [contentLanguage, setContentLanguage] = useState<'it' | 'en'>('it');
  const [contentSection, setContentSection] = useState<string>('hero');
  const [contentKey, setContentKey] = useState<string>('title');
  const [contentValue, setContentValue] = useState<string>('');
  const [contentStatus, setContentStatus] = useState<string>('');

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
    menuViews: 0,
    contactForms: 0,
    averageRating: 4.8
  });

  // Load real metrics on component mount
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const realMetrics = await analyticsService.getMetrics();
        setMetrics({
          totalVisits: realMetrics.page_views || 0,
          menuViews: realMetrics.menu_views || 0,
          contactForms: realMetrics.contact_form_submissions || 0,
          averageRating: 4.8 // Keep mock rating for now
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

    // Simulate PDF parsing and menu extraction
    setUploadStatus('Analisi del PDF in corso...');
    
    try {
      // Convert file to base64
      const fileData = await fileToBase64(upload.file);
      
      // Call Firebase Function
      const processMenuPDF = httpsCallable(functions, 'processMenuPDF');
      const result = await processMenuPDF({ fileData, language });
      
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
      setUploadStatus('Errore nel caricamento del menu');
    }
  };

  const handleUpdateContent = async () => {
    if (!contentValue.trim()) {
      setContentStatus('Inserisci un valore');
      return;
    }

    try {
      const updateContentFn = httpsCallable(functions, 'updateContent');
      const result = await updateContentFn({
        language: contentLanguage,
        section: contentSection,
        key: contentKey,
        value: contentValue
      });

      // Invalidate cache for this language
      contentCache.invalidateCache(contentLanguage);

      // Track content edit
      analyticsService.trackContentEdit(contentSection, 'update');

      setContentStatus('Contenuto aggiornato con successo!');
      setTimeout(() => setContentStatus(''), 3000);
    } catch (error) {
      console.error('Error updating content:', error);
      setContentStatus('Errore nell\'aggiornamento del contenuto');
    }
  };

  const handleMigrateContent = async () => {
    try {
      const migrateContentFn = httpsCallable(functions, 'migrateContent');
      await migrateContentFn({});
      setContentStatus('Migrazione contenuti completata!');
      setTimeout(() => setContentStatus(''), 3000);
    } catch (error) {
      console.error('Error migrating content:', error);
      setContentStatus('Errore nella migrazione contenuti');
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
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
      <nav className="bg-white shadow-sm">
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
        {/* Metrics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Metriche</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-eye text-2xl text-blue-500"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Visite Totali
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.totalVisits}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-utensils text-2xl text-green-500"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Visualizzazioni Menu
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.menuViews}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-envelope text-2xl text-yellow-500"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Form Contatti
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.contactForms}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-star text-2xl text-purple-500"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Valutazione Media
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.averageRating}/5
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Upload Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Caricamento Menu PDF</h2>
          
          {uploadStatus && (
            <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
              <p className="text-green-800">{uploadStatus}</p>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
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
        {/* Content Management Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestione Contenuti Sito</h2>
          
          {contentStatus && (
            <div className="mb-4 p-4 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-blue-800">{contentStatus}</p>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-4">
                <button
                  onClick={handleMigrateContent}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md text-sm"
                >
                  Migra Contenuti (Prima volta)
                </button>
                <p className="text-sm text-gray-600 mt-2">Esegui una volta per migrare i contenuti esistenti su database</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lingua</label>
                  <select
                    value={contentLanguage}
                    onChange={(e) => setContentLanguage(e.target.value as 'it' | 'en')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sezione</label>
                  <select
                    value={contentSection}
                    onChange={(e) => setContentSection(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="nav">Navigazione</option>
                    <option value="hero">Hero</option>
                    <option value="about">About</option>
                    <option value="menu">Menu</option>
                    <option value="contact">Contatti</option>
                    <option value="footer">Footer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campo</label>
                  <input
                    type="text"
                    value={contentKey}
                    onChange={(e) => setContentKey(e.target.value)}
                    placeholder="es: title, subtitle"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valore</label>
                  <input
                    type="text"
                    value={contentValue}
                    onChange={(e) => setContentValue(e.target.value)}
                    placeholder="Nuovo testo"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateContent}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md text-sm"
              >
                Aggiorna Contenuto
              </button>

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
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;