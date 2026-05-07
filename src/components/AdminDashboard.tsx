/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
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
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Service, Testimonial } from '../constants';
import {
  uploadProject, deleteProject,
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

  const onDropBefore = useCallback((acceptedFiles: File[]) => {
    setNewProject(prev => ({ ...prev, beforeImageFile: acceptedFiles[0] }));
  }, []);

  const onDropAfter = useCallback((acceptedFiles: File[]) => {
    setNewProject(prev => ({ ...prev, afterImageFile: acceptedFiles[0] }));
  }, []);

  const { getRootProps: getRootPropsBefore, getInputProps: getInputPropsBefore } = useDropzone({ onDrop: onDropBefore, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, multiple: false } as any);

  const { getRootProps: getRootPropsAfter, getInputProps: getInputPropsAfter } = useDropzone({ onDrop: onDropAfter, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, multiple: false } as any);

  const handleAddProject = async () => {
    if (newProject.title && (newProject as any).beforeImageFile && (newProject as any).afterImageFile) {
      setLoading(true);
      try {
        await uploadProject({
          title: newProject.title,
          location: newProject.location || "Cape Town",
          category: newProject.category as any,
          beforeImage: (newProject as any).beforeImageFile,
          afterImage: (newProject as any).afterImageFile,
        });
        setNewProject({ category: 'Cleaning' });
        onRefresh();
      } catch (err) {
        console.error(err);
        alert('Failed to upload project');
      } finally {
        setLoading(false);
      }
    }
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

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Before Image</label>
                    <div 
                      {...getRootPropsBefore()} 
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${(newProject as any).beforeImageFile ? 'border-brand-teal bg-teal-50/10' : 'border-gray-200 hover:border-brand-teal/50'}`}
                    >
                      <input {...getInputPropsBefore()} />
                      {(newProject as any).beforeImageFile ? (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-8 h-8 text-brand-teal mb-2" />
                          <span className="text-[10px] uppercase font-bold text-brand-teal">Ready to upload</span>
                          <span className="text-[8px] text-gray-400 mt-1">{(newProject as any).beforeImageFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-gray-300 mb-2" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Drag & Drop Before</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">After Image</label>
                    <div 
                      {...getRootPropsAfter()} 
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${(newProject as any).afterImageFile ? 'border-brand-teal bg-teal-50/10' : 'border-gray-200 hover:border-brand-teal/50'}`}
                    >
                      <input {...getInputPropsAfter()} />
                      {(newProject as any).afterImageFile ? (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-8 h-8 text-brand-teal mb-2" />
                          <span className="text-[10px] uppercase font-bold text-brand-teal">Ready to upload</span>
                          <span className="text-[8px] text-gray-400 mt-1">{(newProject as any).afterImageFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-gray-300 mb-2" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Drag & Drop After</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-8">
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

                <button 
                  onClick={handleAddProject}
                  disabled={!newProject.title || !(newProject as any).beforeImageFile || !(newProject as any).afterImageFile || loading}
                  className="w-full py-5 bg-brand-teal text-white uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-teal/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-brand-teal/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                  {loading ? 'Processing Uploads...' : 'Publish to Live Gallery'}
                </button>
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
