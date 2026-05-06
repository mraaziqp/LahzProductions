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
  return (
    <div className="group space-y-4">
      <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-brand-slate/50">
        <ReactCompareSlider
          itemOne={<ReactCompareSliderImage src={before} alt="Before" className="grayscale opacity-80" loading="lazy" decoding="async" />}
          itemTwo={<ReactCompareSliderImage src={after} alt="After" loading="lazy" decoding="async" />}
          className="h-full w-full"
        />
        <div className="absolute top-4 left-4 bg-brand-slate/80 backdrop-blur-md px-3 py-1 text-[10px] uppercase tracking-widest text-white font-bold border border-white/10">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-brand-teal/80 backdrop-blur-md px-3 py-1 text-[10px] uppercase tracking-widest text-white font-bold border border-white/10">
          After
        </div>
      </div>
      <div className="flex justify-between items-start pt-2">
        <div>
          <h4 className="font-serif text-xl text-white group-hover:text-brand-teal transition-colors">{title}</h4>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mt-1">{location}</p>
        </div>
      </div>
    </div>
  );
}
