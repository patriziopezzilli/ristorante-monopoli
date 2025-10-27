import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const galleryImages = [
  'https://picsum.photos/seed/dish1/500/500',
  'https://picsum.photos/seed/interior1/500/500',
  'https://picsum.photos/seed/dish2/500/500',
  'https://picsum.photos/seed/drink1/500/500',
  'https://picsum.photos/seed/dish3/500/500',
  'https://picsum.photos/seed/interior2/500/500',
];

const Gallery: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="gallery" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold uppercase tracking-wider text-gray-800">{t('gallery.title')}</h2>
          <div className="w-20 h-0.5 bg-gray-800 mx-auto mt-4"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((src, index) => (
            <div key={index} className="overflow-hidden rounded-lg shadow-lg group">
              <img 
                src={src} 
                alt={`Gallery image ${index + 1}`} 
                className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
