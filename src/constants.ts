/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  title: string;
  location: string;
  category: "Cleaning" | "Craftsmanship";
  beforeImage: string;
  afterImage: string;
  galleryImages?: string[];
}


export const WEBSITE_COPY = {
  hero: {
    headline: "Complete Upholstery Solutions for Homes & Businesses",
    subHeadline: "Anything & everything in upholstery. From heritage restoration to custom manufacturing and surgical-grade deep cleaning.",
    ctaPrimary: "Request Quote",
    ctaSecondary: "Our Services",
  },
  about: {
    title: "A Decade of Master Craftsmanship",
    intro: "We are a dedicated team with over 10 years of experience in the upholstery industry. What started as a small repair-focused service has grown into a full-service business offering furniture restoration, custom manufacturing, and professional cleaning.",
    fullStory: "Our journey began with simple repairs, but as our skills and reputation grew, so did our services. Today, we not only repair furniture—we design, manufacture, restore, and maintain it to the highest standards. What sets us apart is our honest, all-in-one approach. If your furniture doesn’t need repairs, we’ll tell you.\n\nIn many cases, a professional deep clean is all that’s needed—and because we understand how furniture is built from the inside out, we know exactly how to clean it safely without causing damage, watermarks, or lingering odors. Unlike many providers, we don’t outsource. Every service is handled by our trusted, skilled team, ensuring consistent quality, reliability, faster turnaround times, and cost savings for our clients.",
  },
  trust: {
    galleryHeadline: "Technical Precision: Before & After",
  },
  contact: {
    phone: "0622618608",
    email: "lazreupholstery@gmail.com",
    location: "Maitland, Cape Town",
    hours: "Mon-Fri 8:30 AM - 5:30 PM",
  }
};

export interface Service {
  id: string;
  title: string;
  category: "Restoration" | "Manufacturing" | "SpecializedCare";
  shortDescription: string;
  iconName: string;
}


export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  serviceRendered: string;
  quote: string;
}


