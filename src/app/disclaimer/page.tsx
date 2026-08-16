import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Disclaimer | Knowora',
  description: 'Read the official Non-Governmental Disclaimer and Content Accuracy Policy for Knowora.',
  alternates: {
    canonical: 'https://www.knowora.in/disclaimer'
  }
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-gray-900/80 p-8 sm:p-12 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Disclaimer</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: August 16, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          <p>
            If you require any more information or have any questions about our site's disclaimer, please feel free to contact us by email at <strong>support@knowora.in</strong>.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">1. Non-Governmental Entity Notice</h2>
          <div className="p-5 bg-yellow-950/40 border border-yellow-500/40 rounded-2xl text-yellow-100">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ Important Public Notice:</h3>
            <p>
              <strong>Knowora (www.knowora.in)</strong> is an independent educational news portal. We are <strong>NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with any Government agency, State/Central Recruitment Board, or Public Service Commission</strong> (such as UPSC, SSC, NTA, IBPS, RRB, or State PSCs).
            </p>
            <p className="mt-2">
              All official government logos, names, and trademarks referenced in our articles belong to their respective government bodies.
            </p>
          </div>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">2. Accuracy & Verification of Information</h2>
          <p>
            All the information on this website (<Link href="https://www.knowora.in" className="text-blue-400 underline">https://www.knowora.in</Link>) is published in good faith and for general information purpose only. Knowora does not make any warranties about the completeness, reliability, and accuracy of this information. Any action you take upon the information you find on this website is strictly at your own risk.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">3. External Links Disclaimer</h2>
          <p>
            From our website, you can visit other websites by following hyperlinks to such external sites (such as official portal links ending in `.gov.in` or `.nic.in`). While we strive to provide only quality links to useful and ethical websites, we have no control over the content and nature of these sites.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">4. Consent</h2>
          <p>
            By using our website, you hereby consent to our disclaimer and agree to its terms.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">5. Update</h2>
          <p>
            Should we update, amend, or make any changes to this document, those changes will be prominently posted here.
          </p>
        </div>
      </div>
    </div>
  );
}
