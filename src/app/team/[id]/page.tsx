'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Head from 'next/head';

export default function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [member, setMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) notFound();
        setMember(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        notFound();
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-blue-400">Loading profile...</div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="min-h-screen py-20 px-6">
      <title>{member.name} | Our Blog</title>
      <meta name="description" content={member.bio} />
      
      <div className="max-w-4xl mx-auto">
        <div className="glass-panel p-8 md:p-12 rounded-3xl animate-slide-up">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-blue-600 flex items-center justify-center text-4xl md:text-6xl font-bold text-white shrink-0 overflow-hidden shadow-[0_0_30px_rgba(37,99,235,0.4)]">
              {member.imageUrl ? (
                <Image src={member.imageUrl} alt={member.name} fill className="w-full h-full object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              ) : (
                member.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-white">{member.name}</h1>
              <p className="text-xl text-blue-400 mb-4 font-semibold">{member.role}</p>
              <p className="text-gray-300 text-lg leading-relaxed">{member.bio}</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-white/10 mb-10"></div>
          
          <h2 className="text-2xl font-bold text-white mb-6">Full Profile</h2>
          <div 
            className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: member.fullDetails }}
          />
        </div>
      </div>
    </div>
  );
}
