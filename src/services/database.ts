/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { Project, Service, Testimonial } from '../constants';

// --- Fetching Data ---

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map snake_case to camelCase
  return data.map((p: any) => ({
    id: p.id,
    title: p.title,
    location: p.location,
    category: p.category,
    beforeImage: p.before_image_url,
    afterImage: p.after_image_url,
    galleryImages: p.gallery_images ?? undefined,
  }));
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map((s: any) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    shortDescription: s.short_description,
    iconName: s.icon_name,
  }));
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((t: any) => ({
    id: t.id,
    clientName: t.client_name,
    location: t.location,
    serviceRendered: t.service_rendered,
    quote: t.quote,
  }));
}

// --- Uploading/Mutating Data ---

// Constants for validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates that a file meets image upload requirements
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_FORMATS.includes(file.type)) {
    return { valid: false, error: 'Invalid format. Please use JPG, PNG, or WebP' };
  }

  return { valid: true };
}

async function uploadImage(file: File, path: string): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Image validation failed');
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const fullPath = `${path}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery-images')
    .upload(fullPath, file, { contentType: file.type });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(fullPath);

  return data.publicUrl;
}

// Single-photo modes are stored under a folder named after the mode;
// BeforeAfterSlider reads the folder from the URL to pick the badge/styling.
export type SinglePhotoMode = 'composite' | 'single' | 'beforeOnly' | 'afterOnly';

const SINGLE_MODE_PATH: Record<SinglePhotoMode, string> = {
  composite: 'composite',
  single: 'single',
  beforeOnly: 'before-only',
  afterOnly: 'after-only',
};

export async function uploadProject(projectData: {
  title: string;
  location?: string;
  category: Project['category'];
} & (
  | { mode: 'beforeAfter'; before: File; after: File }
  | { mode: SinglePhotoMode; image: File }
)): Promise<void> {
  if (!projectData.title.trim()) {
    throw new Error('Project title is required');
  }

  let beforeUrl: string;
  let afterUrl: string;

  if (projectData.mode === 'beforeAfter') {
    try {
      beforeUrl = await uploadImage(projectData.before, 'before');
    } catch (error) {
      throw new Error(`Failed to upload before image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    try {
      afterUrl = await uploadImage(projectData.after, 'after');
    } catch (error) {
      throw new Error(`Failed to upload after image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Single image: upload once and store the same URL in both columns
    try {
      beforeUrl = afterUrl = await uploadImage(projectData.image, SINGLE_MODE_PATH[projectData.mode]);
    } catch (error) {
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const { error } = await supabase
    .from('projects')
    .insert([{
      title: projectData.title.trim(),
      location: projectData.location?.trim() || 'Not specified',
      category: projectData.category,
      before_image_url: beforeUrl,
      after_image_url: afterUrl,
    }]);

  if (error) {
    throw new Error(`Failed to save project: ${error.message}`);
  }
}

export async function uploadGalleryProject(projectData: {
  title: string;
  location?: string;
  category: Project['category'];
  galleryFiles: File[];
}): Promise<void> {
  if (!projectData.title.trim()) throw new Error('Project title is required');
  if (projectData.galleryFiles.length < 2) throw new Error('Please add at least 2 photos for a gallery');

  const imageUrls: string[] = [];
  for (const file of projectData.galleryFiles) {
    const url = await uploadImage(file, 'gallery');
    imageUrls.push(url);
  }

  const { error } = await supabase
    .from('projects')
    .insert([{
      title: projectData.title.trim(),
      location: projectData.location?.trim() || 'Not specified',
      category: projectData.category,
      before_image_url: imageUrls[0],
      after_image_url: imageUrls[0],
      gallery_images: imageUrls,
    }]);

  if (error) throw new Error(`Failed to save gallery project: ${error.message}`);
}

export async function updateService(service: Service): Promise<void> {
  const { error } = await supabase
    .from('services')
    .update({
      title: service.title,
      category: service.category,
      short_description: service.shortDescription,
      icon_name: service.iconName,
    })
    .eq('id', service.id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// --- Job WIP Photo Upload ---

export async function uploadWipPhoto(file: File, jobId: string): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${jobId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('wip-photos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`WIP upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('wip-photos').getPublicUrl(path);
  return data.publicUrl;
}

// --- Testimonials CRUD ---

export async function addTestimonial(t: Omit<Testimonial, 'id'>): Promise<void> {
  const { error } = await supabase.from('testimonials').insert([{
    client_name: t.clientName,
    location: t.location,
    service_rendered: t.serviceRendered,
    quote: t.quote,
  }]);
  if (error) throw error;
}

export async function updateTestimonial(t: Testimonial): Promise<void> {
  const { error } = await supabase.from('testimonials').update({
    client_name: t.clientName,
    location: t.location,
    service_rendered: t.serviceRendered,
    quote: t.quote,
  }).eq('id', t.id);
  if (error) throw error;
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw error;
}

// --- Services CRUD ---

export async function addService(s: Omit<Service, 'id'>): Promise<void> {
  const { error } = await supabase.from('services').insert([{
    title: s.title,
    category: s.category,
    short_description: s.shortDescription,
    icon_name: s.iconName,
  }]);
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// --- Public lookups (job tracker / quote page) ---

// Logged-out visitors can only read the one job or quote whose code they send
// in this header; the RLS policies in MIGRATION_SECURITY.sql enforce it, and
// column grants limit them to the fields below.
const LOOKUP_HEADER = 'x-lookup-code';

const PUBLIC_JOB_COLUMNS = 'tracking_code, client_name, item_description, status, wip_image_url, latest_note';
const PUBLIC_QUOTE_COLUMNS = 'quote_code, client_name, item_description, status, quoted_price, admin_note';

export interface TrackedJob {
  tracking_code: string;
  client_name: string;
  item_description: string;
  status: string;
  wip_image_url: string | null;
  latest_note: string | null;
}

export async function trackJob(code: string): Promise<TrackedJob | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(PUBLIC_JOB_COLUMNS)
    .eq('tracking_code', code)
    .setHeader(LOOKUP_HEADER, code)
    .maybeSingle();
  if (error) throw error;
  return data as TrackedJob | null;
}

// --- Quote Requests ---

export interface QuoteRequest {
  id: string;
  quote_code: string;
  client_name: string;
  client_phone: string;
  suburb: string | null;
  service_category: string | null;
  item_description: string | null;
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  quoted_price: string | null;
  admin_note: string | null;
  created_at: string;
}

// The subset of a quote a customer sees on their quote link.
export type QuoteView = Pick<QuoteRequest, 'quote_code' | 'client_name' | 'item_description' | 'status' | 'quoted_price' | 'admin_note'>;

function generateQuoteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'QT-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Saves a customer quote request and returns its quote code. */
export async function saveQuoteRequest(data: {
  client_name: string;
  client_phone: string;
  suburb: string;
  service_category: string;
  item_description: string;
}): Promise<string> {
  // Retry a few times in the rare case of quote_code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const quote_code = generateQuoteCode();
    const { error } = await supabase.from('quote_requests').insert({ ...data, quote_code });
    if (!error) return quote_code;
    if (error.code !== '23505') throw error;
  }
  throw new Error('Failed to generate a unique quote code. Please try again.');
}

