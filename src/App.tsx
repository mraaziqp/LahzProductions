/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Sofa, 
  Settings, 
  Hammer, 
  ShieldCheck, 
  Stethoscope, 
  Wind, 
  Car,
  Sun,
  GlassWater,
  ArrowRight, 
  CheckCircle,
  Menu,
  X,
  Lock,
  Loader2,
  MessageCircle,
  ChevronDown,
  Phone
} from "lucide-react";
import { useState, useEffect } from "react";
import { 
  WEBSITE_COPY, 
  Service, 
  Testimonial,
  Project
} from "./constants";
import BeforeAfterSlider from "./components/BeforeAfterSlider";
import AdminDashboard from "./components/AdminDashboard";
import AdminAuth from "./components/AdminAuth";
import QuoteEstimator from "./components/QuoteEstimator";
import JobTracker from "./components/JobTracker";
import { supabase } from "./lib/supabase";
import { fetchProjects, fetchServices, fetchTestimonials, getQuoteByCode, respondToQuote, QuoteRequest } from "./services/database";

const IconMap: { [key: string]: any } = {
  Sofa,
  Settings,
  Hammer,
  ShieldCheck,
  Stethoscope,
  Wind,
  Car,
  Sun,
  GlassWater
};

type ServiceCategory = "Restoration" | "Manufacturing" | "SpecializedCare";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeServiceTab, setActiveServiceTab] = useState<ServiceCategory>("Restoration");
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  // Read pre-filled tracking code from URL ?track=CODE
  const [initialTrackCode] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("track") ?? undefined;
  });

  // Read quote acceptance code from URL ?quote=CODE
  const [quoteCode] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("quote") ?? undefined;
  });
  const [quoteData, setQuoteData] = useState<QuoteRequest | null | 'loading' | 'notfound'>('loading');
  const [quoteResponse, setQuoteResponse] = useState<'accepted' | 'declined' | null>(null);
  const [quoteResponding, setQuoteResponding] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const loadData = async () => {
    try {
      const [p, s, t] = await Promise.all([
        fetchProjects(),
        fetchServices(),
        fetchTestimonials()
      ]);
      setProjects(p);
      setServices(s);
      setTestimonials(t);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load quote data when ?quote=CODE is in the URL
  useEffect(() => {
    if (!quoteCode) { setQuoteData(null); return; }
    getQuoteByCode(quoteCode).then(q => setQuoteData(q ?? 'notfound')).catch(() => setQuoteData('notfound'));
  }, [quoteCode]);

  // Auto-play testimonial carousel
  useEffect(() => {
    if (testimonials.length === 0) return;
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
      </div>
    );
  }

  if (showAdmin) {
    if (!user) {
      return <AdminAuth onLoginSuccess={() => setShowAdmin(true)} />;
    }
    return (
      <AdminDashboard 
        projects={projects}
        services={services}
        testimonials={testimonials}
        onRefresh={loadData}
        onClose={() => setShowAdmin(false)}
      />
    );
  }

  // ── Quote Acceptance Page ─────────────────────────────────────────────────
  if (quoteCode) {
    const handleRespond = async (response: 'accepted' | 'declined') => {
      if (!quoteCode || quoteData === 'loading' || quoteData === 'notfound' || !quoteData) return;
      setQuoteResponding(true);
      try {
        await respondToQuote(quoteCode, response);
        setQuoteData(prev => (prev && typeof prev === 'object') ? { ...prev, status: response } : prev);
        setQuoteResponse(response);
      } catch { /* ignore */ }
      setQuoteResponding(false);
    };

    return (
      <div className="min-h-screen bg-brand-white flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 justify-center mb-12">
            <span className="text-xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em]">LAHZ <span className="text-brand-yellow">●</span></span>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold border-l pl-2 border-gray-200">Productions</span>
          </div>

          {quoteData === 'loading' && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-brand-teal animate-spin" />
            </div>
          )}

          {quoteData === 'notfound' && (
            <div className="text-center p-10 border border-gray-100 rounded-sm bg-white shadow-sm">
              <p className="text-brand-slate font-serif text-xl mb-2">Quote not found</p>
              <p className="text-gray-400 text-sm">The link may have expired or the code is incorrect.</p>
              <a href="/" className="mt-6 inline-block text-xs uppercase tracking-widest font-bold text-brand-teal hover:opacity-70">← Back to website</a>
            </div>
          )}

          {quoteData && typeof quoteData === 'object' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 shadow-xl rounded-sm overflow-hidden">
              <div className="h-1 bg-brand-teal" />
              <div className="p-8">
                <p className="text-xs uppercase tracking-[0.3em] font-bold text-brand-teal mb-1">Your Quote</p>
                <h2 className="text-2xl font-serif text-brand-slate mb-6">Hi {quoteData.client_name}!</h2>

                <div className="flex flex-col gap-3 mb-6 p-5 bg-gray-50 rounded-sm border border-gray-100">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Item</span>
                    <p className="text-sm text-brand-slate font-medium mt-0.5">{quoteData.item_description}</p>
                  </div>
                  {quoteData.quoted_price && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Quoted Price</span>
                      <p className="text-2xl font-serif text-brand-teal mt-0.5">{quoteData.quoted_price}</p>
                    </div>
                  )}
                  {quoteData.admin_note && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Note from LAHZ</span>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{quoteData.admin_note}</p>
                    </div>
                  )}
                </div>

                {/* Pending — not priced yet */}
                {quoteData.status === 'pending' && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm text-center">
                    <p className="text-sm font-bold text-amber-600">Your quote is being prepared</p>
                    <p className="text-xs text-amber-500 mt-1">Moulana will WhatsApp you with a price within 48 hours.</p>
                  </div>
                )}

                {/* Quoted — awaiting response */}
                {quoteData.status === 'quoted' && !quoteResponse && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-500 text-center mb-2">Would you like to accept this quote?</p>
                    <button onClick={() => handleRespond('accepted')} disabled={quoteResponding}
                      className="h-14 w-full bg-brand-teal text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-brand-teal/20">
                      {quoteResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Yes, Accept Quote
                    </button>
                    <button onClick={() => handleRespond('declined')} disabled={quoteResponding}
                      className="h-12 w-full border border-gray-200 text-sm font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 transition-all rounded-sm disabled:opacity-40">
                      Decline
                    </button>
                  </div>
                )}

                {/* Accepted */}
                {(quoteData.status === 'accepted' || quoteResponse === 'accepted') && (
                  <div className="text-center p-6 bg-teal-50 border border-teal-100 rounded-sm">
                    <CheckCircle className="w-8 h-8 text-brand-teal mx-auto mb-3" />
                    <p className="font-bold text-brand-teal text-lg">Quote Accepted!</p>
                    <p className="text-sm text-gray-500 mt-2">Moulana will be in touch shortly to arrange collection or delivery.</p>
                  </div>
                )}

                {/* Declined */}
                {(quoteData.status === 'declined' || quoteResponse === 'declined') && (
                  <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-sm">
                    <p className="font-bold text-gray-500">Quote Declined</p>
                    <p className="text-sm text-gray-400 mt-2">No problem — feel free to reach out if you change your mind.</p>
                  </div>
                )}
              </div>
              <div className="px-8 pb-6">
                <a href="/" className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-brand-teal transition-all">← Back to website</a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  const categories: { key: ServiceCategory; label: string }[] = [
    { key: "Restoration", label: "Restoration" },
    { key: "Manufacturing", label: "Custom Build" },
    { key: "SpecializedCare", label: "Specialized Care" }
  ];

  const whatsappUrl = `https://wa.me/${WEBSITE_COPY.contact.phone}`;
  const contactSectionId = "contact";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(WEBSITE_COPY.contact.location)}`;

  const filteredServices = services.filter(s => s.category === activeServiceTab);

  return (
    <div className="min-h-screen selection:bg-brand-teal selection:text-white pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-brand-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em] group cursor-default">
              LAHZ <span className="text-brand-yellow">●</span>
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-gray-400 font-semibold border-l pl-2 border-gray-200">
              Productions
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            <a href="#services" className="text-sm uppercase tracking-widest hover:text-brand-teal transition-all">Services</a>
            <a href="#about" className="text-sm uppercase tracking-widest hover:text-brand-teal transition-all">Why Us</a>
            <a href="#gallery" className="text-sm uppercase tracking-widest hover:text-brand-teal transition-all">Showcase</a>
            <a href="#track" className="text-sm uppercase tracking-widest hover:text-brand-teal transition-all">Track Job</a>
            <a
              href={`#${contactSectionId}`}
              className="h-11 px-6 bg-brand-teal text-white text-xs uppercase tracking-widest font-bold hover:bg-brand-teal/90 transition-all rounded-sm shadow-sm flex items-center"
            >
              Contact
            </a>
            <button
              onClick={() => setShowAdmin(true)}
              className="h-11 px-6 border border-gray-200 text-brand-slate text-xs uppercase tracking-widest font-bold hover:bg-gray-50 transition-all rounded-sm flex items-center gap-2"
            >
              <Lock className="w-3 h-3" /> Staff Access
            </button>
          </div>

          <button className="md:hidden h-11 w-11 flex items-center justify-center" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-gray-100 p-6 flex flex-col gap-6 overflow-hidden"
            >
              <a href="#services" onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-widest font-bold py-2">Services</a>
              <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-widest font-bold py-2">Why Us</a>
              <a href="#gallery" onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-widest font-bold py-2">Showcase</a>
              <a href="#track" onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-widest font-bold py-2">Track Job</a>
              <a href={`#${contactSectionId}`} onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-widest font-bold py-2">Contact</a>
              <button onClick={() => { setIsMenuOpen(false); setShowAdmin(true); }} className="text-sm uppercase tracking-widest font-bold py-2 text-left flex items-center gap-2">
                <Lock className="w-4 h-4" /> Staff Access
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-48 pb-16 md:pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif leading-[1.1] text-brand-slate mb-6 md:mb-10">
                {WEBSITE_COPY.hero.headline}
              </h1>
              <p className="text-lg md:text-xl text-gray-500 max-w-xl mb-8 md:mb-12 leading-relaxed font-light">
                {WEBSITE_COPY.hero.subHeadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
                <a 
                  href="#quote"
                  className="h-12 md:h-14 px-10 bg-brand-teal text-white uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-3 group shadow-xl shadow-brand-teal/20"
                >
                  {WEBSITE_COPY.hero.ctaPrimary}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a 
                  href="#services"
                  className="h-12 md:h-14 px-10 border border-gray-200 text-brand-slate uppercase tracking-[0.2em] text-xs font-bold hover:bg-gray-50 transition-all bg-white flex items-center justify-center"
                >
                  {WEBSITE_COPY.hero.ctaSecondary}
                </a>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="relative aspect-square md:aspect-[5/6] bg-brand-slate rounded-sm overflow-hidden hidden lg:block"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-teal/20 to-transparent" />
              <div className="absolute inset-x-8 bottom-8 p-10 bg-white/95 backdrop-blur-md border border-white shadow-2xl">
                <div className="flex items-center gap-4 text-brand-teal mb-4">
                  <CheckCircle className="w-6 h-6 text-brand-yellow" />
                  <span className="text-xs uppercase tracking-[0.3em] font-bold">10+ Years of Excellence</span>
                </div>
                <p className="text-lg font-serif italic text-gray-700 leading-relaxed font-light">
                  "Anything & everything in upholstery—we design, manufacture, restore, and maintain to the highest standards."
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Job Tracker Section */}
      <section id="track" className="py-20 md:py-28 px-6 bg-gray-50 border-y border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-brand-teal font-extrabold mb-6 block">
                Live Updates
              </span>
              <h2 className="text-4xl md:text-6xl font-serif text-brand-slate leading-tight mb-6">
                Track your <br className="hidden md:block" />
                <span className="italic text-brand-teal">job progress</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed font-light max-w-md">
                Enter the tracking code we sent you to see exactly where your item is — from 
                the moment it's booked to the day it's ready for collection.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  { step: '01', label: 'Scheduled', desc: 'Booked & in the queue.' },
                  { step: '02', label: 'Prepping / Stripping', desc: 'Item being prepared.' },
                  { step: '03', label: 'In Production', desc: 'Our team is actively working on it.' },
                  { step: '04', label: 'Quality Check', desc: 'Final inspection underway.' },
                  { step: '05', label: 'Ready for Delivery', desc: 'Your item is complete!' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-brand-teal/40 w-6">{s.step}</span>
                    <span className="text-sm font-bold text-brand-slate">{s.label}</span>
                    <span className="text-xs text-gray-400">— {s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-100 p-8 md:p-12 shadow-sm rounded-sm">
              <JobTracker initialCode={initialTrackCode} />
            </div>
          </div>
        </div>
      </section>

      {/* Optimized Services (Tabbed Interface) */}
      <section id="services" className="py-20 md:py-32 bg-white border-y border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center md:text-left mb-16">
            <span className="text-xs uppercase tracking-[0.4em] text-brand-teal font-extrabold mb-6 block">Full-Service Spectrum</span>
            <h2 className="text-4xl md:text-6xl font-serif text-brand-slate leading-tight mb-12">
              Bespoke solutions <br className="hidden md:block" /> for every surface
            </h2>
            
            {/* Tabs Trigger - Mobile Scrollable */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 mb-12 p-1 bg-gray-50 rounded-lg w-fit md:mx-0 -mx-6 px-6">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveServiceTab(cat.key)}
                  className={`h-11 px-6 whitespace-nowrap text-[10px] uppercase tracking-widest font-bold transition-all rounded-md ${activeServiceTab === cat.key ? 'bg-white text-brand-teal shadow-sm ring-1 ring-black/5 border-b-2 border-brand-yellow' : 'text-gray-400 hover:text-brand-slate'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeServiceTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="contents"
              >
                {filteredServices.map((service, i) => {
                  const Icon = IconMap[service.iconName] || Sofa;
                  return (
                    <div
                      key={service.id}
                      className="p-8 md:p-10 bg-white border border-gray-100 hover:border-brand-yellow/40 hover:shadow-2xl transition-all group relative rounded-sm"
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-white border border-gray-100 flex items-center justify-center text-brand-teal mb-6 md:mb-8 group-hover:bg-brand-teal group-hover:text-white transition-all transform group-hover:rotate-6">
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-serif mb-4 md:mb-5 text-brand-slate">{service.title}</h3>
                      <p className="text-sm md:text-base text-gray-500 leading-relaxed font-light">
                        {service.shortDescription}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 md:py-32 px-6 relative overflow-hidden scroll-mt-20">
        <div className="absolute top-0 right-0 w-full md:w-1/4 h-full bg-brand-teal/5 -skew-x-6 translate-x-20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <div className="max-w-xl">
                <span className="text-xs uppercase tracking-[0.4em] text-brand-teal font-extrabold mb-8 block">Our Journey</span>
                <h2 className="text-4xl md:text-7xl font-serif text-brand-slate mb-8 md:mb-12 leading-[1.1]">
                  {WEBSITE_COPY.about.title}
                </h2>
                <div className="space-y-6">
                  <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-light italic border-l-4 border-brand-yellow pl-6">
                    {WEBSITE_COPY.about.intro}
                  </p>
                  
                  {/* Collapsible Full Story */}
                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                      className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-teal hover:opacity-80 transition-all"
                    >
                      {isAboutExpanded ? "Hide Our Story" : "Read Our Full Story"}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isAboutExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isAboutExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 text-sm text-gray-500 leading-relaxed text-columns-1 md:columns-1 space-y-4">
                            {WEBSITE_COPY.about.fullStory.split('\n\n').map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:block hidden"
            >
              <div className="aspect-[4/5] bg-brand-slate p-2 shadow-2xl relative group">
                <div className="w-full h-full border border-white/20 flex flex-col items-center justify-center text-center px-12 relative z-20">
                  <span className="text-7xl font-serif text-brand-yellow italic mb-6">Honest.</span>
                  <p className="text-xs uppercase tracking-[0.4em] font-bold text-white mb-2 underline decoration-brand-teal underline-offset-8">All-in-One Approach</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40 max-w-[200px] mt-4">We never outsource. Every piece is handled by our skilled team.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section — always visible */}
      <section className="py-20 md:py-28 bg-brand-slate text-white relative overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.5em] text-brand-teal font-extrabold mb-6 block">Simple Process</span>
            <h2 className="text-3xl md:text-5xl font-serif leading-tight">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { step: '01', title: 'Tell Us What You Need', desc: 'Fill in the quote form or send us a WhatsApp. Describe your item, what needs doing, and where you are located.' },
              { step: '02', title: 'We Assess & Quote', desc: 'We review every request personally. Within 48 hours we send a detailed, honest quote — no hidden costs, no pressure.' },
              { step: '03', title: 'We Get To Work', desc: 'Once approved, our team handles everything in-house. You get real-time updates until your item is ready for collection or delivery.' },
            ].map(({ step, title, desc }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col gap-4 border-t-2 border-brand-teal pt-8"
              >
                <span className="text-5xl font-serif text-brand-teal/30 font-bold leading-none">{step}</span>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed font-light">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section — always anchored so nav works; content shown when projects exist */}
      <section id="gallery" className="py-20 md:py-32 bg-brand-slate text-white relative overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 md:mb-24">
            <span className="text-xs uppercase tracking-[0.5em] text-brand-teal font-extrabold mb-6 block">Real-World Restorations</span>
            <h2 className="text-3xl md:text-6xl font-serif leading-tight">
              {WEBSITE_COPY.trust.galleryHeadline}
            </h2>
          </div>
          {projects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-10 md:gap-16">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <BeforeAfterSlider 
                    before={project.beforeImage} 
                    after={project.afterImage} 
                    title={project.title}
                    location={project.location}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-white/10 rounded-sm">
              <p className="text-white/40 text-sm uppercase tracking-widest font-bold">Portfolio coming soon</p>
              <p className="text-white/25 text-xs mt-2">Our before &amp; after showcase will appear here once projects are added.</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonial Carousel — only shown when testimonials exist */}
      {testimonials.length > 0 && (
      <section id="testimonials" className="py-20 md:py-32 px-6 bg-brand-white scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-brand-teal font-extrabold mb-8 block font-sans">The Guild Registry</span>
          
          <div className="relative h-[450px] md:h-[350px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {testimonials.map((t, index) => index === testimonialIndex && (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white p-8 md:p-16 border border-gray-100 shadow-xl rounded-sm absolute inset-0 flex flex-col justify-center"
                >
                  <p className="text-xl md:text-3xl text-gray-700 italic mb-10 leading-relaxed font-serif font-light">
                    "{t.quote}"
                  </p>
                  <div className="mt-4 border-t border-gray-50 pt-8">
                    <h5 className="font-bold text-sm md:text-base text-brand-slate tracking-wide mb-1">{t.clientName}</h5>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-brand-teal font-extrabold">{t.location} • {t.serviceRendered}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-3 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIndex(i)}
                className={`h-1.5 transition-all rounded-full ${i === testimonialIndex ? 'w-8 bg-brand-yellow' : 'w-2 bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Quote Estimator Section */}
      <section id="quote" className="py-20 md:py-32 px-6 bg-white border-y border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-brand-teal font-extrabold mb-6 block">
                Quote Request
              </span>
              <h2 className="text-4xl md:text-6xl font-serif text-brand-slate leading-tight mb-6">
                Hear back within <br className="hidden md:block" />
                <span className="italic text-brand-teal">48 hours</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed font-light max-w-md">
                Tell us what you need and send through the details on WhatsApp.
                We will review the request, assess the work involved, and send a
                personalised quote within 48 hours.
              </p>
            </div>
            <QuoteEstimator />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-16 md:py-24 border-t border-gray-100 bg-white relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-center md:text-left">
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-brand-teal">Location</span>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-serif text-brand-slate hover:text-brand-teal transition-colors">
                {WEBSITE_COPY.contact.location}
              </a>
            </div>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-brand-teal">Direct Line</span>
              <a href={`tel:${WEBSITE_COPY.contact.phone}`} className="text-sm font-serif text-brand-slate hover:text-brand-teal transition-colors">
                {WEBSITE_COPY.contact.phone}
              </a>
            </div>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-brand-teal">Email</span>
              <a href={`mailto:${WEBSITE_COPY.contact.email}`} className="text-sm font-serif text-brand-slate hover:text-brand-teal transition-colors">
                {WEBSITE_COPY.contact.email}
              </a>
            </div>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-brand-teal">Trading Hours</span>
              <p className="text-sm font-serif text-brand-slate">{WEBSITE_COPY.contact.hours}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-10 border-t border-gray-50 pt-12">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em]">
                LAHZ <span className="text-brand-yellow">●</span>
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 md:gap-10 text-[10px] uppercase tracking-[0.3em] font-extrabold text-gray-400">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-brand-teal transition-colors">WhatsApp</a>
              <a href="#" className="hover:text-brand-teal transition-colors">Instagram</a>
              <button 
                onClick={() => setShowAdmin(true)}
                className="flex items-center gap-2 text-gray-300 hover:text-brand-teal transition-colors"
              >
                <Lock className="w-3 h-3" /> Staff Access
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-300 font-bold">
              © {new Date().getFullYear()} LAHZ Productions. Quality Assured.
            </p>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-100 z-[100] flex gap-3 shadow-2xl">
        <a 
          href="#quote"
          className="flex-1 h-12 bg-brand-teal text-white text-[10px] uppercase tracking-[0.2em] font-extrabold flex items-center justify-center gap-2 rounded-sm active:scale-[0.98] transition-all"
        >
          <MessageCircle className="w-4 h-4 fill-current text-brand-yellow" /> Request Quote
        </a>
        <a 
          href={`tel:${WEBSITE_COPY.contact.phone}`}
          className="flex-1 h-12 bg-brand-slate text-white text-[10px] uppercase tracking-[0.2em] font-extrabold flex items-center justify-center gap-2 rounded-sm active:scale-[0.98] transition-all"
        >
          <Phone className="w-4 h-4" /> Call Studio
        </a>
      </div>
    </div>
  );
}
