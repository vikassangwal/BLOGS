import React from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import AboutClient from '@/components/AboutClient';

export const revalidate = 3600; // Cache for 1 hour since team changes are infrequent

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const siteName = siteSettings?.siteName || 'Knowora';

  const title = `About Us | ${siteName} - Platform Expertise & E-E-A-T`;
  const description = `Learn about our mission, transparency, fact-checking policies, and the expert team of writers and developers behind ${siteName}.`;

  return {
    title: title,
    description: description,
    alternates: {
      canonical: 'https://knowora.in/about',
    },
    openGraph: {
      title: title,
      description: description,
      url: 'https://knowora.in/about',
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

export default async function AboutUsPage() {
  const [aboutSetting, teamMembers] = await Promise.all([
    prisma.aboutSetting.findUnique({ where: { id: 'default' } }),
    prisma.teamMember.findMany({ where: { isActive: true } })
  ]);

  const about = {
    heading: aboutSetting?.heading || 'About Our Blog',
    content: aboutSetting?.content || 'Welcome to our blog.',
    mission: aboutSetting?.mission || 'We adhere to the highest standards of accuracy and quality.'
  };

  const team = teamMembers.map(member => ({
    id: member.id,
    name: member.name,
    role: member.role,
    bio: member.bio,
    imageUrl: member.imageUrl
  }));

  // JSON-LD Schemas for search crawlers & AI model context
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Knowora',
    url: 'https://knowora.in',
    logo: 'https://knowora.in/logo.png',
    founder: {
      '@type': 'Person',
      name: 'Vikas Sangwal',
      jobTitle: 'Founder & CEO'
    },
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@knowora.in',
      contactType: 'customer support'
    }
  };

  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Knowora',
    url: 'https://knowora.in/about',
    description: about.content,
    mainEntity: {
      '@type': 'Organization',
      name: 'Knowora'
    }
  };

  return (
    <div className="min-h-screen py-20 px-6">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center premium-gradient-text">
          {about.heading}
        </h1>

        <AboutClient about={about} team={team} />
      </div>
    </div>
  );
}
