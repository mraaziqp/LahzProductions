/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Key, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminAuth({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    } else {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-gray-100 p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-brand-slate text-brand-teal flex items-center justify-center rounded-full mb-6 relative overflow-hidden group">
            <Lock className="w-6 h-6 z-10" />
            <div className="absolute inset-0 bg-brand-teal opacity-0 group-hover:opacity-10 transition-opacity" />
          </div>
          <span className="text-2xl font-serif font-medium text-brand-teal uppercase tracking-[0.2em] mb-2">LAHZ</span>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Admin Portal Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                placeholder="admin@lahzproductions.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Security Key</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:bg-white focus:border-brand-teal outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500 font-bold text-center"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-brand-teal text-white uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-teal/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authorize Access'}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-gray-300 font-bold">
          Technical Environment Secured by Supabase
        </p>
      </motion.div>
    </div>
  );
}
