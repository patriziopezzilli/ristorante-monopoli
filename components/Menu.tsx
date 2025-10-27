import React, { useState } from 'react';
import MenuModal from './MenuModal';
import { useI18n } from '../i18n/I18nContext';

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
  const { t } = useI18n();

  const menuData = t('menu.data');
  const menuCategories = t('menu.categories');

  return (
    <section id="menu" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-gray-800">{t('menu.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mt-4"></div>
           <p className="mt-6 max-w-2xl mx-auto text-gray-600">
            {t('menu.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-lg text-base uppercase tracking-wider transition duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              {t('menu.pdfButton')}
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
