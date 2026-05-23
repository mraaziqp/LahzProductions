/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { uploadWipPhoto } from '../services/database';
import {
  Plus, Loader2, RefreshCw, Trash2, MessageCircle,
  ChevronDown, Camera, CheckCircle2, X, Check, Copy, Share2, Phone,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  client_phone: string | null;
  status: JobStatus;
  wip_image_url: string | null;
  latest_note: string | null;
  created_at: string;
}

interface JobEdit {
  status: JobStatus;
  note: string;
  phone: string;
  wipFile: File | null;
  wipPreview: string | null;
}

interface NewJobForm {
  client_name: string;
  item_description: string;
  client_phone: string;
  tracking_code: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: JobStatus[] = [
  'Scheduled',
  'Prepping/Stripping',
  'In Production',
  'Quality Check',
  'Ready for Delivery',
];

const STATUS_CHIP: Record<JobStatus, string> = {
  'Scheduled':           'bg-gray-100 text-gray-500',
  'Prepping/Stripping':  'bg-amber-50 text-amber-600',
  'In Production':       'bg-blue-50 text-blue-600',
  'Quality Check':       'bg-violet-50 text-violet-600',
  'Ready for Delivery':  'bg-teal-50 text-teal-600',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, JobEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState<NewJobForm>({
    client_name: '',
    item_description: '',
    client_phone: '',
    tracking_code: generateCode(),
  });

  // ── Data ────────────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('id, tracking_code, client_name, item_description, client_phone, status, wip_image_url, latest_note, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Expand / edit ────────────────────────────────────────────────────────────

  const toggleExpand = (job: Job) => {
    if (expandedId === job.id) { setExpandedId(null); return; }
    setExpandedId(job.id);
    if (!edits[job.id]) {
      setEdits(prev => ({
        ...prev,
        [job.id]: { status: job.status, note: job.latest_note ?? '', phone: job.client_phone ?? '', wipFile: null, wipPreview: null },
      }));
    }
  };

  const patchEdit = (jobId: string, patch: Partial<JobEdit>) =>
    setEdits(prev => ({ ...prev, [jobId]: { ...prev[jobId], ...patch } }));

  const handleWipChange = (jobId: string, file: File | null) => {
    if (!file) return;
    patchEdit(jobId, { wipFile: file, wipPreview: URL.createObjectURL(file) });
  };

  // ── Save update ──────────────────────────────────────────────────────────────

  const handleSaveJob = async (job: Job) => {
    const edit = edits[job.id];
    if (!edit) return;
    setSavingId(job.id);

    let wipUrl = job.wip_image_url;
    if (edit.wipFile) {
      try { wipUrl = await uploadWipPhoto(edit.wipFile, job.id); }
      catch { setSavingId(null); return; }
    }

    const { error } = await supabase.from('jobs').update({
      status: edit.status,
      latest_note: edit.note.trim() || null,
      wip_image_url: wipUrl,
      client_phone: edit.phone.trim() || null,
    }).eq('id', job.id);

    if (!error) {
      setJobs(prev => prev.map(j =>
        j.id === job.id
          ? { ...j, status: edit.status, latest_note: edit.note.trim() || null, wip_image_url: wipUrl, client_phone: edit.phone.trim() || null }
          : j
      ));
      setExpandedId(null);
    }
    setSavingId(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete job ${code}? This cannot be undone.`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (!error) {
      setJobs(prev => prev.filter(j => j.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  // ── Add job ──────────────────────────────────────────────────────────────────

  const handleAddJob = async () => {
    if (!form.client_name.trim() || !form.item_description.trim()) return;
    setAddLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        tracking_code: form.tracking_code,
        client_name: form.client_name.trim(),
        item_description: form.item_description.trim(),
        client_phone: form.client_phone.trim() || null,
        status: 'Scheduled',
      })
      .select().single();
    if (!error && data) {
      setJobs(prev => [data as Job, ...prev]);
      setForm({ client_name: '', item_description: '', client_phone: '', tracking_code: generateCode() });
      setAddOpen(false);
    }
    setAddLoading(false);
  };

  // ── Share ────────────────────────────────────────────────────────────────────

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Convert SA local number (0xx) to international format for wa.me URLs
  const toWaNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return '27' + digits.slice(1);
    return digits;
  };

  // Send initial tracking link — goes directly to client if phone is saved
  const openWhatsApp = (job: Job) => {
    const link = `${window.location.origin}/?track=${job.tracking_code}#track`;
    const msg =
      `Salaam/Hi ${job.client_name}! Your custom order with LAHZ Productions is in our system. ` +
      `You can track its live progress and see updates here: ${link}`;
    if (job.client_phone) {
      window.open(`https://wa.me/${toWaNumber(job.client_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Send a progress update message with current status + note
  const openWhatsAppUpdate = (job: Job, status: JobStatus, note: string) => {
    const link = `${window.location.origin}/?track=${job.tracking_code}#track`;
    let msg = `Salaam/Hi ${job.client_name}! Here's a progress update on your order (Code: ${job.tracking_code}):\n\n📌 Status: ${status}`;
    if (note.trim()) msg += `\n💬 Note: ${note.trim()}`;
    msg += `\n\nSee full updates here: ${link}`;
    if (job.client_phone) {
      window.open(`https://wa.me/${toWaNumber(job.client_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <header className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-serif text-brand-slate mb-2">Job Manager</h1>
          <p className="text-gray-500 text-sm">
            Create jobs, post live progress photos and notes, then share a tracking link with clients.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchJobs} className="h-11 w-11 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-brand-teal hover:border-brand-teal/40 transition-all rounded-sm" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 h-11 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm shadow-lg shadow-brand-teal/20">
            <Plus className="w-4 h-4" /> New Job
          </button>
        </div>
      </header>

      {/* How-to banner */}
      <div className="mb-4 p-5 bg-teal-50 border border-brand-teal/20 rounded-sm flex items-start gap-4">
        <Share2 className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-teal mb-1">How to send a tracking link to a client</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Click <strong className="text-brand-teal">New Job</strong> → fill in the client's name and item → <strong className="text-brand-teal">Create Job</strong> → tap the <strong className="text-green-600">WhatsApp button</strong> to send them a direct tracking link. The client does not need to log in — they just click the link to see their job's live status.
          </p>
        </div>
      </div>
      <div className="mb-8 p-5 bg-amber-50 border border-amber-200/60 rounded-sm flex items-start gap-4">
        <Camera className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">How to update progress during the job</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Click anywhere on a job card to expand it → change the <strong className="text-amber-600">Status</strong> to the current stage → (optional) type a <strong className="text-amber-600">note</strong> and upload a <strong className="text-amber-600">progress photo</strong> → click <strong className="text-amber-600">Save Update</strong>. The client's tracking page updates instantly.
          </p>
        </div>
      </div>

      {/* ── Add Job Modal ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <p className="text-xs text-gray-400 mb-8">Fill in the client's details. The tracking code is auto-generated — share it with them after saving.</p>

              {/* Code preview */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-sm">
                <span className="flex-1 font-mono font-bold tracking-[0.3em] text-brand-teal text-lg">{form.tracking_code}</span>
                <button onClick={() => setForm(f => ({ ...f, tracking_code: generateCode() }))} className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-brand-teal transition-all">
                  Regenerate
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Client Name</label>
                  <input type="text" placeholder="e.g. Fatima Moosa" value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddJob()}
                    className="h-12 px-4 border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm text-brand-slate rounded-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Item Description</label>
                  <input type="text" placeholder="e.g. 3-Seater Grey Couch Restoration" value={form.item_description}
                    onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))}
                    className="h-12 px-4 border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm text-brand-slate rounded-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> WhatsApp Number
                    <span className="normal-case font-normal text-gray-300 tracking-normal">(optional — enables direct send)</span>
                  </label>
                  <input type="tel" placeholder="e.g. 0821234567 or 27821234567" value={form.client_phone}
                    onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                    className="h-12 px-4 border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm text-brand-slate rounded-sm font-mono" />
                  <p className="text-[10px] text-gray-300 leading-relaxed">If you add the number, WhatsApp buttons will open a direct chat with this client. Start with 0 (SA local) or 27 (international). No spaces needed.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setAddOpen(false)} className="flex-1 h-12 border border-gray-200 text-sm font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 transition-all rounded-sm">Cancel</button>
                <button onClick={handleAddJob} disabled={!form.client_name.trim() || !form.item_description.trim() || addLoading}
                  className="flex-1 h-12 bg-brand-teal text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2">
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
          <p className="text-xs uppercase tracking-widest font-bold text-gray-300">No jobs yet — click "New Job" to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job, i) => {
            const edit = edits[job.id];
            const isExpanded = expandedId === job.id;
            const isSaving = savingId === job.id;
            const previewSrc = edit?.wipPreview ?? job.wip_image_url;

            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white border border-gray-100 rounded-sm shadow-sm overflow-hidden">

                {/* Compact row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Tracking code */}
                  <button onClick={() => copyCode(job.tracking_code)} title="Click to copy"
                    className="flex items-center gap-2 font-mono font-bold tracking-[0.2em] text-brand-teal text-sm bg-teal-50 px-3 py-2 rounded-sm hover:bg-teal-100 transition-all flex-shrink-0 w-fit">
                    {job.tracking_code}
                    {copiedCode === job.tracking_code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 opacity-50" />}
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-brand-slate truncate">{job.client_name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{job.item_description}</p>
                    {job.client_phone && (
                      <p className="text-[10px] text-gray-300 truncate mt-0.5 font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />{job.client_phone}
                      </p>
                    )}
                  </div>

                  {/* Status chip (desktop) */}
                  <span className={`hidden sm:inline-flex items-center px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm flex-shrink-0 ${STATUS_CHIP[job.status]}`}>
                    {job.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openWhatsApp(job)} title="Send tracking link via WhatsApp"
                      className="flex items-center gap-1.5 h-9 px-3 bg-green-500 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-green-600 transition-all rounded-sm shadow-sm shadow-green-500/20">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                    <button onClick={() => toggleExpand(job)}
                      className={`flex items-center gap-1.5 h-9 px-3 text-[10px] uppercase tracking-widest font-bold transition-all rounded-sm border ${isExpanded ? 'bg-brand-slate text-white border-brand-slate' : 'border-gray-200 text-gray-500 hover:border-brand-teal/40 hover:text-brand-teal'}`}>
                      {isExpanded ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Close' : 'Update'}
                    </button>
                    <button onClick={() => handleDelete(job.id, job.tracking_code)}
                      className="h-9 w-9 flex items-center justify-center text-gray-200 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all rounded-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable update panel */}
                <AnimatePresence>
                  {isExpanded && edit && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-5 sm:p-6 bg-gray-50/60 grid sm:grid-cols-2 gap-5">

                        {/* Status + Note */}
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Update Status</label>
                            <select value={edit.status} onChange={e => patchEdit(job.id, { status: e.target.value as JobStatus })}
                              className="h-11 px-3 border border-gray-200 bg-white rounded-sm text-sm font-bold text-brand-slate focus:border-brand-teal outline-none transition-all">
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" /> WhatsApp Number
                              <span className="normal-case font-normal text-gray-300 tracking-normal">(optional)</span>
                            </label>
                            <input type="tel" value={edit.phone}
                              onChange={e => patchEdit(job.id, { phone: e.target.value })}
                              placeholder="e.g. 0821234567 or 27821234567"
                              className="h-11 px-3 border border-gray-200 bg-white rounded-sm text-sm text-brand-slate focus:border-brand-teal outline-none transition-all font-mono placeholder:text-gray-300" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                              Quick Note <span className="normal-case text-gray-300">(visible to client)</span>
                            </label>
                            <textarea value={edit.note} onChange={e => patchEdit(job.id, { note: e.target.value })}
                              placeholder='e.g. "Fabric arrived, starting the cut!"'
                              rows={3}
                              className="px-3 py-2.5 border border-gray-200 bg-white rounded-sm text-sm text-brand-slate focus:border-brand-teal outline-none transition-all resize-none placeholder:text-gray-300 leading-relaxed" />
                          </div>
                        </div>

                        {/* WIP Photo */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                            Progress Photo <span className="normal-case text-gray-300">(optional)</span>
                          </label>
                          <div className="relative aspect-video bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
                            {previewSrc ? (
                              <img src={previewSrc} alt="Work in progress" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <Camera className="w-8 h-8 text-gray-300" />
                                <p className="text-[10px] uppercase tracking-widest text-gray-300 font-bold">No photo yet</p>
                              </div>
                            )}
                            <label htmlFor={`wip-${job.id}`}
                              className="absolute bottom-2 right-2 h-8 px-3 bg-white/90 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold text-brand-slate hover:bg-brand-teal hover:text-white transition-all rounded-sm shadow-sm flex items-center gap-1.5 border border-white cursor-pointer">
                              <Camera className="w-3.5 h-3.5" />
                              {previewSrc ? 'Replace' : 'Upload'}
                            </label>
                          </div>
                          <input id={`wip-${job.id}`} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={e => handleWipChange(job.id, e.target.files?.[0] ?? null)} />
                          {edit.wipFile && (
                            <p className="text-[10px] text-brand-teal font-bold">✓ New photo ready — will upload on save</p>
                          )}
                        </div>

                        {/* Save + WhatsApp footer */}
                        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200">
                          <button onClick={() => handleSaveJob(job)} disabled={isSaving}
                            className="flex-1 h-12 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-brand-teal/20">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {isSaving ? 'Saving…' : 'Save Update'}
                          </button>
                          <button onClick={() => openWhatsAppUpdate(job, edit.status, edit.note)}
                            title={job.client_phone ? `Send update directly to ${job.client_phone}` : 'Send update via WhatsApp (pick contact)'}
                            className="sm:w-auto h-12 px-6 bg-green-500 text-white text-xs uppercase tracking-widest font-bold hover:bg-green-600 transition-all rounded-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                            <MessageCircle className="w-4 h-4" />
                            {job.client_phone ? 'Send Update' : 'Send to WhatsApp'}
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
