/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { uploadWipPhoto, fetchQuoteRequests, sendQuoteToClient, adminDeclineQuote, QuoteRequest } from '../services/database';
import { SITE_URL } from '../constants';
import { reserveTab, waLink } from '../lib/whatsapp';
import {
  Plus, Loader2, RefreshCw, Trash2, MessageCircle,
  ChevronDown, Camera, CheckCircle2, X, Check, Copy, Share2, Phone,
  Clock, BadgeCheck, XCircle, AlertCircle,
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

const QUOTE_BADGE: Record<QuoteRequest['status'], { label: string; cls: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-600',  icon: <Clock className="w-3 h-3" /> },
  quoted:   { label: 'Quoted',   cls: 'bg-blue-50 text-blue-600',    icon: <MessageCircle className="w-3 h-3" /> },
  accepted: { label: 'Accepted', cls: 'bg-teal-50 text-teal-600',    icon: <BadgeCheck className="w-3 h-3" /> },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-500',      icon: <XCircle className="w-3 h-3" /> },
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : (err as { message?: string })?.message) || 'Unknown error';

// ─── Component ───────────────────────────────────────────────────────────────

interface JobManagerProps {
  tab: 'jobs' | 'quotes';
  onTabChange: (tab: 'jobs' | 'quotes') => void;
  onQuoteCountChange?: (count: number) => void;
}

export default function JobManager({ tab: activeTab, onTabChange, onQuoteCountChange }: JobManagerProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, JobEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // Quotes tab state
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [quoteEdits, setQuoteEdits] = useState<Record<string, { price: string; note: string }>>({});
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);
  const [decliningQuoteId, setDecliningQuoteId] = useState<string | null>(null);
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [convertedQuoteJobs, setConvertedQuoteJobs] = useState<Record<string, string>>({});
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
    if (error) setError(`Could not load jobs (${error.message}).`);
    else setJobs(data as Job[]);
    setLoading(false);
  }, []);

  const loadQuotes = useCallback(async () => {
    setQuotesLoading(true);
    setQuotesError(null);
    try {
      setQuotes(await fetchQuoteRequests());
      setQuotesLoaded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setQuotesError(`Could not load quote requests (${msg}).`);
    }
    setQuotesLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { if (activeTab === 'quotes') loadQuotes(); }, [activeTab, loadQuotes]);

  const pendingCount = quotes.filter(q => q.status === 'pending').length;
  useEffect(() => { if (quotesLoaded) onQuoteCountChange?.(pendingCount); }, [pendingCount, quotesLoaded, onQuoteCountChange]);

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

    setError(null);
    let wipUrl = job.wip_image_url;
    if (edit.wipFile) {
      try { wipUrl = await uploadWipPhoto(edit.wipFile, job.id); }
      catch (err) { setError(`Photo upload failed (${errorText(err)}). Nothing was saved.`); setSavingId(null); return; }
    }

    const { error } = await supabase.from('jobs').update({
      status: edit.status,
      latest_note: edit.note.trim() || null,
      wip_image_url: wipUrl,
      client_phone: edit.phone.trim() || null,
    }).eq('id', job.id);

    if (error) {
      setError(`Could not save the update (${error.message}).`);
    } else {
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
    if (error) {
      setError(`Could not delete job ${code} (${error.message}).`);
    } else {
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
    if (error) {
      setError(error.code === '23505'
        ? 'That tracking code is already in use — click Regenerate and try again.'
        : `Could not create the job (${error.message}).`);
    } else {
      setJobs(prev => [data as Job, ...prev]);
      setForm({ client_name: '', item_description: '', client_phone: '', tracking_code: generateCode() });
      setAddOpen(false);
      setError(null);
    }
    setAddLoading(false);
  };

  // ── Share ────────────────────────────────────────────────────────────────────

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const trackingLink = (code: string) => `${SITE_URL}/?track=${code}#track`;

  // Send initial tracking link — goes directly to client if phone is saved
  const openWhatsApp = (job: Job) => {
    const msg =
      `Salaam/Hi ${job.client_name}! Your custom order with LAHZ Productions is in our system. ` +
      `You can track its live progress and see updates here: ${trackingLink(job.tracking_code)}`;
    window.open(waLink(msg, job.client_phone), '_blank', 'noreferrer');
  };

  // Send a progress update message with current status + note
  const openWhatsAppUpdate = (job: Job, status: JobStatus, note: string) => {
    let msg = `Salaam/Hi ${job.client_name}! Here's a progress update on your order (Code: ${job.tracking_code}):\n\n📌 Status: ${status}`;
    if (note.trim()) msg += `\n💬 Note: ${note.trim()}`;
    msg += `\n\nSee full updates here: ${trackingLink(job.tracking_code)}`;
    window.open(waLink(msg, job.client_phone), '_blank', 'noreferrer');
  };

  // ── Convert accepted quote to job ─────────────────────────────────────────────

  const handleConvertToJob = async (q: QuoteRequest) => {
    setConvertingQuoteId(q.id);
    const trackingCode = generateCode();
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        tracking_code: trackingCode,
        client_name: q.client_name,
        item_description: q.item_description ?? q.service_category ?? 'Upholstery Job',
        client_phone: q.client_phone || null,
        status: 'Scheduled',
      })
      .select()
      .single();
    if (error) {
      setError(`Could not create a job from this quote (${error.message}).`);
    } else {
      setJobs(prev => [data as Job, ...prev]);
      setConvertedQuoteJobs(prev => ({ ...prev, [q.id]: trackingCode }));
      setExpandedQuoteId(null);
      onTabChange('jobs');
    }
    setConvertingQuoteId(null);
  };

  // ── Decline quote (admin side) ───────────────────────────────────────────────

  const handleDeclineQuote = async (q: QuoteRequest) => {
    setDeclineConfirmId(null);
    setDecliningQuoteId(q.id);
    try {
      await adminDeclineQuote(q.id);
      setQuotes(prev => prev.map(r => r.id === q.id ? { ...r, status: 'declined' } : r));
    } catch (err) {
      setError(`Could not decline the quote (${errorText(err)}).`);
    }
    setDecliningQuoteId(null);
  };

  const openDeclineNotify = (q: QuoteRequest) => {
    const msg =
      `Good day ${q.client_name}, thank you for reaching out to LAHZ Productions. ` +
      `After careful consideration, we regret to inform you that we are unable to accommodate your request at this time. ` +
      `We apologise for any inconvenience caused and wish you well.`;
    window.open(waLink(msg, q.client_phone), '_blank', 'noreferrer');
  };

  // ── Send priced quote to client ──────────────────────────────────────────────

  const handleSendQuote = async (q: QuoteRequest) => {
    const edit = quoteEdits[q.id];
    if (!edit?.price.trim()) return;
    const tab = reserveTab();
    setSendingQuoteId(q.id);
    setError(null);
    try {
      await sendQuoteToClient(q.id, edit.price.trim(), edit.note.trim());
      const link = `${SITE_URL}/?quote=${q.quote_code}`;
      const msg =
        `Salaam/Hi ${q.client_name}! 🎉 Your quote from LAHZ Productions is ready.\n\n` +
        `📦 Item: ${q.item_description}\n` +
        `💰 Price: ${edit.price.trim()}\n` +
        (edit.note.trim() ? `📝 Note: ${edit.note.trim()}\n` : '') +
        `\nTap the link below to accept or decline your quote:\n${link}`;
      const url = waLink(msg, q.client_phone);
      if (!tab.go(url)) window.location.href = url;
      setQuotes(prev => prev.map(r => r.id === q.id ? { ...r, status: 'quoted', quoted_price: edit.price.trim(), admin_note: edit.note.trim() } : r));
      setExpandedQuoteId(null);
    } catch (err) {
      tab.cancel();
      setError(`Could not save the quote (${errorText(err)}). The client was not messaged.`);
    }
    setSendingQuoteId(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-serif text-brand-slate mb-2">{activeTab === 'jobs' ? 'Job Manager' : 'Quote Requests'}</h1>
          <p className="text-gray-500 text-sm">
            {activeTab === 'jobs'
              ? 'Create jobs, post live progress photos and notes, then share a tracking link with clients.'
              : 'Price incoming requests and send them to the client on WhatsApp. Accepted quotes can be turned into jobs.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => (activeTab === 'jobs' ? fetchJobs() : loadQuotes())} className="h-11 w-11 flex items-center justify-center border border-gray-200 text-gray-400 hover:text-brand-teal hover:border-brand-teal/40 transition-all rounded-sm" title="Refresh" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'jobs' && (
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 h-11 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm shadow-lg shadow-brand-teal/20">
              <Plus className="w-4 h-4" /> New Job
            </button>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {activeTab === 'jobs' && (<>

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
                    <button onClick={() => handleDelete(job.id, job.tracking_code)} aria-label={`Delete job ${job.tracking_code}`}
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

      </>)} {/* end activeTab === 'jobs' */}

      {/* ── QUOTES TAB ── */}
      {activeTab === 'quotes' && (
        <div>
          {quotesLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
            </div>
          ) : quotesError ? (
            <div className="border border-red-200 bg-red-50 rounded-sm p-6 text-center">
              <p className="text-xs uppercase tracking-widest font-bold text-red-600">Failed to load quote requests</p>
              <p className="text-red-500 text-xs mt-2">{quotesError}</p>
              <button
                onClick={loadQuotes}
                className="mt-4 h-9 px-4 border border-red-200 text-red-600 text-[10px] uppercase tracking-widest font-bold rounded-sm hover:bg-red-100 transition-all"
              >
                Retry
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-sm p-16 text-center">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-300">No quote requests yet</p>
              <p className="text-gray-300 text-xs mt-2">When a customer fills in the quote form on the website, it will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {quotes.map((q, i) => {
                const isExpanded = expandedQuoteId === q.id;
                const edit = quoteEdits[q.id] ?? { price: q.quoted_price ?? '', note: q.admin_note ?? '' };
                const isSending = sendingQuoteId === q.id;

                const badge = QUOTE_BADGE[q.status] ?? QUOTE_BADGE.pending;

                return (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white border border-gray-100 rounded-sm shadow-sm overflow-hidden">

                    {/* Compact row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Quote code */}
                      <span className="font-mono font-bold tracking-[0.15em] text-gray-400 text-xs bg-gray-50 px-3 py-2 rounded-sm flex-shrink-0 w-fit">
                        {q.quote_code}
                      </span>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-brand-slate truncate">{q.client_name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{q.item_description} — {q.suburb}</p>
                        {q.client_phone && (
                          <p className="text-[10px] text-gray-300 truncate mt-0.5 font-mono flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />{q.client_phone}
                          </p>
                        )}
                        {q.quoted_price && (
                          <p className="text-[11px] font-bold text-brand-teal mt-0.5">{q.quoted_price}</p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm flex-shrink-0 ${badge.cls}`}>
                        {badge.icon} {badge.label}
                      </span>

                      {/* Expand button */}
                      <button
                        onClick={() => {
                          setExpandedQuoteId(isExpanded ? null : q.id);
                          if (!quoteEdits[q.id]) setQuoteEdits(prev => ({ ...prev, [q.id]: { price: q.quoted_price ?? '', note: q.admin_note ?? '' } }));
                        }}
                        className={`flex items-center gap-1.5 h-9 px-3 text-[10px] uppercase tracking-widest font-bold transition-all rounded-sm border ${isExpanded ? 'bg-brand-slate text-white border-brand-slate' : 'border-gray-200 text-gray-500 hover:border-brand-teal/40 hover:text-brand-teal'}`}>
                        {isExpanded ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Close' : (q.status === 'pending' ? 'Send Quote' : 'View')}
                      </button>
                    </div>

                    {/* Expandable panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-gray-100"
                        >
                          <div className="p-5 sm:p-6 bg-gray-50/60 flex flex-col gap-4">
                            {/* Request details summary */}
                            <div className="grid sm:grid-cols-2 gap-3 p-4 bg-white border border-gray-100 rounded-sm text-sm">
                              <div><span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5">Service</span><span className="text-brand-slate font-medium">{q.service_category}</span></div>
                              <div><span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5">Item</span><span className="text-brand-slate font-medium">{q.item_description}</span></div>
                              <div><span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5">Suburb</span><span className="text-brand-slate font-medium">{q.suburb}</span></div>
                              <div><span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5">Received</span><span className="text-brand-slate font-medium">{new Date(q.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                            </div>

                            {/* Price + note fields */}
                            {(q.status === 'pending' || q.status === 'quoted') && (
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Your Price</label>
                                  <input type="text" placeholder="e.g. R1 200 – R1 500"
                                    value={edit.price}
                                    onChange={e => setQuoteEdits(prev => ({ ...prev, [q.id]: { ...prev[q.id], price: e.target.value } }))}
                                    className="h-11 px-3 border border-gray-200 bg-white rounded-sm text-sm text-brand-slate focus:border-brand-teal outline-none transition-all" />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Note to client <span className="normal-case font-normal text-gray-300">(optional)</span></label>
                                  <input type="text" placeholder="e.g. Includes collection from Maitland"
                                    value={edit.note}
                                    onChange={e => setQuoteEdits(prev => ({ ...prev, [q.id]: { ...prev[q.id], note: e.target.value } }))}
                                    className="h-11 px-3 border border-gray-200 bg-white rounded-sm text-sm text-brand-slate focus:border-brand-teal outline-none transition-all" />
                                </div>
                              </div>
                            )}

                            {/* Accepted/declined response */}
                            {q.status === 'accepted' && (
                              <div className="flex flex-col gap-3 p-4 bg-teal-50 border border-teal-100 rounded-sm">
                                <div className="flex items-center gap-3">
                                  <BadgeCheck className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                  <p className="text-sm font-bold text-teal-600">Client accepted this quote.</p>
                                </div>
                                {convertedQuoteJobs[q.id] ? (
                                  <div className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-sm">
                                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                    <span className="text-xs text-teal-700 font-bold">Job created — Tracking code: </span>
                                    <span className="font-mono font-bold tracking-[0.2em] text-brand-teal text-sm">{convertedQuoteJobs[q.id]}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleConvertToJob(q)}
                                    disabled={convertingQuoteId === q.id}
                                    className="flex items-center justify-center gap-2 h-11 px-5 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 shadow-sm shadow-brand-teal/20"
                                  >
                                    {convertingQuoteId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {convertingQuoteId === q.id ? 'Creating Job…' : 'Convert to Job'}
                                  </button>
                                )}
                              </div>
                            )}
                            {q.status === 'declined' && (
                              <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-sm">
                                <div className="flex items-center gap-3">
                                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                  <p className="text-sm font-bold text-red-500">This request has been declined.</p>
                                </div>
                                <button
                                  onClick={() => openDeclineNotify(q)}
                                  className="flex items-center justify-center gap-2 h-10 px-4 border border-red-200 text-red-500 text-[10px] uppercase tracking-widest font-bold hover:bg-red-100 transition-all rounded-sm"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> Notify Client via WhatsApp (optional)
                                </button>
                              </div>
                            )}

                            {/* Inline decline confirmation */}
                            {declineConfirmId === q.id && (
                              <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-200 rounded-sm">
                                <p className="text-sm font-bold text-red-600">Decline this request?</p>
                                <p className="text-xs text-red-400">The request will be marked as declined. You can optionally notify the client afterwards.</p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setDeclineConfirmId(null)}
                                    className="flex-1 h-10 border border-gray-200 text-gray-500 text-[10px] uppercase tracking-widest font-bold hover:border-gray-400 transition-all rounded-sm"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDeclineQuote(q)}
                                    disabled={decliningQuoteId === q.id}
                                    className="flex-1 h-10 bg-red-500 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-red-600 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
                                  >
                                    {decliningQuoteId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Confirm Decline
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Send / Decline buttons */}
                            {(q.status === 'pending' || q.status === 'quoted') && declineConfirmId !== q.id && (
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => handleSendQuote(q)} disabled={!edit.price.trim() || isSending}
                                  className="flex-1 h-12 bg-green-500 text-white text-xs uppercase tracking-widest font-bold hover:bg-green-600 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm shadow-green-500/20">
                                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                  {isSending ? 'Sending…' : (q.status === 'quoted' ? 'Resend Quote via WhatsApp' : 'Send Quote via WhatsApp')}
                                </button>
                                <button
                                  onClick={() => setDeclineConfirmId(q.id)}
                                  className="sm:w-auto h-12 px-5 border border-red-200 text-red-500 text-xs uppercase tracking-widest font-bold hover:bg-red-50 transition-all rounded-sm flex items-center justify-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" /> Decline
                                </button>
                              </div>
                            )}
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
      )}

    </div>
  );
}
