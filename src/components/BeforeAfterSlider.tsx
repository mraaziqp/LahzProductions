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
      <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-brand-slate/50 w-full">
        <div className="w-full pt-[56.25%] relative bg-gray-800">
          <div className="absolute inset-0">
            <ReactCompareSlider
              itemOne={
                <ReactCompareSliderImage 
                  src={before} 
                  alt={isComposite ? title : 'Before'}
                  className={isComposite ? 'brightness-90' : 'grayscale opacity-85 hover:opacity-90 transition-opacity'} 
                  loading="lazy" 
                  decoding="async" 
                />
              }
              itemTwo={
                <ReactCompareSliderImage 
                  src={after} 
                  alt={isComposite ? title : 'After'}
                  loading="lazy" 
                  decoding="async" 
                />
              }
              className="h-full w-full"
              position={50}
            />
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
          <h4 className="font-serif text-lg md:text-xl text-white group-hover:text-brand-teal transition-colors truncate">{title}</h4>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mt-1 truncate">{location}</p>
        </div>
      </div>
    </div>
  );
}
