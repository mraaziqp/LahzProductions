/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wind, Sofa, ArrowRight, ArrowLeft, CheckCircle, MessageCircle, Loader2 } from "lucide-react";
import { saveQuoteRequest } from "../services/database";
import { WEBSITE_COPY } from "../constants";
import { isValidPhone, reserveTab, waLink } from "../lib/whatsapp";

type Category = "Deep Cleaning" | "Upholstery/Repair";

interface CleaningItem {
  name: string;
  sizes?: string[];
}

interface RepairItem {
  name: string;
  quantities?: number[];
}

const CLEANING_ITEMS: CleaningItem[] = [
  { name: "Couch", sizes: ["2-Seater", "3-Seater", "L-Shape", "Corner Suite"] },
  { name: "Mattress", sizes: ["Single", "Double", "Queen", "King"] },
  { name: "Carpet" },
  { name: "Car Seats" },
  { name: "Curtains" },
];

const REPAIR_ITEMS: RepairItem[] = [
  { name: "Dining Chair", quantities: [1, 2, 4, 6, 8] },
  { name: "Sofa" },
  { name: "Ottoman" },
  { name: "Office Chair" },
  { name: "Headboard" },
  { name: "Custom Build" },
];

interface FormData {
  category: Category | null;
  item: string;
  size: string;
  quantity: number;
  name: string;
  phone: string;
  suburb: string;
}

const slideVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

