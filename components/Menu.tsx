import React, { useState, useEffect } from 'react';
import MenuModal from './MenuModal';
import { useI18n } from '../i18n/I18nContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase';
import { analyticsService } from '../src/analytics';

interface MenuItem {
  name: string;
  description: string;
  price: string;
}

const MenuCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="border-b border-gray-200 py-4 transition-transform duration-300 ease-in-out hover:scale-[1.03] cursor-pointer">
    <div className="flex justify-between items-baseline">
      <h4 className="text-xl font-medium text-gray-800">{item.name}</h4>
      <p className="text-lg font-semibold text-gray-700">{item.price}</p>
    </div>
    <p className="text-gray-600 mt-1">{item.description}</p>
  </div>
);

const Menu: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t, language } = useI18n();
  const [menuData, setMenuData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load menu data from Firebase Function
  useEffect(() => {
    const loadMenuData = async () => {
      setIsLoading(true);
      
      try {
        // Call Firebase Function to get menu data
        const getMenu = httpsCallable(functions, 'getMenu');
        const result = await getMenu({ language });
        setMenuData(result.data);
      } catch (error) {
        console.error('Error loading menu data:', error);
        // Fallback to defaults
        setMenuData(t('menu.data'));
      }
      
      setIsLoading(false);
    };

    loadMenuData();

    // Track menu view
    analyticsService.trackMenuView('menu_section');

    // Listen for menu updates
    const handleMenuUpdate = (event: CustomEvent) => {
      if (event.detail.language === language) {
        loadMenuData();
      }
    };

    window.addEventListener('menuUpdated', handleMenuUpdate as EventListener);

    return () => {
      window.removeEventListener('menuUpdated', handleMenuUpdate as EventListener);
    };
  }, [language, t]);

  const menuCategories = t('menu.categories');

  if (isLoading) {
    return (
      <section id="menu" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Caricamento menu...</p>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-gray-800">{t('menu.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mt-4"></div>
           <p className="mt-6 max-w-2xl mx-auto text-gray-600">
            {t('menu.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gray-800 hover:bg-black text-white font-semibold py-3 px-8 rounded-md text-base uppercase tracking-wider transition duration-300 ease-in-out transform hover:scale-105"
            >
              {t('menu.button')}
            </button>
            <a
              href="/menu.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-8 rounded-md text-base uppercase tracking-wider transition duration-300 ease-in-out transform hover:scale-105 border-2 border-gray-800"
            >
              OPEN PDF MENU
            </a>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-6">{menuCategories.antipasti}</h3>
            <div className="space-y-4">
              {menuData.antipasti.map((item: MenuItem, index: number) => <MenuCard key={index} item={item} />)}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-6">{menuCategories.primi}</h3>
             <div className="space-y-4">
              {menuData.primi.map((item: MenuItem, index: number) => <MenuCard key={index} item={item} />)}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-6">{menuCategories.secondi}</h3>
             <div className="space-y-4">
              {menuData.secondi.map((item: MenuItem, index: number) => <MenuCard key={index} item={item} />)}
            </div>
          </div>
        </div>
      </div>
      <MenuModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default Menu;
