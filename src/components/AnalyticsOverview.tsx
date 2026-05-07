/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import type { FC } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { FolderOpen, Star, Wrench, Loader2 } from "lucide-react";

interface StatCard {
  label: string;
  value: number;
  description: string;
  icon: FC<{ className?: string }>;
}

export default function AnalyticsOverview() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const [projectsRes, servicesRes, testimonialsRes] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("services").select("*", { count: "exact", head: true }),
        supabase.from("testimonials").select("*", { count: "exact", head: true }),
      ]);

      setStats([
        {
          label: "Projects Showcased",
          value: projectsRes.count ?? 0,
          description: "Published portfolio items",
          icon: FolderOpen,
        },
        {
          label: "Active Services",
          value: servicesRes.count ?? 0,
          description: "Services listed on site",
          icon: Wrench,
        },
        {
          label: "Client Reviews",
          value: testimonialsRes.count ?? 0,
          description: "Verified testimonials",
          icon: Star,
        },
      ]);

      setLoading(false);
    };

    fetchCounts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-28 mb-12">
        <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
      {stats.map(({ label, value, description, icon: Icon }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white border border-gray-100 p-7 shadow-sm rounded-sm relative overflow-hidden group hover:border-brand-teal/30 transition-all"
        >
          {/* Background watermark icon */}
          <div className="absolute top-4 right-4 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
            <Icon className="w-16 h-16 text-brand-teal" />
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal/20 group-hover:bg-brand-teal/40 transition-colors" />

          <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-400 mb-3">
            {label}
          </p>
          <p className="text-5xl font-serif text-brand-slate font-bold leading-none mb-2">
            {value}
          </p>
          <p className="text-xs text-gray-400 mb-4">{description}</p>
          <Icon className="w-5 h-5 text-brand-teal" />
        </motion.div>
      ))}
    </div>
  );
}
