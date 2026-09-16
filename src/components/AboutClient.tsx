'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Props = {
  about: { heading: string; content: string; mission: string };
  team: Array<{ id: string; name: string; role: string; bio: string; imageUrl?: string | null }>;
};

export default function AboutClient({ about, team }: Props) {
  const displayTeam = team.length > 0 ? team : [
    {
      id: 'vikas-sangwal',
      name: 'Vikas Sangwal',
      role: 'Founder & Editor-in-Chief',
      bio: 'Educational researcher and career mentor specializing in Indian government recruitments, public service examinations, syllabus breakdown, and official notification analysis.',
      imageUrl: null
    },
    {
      id: 'knowora-editorial-desk',
      name: 'Knowora Research & Fact-Check Desk',
      role: 'Senior Editorial Team',
      bio: 'Dedicated team of fact-checkers and notification analysts verifying all government exam dates, eligibility criteria, official gazettes, and official apply links across 300+ government portals.',
      imageUrl: null
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-panel p-8 md:p-12 rounded-3xl mb-12 animate-slide-up">
        <h2 className="text-2xl font-bold mb-4 text-white">About Knowora</h2>
        <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
          {about.content && about.content !== 'Welcome to our blog.' 
            ? about.content 
            : "Knowora (www.knowora.in) is an independent educational news and career guidance portal dedicated to empowering Indian students, job seekers, and competitive exam aspirants with 100% verified, authentic, and timely information on Central and State Government Recruitments, Sarkari Results, Admit Cards, Official Syllabi, and National Welfare Schemes."}
        </p>
        
        <h2 className="text-2xl font-bold mb-4 text-white mt-8">Our Standards (Google E-E-A-T)</h2>
        <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
          {about.mission || "We strictly adhere to Google's E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness) quality guidelines."}
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-3 mb-6">
          <li><strong>Experience:</strong> Years of active research into Indian recruitment examinations, educational policies, and career counseling.</li>
          <li><strong>Expertise:</strong> In-depth syllabus breakdowns, salary structures per 7th Pay Commission, and step-by-step application guidance authored by dedicated subject specialists.</li>
          <li><strong>Authoritativeness:</strong> Direct citations and 100% verified official links to .gov.in and .nic.in portals with zero clickbait.</li>
          <li><strong>Trustworthiness:</strong> Absolute editorial independence, transparent fact-checking methodology, and clear non-governmental disclaimers on every article.</li>
        </ul>

        <h2 className="text-2xl font-bold mb-4 text-white mt-8">Editorial & Fact-Checking Policy</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          To protect aspirants from misinformation, rumors, and fake notices, Knowora enforces a 3-step verification protocol:
        </p>
        <ol className="list-decimal pl-6 text-gray-300 space-y-2 mb-6">
          <li><strong>Primary Source Sourcing:</strong> Information is only published after direct confirmation from official gazette notifications, PIB releases, or government agency websites (.gov.in / .nic.in).</li>
          <li><strong>Data Cross-Verification:</strong> Application dates, age limits, vacancy counts, and eligibility criteria are verified word-for-word against official PDF advertisements.</li>
          <li><strong>Timely Corrections:</strong> If an exam board issues a corrigendum, postponement, or amendment, our team updates the respective article immediately with an editorial notice.</li>
        </ol>
      </div>
      
      <h2 className="text-3xl font-bold mb-8 text-center text-white animate-slide-up delay-100">Meet Our Editorial Team</h2>
      
      <div className="grid md:grid-cols-2 gap-8 animate-slide-up delay-200">
        {displayTeam.map(member => (
          <div key={member.id} className="premium-card p-6 flex items-center gap-6 group hover:scale-105 transition-transform">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden relative">
              {member.imageUrl ? (
                <Image src={member.imageUrl} alt={member.name} width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                member.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{member.name}</h3>
              <p className="text-sm text-blue-400 mb-2 font-semibold">{member.role}</p>
              <p className="text-sm text-gray-300 leading-snug">{member.bio}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-16 animate-slide-up delay-300">
        <h2 className="text-2xl font-bold mb-4 text-white">Editorial Contact & Feedback</h2>
        <p className="text-gray-400 mb-6">Have a question, feedback, or notice a discrepancy in any recruitment alert? Contact our editorial desk directly.</p>
        <a href="mailto:support@knowora.in" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          Email Editorial Team (support@knowora.in)
        </a>
      </div>
    </div>
  );
}