export async function fetchQuoteRequests(): Promise<QuoteRequest[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as QuoteRequest[];
}

export async function getQuoteByCode(code: string): Promise<QuoteView | null> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select(PUBLIC_QUOTE_COLUMNS)
    .eq('quote_code', code)
    .setHeader(LOOKUP_HEADER, code)
    .maybeSingle();
  if (error) throw error;
  return data as QuoteView | null;
}

export async function sendQuoteToClient(id: string, quoted_price: string, admin_note: string): Promise<void> {
  const { error } = await supabase
    .from('quote_requests')
    .update({ status: 'quoted', quoted_price, admin_note })
    .eq('id', id);
  if (error) throw error;
}

export async function adminDeclineQuote(id: string): Promise<void> {
  const { error } = await supabase
    .from('quote_requests')
    .update({ status: 'declined' })
    .eq('id', id);
  if (error) throw error;
}

export async function respondToQuote(code: string, response: 'accepted' | 'declined'): Promise<void> {
  // Count instead of returning the row: visitors can't read every column back.
  const { count, error } = await supabase
    .from('quote_requests')
    .update({ status: response }, { count: 'exact' })
    .eq('quote_code', code)
    .eq('status', 'quoted')
    .setHeader(LOOKUP_HEADER, code);
  if (error) throw error;
  if (!count) throw new Error('This quote can no longer be changed.');
}