export default function QuoteEstimator() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when the browser blocked the WhatsApp tab, so we show a manual link instead.
  const [fallbackWaUrl, setFallbackWaUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    category: null,
    item: "",
    size: "",
    quantity: 1,
    name: "",
    phone: "",
    suburb: "",
  });

  const handleCategorySelect = (cat: Category) => {
    setForm(f => ({ ...f, category: cat, item: "", size: "", quantity: 1 }));
    setStep(2);
  };

  const handleItemSelect = (item: string) => {
    setForm(f => ({ ...f, item, size: "" }));
  };

  const currentCleanItem = CLEANING_ITEMS.find(i => i.name === form.item);
  const currentRepairItem = REPAIR_ITEMS.find(i => i.name === form.item);

  const canProceedToStep3 =
    !!form.item &&
    !(form.category === "Deep Cleaning" && currentCleanItem?.sizes && !form.size);

  const itemDetails =
    form.category === "Deep Cleaning"
      ? `${form.size ? form.size + " " : ""}${form.item}`
      : `${form.quantity > 1 ? form.quantity + "x " : ""}${form.item}`;

  const phoneValid = isValidPhone(form.phone);
  const canSubmit = !!(form.name.trim() && phoneValid && form.suburb.trim());

  const buildWhatsAppMessage = (quoteCode: string): string => {
    const msg =
      `Hi LAHZ Productions, I'd like a quote for ${form.category} - ${itemDetails} in ${form.suburb.trim()}. ` +
      `My name is ${form.name.trim()}. Contact: ${form.phone.trim()} (Ref: ${quoteCode})`;
    return waLink(msg, WEBSITE_COPY.contact.phoneIntl);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    // Reserve the WhatsApp tab now, while we are still inside the tap/click.
    const tab = reserveTab();
    setSubmitting(true);
    setSubmitError(null);
    setFallbackWaUrl(null);
    try {
      const quoteCode = await saveQuoteRequest({
        client_name: form.name.trim(),
        client_phone: form.phone.trim(),
        suburb: form.suburb.trim(),
        service_category: form.category ?? '',
        item_description: itemDetails,
      });
      const url = buildWhatsAppMessage(quoteCode);
      if (!tab.go(url)) setFallbackWaUrl(url);
      setSubmitted(true);
    } catch (err: unknown) {
      tab.cancel();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSubmitError(`Could not save your request (${msg}). Please try again or contact us directly on WhatsApp.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-sm overflow-hidden max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-full bg-brand-teal"
          animate={{ width: submitted ? '100%' : `${(step / 3) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 min-h-[320px] flex flex-col items-center justify-center text-center gap-5"
        >
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-brand-teal" />
          </div>
          <div>
            <h3 className="text-2xl font-serif text-brand-slate mb-2">Request submitted successfully.</h3>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Thank you for your enquiry. We will review your requirements and send a
              personalised quotation via WhatsApp within 48 hours. You will be able to
              accept or decline directly from that message.
            </p>
          </div>
          {fallbackWaUrl && (
            <a
              href={fallbackWaUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 h-12 px-6 bg-green-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all rounded-sm"
            >
              <MessageCircle className="w-4 h-4" /> Also send on WhatsApp
            </a>
          )}
          <button
            onClick={() => { setSubmitted(false); setFallbackWaUrl(null); setStep(1); setForm({ category: null, item: '', size: '', quantity: 1, name: '', phone: '', suburb: '' }); }}
            className="text-xs uppercase tracking-widest font-bold text-brand-teal hover:opacity-70 transition-all mt-2"
          >
            Submit a new request
          </button>
        </motion.div>
      ) : (
      <>
      {/* Step indicators */}
      <div className="flex items-center gap-2 px-5 sm:px-8 pt-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                step > s
                  ? "bg-brand-teal text-white"
                  : step === s
                  ? "bg-brand-teal text-white ring-4 ring-brand-teal/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-6 sm:w-10 h-px transition-all ${step > s ? "bg-brand-teal" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-auto text-[10px] uppercase tracking-widest text-gray-400 font-bold">
          Step {step} / 3
        </span>
      </div>

      <div className="p-5 sm:p-8 min-h-[320px]">
        <AnimatePresence mode="wait">
          {/* ─── Step 1: Category ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28 }}
            >
              <h3 className="text-2xl font-serif text-brand-slate mb-1">What do you need?</h3>
              <p className="text-sm text-gray-400 mb-8">Select a category to get started.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    {
                      value: "Deep Cleaning" as Category,
                      label: "Deep Cleaning",
                      icon: Wind,
                      desc: "Couches, mattresses, carpets & more",
                    },
                    {
                      value: "Upholstery/Repair" as Category,
                      label: "Upholstery / Repair",
                      icon: Sofa,
                      desc: "Restore, repair or custom build",
                    },
                  ] as const
                ).map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => handleCategorySelect(value)}
                    className="group p-6 border-2 border-gray-100 hover:border-brand-teal text-left transition-all rounded-sm active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 bg-gray-50 group-hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal mb-4 transition-all rounded-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-brand-slate mb-1">{label}</h4>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Item Details ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28 }}
            >
              <h3 className="text-2xl font-serif text-brand-slate mb-1">
                {form.category === "Deep Cleaning" ? "What needs cleaning?" : "What needs work?"}
              </h3>
              <p className="text-sm text-gray-400 mb-6">Select your item type.</p>

              {/* Item chips */}
              <div className="flex flex-wrap gap-3 mb-6">
                {(form.category === "Deep Cleaning" ? CLEANING_ITEMS : REPAIR_ITEMS).map(
                  ({ name }) => (
                    <button
                      key={name}
                      onClick={() => handleItemSelect(name)}
                      className={`px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all rounded-sm border-2 active:scale-[0.98] ${
                        form.item === name
                          ? "bg-brand-teal text-white border-brand-teal"
                          : "border-gray-200 text-gray-500 hover:border-brand-teal hover:text-brand-teal"
                      }`}
                    >
                      {name}
                    </button>
                  )
                )}
              </div>

              {/* Conditional: size selector for cleaning items */}
              {form.category === "Deep Cleaning" && currentCleanItem?.sizes && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">
                    Size / Type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentCleanItem.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setForm(f => ({ ...f, size }))}
                        className={`px-4 py-2.5 text-sm font-semibold transition-all rounded-sm border active:scale-[0.98] ${
                          form.size === size
                            ? "bg-brand-teal/10 border-brand-teal text-brand-teal"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Conditional: quantity selector for repair items */}
              {form.category === "Upholstery/Repair" && currentRepairItem?.quantities && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">
                    Quantity
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentRepairItem.quantities.map(q => (
                      <button
                        key={q}
                        onClick={() => setForm(f => ({ ...f, quantity: q }))}
                        className={`w-12 h-12 text-sm font-bold transition-all rounded-sm border active:scale-[0.98] ${
                          form.quantity === q
                            ? "bg-brand-teal/10 border-brand-teal text-brand-teal"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="flex justify-between gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 h-14 px-4 sm:px-6 border border-gray-200 text-sm font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 transition-all rounded-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => canProceedToStep3 && setStep(3)}
                  disabled={!canProceedToStep3}
                  className="flex items-center gap-2 h-14 px-5 sm:px-8 bg-brand-teal text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-teal/90 transition-all rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Contact & Submit ─── */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28 }}
            >
              <h3 className="text-2xl font-serif text-brand-slate mb-1">Almost done!</h3>
              <p className="text-sm text-gray-400 mb-8">
                We will review your request and send your personalised quote on WhatsApp within 48 hours.
              </p>

              <div className="flex flex-col gap-5">
                {(
                  [
                    { label: "Full Name", field: "name", type: "text", placeholder: "e.g. John Smith", autoComplete: "name" },
                    {
                      label: "WhatsApp Number",
                      field: "phone",
                      type: "tel",
                      placeholder: "e.g. 072 345 6789",
                      autoComplete: "tel",
                    },
                    {
                      label: "Suburb",
                      field: "suburb",
                      type: "text",
                      placeholder: "e.g. Maitland, Cape Town",
                      autoComplete: "address-level2",
                    },
                  ] as const
                ).map(({ label, field, type, placeholder, autoComplete }) => {
                  const showPhoneError = field === "phone" && form.phone.trim() !== "" && !phoneValid;
                  return (
                    <div key={field} className="flex flex-col gap-2">
                      <label htmlFor={`quote-${field}`} className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                        {label}
                      </label>
                      <input
                        id={`quote-${field}`}
                        type={type}
                        placeholder={placeholder}
                        autoComplete={autoComplete}
                        value={form[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        aria-invalid={showPhoneError}
                        className={`h-14 px-4 border bg-gray-50 focus:bg-white outline-none transition-all text-base sm:text-sm text-brand-slate rounded-sm ${showPhoneError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-brand-teal"}`}
                      />
                      {showPhoneError && (
                        <p className="text-xs text-red-500">Please enter a valid phone number, e.g. 072 345 6789.</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-3 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 h-14 px-4 sm:px-6 border border-gray-200 text-sm font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 transition-all rounded-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="flex items-center gap-3 h-14 px-5 sm:px-10 bg-brand-teal text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-teal/90 transition-all rounded-sm shadow-xl shadow-brand-teal/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5 fill-current text-brand-yellow" />}
                  {submitting ? 'Sending…' : 'Send Quote Request'}
                </button>
              </div>
              {submitError && (
                <p className="mt-4 text-sm text-red-600 text-center">{submitError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}
    </div>
  );
}
