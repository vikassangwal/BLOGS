'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('vsangwal54@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password');
        setLoading(false);
      } else {
        if (data.token) {
          document.cookie = `automata_auth_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `admin_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        window.location.href = '/admin';
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center relative overflow-hidden bg-[#03060f]">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Welcome Back</h1>
          <p className="text-white/60 text-sm">Sign in to your admin account</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
