'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, GitBranch, Sparkles } from 'lucide-react';
import { loginUser } from '@/app/actions/auth';
import { signIn } from 'next-auth/react'; // Need this for Google/GitHub buttons if they want
 
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
 
    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);
 
    if (result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/admin'); // Redirect to admin dashboard
      router.refresh();
    }
  }
 
  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center relative overflow-hidden bg-[#03060f]">
      {/* Background Orbs */}
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
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
 
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input 
                  type="email" 
                  name="email"
                  required
                  placeholder="admin@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input 
                  type="password" 
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : (
                <>Log In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-4 text-sm text-white/40 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
            or
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <button onClick={() => signIn('google', { callbackUrl: '/admin' })} type="button" className="w-full flex items-center justify-center gap-2 bg-black/40 border border-white/10 hover:bg-white/10 text-white py-2.5 px-4 rounded-xl transition-all font-medium text-xs">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Google
            </button>
            <button type="button" className="w-full flex items-center justify-center gap-2 bg-black/40 border border-white/10 hover:bg-white/10 text-white py-2.5 px-4 rounded-xl transition-all font-medium text-xs">
              <GitBranch className="w-4 h-4" /> GitHub
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
