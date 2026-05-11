/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  UploadCloud, 
  Loader2,
  LayoutDashboard,
  Settings,
  MessageSquare,
  LogOut,
  BarChart2,
  ClipboardList,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Service, Testimonial } from '../constants';
import {
  uploadProject, deleteProject, validateImageFile,
  addService, updateService, deleteService,
  addTestimonial, updateTestimonial, deleteTestimonial,
} from '../services/database';
import { supabase } from '../lib/supabase';
import AnalyticsOverview from './AnalyticsOverview';
import JobManager from './JobManager';

interface AdminDashboardProps {
  projects: Project[];
  services: Service[];
  testimonials: Testimonial[];
  onRefresh: () => void;
  onClose: () => void;
}

export default function AdminDashboard({
  projects,
  services,
  testimonials,
  onRefresh,
  onClose
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'services' | 'testimonials' | 'jobs'>('overview');
  const [loading, setLoading] = useState(false);

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

  // Project Form State
  const [newProject, setNewProject] = useState<Partial<Project>>({
    category: 'Cleaning',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [projectFormErrors, setProjectFormErrors] = useState<{ [key: string]: string }>({});
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});

  // Image preview from File objects
  const createImagePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const onDropBefore = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setProjectFormErrors((prev: any) => ({ ...prev, beforeImage: '' }));
    
    if (rejectedFiles.length > 0) {
      setProjectFormErrors((prev: any) => ({ ...prev, beforeImage: 'Invalid file format. Please use JPG, PNG, or WebP.' }));
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setProjectFormErrors((prev: any) => ({ ...prev, beforeImage: validation.error || 'Invalid image' }));
      return;
    }

    const preview = await createImagePreview(file);
    setPreviewUrls((prev: any) => ({ ...prev, beforeImage: preview }));
    setNewProject((prev: any) => ({ ...prev, beforeImageFile: file }));
  }, [createImagePreview]);

  const onDropAfter = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setProjectFormErrors((prev: any) => ({ ...prev, afterImage: '' }));
    
    if (rejectedFiles.length > 0) {
      setProjectFormErrors((prev: any) => ({ ...prev, afterImage: 'Invalid file format. Please use JPG, PNG, or WebP.' }));
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setProjectFormErrors((prev: any) => ({ ...prev, afterImage: validation.error || 'Invalid image' }));
      return;
    }

    const preview = await createImagePreview(file);
    setPreviewUrls((prev: any) => ({ ...prev, afterImage: preview }));
    setNewProject((prev: any) => ({ ...prev, afterImageFile: file }));
  }, [createImagePreview]);

  const { getRootProps: getRootPropsBefore, getInputProps: getInputPropsBefore, isDragActive: isDragActiveBefore } = useDropzone({ 
    onDrop: onDropBefore, 
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, 
    multiple: false,
    disabled: loading 
  } as any);

  const { getRootProps: getRootPropsAfter, getInputProps: getInputPropsAfter, isDragActive: isDragActiveAfter } = useDropzone({ 
    onDrop: onDropAfter, 
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, 
    multiple: false,
    disabled: loading 
  } as any);

  // Composite (single image) mode
  const [isComposite, setIsComposite] = useState(false);
  const onDropComposite = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setProjectFormErrors((prev: any) => ({ ...prev, compositeImage: '' }));
    
    if (rejectedFiles.length > 0) {
      setProjectFormErrors((prev: any) => ({ ...prev, compositeImage: 'Invalid file format. Please use JPG, PNG, or WebP.' }));
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setProjectFormErrors((prev: any) => ({ ...prev, compositeImage: validation.error || 'Invalid image' }));
      return;
    }

    const preview = await createImagePreview(file);
    setPreviewUrls((prev: any) => ({ ...prev, compositeImage: preview }));
    setNewProject((prev: any) => ({ ...prev, compositeImageFile: file }));
  }, [createImagePreview]);

  const { getRootProps: getRootPropsComposite, getInputProps: getInputPropsComposite, isDragActive: isDragActiveComposite } = useDropzone({ 
    onDrop: onDropComposite, 
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, 
    multiple: false,
    disabled: loading 
  } as any);

  const handleAddProject = async () => {
    // Clear previous errors
    setUploadError(null);
    setProjectFormErrors({});

    // Validate form
    const errors: { [key: string]: string } = {};

    if (!newProject.title || !newProject.title.trim()) {
      errors.title = 'Project title is required';
    }

    if (isComposite) {
      if (!(newProject as any).compositeImageFile) {
        errors.compositeImage = 'Please upload a composite image';
      }
    } else {
      if (!(newProject as any).beforeImageFile) {
        errors.beforeImage = 'Please upload a before image';
      }
      if (!(newProject as any).afterImageFile) {
        errors.afterImage = 'Please upload an after image';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProjectFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const imageFile = isComposite
        ? (newProject as any).compositeImageFile
        : undefined;
      
      await uploadProject({
        title: newProject.title,
        location: newProject.location || "Not specified",
        category: newProject.category as any,
        beforeImage: isComposite ? imageFile : (newProject as any).beforeImageFile,
        afterImage: isComposite ? imageFile : (newProject as any).afterImageFile,
      });
      
      // Reset form on success
      setNewProject({ category: 'Cleaning' });
      setPreviewUrls({});
      onRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload project';
      setUploadError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearImages = () => {
    setNewProject((prev: any) => ({ ...prev, beforeImageFile: undefined, afterImageFile: undefined, compositeImageFile: undefined }));
    setPreviewUrls({});
    setProjectFormErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-brand-slate text-white p-8 flex flex-col gap-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em]">LAHZ</span>
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold border-l pl-2 border-gray-600">Admin</span>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'overview' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <BarChart2 className="w-4 h-4" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'projects' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Portfolio
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'services' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Settings className="w-4 h-4" /> Services
          </button>
          <button 
            onClick={() => setActiveTab('testimonials')}
            className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'testimonials' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <MessageSquare className="w-4 h-4" /> Reviews
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-3 px-4 h-11 text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'jobs' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <ClipboardList className="w-4 h-4" /> Job Tracker
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
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
      <main className="flex-1 overflow-y-auto p-8 md:p-16 bg-gray-50">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <header className="mb-12">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Business Overview</h1>
                <p className="text-gray-500 text-sm">A live snapshot of your content and activity, pulled directly from Supabase.</p>
              </header>
              <AnalyticsOverview />
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <header className="mb-12">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Portfolio Management</h1>
                <p className="text-gray-500 text-sm">Add high-quality before/after comparisons to your showcase. Everything is synced with Supabase storage.</p>
              </header>

              {/* Add New Project Form */}
              <div className="bg-white border border-gray-100 p-8 shadow-sm mb-12">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-8">New Completed Job</h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Project Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Vintage Leather Restoration"
                      value={newProject.title || ''}
                      onChange={e => setNewProject({...newProject, title: e.target.value})}
                      className="p-4 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sea Point"
                      value={newProject.location || ''}
                      onChange={e => setNewProject({...newProject, location: e.target.value})}
                      className="p-4 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Image mode toggle */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => { setIsComposite(false); setPreviewUrls(p => ({ ...p, beforeImage: '', afterImage: '' })); setNewProject(p => ({ ...p, compositeImageFile: undefined })); setProjectFormErrors({}); }}
                    className={`h-9 px-5 text-[10px] uppercase tracking-widest font-bold transition-all rounded-sm ${ !isComposite ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >Separate Before / After</button>
                  <button
                    type="button"
                    onClick={() => { setIsComposite(true); setPreviewUrls(p => ({ ...p, compositeImage: '' })); setNewProject(p => ({ ...p, beforeImageFile: undefined, afterImageFile: undefined })); setProjectFormErrors({}); }}
                    className={`h-9 px-5 text-[10px] uppercase tracking-widest font-bold transition-all rounded-sm ${ isComposite ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >Single Composite Photo</button>
                </div>

                {/* Error Messages */}
                {uploadError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">Upload Failed</p>
                      <p className="text-[13px] text-red-700 mt-1">{uploadError}</p>
                    </div>
                    <button 
                      onClick={() => setUploadError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {projectFormErrors.title && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" /> {projectFormErrors.title}
                  </motion.div>
                )}

                {isComposite ? (
                  <div className="flex flex-col gap-4 mb-10">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Composite Image <span className="text-gray-300 normal-case">(before &amp; after already in one photo)</span></label>
                    <div
                      {...getRootPropsComposite()}
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${isDragActiveComposite ? 'border-brand-teal bg-brand-teal/5' : (previewUrls.compositeImage ? 'border-brand-teal bg-teal-50/10' : 'border-gray-200 hover:border-brand-teal/50')}`}
                    >
                      <input {...getInputPropsComposite()} disabled={loading} />
                      {previewUrls.compositeImage ? (
                        <div className="flex flex-col items-center w-full h-full">
                          <img src={previewUrls.compositeImage} alt="Preview" className="max-h-full max-w-full object-contain rounded" />
                          <div className="mt-2 text-center">
                            <span className="text-[10px] uppercase font-bold text-brand-teal">✓ Image Ready</span>
                            <span className="text-[8px] text-gray-500 block mt-1">{(newProject as any).compositeImageFile?.name}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-12 h-12 text-gray-300 mb-3" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Drag & Drop Your Photo</span>
                          <span className="text-[8px] text-gray-300">or click to browse</span>
                          <span className="text-[8px] text-gray-400 mt-2">JPG, PNG, or WebP • Max 50MB</span>
                        </>
                      )}
                    </div>
                    {projectFormErrors.compositeImage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" /> {projectFormErrors.compositeImage}
                      </motion.div>
                    )}
                  </div>
                ) : (
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Before Image</label>
                    <div 
                      {...getRootPropsBefore()} 
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${isDragActiveBefore ? 'border-brand-teal bg-brand-teal/5' : (previewUrls.beforeImage ? 'border-brand-teal bg-teal-50/10' : 'border-gray-200 hover:border-brand-teal/50')}`}
                    >
                      <input {...getInputPropsBefore()} disabled={loading} />
                      {previewUrls.beforeImage ? (
                        <div className="flex flex-col items-center w-full h-full">
                          <img src={previewUrls.beforeImage} alt="Before Preview" className="max-h-full max-w-full object-contain rounded" />
                          <div className="mt-2 text-center">
                            <span className="text-[10px] uppercase font-bold text-brand-teal">✓ Ready</span>
                            <span className="text-[8px] text-gray-500 block mt-1">{(newProject as any).beforeImageFile?.name}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-12 h-12 text-gray-300 mb-3" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Before Photo</span>
                          <span className="text-[8px] text-gray-300">Drag & Drop or click to browse</span>
                        </>
                      )}
                    </div>
                    {projectFormErrors.beforeImage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" /> {projectFormErrors.beforeImage}
                      </motion.div>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">After Image</label>
                    <div 
                      {...getRootPropsAfter()} 
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${isDragActiveAfter ? 'border-brand-teal bg-brand-teal/5' : (previewUrls.afterImage ? 'border-brand-teal bg-teal-50/10' : 'border-gray-200 hover:border-brand-teal/50')}`}
                    >
                      <input {...getInputPropsAfter()} disabled={loading} />
                      {previewUrls.afterImage ? (
                        <div className="flex flex-col items-center w-full h-full">
                          <img src={previewUrls.afterImage} alt="After Preview" className="max-h-full max-w-full object-contain rounded" />
                          <div className="mt-2 text-center">
                            <span className="text-[10px] uppercase font-bold text-brand-teal">✓ Ready</span>
                            <span className="text-[8px] text-gray-500 block mt-1">{(newProject as any).afterImageFile?.name}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-12 h-12 text-gray-300 mb-3" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">After Photo</span>
                          <span className="text-[8px] text-gray-300">Drag & Drop or click to browse</span>
                        </>
                      )}
                    </div>
                    {projectFormErrors.afterImage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" /> {projectFormErrors.afterImage}
                      </motion.div>
                    )}
                  </div>
                </div>
                )}

                <div className="flex flex-col gap-4 mb-10">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Category</label>
                  <select 
                    value={newProject.category}
                    onChange={e => setNewProject({...newProject, category: e.target.value as any})}
                    className="p-4 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                  >
                    <option value="Cleaning">Cleaning</option>
                    <option value="Craftsmanship">Craftsmanship</option>
                  </select>
                </div>

                <div className="flex gap-3 mb-8">
                  <button 
                    onClick={handleAddProject}
                    disabled={!newProject.title || (isComposite ? !(newProject as any).compositeImageFile : (!(newProject as any).beforeImageFile || !(newProject as any).afterImageFile)) || loading}
                    className="flex-1 py-5 bg-brand-teal text-white uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-teal/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-brand-teal/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                    {loading ? 'Uploading...' : 'Publish to Gallery'}
                  </button>
                  <button 
                    onClick={handleClearImages}
                    disabled={!((newProject as any).beforeImageFile || (newProject as any).afterImageFile || (newProject as any).compositeImageFile) || loading}
                    className="px-6 py-5 bg-gray-100 text-gray-600 uppercase tracking-[0.1em] text-xs font-bold hover:bg-gray-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Clear
                  </button>
                </div>
              </div>

              {/* List Projects */}
              <div className="grid gap-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4">Current Projects ({projects.length})</h3>
                {projects.map(project => (
                  <div key={project.id} className="bg-white p-4 border border-gray-100 flex items-center gap-6 group hover:border-brand-teal/20 transition-all">
                    <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex gap-0.5">
                      <img src={project.beforeImage} className="w-1/2 h-full object-cover" alt="Before" />
                      <img src={project.afterImage} className="w-1/2 h-full object-cover" alt="After" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-brand-slate uppercase tracking-tight">{project.title}</h4>
                      <p className="text-[10px] uppercase text-gray-400 tracking-widest mt-1 font-semibold">{project.location} • <span className="text-brand-teal">{project.category}</span></p>
                    </div>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      className="h-11 w-11 flex items-center justify-center text-gray-200 hover:text-red-500 transition-all border border-transparent hover:border-red-100 hover:bg-red-50 rounded-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <header className="mb-10">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Service Catalog</h1>
                <p className="text-gray-500 text-sm">Add, edit, or remove services. Changes are live immediately.</p>
              </header>

              {/* Add New Service */}
              <div className="bg-white border border-gray-100 p-8 shadow-sm mb-10">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-6">Add New Service</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Title</label>
                    <input type="text" placeholder="e.g. Leather Care & Repair"
                      value={newService.title}
                      onChange={e => setNewService(s => ({...s, title: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Category</label>
                    <select value={newService.category} onChange={e => setNewService(s => ({...s, category: e.target.value as Service['category']}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm">
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Icon</label>
                    <select value={newService.iconName} onChange={e => setNewService(s => ({...s, iconName: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm">
                      {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Short Description</label>
                    <input type="text" placeholder="One sentence description"
                      value={newService.shortDescription}
                      onChange={e => setNewService(s => ({...s, shortDescription: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <button
                  disabled={!newService.title || !newService.shortDescription || serviceLoading}
                  onClick={async () => { setServiceLoading(true); try { await addService(newService); setNewService(blankService()); onRefresh(); } catch(e){console.error(e);} finally{setServiceLoading(false);} }}
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
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Title</label>
                            <input type="text" value={editingService.title}
                              onChange={e => setEditingService(s => s ? {...s, title: e.target.value} : s)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Category</label>
                            <select value={editingService.category} onChange={e => setEditingService(s => s ? {...s, category: e.target.value as Service['category']} : s)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm">
                              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Icon</label>
                            <select value={editingService.iconName} onChange={e => setEditingService(s => s ? {...s, iconName: e.target.value} : s)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm">
                              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Description</label>
                            <input type="text" value={editingService.shortDescription}
                              onChange={e => setEditingService(s => s ? {...s, shortDescription: e.target.value} : s)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={async () => { if(!editingService) return; setServiceLoading(true); try { await updateService(editingService); setEditingService(null); onRefresh(); } catch(e){console.error(e);} finally{setServiceLoading(false);} }}
                            className="h-10 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all flex items-center gap-2">
                            {serviceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                          </button>
                          <button onClick={() => setEditingService(null)}
                            className="h-10 px-6 border border-gray-200 text-xs uppercase tracking-widest font-bold text-gray-400 hover:border-gray-400 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 flex items-center gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-sm text-brand-slate">{service.title}</h3>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-brand-teal bg-teal-50 px-2 py-0.5">{service.category}</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{service.shortDescription}</p>
                        </div>
                        <button onClick={() => setEditingService(service)}
                          className="h-9 px-4 text-[10px] uppercase tracking-widest font-bold border border-gray-200 text-gray-400 hover:border-brand-teal hover:text-brand-teal transition-all flex-shrink-0">
                          Edit
                        </button>
                        <button onClick={async () => { if(!confirm('Delete this service?')) return; await deleteService(service.id); onRefresh(); }}
                          className="h-9 w-9 flex items-center justify-center text-gray-200 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all flex-shrink-0">
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
            <motion.div
              key="testimonials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <header className="mb-10">
                <h1 className="text-4xl font-serif text-brand-slate mb-2">Client Reviews</h1>
                <p className="text-gray-500 text-sm">Add, edit, or remove testimonials. Shown live on the public site.</p>
              </header>

              {/* Add new testimonial */}
              <div className="bg-white border border-gray-100 p-8 shadow-sm mb-10">
                <h2 className="text-xs uppercase tracking-[0.3em] text-brand-teal font-bold mb-6">Add New Review</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Client Name</label>
                    <input type="text" placeholder="e.g. Sarah Johnson"
                      value={newTestimonial.clientName}
                      onChange={e => setNewTestimonial(t => ({...t, clientName: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Location</label>
                    <input type="text" placeholder="e.g. Sea Point, Cape Town"
                      value={newTestimonial.location}
                      onChange={e => setNewTestimonial(t => ({...t, location: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Service Rendered</label>
                    <input type="text" placeholder="e.g. Deep Cleaning"
                      value={newTestimonial.serviceRendered}
                      onChange={e => setNewTestimonial(t => ({...t, serviceRendered: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Review Quote</label>
                    <textarea rows={3} placeholder="The client's words..."
                      value={newTestimonial.quote}
                      onChange={e => setNewTestimonial(t => ({...t, quote: e.target.value}))}
                      className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm resize-none"
                    />
                  </div>
                </div>
                <button
                  disabled={!newTestimonial.clientName || !newTestimonial.quote || testimonialLoading}
                  onClick={async () => { setTestimonialLoading(true); try { await addTestimonial(newTestimonial); setNewTestimonial(blankTestimonial()); onRefresh(); } catch(e){console.error(e);} finally{setTestimonialLoading(false);} }}
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
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Client Name</label>
                            <input type="text" value={editingTestimonial.clientName}
                              onChange={e => setEditingTestimonial(x => x ? {...x, clientName: e.target.value} : x)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Location</label>
                            <input type="text" value={editingTestimonial.location}
                              onChange={e => setEditingTestimonial(x => x ? {...x, location: e.target.value} : x)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Service Rendered</label>
                            <input type="text" value={editingTestimonial.serviceRendered}
                              onChange={e => setEditingTestimonial(x => x ? {...x, serviceRendered: e.target.value} : x)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Quote</label>
                            <textarea rows={3} value={editingTestimonial.quote}
                              onChange={e => setEditingTestimonial(x => x ? {...x, quote: e.target.value} : x)}
                              className="p-3 border border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-teal outline-none text-sm resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={async () => { if(!editingTestimonial) return; setTestimonialLoading(true); try { await updateTestimonial(editingTestimonial); setEditingTestimonial(null); onRefresh(); } catch(e){console.error(e);} finally{setTestimonialLoading(false);} }}
                            className="h-10 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all flex items-center gap-2">
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
                        <div className="flex items-end justify-between border-t border-gray-50 pt-4">
                          <div>
                            <h5 className="font-bold text-sm text-brand-slate">{t.clientName}</h5>
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">{t.location} • <span className="text-brand-teal">{t.serviceRendered}</span></p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingTestimonial(t)}
                              className="h-9 px-4 text-[10px] uppercase tracking-widest font-bold border border-gray-200 text-gray-400 hover:border-brand-teal hover:text-brand-teal transition-all">
                              Edit
                            </button>
                            <button onClick={async () => { if(!confirm('Delete this review?')) return; await deleteTestimonial(t.id); onRefresh(); }}
                              className="h-9 w-9 flex items-center justify-center text-gray-200 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition-all">
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

          {activeTab === 'jobs' && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <JobManager />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
