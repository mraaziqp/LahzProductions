/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryCarouselProps {
  images: string[];
  title: string;
  location: string;
}

export default function GalleryCarousel({ images, title, location }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touchStartX.current = null;
  };

  return (
    <div className="group space-y-4">
      <div className="relative rounded-lg overflow-hidden shadow-2xl bg-brand-slate/50 w-full border border-white/10 group-hover:border-white/20 transition-all duration-300">
        <div className="w-full pt-[56.25%] relative bg-gray-800">
          <div
            className="absolute inset-0 select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              key={current}
              src={images[current]}
              alt={`${title} — photo ${current + 1} of ${images.length}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />

            {/* Counter badge */}
            <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-brand-slate/80 backdrop-blur-md px-2 md:px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold border border-white/20 rounded-sm pointer-events-none">
              {current + 1} / {images.length}
            </div>

            {/* Gallery badge */}
            <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-brand-teal/90 backdrop-blur-md px-2 md:px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold border border-white/20 rounded-sm pointer-events-none">
              Gallery
            </div>

            {/* Prev / Next arrows — always visible on mobile, hover-reveal on desktop */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-brand-slate/70 backdrop-blur-sm text-white border border-white/20 rounded-sm hover:bg-brand-teal transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-brand-slate/70 backdrop-blur-sm text-white border border-white/20 rounded-sm hover:bg-brand-teal transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dot indicators — always visible */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === current ? 'bg-brand-teal w-6' : 'bg-white/50 w-2 hover:bg-white/80'
                    }`}
                    aria-label={`Go to photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-start pt-2 px-1">
        <div>
          <h4 className="font-serif text-lg md:text-xl text-white group-hover:text-brand-teal transition-all duration-300 truncate">{title}</h4>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold mt-1 text-white/40 truncate">{location}</p>
        </div>
      </div>
    </div>
  );
}
