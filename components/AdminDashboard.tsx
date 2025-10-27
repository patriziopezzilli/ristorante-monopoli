import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface MenuItem {
  name: string;
  description: string;
  price: string;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [menuData, setMenuData] = useState(t('menu.data'));
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  // Mock metrics
  const metrics = {
    totalVisits: 1250,
    menuViews: 340,
    contactForms: 15,
    averageRating: 4.8
  };

  const handleEditItem = (category: string, item: MenuItem, index: number) => {
    setEditingCategory(category);
    setEditingItem({ ...item });
  };

  const handleSaveItem = () => {
    if (editingCategory && editingItem) {
      const updatedMenu = { ...menuData };
      const categoryIndex = updatedMenu[editingCategory].findIndex(
        (item: MenuItem) => item.name === editingItem.name
      );
      if (categoryIndex !== -1) {
        updatedMenu[editingCategory][categoryIndex] = editingItem;
        setMenuData(updatedMenu);
        // In a real app, save to backend
        localStorage.setItem('menuData', JSON.stringify(updatedMenu));
      }
    }
    setEditingCategory(null);
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingItem(null);
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

        {/* Menu Management Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestione Menu</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              {Object.entries(menuData).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                    {t(`menu.categories.${category}`)}
                  </h3>
                  <div className="space-y-4">
                    {items.map((item: MenuItem, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        {editingCategory === category && editingItem?.name === item.name ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Nome
                              </label>
                              <input
                                type="text"
                                value={editingItem.name}
                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Descrizione
                              </label>
                              <input
                                type="text"
                                value={editingItem.description}
                                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Prezzo
                              </label>
                              <input
                                type="text"
                                value={editingItem.price}
                                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveItem}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                              >
                                Salva
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{item.name}</h4>
                              <p className="text-gray-600">{item.description}</p>
                              <p className="text-lg font-semibold text-gray-900">{item.price}</p>
                            </div>
                            <button
                              onClick={() => handleEditItem(category, item, index)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                            >
                              Modifica
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;