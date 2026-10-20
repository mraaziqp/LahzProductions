/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  LayoutDashboard,
  Settings,
  MessageSquare,
  LogOut,
  BarChart2,
  ClipboardList,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Service, Testimonial } from '../constants';
import {
  uploadProject, deleteProject,
  addService, updateService, deleteService,
  addTestimonial, updateTestimonial, deleteTestimonial,
  fetchQuoteRequests, uploadGalleryProject, SinglePhotoMode,
} from '../services/database';
import { supabase } from '../lib/supabase';
import AnalyticsOverview from './AnalyticsOverview';
import JobManager from './JobManager';
import ImageDropzone, { PickedImage, pickImage } from './ImageDropzone';

interface AdminDashboardProps {
  projects: Project[];
  services: Service[];
  testimonials: Testimonial[];
  onRefresh: () => void;
  onClose: () => void;
}

type Tab = 'overview' | 'projects' | 'services' | 'testimonials' | 'jobs' | 'quotes';
type UploadMode = 'beforeAfter' | SinglePhotoMode | 'gallery';

const NAV: { key: Tab; label: string; icon: typeof BarChart2 }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart2 },
  { key: 'projects', label: 'Portfolio', icon: LayoutDashboard },
  { key: 'services', label: 'Services', icon: Settings },
  { key: 'testimonials', label: 'Reviews', icon: MessageSquare },
  { key: 'jobs', label: 'Job Tracker', icon: ClipboardList },
  { key: 'quotes', label: 'Quote Requests', icon: FileText },
];

const UPLOAD_MODES: { key: UploadMode; label: string; hint: ReactNode }[] = [
  { key: 'beforeAfter', label: 'Before / After Slider', hint: <>Upload the photo <em>before</em> the job and the photo <em>after</em>. Clients can drag a handle left and right to compare. This is the most impressive mode for transformations.</> },
  { key: 'composite', label: 'Featured Photo', hint: <>Use this when you already have a single image that shows before &amp; after side by side in one picture. It will be highlighted with a gold border on the website.</> },
  { key: 'single', label: 'Single Photo', hint: <>Just one photo, shown as a normal card. Use this when you only have a general photo of the finished job and no before/after pair.</> },
  { key: 'afterOnly', label: 'After Only', hint: <>Shows a single photo with a teal "After" badge. Use this when you only have the finished result and no before photo.</> },
  { key: 'beforeOnly', label: 'Before Only', hint: <>Shows a single photo with a "Before" badge. Use this to show a job that's still in progress or waiting to be done.</> },
  { key: 'gallery', label: 'Gallery / Slideshow', hint: <>Add as many photos as you like (minimum 2). Clients tap the arrows or swipe to flip through them like a photo book. Great for grouping all your couch jobs together, or showing a full restoration step by step.</> },
];

const SINGLE_MODE_DROPZONE: Record<SinglePhotoMode, { label: ReactNode; emptyTitle: string; emptyNote: string; highlight?: boolean }> = {
  composite: { label: <>Composite Image <span className="text-gray-300 normal-case">(before &amp; after already in one photo)</span></>, emptyTitle: 'Upload Featured Photo', emptyNote: 'JPG, PNG, or WebP • Max 50MB', highlight: true },
  single: { label: <>Single Image <span className="text-gray-300 normal-case">(displayed as a normal photo without slider)</span></>, emptyTitle: 'Upload Single Photo', emptyNote: 'Shown as a full image card (no slider)', highlight: true },
  afterOnly: { label: <>After Photo <span className="text-gray-300 normal-case">(displayed with an "After" label)</span></>, emptyTitle: 'Upload After Photo', emptyNote: 'Shown with a teal "After" badge' },
  beforeOnly: { label: <>Before Photo <span className="text-gray-300 normal-case">(displayed with a "Before" label)</span></>, emptyTitle: 'Upload Before Photo', emptyNote: 'Shown with a "Before" badge' },
};

const inputCls = 'p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm';
const labelCls = 'text-[10px] uppercase tracking-widest font-bold text-gray-400';

const errorText = (err: unknown) => (err instanceof Error ? err.message : (err as { message?: string })?.message) || 'Unknown error';

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="mb-10 p-5 bg-blue-50 border border-blue-100 rounded-sm flex items-start gap-3">
      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-700 leading-relaxed">{children}</div>
    </div>
  );
}

