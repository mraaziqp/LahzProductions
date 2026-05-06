/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { Search, CheckCircle, Clock, Wrench, PackageCheck, Loader2 } from "lucide-react";

type JobStatus = "Scheduled" | "In Progress" | "Quality Check" | "Ready for Delivery";

interface Job {
  id: string;
  tracking_code: string;
  client_name: string;
  item_description: string;
  status: JobStatus;
}

interface StatusStep {
  value: JobStatus;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

const STATUS_STEPS: StatusStep[] = [
  {
    value: "Scheduled",
    label: "Job Scheduled",
    icon: Clock,
    description: "Your job is booked and queued with our team.",
  },
  {
    value: "In Progress",
    label: "In Progress",
    icon: Wrench,
    description: "Our craftsmen are actively working on your item.",
  },
  {
    value: "Quality Check",
    label: "Quality Check",
    icon: Search,
    description: "Final inspection to ensure every detail is perfect.",
  },
  {
    value: "Ready for Delivery",
    label: "Ready for Delivery",
    icon: PackageCheck,
    description: "Your item is complete and ready to go!",
  },
];

export default function JobTracker() {
  const [code, setCode] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setJob(null);

    const { data, error: dbError } = await supabase
      .from("jobs")
      .select("id, tracking_code, client_name, item_description, status")
      .eq("tracking_code", trimmed)
      .single();

    if (dbError || !data) {
      setError("No job found with that tracking code. Please double-check and try again.");
    } else {
      setJob(data as Job);
    }

    setLoading(false);
  };

  const currentStatusIndex = job
    ? STATUS_STEPS.findIndex(s => s.value === job.status)
    : -1;

  return (
    <div className="max-w-xl mx-auto w-full">
      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          maxLength={10}
          placeholder="Enter your tracking code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && !loading && handleTrack()}
          className="flex-1 h-14 px-5 border-2 border-gray-200 bg-white focus:border-brand-teal outline-none transition-all text-sm font-mono font-bold tracking-[0.25em] text-brand-slate placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 rounded-sm"
        />
        <button
          onClick={handleTrack}
          disabled={loading || !code.trim()}
          className="h-14 px-8 bg-brand-teal text-white font-bold uppercase tracking-widest text-xs hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 shadow-lg shadow-brand-teal/20 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-6 px-8 border border-red-100 bg-red-50/50 rounded-sm"
          >
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <p className="text-xs text-red-400 mt-1">
              Contact us on WhatsApp if you need help locating your code.
            </p>
          </motion.div>
        )}

        {job && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Job header card */}
            <div className="bg-white border border-gray-100 p-6 mb-4 shadow-sm rounded-sm">
              <p className="text-[10px] uppercase tracking-widest text-brand-teal font-bold mb-2">
                Tracking #{job.tracking_code}
              </p>
              <h4 className="text-xl font-serif text-brand-slate mb-1">{job.client_name}</h4>
              <p className="text-sm text-gray-500">{job.item_description}</p>
            </div>

            {/* Status timeline */}
            <div className="bg-white border border-gray-100 px-8 py-8 shadow-sm rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-400 mb-8">
                Job Progress
              </p>

              <div className="relative">
                {STATUS_STEPS.map(({ value, label, icon: Icon, description }, index) => {
                  const isCompleted = index < currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const isFuture = index > currentStatusIndex;
                  const isLast = index === STATUS_STEPS.length - 1;

                  return (
                    <motion.div
                      key={value}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="flex gap-5 relative"
                    >
                      {/* Vertical connector */}
                      {!isLast && (
                        <div
                          className={`absolute left-5 top-10 w-px transition-all ${
                            isCompleted || isCurrent ? "bg-brand-teal/40" : "bg-gray-100"
                          }`}
                          style={{ height: "calc(100% - 2.5rem)" }}
                        />
                      )}

                      {/* Status icon bubble */}
                      <div
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          isCurrent
                            ? "bg-brand-teal shadow-lg shadow-brand-teal/30 ring-4 ring-brand-teal/20"
                            : isCompleted
                            ? "bg-brand-teal/20"
                            : "bg-gray-100"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-brand-teal" />
                        ) : (
                          <Icon
                            className={`w-5 h-5 ${
                              isCurrent ? "text-white" : "text-gray-300"
                            }`}
                          />
                        )}
                      </div>

                      {/* Text content */}
                      <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={`font-bold text-sm transition-all ${
                              isFuture
                                ? "text-gray-300"
                                : isCurrent
                                ? "text-brand-teal"
                                : "text-brand-slate"
                            }`}
                          >
                            {label}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                              Current
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isFuture ? "text-gray-200" : "text-gray-400"
                          }`}
                        >
                          {description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
