/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Plus, Loader2, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';

type JobStatus = 'Scheduled' | 'In Progress' | 'Quality Check' | 'Ready for Delivery';

interface Job {
  id: string;
  tracking_code: string;
  client_name: string;
  item_description: string;
  status: JobStatus;
  created_at: string;
}

const STATUS_OPTIONS: JobStatus[] = [
  'Scheduled',
  'In Progress',
  'Quality Check',
  'Ready for Delivery',
];

const STATUS_COLORS: Record<JobStatus, string> = {
  'Scheduled':          'bg-gray-100 text-gray-500',
  'In Progress':        'bg-blue-50 text-blue-600',
  'Quality Check':      'bg-amber-50 text-amber-600',
  'Ready for Delivery': 'bg-teal-50 text-brand-teal',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface NewJobForm {
  client_name: string;
  item_description: string;
  tracking_code: string;
}

export default function JobManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);  // job id being updated
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState<NewJobForm>({
    client_name: '',
    item_description: '',
    tracking_code: generateCode(),
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('id, tracking_code, client_name, item_description, status, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleStatusChange = async (id: string, status: JobStatus) => {
    setSaving(id);
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (!error) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
    }
    setSaving(null);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete job ${code}? This cannot be undone.`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (!error) setJobs(prev => prev.filter(j => j.id !== id));
  };

  const handleAddJob = async () => {
    if (!form.client_name.trim() || !form.item_description.trim()) return;
    setAddLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        tracking_code: form.tracking_code,
        client_name: form.client_name.trim(),
        item_description: form.item_description.trim(),
        status: 'Scheduled',
      })
      .select()
      .single();

    if (!error && data) {
      setJobs(prev => [data as Job, ...prev]);
      setForm({ client_name: '', item_description: '', tracking_code: generateCode() });
      setAddOpen(false);
    }
    setAddLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl">
      <header className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-serif text-brand-slate mb-2">Job Manager</h1>
          <p className="text-gray-500 text-sm">
            Create jobs, share tracking codes with clients, and update progress in real time.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchJobs}
            className="h-11 w-11 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-brand-teal hover:border-brand-teal/40 transition-all rounded-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 h-11 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm shadow-lg shadow-brand-teal/20"
          >
            <Plus className="w-4 h-4" /> New Job
          </button>
        </div>
      </header>

      {/* ── Add Job Modal ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setAddOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
              className="bg-white w-full max-w-md p-8 shadow-2xl rounded-sm"
            >
              <h2 className="text-2xl font-serif text-brand-slate mb-1">New Job</h2>
              <p className="text-xs text-gray-400 mb-8">
                A tracking code is auto-generated. Share it with the client once saved.
              </p>

              {/* Tracking code preview */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-sm">
                <span className="flex-1 font-mono font-bold tracking-[0.3em] text-brand-teal text-lg">
                  {form.tracking_code}
                </span>
                <button
                  onClick={() => setForm(f => ({ ...f, tracking_code: generateCode() }))}
                  className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-brand-teal transition-all"
                >
                  Regenerate
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Johnson"
                    value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="h-12 px-4 border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm text-brand-slate rounded-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    Item Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3-Seater Grey Couch Restoration"
                    value={form.item_description}
                    onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))}
                    className="h-12 px-4 border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm text-brand-slate rounded-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setAddOpen(false)}
                  className="flex-1 h-12 border border-gray-200 text-sm font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 transition-all rounded-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddJob}
                  disabled={!form.client_name.trim() || !form.item_description.trim() || addLoading}
                  className="flex-1 h-12 bg-brand-teal text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Job
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Jobs List ── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-sm p-16 text-center">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-300">
            No jobs yet — click "New Job" to get started
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-brand-teal/20 transition-all group rounded-sm shadow-sm"
            >
              {/* Tracking code pill + copy */}
              <button
                onClick={() => copyCode(job.tracking_code)}
                className="flex items-center gap-2 font-mono font-bold tracking-[0.2em] text-brand-teal text-sm bg-teal-50 px-3 py-2 rounded-sm hover:bg-teal-100 transition-all flex-shrink-0"
                title="Click to copy"
              >
                {job.tracking_code}
                {copiedCode === job.tracking_code ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-50" />
                )}
              </button>

              {/* Job details */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-brand-slate truncate">{job.client_name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{job.item_description}</p>
              </div>

              {/* Status dropdown */}
              <div className="relative flex items-center gap-2 flex-shrink-0">
                {saving === job.id && (
                  <Loader2 className="w-3.5 h-3.5 text-brand-teal animate-spin" />
                )}
                <select
                  value={job.status}
                  onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                  disabled={saving === job.id}
                  className={`h-9 pl-3 pr-8 text-[11px] uppercase tracking-widest font-bold border-0 rounded-sm outline-none appearance-none cursor-pointer transition-all disabled:opacity-60 ${STATUS_COLORS[job.status]}`}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {/* Custom chevron */}
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-50 text-xs">▾</span>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(job.id, job.tracking_code)}
                className="h-9 w-9 flex items-center justify-center text-gray-200 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all rounded-sm flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
