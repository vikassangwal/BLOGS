import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Knowora',
  description: 'Read the Terms of Service and Conditions for using Knowora news and job portal.',
  alternates: {
    canonical: 'https://www.knowora.in/terms-of-service'
  }
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-gray-900/80 p-8 sm:p-12 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: August 16, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          <p>
            Welcome to <strong>Knowora</strong> (<Link href="https://www.knowora.in" className="text-blue-400 underline">https://www.knowora.in</Link>). By accessing or using our website, you agree to comply with and be bound by the following Terms of Service. Please read them carefully.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or browsing Knowora, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any part of these terms, you must not use our website.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">2. Educational & Informational Purpose</h2>
          <p>
            All information published on Knowora regarding Sarkari jobs, examinations, admit cards, cut-off marks, technology news, and financial updates is provided for general informational and educational purposes only. While we make every effort to verify information from official sources (`.gov.in`, `.nic.in`), candidates must cross-check details on the official portal before applying.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">3. Non-Governmental Entity</h2>
          <p className="p-4 bg-gray-800/60 rounded-xl border border-blue-500/30 text-gray-200">
            Knowora is an independent news blogging platform. We do not represent, hold affiliation with, or act as an agent for any government entity, recruitment board, or university. We do not collect examination fees or issue admit cards directly.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">4. Intellectual Property</h2>
          <p>
            The content, layout, design, data, graphics, and code on Knowora are protected by intellectual property laws. You may read, share, and link to our articles for non-commercial personal use. You may not republish complete articles without attribution to Knowora.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">5. User Conduct & Comments</h2>
          <p>
            Users are expected to communicate respectfully in discussion areas and comment sections. Spamming, posting misleading links, hate speech, or offensive content will result in IP termination and deletion of comments.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">6. Limitation of Liability</h2>
          <p>
            In no event shall Knowora, its founders, or contributors be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the information provided on our website.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">7. Modifications to Terms</h2>
          <p>
            We reserve the right to revise these Terms of Service at any time without prior notice. By continuing to use Knowora after changes are made, you accept the updated terms.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">8. Contact Information</h2>
          <p>
            If you have any questions regarding these Terms, please contact us at <strong>support@knowora.in</strong> or via our <Link href="/contact" className="text-blue-400 underline">Contact Page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
