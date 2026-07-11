import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TeamMemberClient from '@/components/TeamMemberClient';

export const revalidate = 3600; // Cache profiles for 1 hour

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const member = await prisma.teamMember.findUnique({ where: { id } });
  if (!member) {
    return { title: 'Author Profile Not Found' };
  }

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const siteName = siteSettings?.siteName || 'Knowora';

  const title = `${member.name} - ${member.role} at ${siteName}`;
  const description = `${member.name} is a ${member.role} at ${siteName}. Read professional articles, guides, and updates authored by ${member.name}.`;

  return {
    title: title,
    description: description,
    alternates: {
      canonical: `https://knowora.in/team/${member.id}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `https://knowora.in/team/${member.id}`,
      siteName: siteName,
      type: 'profile',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
    }
  };
}

export default async function TeamMemberPage({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const member = await prisma.teamMember.findUnique({ where: { id } });
  if (!member || !member.isActive) {
    notFound();
  }

  // Inject Person (Author Profile) schema for E-E-A-T score optimization
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.name,
    jobTitle: member.role,
    description: member.bio,
    image: member.imageUrl || undefined,
    url: `https://knowora.in/team/${member.id}`,
    worksFor: {
      '@type': 'Organization',
      name: 'Knowora',
      url: 'https://knowora.in'
    }
  };

  return (
    <div className="min-h-screen py-20 px-6">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <TeamMemberClient member={member} />
    </div>
  );
}
