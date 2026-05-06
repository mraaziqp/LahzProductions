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
}

export const PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Vintage Leather Couch Restoration",
    location: "Sea Point",
    category: "Craftsmanship",
    beforeImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800",
    afterImage: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "p2",
    title: "Deep Clean & Sanitization",
    location: "Tamboerskloof",
    category: "Cleaning",
    beforeImage: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
    afterImage: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=800",
  }
];

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

export const SERVICES: Service[] = [
  // Restoration
  {
    id: "s1",
    title: "Upholstery Restoration",
    category: "Restoration",
    shortDescription: "Complete reupholstering, redesigning, and upgrading of heritage and modern furniture.",
    iconName: "Sofa",
  },
  {
    id: "s2",
    title: "Leather Care & Repair",
    category: "Restoration",
    shortDescription: "Master restoration for leather: re-dyeing, crack/burn repairs, polishing, and deep conditioning.",
    iconName: "Wind",
  },
  {
    id: "s3",
    title: "Recliner & Sofa Repair",
    category: "Restoration",
    shortDescription: "Expert mechanical and structural repairs for recliners and weighted lounge suites.",
    iconName: "Settings",
  },
  // Manufacturing
  {
    id: "s4",
    title: "Custom Manufacturing",
    category: "Manufacturing",
    shortDescription: "Bespoke headboards, ottomans, sofas, and chairs designed and built to your exact specs.",
    iconName: "Hammer",
  },
  {
    id: "s5",
    title: "Automotive Upholstery",
    category: "Manufacturing",
    shortDescription: "Complete car interior transformations: seats, panels, and roof linings.",
    iconName: "Car",
  },
  {
    id: "s6",
    title: "Outdoor Solutions",
    category: "Manufacturing",
    shortDescription: "Custom pool covers and outdoor seating using premium UV and water-resistant fabrics.",
    iconName: "Sun",
  },
  // Specialized Care
  {
    id: "s7",
    title: "Professional Deep Cleaning",
    category: "SpecializedCare",
    shortDescription: "Surgical-grade cleaning for furniture, carpets, and mattresses removing all allergens.",
    iconName: "ShieldCheck",
  },
  {
    id: "s8",
    title: "Specialized Equipment",
    category: "SpecializedCare",
    shortDescription: "Precise upholstery repairs for dental chairs and specialized medical/industrial seating.",
    iconName: "Stethoscope",
  },
  {
    id: "s9",
    title: "Scotchgard Protection",
    category: "SpecializedCare",
    shortDescription: "Professional grade stain protection treatments for interior and exterior furniture.",
    iconName: "GlassWater",
  },
];

export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  serviceRendered: string;
  quote: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    clientName: "Sarah M.",
    location: "Sea Point",
    serviceRendered: "Full Upholstery Restoration",
    quote: "I thought my heirloom couch was beyond saving. They didn't just clean it; they restored its soul. Truly elite work.",
  },
  {
    id: "t2",
    clientName: "David K.",
    location: "Tamboerskloof",
    serviceRendered: "Custom Kitchen Cabinetry",
    quote: "The precision in their woodwork is staggering. It's rare to find a team that understands both the art and the technicality.",
  },
  {
    id: "t3",
    clientName: "Elena R.",
    location: "Constantia",
    serviceRendered: "Deep Cleaning & Odor Removal",
    quote: "Highly professional and meticulous. My rugs look brand new, and the team was a joy to have in the house.",
  },
];

