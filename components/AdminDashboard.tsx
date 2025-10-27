import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

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

  // Mock metrics
  const metrics = {
    totalVisits: 1250,
    menuViews: 340,
    contactForms: 15,
    averageRating: 4.8
  };

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

  const handleUpload = (language: 'it' | 'en') => {
    const upload = menuUploads.find(u => u.language === language);
    if (!upload?.file) {
      setUploadStatus('Seleziona un file prima di caricare');
      return;
    }

    // Simulate PDF parsing and menu extraction
    setUploadStatus('Analisi del PDF in corso...');
    
    setTimeout(() => {
      // Simulate PDF parsing - in real app, this would parse the actual PDF
      const extractedMenuData = extractMenuFromPDF(upload.file!, language);
      
      // Save to "database" (localStorage)
      const dbKey = `menuData_${language}`;
      localStorage.setItem(dbKey, JSON.stringify(extractedMenuData));
      
      // Update uploads
      const updatedUploads = menuUploads.map(u => 
        u.language === language 
          ? { ...u, file: null }
          : u
      );
      
      setMenuUploads(updatedUploads);
      localStorage.setItem('menuUploads', JSON.stringify(updatedUploads));
      setUploadStatus(`Menu ${language === 'it' ? 'italiano' : 'inglese'} estratto e salvato con successo!`);
      
      // Clear status after 5 seconds
      setTimeout(() => setUploadStatus(''), 5000);
    }, 2000); // Simulate processing time
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;