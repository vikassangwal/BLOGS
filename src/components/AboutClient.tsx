'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Props = {
  about: { heading: string; content: string; mission: string };
  team: Array<{ id: string; name: string; role: string; bio: string; imageUrl?: string | null }>;
};

export default function AboutClient({ about, team }: Props) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-panel p-8 md:p-12 rounded-3xl mb-12 animate-slide-up">
        <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
        <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
          {about.content}
        </p>
        
        <h2 className="text-2xl font-bold mb-4 text-white mt-8">Our Expertise (E-E-A-T)</h2>
        <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
          {about.mission || "We adhere strictly to Google's E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness) guidelines."}
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-3 mb-6">
          <li><strong>Experience:</strong> Years of hands-on experience in tech, finance, and education sectors.</li>
          <li><strong>Expertise:</strong> Content reviewed by subject matter experts.</li>
          <li><strong>Authoritativeness:</strong> Recognized as a reliable source of information by our growing community.</li>
          <li><strong>Trustworthiness:</strong> Transparent about our AI-assisted writing process and rigorous fact-checking.</li>
        </ul>
      </div>
      
      <h2 className="text-3xl font-bold mb-8 text-center text-white animate-slide-up delay-100">Meet the Core Team</h2>
      
      <div className="grid md:grid-cols-2 gap-8 animate-slide-up delay-200">
        {team.length > 0 ? (
          team.map(member => (
            <Link href={`/team/${member.id}`} key={member.id} className="premium-card p-6 flex items-center gap-6 group hover:scale-105 transition-transform cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden relative">
                {member.imageUrl ? (
                  <Image src={member.imageUrl} alt={member.name} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  member.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{member.name}</h3>
                <p className="text-sm text-blue-400 mb-2">{member.role}</p>
                <p className="text-sm text-gray-400 line-clamp-2">{member.bio}</p>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-gray-400 text-center col-span-2">Our team is growing. Check back soon!</p>
        )}
      </div>
      
      <div className="text-center mt-16 animate-slide-up delay-300">
        <h2 className="text-2xl font-bold mb-4 text-white">Contact Us</h2>
        <p className="text-gray-400 mb-6">Have questions or want to collaborate? Reach out to us.</p>
        <a href="mailto:info@knowora.in" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          Email Us
        </a>
      </div>
    </div>
  );
}
