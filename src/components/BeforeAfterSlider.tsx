/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  title: string;
  location: string;
}

export default function BeforeAfterSlider({ before, after, title, location }: BeforeAfterSliderProps) {
  const isComposite = before === after;
  
  return (
    <div className="group space-y-4">
      <div className={`relative rounded-lg overflow-hidden shadow-2xl bg-brand-slate/50 w-full transition-all duration-300 ${isComposite ? 'border-3 border-brand-yellow/70 ring-2 ring-brand-yellow/40 shadow-2xl shadow-brand-yellow/20 group-hover:border-brand-yellow group-hover:ring-4 group-hover:ring-brand-yellow/60 group-hover:shadow-brand-yellow/40' : 'border border-white/10 group-hover:border-white/20'}`}>
        <div className="w-full pt-[56.25%] relative bg-gray-800">
          <div className="absolute inset-0">
            {isComposite ? (
              <img
                src={before}
                alt={title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <ReactCompareSlider
                itemOne={
                  <ReactCompareSliderImage 
                    src={before} 
                    alt="Before"
                    className="grayscale opacity-85 hover:opacity-90 transition-opacity" 
                    loading="lazy" 
                    decoding="async" 
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage 
                    src={after} 
                    alt="After"
                    loading="lazy" 
                    decoding="async" 
                  />
                }
                className="h-full w-full"
                position={50}
              />
            )}
            {isComposite && (
              <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-brand-yellow/95 backdrop-blur-md px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] uppercase tracking-widest text-brand-slate font-black border-2 border-brand-yellow rounded-sm pointer-events-none shadow-lg shadow-brand-yellow/40">
                Featured Photo
              </div>
            )}
            {!isComposite && (
              <>
                <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-brand-slate/90 backdrop-blur-md px-2 md:px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold border border-white/20 rounded-sm pointer-events-none">
                  Before
                </div>
                <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-brand-teal/90 backdrop-blur-md px-2 md:px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-widest text-white font-bold border border-white/20 rounded-sm pointer-events-none">
                  After
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-start pt-2 px-1">
        <div>
          <h4 className={`font-serif text-lg md:text-xl transition-all duration-300 truncate ${isComposite ? 'text-brand-yellow font-black group-hover:text-white tracking-wider' : 'text-white group-hover:text-brand-teal'}`}>{title}</h4>
          <p className={`uppercase tracking-[0.2em] font-bold mt-1 truncate transition-colors duration-300 ${isComposite ? 'text-[10px] md:text-[11px] text-brand-yellow/70 group-hover:text-brand-yellow' : 'text-[9px] md:text-[10px] text-white/40'}`}>{location}</p>
        </div>
      </div>
    </div>
  );
}
