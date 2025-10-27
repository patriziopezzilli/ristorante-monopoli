import React, { useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface MenuItem {
  name: string;
  description: string;
  price: string;
}

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuModal: React.FC<MenuModalProps> = ({ isOpen, onClose }) => {
  const mainContentRef = useRef<HTMLElement>(null);
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }
  
  const menuData = t('menu.data');
  const categoryTitles = t('menu.categories');
  
  const scrollToCategory = (e: React.MouseEvent<HTMLAnchorElement>, categoryId: string) => {
    e.preventDefault();
    const container = mainContentRef.current;
    if (container) {
      const section = container.querySelector(`#menu-category-${categoryId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'scale-in 0.3s forwards' }}
      >
        <header className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-20">
          <h2 className="text-2xl font-bold text-gray-800">{t('menu.modalTitle')}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 transition-colors text-3xl leading-none"
            aria-label="Close menu"
          >
            &times;
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden md:block w-1/4 border-r overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Categorie</h3>
            <nav>
              <ul>
                {Object.keys(menuData).map((category) => (
                  <li key={category}>
                    <a 
                      href={`#menu-category-${category}`}
                      onClick={(e) => scrollToCategory(e, category)}
                      className="block py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                      {categoryTitles[category] || category}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto p-6 md:p-8">
            {/* Top Navigation (Mobile) */}
            <div className="md:hidden mb-6 pb-4 border-b">
               <h3 className="text-lg font-semibold mb-3">Categorie</h3>
               <div className="flex flex-wrap gap-2">
                 {Object.keys(menuData).map((category) => (
                    <a 
                      key={category}
                      href={`#menu-category-${category}`}
                      onClick={(e) => scrollToCategory(e, category)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {categoryTitles[category] || category}
                    </a>
                  ))}
               </div>
            </div>

            <div className="space-y-10">
              {Object.keys(menuData).map((category) => (
                <div key={category} id={`menu-category-${category}`}>
                  <h3 className="text-2xl font-semibold text-gray-800 border-b-2 border-gray-200 pb-2 mb-6">
                    {categoryTitles[category] || category}
                  </h3>
                  <div className="space-y-4">
                    {menuData[category].map((item: MenuItem, index: number) => (
                      <div key={index} className="py-2">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xl font-medium text-gray-800">{item.name}</h4>
                          <p className="text-lg font-semibold text-gray-700">{item.price}</p>
                        </div>
                        <p className="text-gray-600 mt-1">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
       {/* Simple keyframe animation */}
      <style>{`
        @keyframes scale-in {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default MenuModal;
