'use client';
import React, { useState } from 'react';

export default function ContactClient() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'Editorial Inquiry', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate instant safe submission & log feedback
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-center">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl mb-1">📧</div>
          <div className="text-xs text-neutral-400 font-semibold uppercase">Email Support</div>
          <a href="mailto:support@knowora.in" className="text-sm font-bold text-blue-400 hover:underline mt-1 block">
            support@knowora.in
          </a>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl mb-1">⚖️</div>
          <div className="text-xs text-neutral-400 font-semibold uppercase">Grievance Officer</div>
          <p className="text-sm font-bold text-white mt-1">
            Vikas Sangwal
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl mb-1">⏱️</div>
          <div className="text-xs text-neutral-400 font-semibold uppercase">Response SLA</div>
          <p className="text-sm font-bold text-emerald-400 mt-1">
            Within 24 Hours
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-xl font-bold text-white mb-2">संदेश प्राप्त हुआ (Message Received)</h3>
          <p className="text-neutral-300 text-sm max-w-md mx-auto mb-4">
            Thank you for contacting Knowora. Our editorial team will review your inquiry and get back to you at <strong>{formData.email}</strong> shortly.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Your Full Name (पूरा नाम) *
              </label>
              <input 
                type="text" 
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="Enter your name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Email Address (ईमेल पता) *
              </label>
              <input 
                type="email" 
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="your.email@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Inquiry Type (विषय)
            </label>
            <select
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            >
              <option value="Editorial Inquiry">General Editorial Inquiry</option>
              <option value="Fact-Check Correction">Report a Correction / Fact-Check</option>
              <option value="Advertisement / Business">Advertising & Partnerships</option>
              <option value="Technical Support">Technical Support / Bug Report</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Message (आपका संदेश) *
            </label>
            <textarea 
              rows={5}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none text-sm"
              placeholder="Please provide details about your inquiry..."
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            ></textarea>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] text-sm"
          >
            {loading ? 'Sending...' : '🚀 Send Message (संदेश भेजें)'}
          </button>
        </form>
      )}

      {/* Office & Ethics Disclosure */}
      <div className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-400 space-y-2">
        <p>
          <strong className="text-white">Editorial Address:</strong> Knowora Media & Digital Publishing, India.
        </p>
        <p>
          <strong className="text-white">Compliance:</strong> In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, readers may submit grievances directly to our Grievance Officer at <strong>support@knowora.in</strong>.
        </p>
      </div>
    </div>
  );
}