export default function AdminDashboard({
  projects,
  services,
  testimonials,
  onRefresh,
  onClose
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pendingQuoteCount, setPendingQuoteCount] = useState(0);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchQuoteRequests()
      .then(qs => setPendingQuoteCount(qs.filter(q => q.status === 'pending').length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (notice?.type !== 'success') return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Runs an admin action, refreshes site data and reports the outcome.
  const run = async (action: () => Promise<void>, success: string, setBusy?: (b: boolean) => void) => {
    setBusy?.(true);
    setNotice(null);
    try {
      await action();
      onRefresh();
      setNotice({ type: 'success', text: success });
      return true;
    } catch (err) {
      setNotice({ type: 'error', text: errorText(err) });
      return false;
    } finally {
      setBusy?.(false);
    }
  };

  // Service form state
  const ICON_OPTIONS = ['Sofa','Wind','Settings','Hammer','Car','Sun','ShieldCheck','Stethoscope','GlassWater'];
  const CATEGORY_OPTIONS: Service['category'][] = ['Restoration','Manufacturing','SpecializedCare'];
  const blankService = (): Omit<Service,'id'> => ({ title:'', category:'Restoration', shortDescription:'', iconName:'Sofa' });
  const [newService, setNewService] = useState<Omit<Service,'id'>>(blankService());
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Testimonial form state
  const blankTestimonial = (): Omit<Testimonial,'id'> => ({ clientName:'', location:'', serviceRendered:'', quote:'' });
  const [newTestimonial, setNewTestimonial] = useState<Omit<Testimonial,'id'>>(blankTestimonial());
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialLoading, setTestimonialLoading] = useState(false);

  // Project form state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectCategory, setProjectCategory] = useState<Project['category']>('Cleaning');
  const [uploadMode, setUploadMode] = useState<UploadMode>('beforeAfter');
  // Before/after use 'before' + 'after'; every single-photo mode uses 'single'.
  const [images, setImages] = useState<{ before?: PickedImage; after?: PickedImage; single?: PickedImage }>({});
  const [gallery, setGallery] = useState<PickedImage[]>([]);
  const [imageErrors, setImageErrors] = useState<{ before?: string; after?: string; single?: string; gallery?: string }>({});
  const [loading, setLoading] = useState(false);

  const clearImages = () => {
    [...Object.values(images), ...gallery].forEach(img => img && URL.revokeObjectURL(img.preview));
    setImages({});
    setGallery([]);
    setImageErrors({});
  };

  const switchMode = (mode: UploadMode) => {
    clearImages();
    setUploadMode(mode);
  };

  const setSlot = (slot: 'before' | 'after' | 'single', file: File) =>
    setImages(prev => {
      if (prev[slot]) URL.revokeObjectURL(prev[slot]!.preview);
      return { ...prev, [slot]: pickImage(file) };
    });

  const slotError = (slot: keyof typeof imageErrors) => (msg: string) =>
    setImageErrors(prev => ({ ...prev, [slot]: msg }));

  const imagesReady =
    uploadMode === 'gallery' ? gallery.length >= 2
    : uploadMode === 'beforeAfter' ? !!(images.before && images.after)
    : !!images.single;
  const hasAnyImage = !!(images.before || images.after || images.single || gallery.length);

  const handleAddProject = async () => {
    if (!projectTitle.trim() || !imagesReady) return;
    const base = { title: projectTitle, location: projectLocation, category: projectCategory };
    const ok = await run(async () => {
      if (uploadMode === 'gallery') {
        await uploadGalleryProject({ ...base, galleryFiles: gallery.map(g => g.file) });
      } else if (uploadMode === 'beforeAfter') {
        await uploadProject({ ...base, mode: 'beforeAfter', before: images.before!.file, after: images.after!.file });
      } else {
        await uploadProject({ ...base, mode: uploadMode, image: images.single!.file });
      }
    }, 'Project published to the gallery.', setLoading);
    if (ok) {
      setProjectTitle('');
      setProjectLocation('');
      switchMode('beforeAfter');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const tabMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Sidebar — a compact scrollable bar on phones, a column on desktop */}
      <aside className="w-full md:w-64 bg-brand-slate text-white p-4 md:p-8 flex flex-col gap-4 md:gap-10 flex-shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em]">LAHZ</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold border-l pl-2 border-gray-600">Admin</span>
          </div>
          <div className="flex md:hidden gap-2">
            <button onClick={onClose} className="h-9 px-3 border border-white/20 text-[10px] uppercase tracking-widest font-bold">Site</button>
            <button onClick={handleLogout} className="h-9 w-9 flex items-center justify-center bg-red-500/10 text-red-400" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === key ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" /> {label}
              {key === 'quotes' && pendingQuoteCount > 0 && (
                <span className="ml-auto bg-brand-yellow text-brand-slate text-[9px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingQuoteCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden md:flex flex-col gap-3">
          <button
            onClick={onClose}
            className="px-6 h-11 border border-white/20 text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-brand-slate transition-all"
          >
            View Live Site
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-6 h-11 bg-red-500/10 text-red-500 text-[10px] uppercase tracking-widest font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-500/5"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-16 bg-gray-50">
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role={notice.type === 'error' ? 'alert' : 'status'}
              className={`max-w-4xl mb-6 p-4 border rounded-sm flex items-start gap-3 ${notice.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'}`}
            >
              {notice.type === 'error'
                ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                : <CheckCircle className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />}
              <p className={`flex-1 text-sm ${notice.type === 'error' ? 'text-red-700' : 'text-teal-700'}`}>{notice.text}</p>
              <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" {...tabMotion} className="max-w-4xl">
              <header className="mb-8">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Business Overview</h1>
                <p className="text-gray-500 text-sm">A live snapshot of your content and activity, pulled directly from Supabase.</p>
              </header>
              <InfoBox>
                This page shows a live count of everything on your website. <strong>Projects</strong> are portfolio photos, <strong>Services</strong> are what you offer, and <strong>Reviews</strong> are client testimonials. Nothing on this page can be changed here — use the other tabs to manage content.
              </InfoBox>
              <AnalyticsOverview />
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div key="projects" {...tabMotion} className="max-w-4xl">
              <header className="mb-8">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Portfolio Management</h1>
                <p className="text-gray-500 text-sm">Add high-quality before/after comparisons to your showcase. Everything is synced with Supabase storage.</p>
              </header>
              <InfoBox>
                <div className="space-y-2">
                  <p>Photos you add here appear in the <strong>gallery section</strong> of the live website. Pick the right mode below for each job, then click <strong>Publish to Gallery</strong> — it goes live instantly.</p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-[12px]">
                    <p><strong>Before / After Slider</strong> — Two photos, drag to compare. Best for most transformations.</p>
                    <p><strong>Gallery / Slideshow</strong> — 2–10 photos in one card. Clients swipe through like a book. Perfect for grouping multiple jobs or showing a full project in steps.</p>
                    <p><strong>Featured Photo</strong> — One composite image (before &amp; after already combined). Shows with a gold border.</p>
                    <p><strong>Single / After Only / Before Only</strong> — One photo when you don't have both sides of the job.</p>
                  </div>
                </div>
              </InfoBox>

              {/* Add New Project Form */}
              <div className="bg-white border border-gray-100 p-5 sm:p-8 shadow-sm mb-12">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-8">New Completed Job</h2>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="project-title" className={labelCls}>Project Title</label>
                    <input id="project-title" type="text" placeholder="e.g. Vintage Leather Restoration"
                      value={projectTitle} onChange={e => setProjectTitle(e.target.value)}
                      className={`p-4 ${inputCls}`} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="project-location" className={labelCls}>Location</label>
                    <input id="project-location" type="text" placeholder="e.g. Sea Point"
                      value={projectLocation} onChange={e => setProjectLocation(e.target.value)}
                      className={`p-4 ${inputCls}`} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="project-category" className={labelCls}>Category</label>
                    <select id="project-category" value={projectCategory}
                      onChange={e => setProjectCategory(e.target.value as Project['category'])}
                      className={`p-4 ${inputCls}`}>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Craftsmanship">Craftsmanship</option>
                    </select>
                  </div>
                </div>

                {/* Image mode toggle */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {UPLOAD_MODES.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => switchMode(m.key)}
                      className={`h-9 px-5 text-[10px] uppercase tracking-widest font-bold transition-all rounded-sm ${uploadMode === m.key ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >{m.label}</button>
                  ))}
                </div>

                {/* Per-mode hint */}
                <p className="mb-6 px-1 text-xs text-gray-400 leading-relaxed">
                  <span className="font-bold text-brand-teal">{UPLOAD_MODES.find(m => m.key === uploadMode)!.label}</span> — {UPLOAD_MODES.find(m => m.key === uploadMode)!.hint}
                </p>

                <div className="mb-10">
                  {uploadMode === 'beforeAfter' ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      <ImageDropzone label="Before Image" emptyTitle="Before Photo" emptyNote="JPG, PNG, or WebP • Max 50MB"
                        image={images.before} error={imageErrors.before} disabled={loading}
                        onFiles={([f]) => setSlot('before', f)} onError={slotError('before')} />
                      <ImageDropzone label="After Image" emptyTitle="After Photo" emptyNote="JPG, PNG, or WebP • Max 50MB"
                        image={images.after} error={imageErrors.after} disabled={loading}
                        onFiles={([f]) => setSlot('after', f)} onError={slotError('after')} />
                    </div>
                  ) : uploadMode === 'gallery' ? (
                    <div className="flex flex-col gap-4">
                      {gallery.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {gallery.map((img, idx) => (
                            <div key={img.preview} className="relative w-24 h-24 rounded-sm overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                              <img src={img.preview} alt={`Gallery photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(img.preview);
                                  setGallery(g => g.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                                aria-label={`Remove photo ${idx + 1}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-brand-slate/60 text-[9px] text-white text-center py-0.5 font-bold">{idx + 1}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <ImageDropzone multiple
                        label={<>Gallery Photos <span className="text-gray-300 normal-case">(min 2 — {gallery.length} added)</span></>}
                        emptyTitle={gallery.length === 0 ? 'Drop All Photos Here' : 'Add More Photos'}
                        emptyNote="Select multiple at once • JPG, PNG, or WebP • Max 50MB each"
                        error={imageErrors.gallery} disabled={loading}
                        onFiles={files => setGallery(g => [...g, ...files.map(pickImage)])} onError={slotError('gallery')} />
                    </div>
                  ) : (
                    <ImageDropzone {...SINGLE_MODE_DROPZONE[uploadMode]}
                      image={images.single} error={imageErrors.single} disabled={loading}
                      onFiles={([f]) => setSlot('single', f)} onError={slotError('single')} />
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddProject}
                    disabled={!projectTitle.trim() || !imagesReady || loading}
                    className="flex-1 py-5 bg-brand-teal text-white uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-teal/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-brand-teal/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {loading ? 'Uploading...' : 'Publish to Gallery'}
                  </button>
                  <button
                    onClick={clearImages}
                    disabled={!hasAnyImage || loading}
                    className="px-6 py-5 bg-gray-100 text-gray-600 uppercase tracking-[0.1em] text-xs font-bold hover:bg-gray-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Clear
                  </button>
                </div>
                {!projectTitle.trim() && hasAnyImage && (
                  <p className="mt-3 text-xs text-amber-600">Add a project title to publish.</p>
                )}
              </div>

              {/* List Projects */}
              <div className="grid gap-4">
                <h3 className={`${labelCls} mb-4`}>Current Projects ({projects.length})</h3>
                {projects.map(project => (
                  <div key={project.id} className="bg-white p-4 border border-gray-100 flex items-center gap-4 sm:gap-6 group hover:border-brand-teal/20 transition-all">
                    {project.galleryImages && project.galleryImages.length > 1 ? (
                      <div className="w-24 sm:w-32 h-20 bg-gray-100 rounded overflow-hidden flex gap-0.5 flex-shrink-0 relative">
                        {project.galleryImages.slice(0, 3).map((src, i) => (
                          <img key={i} src={src} loading="lazy" className="flex-1 min-w-0 h-full object-cover" alt={`Gallery photo ${i + 1}`} />
                        ))}
                        <div className="absolute bottom-1 left-1 bg-brand-teal/90 text-white text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                          {project.galleryImages.length} photos
                        </div>
                      </div>
                    ) : project.beforeImage === project.afterImage ? (
                      <div className="w-24 sm:w-32 h-20 bg-gray-100 rounded overflow-hidden border border-brand-yellow/40 shadow-sm flex-shrink-0">
                        <img src={project.beforeImage} loading="lazy" className="w-full h-full object-cover" alt={project.title} />
                      </div>
                    ) : (
                      <div className="w-24 sm:w-32 h-20 bg-gray-100 rounded overflow-hidden flex gap-0.5 flex-shrink-0">
                        <img src={project.beforeImage} loading="lazy" className="w-1/2 h-full object-cover" alt="Before" />
                        <img src={project.afterImage} loading="lazy" className="w-1/2 h-full object-cover" alt="After" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-brand-slate uppercase tracking-tight truncate">{project.title}</h4>
                      <p className="text-[10px] uppercase text-gray-400 tracking-widest mt-1 font-semibold truncate">{project.location} • <span className="text-brand-teal">{project.category}</span></p>
                    </div>
                    <button
                      onClick={() => confirm('Are you sure you want to delete this project?') && run(() => deleteProject(project.id), 'Project deleted.')}
                      aria-label={`Delete ${project.title}`}
                      className="h-11 w-11 flex-shrink-0 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100 hover:bg-red-50 rounded-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div key="services" {...tabMotion} className="max-w-4xl">
              <header className="mb-8">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Service Catalog</h1>
                <p className="text-gray-500 text-sm">Add, edit, or remove services. Changes are live immediately.</p>
              </header>
              <InfoBox>
                <p className="mb-2">Services appear in the <strong>"Bespoke solutions"</strong> section of the website. Each service needs a <strong>Title</strong>, a <strong>Category</strong>, and a one-sentence <strong>Description</strong>.</p>
                <p><strong>Category meanings:</strong> <em>Restoration</em> = repairing existing items · <em>Manufacturing</em> = building new items · <em>SpecializedCare</em> = specialist treatments like deep cleaning. Clients can filter by these categories on the website.</p>
              </InfoBox>

              {/* Add New Service */}
              <div className="bg-white border border-gray-100 p-5 sm:p-8 shadow-sm mb-10">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-6">Add New Service</h2>
                <ServiceFields value={newService} onChange={setNewService} icons={ICON_OPTIONS} categories={CATEGORY_OPTIONS} idPrefix="new-service" />
                <button
                  disabled={!newService.title.trim() || !newService.shortDescription.trim() || serviceLoading}
                  onClick={async () => { if (await run(() => addService(newService), 'Service added.', setServiceLoading)) setNewService(blankService()); }}
                  className="mt-2 h-12 px-8 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-brand-teal/20"
                >
                  {serviceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Service
                </button>
              </div>

              {/* Services list */}
              <div className="flex flex-col gap-4">
                {services.map(service => (
                  <div key={service.id} className="bg-white border border-gray-100 shadow-sm">
                    {editingService?.id === service.id ? (
                      <div className="p-6">
                        <ServiceFields value={editingService} onChange={v => setEditingService({ ...editingService, ...v })} icons={ICON_OPTIONS} categories={CATEGORY_OPTIONS} idPrefix={`service-${service.id}`} />
                        <div className="flex gap-3">
                          <button
                            disabled={serviceLoading}
                            onClick={async () => { if (await run(() => updateService(editingService), 'Service updated.', setServiceLoading)) setEditingService(null); }}
                            className="h-10 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all flex items-center gap-2 disabled:opacity-40">
                            {serviceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                          </button>
                          <button onClick={() => setEditingService(null)}
                            className="h-10 px-6 border border-gray-200 text-xs uppercase tracking-widest font-bold text-gray-400 hover:border-gray-400 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 flex items-center gap-4 sm:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-sm text-brand-slate">{service.title}</h3>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-brand-teal bg-teal-50 px-2 py-0.5">{service.category}</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{service.shortDescription}</p>
                        </div>
                        <button onClick={() => setEditingService(service)}
                          className="h-9 px-4 text-[10px] uppercase tracking-widest font-bold border border-gray-200 text-gray-400 hover:border-brand-teal hover:text-brand-teal transition-all flex-shrink-0">
                          Edit
                        </button>
                        <button
                          onClick={() => confirm('Delete this service?') && run(() => deleteService(service.id), 'Service deleted.')}
                          aria-label={`Delete ${service.title}`}
                          className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'testimonials' && (
            <motion.div key="testimonials" {...tabMotion} className="max-w-4xl">
              <header className="mb-8">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Client Reviews</h1>
                <p className="text-gray-500 text-sm">Add, edit, or remove testimonials. Shown live on the public site.</p>
              </header>
              <InfoBox>
                Reviews appear in the <strong>testimonials section</strong> of the homepage and rotate automatically. Fill in the client's name, their suburb/city, what service was done, and paste their exact words into the <strong>Review Quote</strong> box. Click <strong>Publish Review</strong> and it goes live immediately.
              </InfoBox>

              {/* Add new testimonial */}
              <div className="bg-white border border-gray-100 p-5 sm:p-8 shadow-sm mb-10">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-6">Add New Review</h2>
                <TestimonialFields value={newTestimonial} onChange={setNewTestimonial} idPrefix="new-review" />
                <button
                  disabled={!newTestimonial.clientName.trim() || !newTestimonial.quote.trim() || testimonialLoading}
                  onClick={async () => { if (await run(() => addTestimonial(newTestimonial), 'Review published.', setTestimonialLoading)) setNewTestimonial(blankTestimonial()); }}
                  className="mt-2 h-12 px-8 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-brand-teal/20"
                >
                  {testimonialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Publish Review
                </button>
              </div>

              {/* Testimonials list */}
              <div className="flex flex-col gap-4">
                {testimonials.map((t) => (
                  <div key={t.id} className="bg-white border border-gray-100 shadow-sm">
                    {editingTestimonial?.id === t.id ? (
                      <div className="p-6">
                        <TestimonialFields value={editingTestimonial} onChange={v => setEditingTestimonial({ ...editingTestimonial, ...v })} idPrefix={`review-${t.id}`} />
                        <div className="flex gap-3">
                          <button
                            disabled={testimonialLoading}
                            onClick={async () => { if (await run(() => updateTestimonial(editingTestimonial), 'Review updated.', setTestimonialLoading)) setEditingTestimonial(null); }}
                            className="h-10 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all flex items-center gap-2 disabled:opacity-40">
                            {testimonialLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                          </button>
                          <button onClick={() => setEditingTestimonial(null)}
                            className="h-10 px-6 border border-gray-200 text-xs uppercase tracking-widest font-bold text-gray-400 hover:border-gray-400 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <p className="text-sm italic text-gray-500 mb-4 leading-relaxed">"{t.quote}"</p>
                        <div className="flex items-end justify-between border-t border-gray-50 pt-4 gap-4">
                          <div className="min-w-0">
                            <h5 className="font-bold text-sm text-brand-slate">{t.clientName}</h5>
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">{t.location} • <span className="text-brand-teal">{t.serviceRendered}</span></p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setEditingTestimonial(t)}
                              className="h-9 px-4 text-[10px] uppercase tracking-widest font-bold border border-gray-200 text-gray-400 hover:border-brand-teal hover:text-brand-teal transition-all">
                              Edit
                            </button>
                            <button
                              onClick={() => confirm('Delete this review?') && run(() => deleteTestimonial(t.id), 'Review deleted.')}
                              aria-label={`Delete review from ${t.clientName}`}
                              className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {(activeTab === 'jobs' || activeTab === 'quotes') && (
            // One instance for both tabs so switching keeps loaded data and state
            <motion.div key="job-manager" {...tabMotion}>
              <JobManager tab={activeTab} onTabChange={setActiveTab} onQuoteCountChange={setPendingQuoteCount} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ServiceFields({ value, onChange, icons, categories, idPrefix }: {
  value: Omit<Service, 'id'>;
  onChange: (v: Omit<Service, 'id'>) => void;
  icons: string[];
  categories: Service['category'][];
  idPrefix: string;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-title`} className={labelCls}>Title</label>
        <input id={`${idPrefix}-title`} type="text" placeholder="e.g. Leather Care & Repair"
          value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} className={inputCls} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-category`} className={labelCls}>Category</label>
        <select id={`${idPrefix}-category`} value={value.category}
          onChange={e => onChange({ ...value, category: e.target.value as Service['category'] })} className={inputCls}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-icon`} className={labelCls}>Icon</label>
        <select id={`${idPrefix}-icon`} value={value.iconName}
          onChange={e => onChange({ ...value, iconName: e.target.value })} className={inputCls}>
          {icons.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-desc`} className={labelCls}>Short Description</label>
        <input id={`${idPrefix}-desc`} type="text" placeholder="One sentence description"
          value={value.shortDescription} onChange={e => onChange({ ...value, shortDescription: e.target.value })} className={inputCls} />
      </div>
    </div>
  );
}

function TestimonialFields({ value, onChange, idPrefix }: {
  value: Omit<Testimonial, 'id'>;
  onChange: (v: Omit<Testimonial, 'id'>) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-name`} className={labelCls}>Client Name</label>
        <input id={`${idPrefix}-name`} type="text" placeholder="e.g. Sarah Johnson"
          value={value.clientName} onChange={e => onChange({ ...value, clientName: e.target.value })} className={inputCls} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-location`} className={labelCls}>Location</label>
        <input id={`${idPrefix}-location`} type="text" placeholder="e.g. Sea Point, Cape Town"
          value={value.location} onChange={e => onChange({ ...value, location: e.target.value })} className={inputCls} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-service`} className={labelCls}>Service Rendered</label>
        <input id={`${idPrefix}-service`} type="text" placeholder="e.g. Deep Cleaning"
          value={value.serviceRendered} onChange={e => onChange({ ...value, serviceRendered: e.target.value })} className={inputCls} />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <label htmlFor={`${idPrefix}-quote`} className={labelCls}>Review Quote</label>
        <textarea id={`${idPrefix}-quote`} rows={3} placeholder="The client's words..."
          value={value.quote} onChange={e => onChange({ ...value, quote: e.target.value })} className={`${inputCls} resize-none`} />
      </div>
    </div>
  );
}
