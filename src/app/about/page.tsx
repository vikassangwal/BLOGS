'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AboutUsPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeam(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen py-20 px-6">
      <title>About Us | Anti Gravity</title>
      <meta name="description" content="Learn more about Anti Gravity, our mission, and our expert team of writers and developers." />
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center premium-gradient-text">
          About Anti Gravity
        </h1>
        
        <div className="glass-panel p-8 md:p-12 rounded-3xl mb-12 animate-slide-up">
          <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            At Anti Gravity, our mission is to empower readers with high-quality, expertly curated content across Technology, Education & Career, and Finance & Earning. 
            We believe that knowledge should be accessible, accurate, and actionable. Our platform leverages advanced AI combined with human expertise to bring you the most reliable insights.
          </p>
          
          <h2 className="text-2xl font-bold mb-4 text-white mt-8">Our Expertise (E-E-A-T)</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            We adhere strictly to Google's E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness) guidelines. 
            Our content is generated and reviewed by industry professionals to ensure that the information you receive is not only engaging but also factually correct and trustworthy.
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
          {isLoading ? (
            <p className="text-gray-400 text-center col-span-2">Loading team members...</p>
          ) : team.length > 0 ? (
            team.map(member => (
              <Link href={`/team/${member.id}`} key={member.id} className="premium-card p-6 flex items-center gap-6 group hover:scale-105 transition-transform cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden">
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
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
          <a href="mailto:admin@antigravity.com" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            Email Us
          </a>
        </div>
      </div>
    </div>
  );
}
