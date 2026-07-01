import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Contact Us | Knowora',
  description: 'Get in touch with the Knowora team.',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl animate-fade-in min-h-[70vh]">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        Contact Us
      </h1>
      
      <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl">
        <p className="text-gray-300 text-lg mb-8 leading-relaxed text-center">
          Have a question, feedback, or want to collaborate? We'd love to hear from you. 
          Fill out the form below or reach out to us via email.
        </p>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
              <input 
                type="text" 
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
            <textarea 
              rows={5}
              className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="How can we help you?"
              required
            ></textarea>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            Send Message
          </button>
        </form>
        
        <div className="mt-12 text-center text-gray-400 border-t border-white/10 pt-8">
          <p>Or email us directly at:</p>
          <a href="mailto:support@knowora.in" className="text-blue-400 font-medium hover:underline text-lg mt-2 inline-block">
            support@knowora.in
          </a>
        </div>
      </div>
    </div>
  );
}
