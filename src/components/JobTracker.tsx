/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Fragment } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import {
  Search, CheckCircle2, Loader2,
  Clock, Scissors, Wrench, ShieldCheck, PackageCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus =
  | 'Scheduled'
  | 'Prepping/Stripping'
  | 'In Production'
  | 'Quality Check'
  | 'Ready for Delivery';

interface Job {
  id: string;
  tracking_code: string;
  client_name: string;
  item_description: string;
  status: JobStatus;
  wip_image_url: string | null;
  latest_note: string | null;
}

interface Step {
  value: JobStatus;
  label: string;
  icon: FC<{ className?: string }>;
  description: string;
}

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  { value: 'Scheduled',          label: 'Scheduled',     icon: Clock,        description: 'Job booked and in the queue.'           },
  { value: 'Prepping/Stripping', label: 'Prepping',      icon: Scissors,     description: 'Item stripped, materials prepared.'     },
  { value: 'In Production',      label: 'In Production', icon: Wrench,       description: 'Our craftsmen are actively working.'    },
  { value: 'Quality Check',      label: 'Quality Check', icon: ShieldCheck,  description: 'Final inspection for perfect finish.'   },
  { value: 'Ready for Delivery', label: 'Ready',         icon: PackageCheck, description: 'Complete and ready for collection.'     },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobTracker({ initialCode }: { initialCode?: string }) {
  // Read code from URL param as a self-contained fallback
  const urlCode = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('track') ?? undefined)
    : undefined;

  const [code, setCode] = useState((initialCode ?? urlCode)?.toUpperCase() ?? '');
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (overrideCode?: string) => {
    const trimmed = (overrideCode ?? code).trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setJob(null);

    const { data, error: dbError } = await supabase
      .from('jobs')
      .select('id, tracking_code, client_name, item_description, status, wip_image_url, latest_note')
      .eq('tracking_code', trimmed)
      .single();

    if (dbError || !data) {
      setError('No job found with that tracking code. Please double-check and try again.');
    } else {
      setJob(data as Job);
    }
    setLoading(false);
  };

  // Auto-search on mount when a code is pre-supplied
  useEffect(() => {
    const initial = (initialCode ?? urlCode)?.trim().toUpperCase();
    if (initial) handleTrack(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentIndex = job ? STEPS.findIndex(s => s.value === job.status) : -1;
  const hasUpdate = job && (job.wip_image_url || job.latest_note);

  return (
    <div className="max-w-xl mx-auto w-full">

      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          maxLength={10}
          placeholder="Enter your tracking code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && !loading && handleTrack()}
          className="flex-1 h-14 px-5 border-2 border-gray-200 bg-white focus:border-brand-teal outline-none transition-all text-sm font-mono font-bold tracking-[0.25em] text-brand-slate placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 rounded-sm"
        />
        <button
          onClick={() => handleTrack()}
          disabled={loading || !code.trim()}
          className="h-14 px-8 bg-brand-teal text-white font-bold uppercase tracking-widest text-xs hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 shadow-lg shadow-brand-teal/20 flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* Error state */}
        {error && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center py-6 px-8 border border-red-100 bg-red-50/50 rounded-sm">
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <p className="text-xs text-red-400 mt-1">Contact us on WhatsApp if you need help locating your code.</p>
          </motion.div>
        )}

        {/* Result */}
        {job && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="space-y-4">

            {/* Job header */}
            <div className="bg-white border border-gray-100 p-6 shadow-sm rounded-sm">
              <p className="text-[10px] uppercase tracking-widest text-brand-teal font-bold mb-2">
                Tracking #{job.tracking_code}
              </p>
              <h4 className="text-xl font-serif text-brand-slate mb-1">{job.client_name}</h4>
              <p className="text-sm text-gray-500">{job.item_description}</p>
            </div>

            {/* Progress stepper */}
            <div className="bg-white border border-gray-100 p-6 md:p-8 shadow-sm rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-400 mb-8">Job Progress</p>

              {/* ── DESKTOP: horizontal ── */}
              <div className="hidden md:flex items-start w-full">
                {STEPS.map((step, index) => {
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const Icon = step.icon;
                  return (
                    <Fragment key={step.value}>
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: '80px' }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCurrent  ? 'bg-brand-teal shadow-lg shadow-brand-teal/30 ring-4 ring-brand-teal/20'
                          : isCompleted ? 'bg-brand-teal/20'
                          : 'bg-gray-100'
                        }`}>
                          {isCompleted
                            ? <CheckCircle2 className="w-5 h-5 text-brand-teal" />
                            : <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-300'}`} />
                          }
                        </div>
                        <p className={`text-[10px] font-bold mt-2 text-center leading-tight ${
                          isCurrent ? 'text-brand-teal' : isCompleted ? 'text-brand-teal/60' : 'text-gray-300'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mt-5 transition-all duration-500 ${
                          isCompleted ? 'bg-brand-teal/40' : 'bg-gray-100'
                        }`} />
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* Current step description (desktop) */}
              {currentIndex >= 0 && (
                <p className="hidden md:block text-xs text-gray-400 mt-5 text-center">
                  {STEPS[currentIndex].description}
                </p>
              )}

              {/* ── MOBILE: vertical ── */}
              <div className="md:hidden">
                {STEPS.map((step, index) => {
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const isLast = index === STEPS.length - 1;
                  const Icon = step.icon;
                  return (
                    <motion.div key={step.value}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.4 }}>
                      <div className="flex gap-4 items-start">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isCurrent  ? 'bg-brand-teal shadow-lg shadow-brand-teal/30 ring-4 ring-brand-teal/20'
                            : isCompleted ? 'bg-brand-teal/20'
                            : 'bg-gray-100'
                          }`}>
                            {isCompleted
                              ? <CheckCircle2 className="w-5 h-5 text-brand-teal" />
                              : <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-300'}`} />
                            }
                          </div>
                          {!isLast && (
                            <div className={`w-px flex-1 min-h-[2rem] mt-1 transition-all ${
                              isCompleted || isCurrent ? 'bg-brand-teal/30' : 'bg-gray-100'
                            }`} />
                          )}
                        </div>
                        <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                          <p className={`font-bold text-sm ${
                            isCurrent ? 'text-brand-teal' : isCompleted ? 'text-brand-slate' : 'text-gray-300'
                          }`}>
                            {step.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${
                            isCurrent ? 'text-brand-slate' : isCompleted ? 'text-gray-400' : 'text-gray-200'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Latest Update card */}
            <AnimatePresence>
              {hasUpdate && (
                <motion.div key="update"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white border border-brand-teal/20 shadow-sm rounded-sm overflow-hidden">

                  {/* Card header */}
                  <div className="px-6 py-4 bg-brand-teal/5 border-b border-brand-teal/10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-teal">
                      Latest Update from LAHZ Productions
                    </p>
                  </div>

                  {/* Card body */}
                  <div className="p-6 flex flex-col sm:flex-row gap-5">
                    {job.wip_image_url && (
                      <div className="sm:w-48 w-full aspect-video sm:aspect-square flex-shrink-0 rounded-sm overflow-hidden bg-gray-100">
                        <img
                          src={job.wip_image_url}
                          alt="Work in progress"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {job.latest_note && (
                      <div className="flex flex-col justify-center">
                        <svg className="w-6 h-6 text-brand-teal/30 mb-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                        </svg>
                        <p className="text-brand-slate font-serif text-lg italic leading-relaxed">
                          {job.latest_note}
                        </p>
                        <p className="text-xs text-brand-teal font-bold uppercase tracking-widest mt-3">
                          — Moulana @ LAHZ Productions
                        </p>
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
