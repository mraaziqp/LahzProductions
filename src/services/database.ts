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

async function uploadImage(file: string | File, path: string): Promise<string> {
  // If it's already a URL, return it
  if (typeof file === 'string' && file.startsWith('http')) return file;

  // Convert base64/dataURL to blob if necessary
  let blob: Blob;
  if (typeof file === 'string') {
    const response = await fetch(file);
    blob = await response.blob();
  } else {
    blob = file;
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const fullPath = `${path}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery-images')
    .upload(fullPath, blob);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(fullPath);

  return data.publicUrl;
}

export async function uploadProject(projectData: Partial<Project>): Promise<void> {
  const beforeUrl = await uploadImage(projectData.beforeImage!, 'before');
  const afterUrl = await uploadImage(projectData.afterImage!, 'after');

  const { error } = await supabase
    .from('projects')
    .insert([{
      title: projectData.title,
      location: projectData.location,
      category: projectData.category,
      before_image_url: beforeUrl,
      after_image_url: afterUrl,
    }]);

  if (error) throw error;
}

export async function updateService(service: Service): Promise<void> {
  const { error } = await supabase
    .from('services')
    .upsert({
      id: service.id.includes('v-') ? undefined : service.id, // Handle potential temp IDs
      title: service.title,
      category: service.category,
      short_description: service.shortDescription,
      icon_name: service.iconName
    });
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}
