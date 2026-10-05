import React from 'react';
import { Metadata } from 'next';
import ContactClient from '@/components/ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Knowora — Editorial & Support Desk',
  description: 'Get in touch with the Knowora editorial and support team. Inquiries, corrections, grievances, and partnerships.',
  alternates: {
    canonical: 'https://knowora.in/contact'
  },
  openGraph: {
    title: 'Contact Us | Knowora',
    description: 'Get in touch with the Knowora editorial and support team.',
    url: 'https://knowora.in/contact',
    siteName: 'Knowora',
    type: 'website',
    locale: 'hi_IN',
  }
};

export default function ContactPage() {
  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Knowora',
    url: 'https://knowora.in/contact',
    description: 'Contact information for Knowora news and government recruitment portal.',
    mainEntity: {
      '@type': 'NewsMediaOrganization',
      name: 'Knowora',
      url: 'https://knowora.in',
      publishingPrinciples: 'https://knowora.in/editorial-policy',
      correctionsPolicy: 'https://knowora.in/fact-check-policy',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          email: 'support@knowora.in',
          contactType: 'editorial and customer support',
          availableLanguage: ['Hindi', 'English']
        },
        {
          '@type': 'ContactPoint',
          email: 'support@knowora.in',
          contactType: 'Grievance Officer'
        }
      ]
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl animate-fade-in min-h-[70vh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <h1 className="text-3xl sm:text-5xl font-black mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        Contact Us (संपर्क करें)
      </h1>
      <p className="text-gray-400 text-sm sm:text-base text-center max-w-xl mx-auto mb-10 leading-relaxed">
        Have questions about an exam notification, need an editorial correction, or want to partner with us? Our team is here to assist you.
      </p>
      
      <ContactClient />
    </div>
  );
}
