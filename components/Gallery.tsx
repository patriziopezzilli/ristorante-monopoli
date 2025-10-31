import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

const galleryImages = [
  'https://www.ristorantemonopoli.com/assets/images/galleria_1.png',
  'https://www.ristorantemonopoli.com/assets/images/galleria_4.png',
  'https://www.ristorantemonopoli.com/assets/images/galleria_3.png',
  'https://www.ristorantemonopoli.com/assets/images/galleria_6.png',
  'https://www.ristorantemonopoli.com/assets/images/galleria_7.png',
  'https://www.ristorantemonopoli.com/assets/images/galleria_5.png',
];

const Gallery: React.FC = () => {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const prevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Auto-play ogni 4 secondi
  useEffect(() => {
    const interval = setInterval(nextImage, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="gallery" className="py-20 bg-white font-sans">
      <div className="w-full px-0 sm:px-4 lg:px-8">
        <div className="text-center mb-12 px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-black">{t('gallery.title')}</h2>
          <div className="w-20 h-0.5 bg-black mx-auto mt-4"></div>
        </div>
        
        <div className="relative w-full">
          {/* Fade gradients - solo su desktop */}
          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
          
          {/* Main carousel container - flat senza ombre e bordi */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {galleryImages.map((src, index) => (
                <div key={index} className="flex-shrink-0 w-full relative">
                  <img 
                    src={src} 
                    alt={`Gallery image ${index + 1}`} 
                    className="w-full h-64 md:h-80 object-cover"
                  />
                  <div className={`absolute inset-0 bg-black bg-opacity-20 transition-opacity duration-500 ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons - flat senza ombre */}
          <button
            onClick={prevImage}
            className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-black p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 z-20"
            disabled={isTransitioning}
          >
            <i className="fas fa-chevron-left text-base sm:text-lg"></i>
          </button>
          
          <button
            onClick={nextImage}
            className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-black p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 z-20"
            disabled={isTransitioning}
          >
            <i className="fas fa-chevron-right text-base sm:text-lg"></i>
          </button>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-6 space-x-2 px-4 sm:px-0">
            {galleryImages.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (isTransitioning) return;
                  setIsTransitioning(true);
                  setCurrentIndex(index);
                  setTimeout(() => setIsTransitioning(false), 500);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-black scale-125' 
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
