import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Knowora',
  description: 'Read the official Privacy Policy of Knowora including Google AdSense cookies disclosure, data collection, and user rights.',
  alternates: {
    canonical: 'https://www.knowora.in/privacy-policy'
  }
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-gray-900/80 p-8 sm:p-12 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: August 16, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          <p>
            At <strong>Knowora</strong> (accessible from <Link href="https://www.knowora.in" className="text-blue-400 underline">https://www.knowora.in</Link>), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Knowora and how we use it.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">1. Information We Collect</h2>
          <p>
            If you contact us directly or subscribe to job alerts, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate, and maintain our educational and Sarkari job portal.</li>
            <li>Improve, personalize, and expand our website content.</li>
            <li>Understand and analyze how you use our website.</li>
            <li>Develop new products, services, features, and functionality.</li>
            <li>Communicate with you to provide updates and alerts related to government recruitment, admit cards, and results.</li>
            <li>Send you emails or notification alerts.</li>
            <li>Find and prevent fraud.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">3. Log Files</h2>
          <p>
            Knowora follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this as part of hosting services' analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3 font-mono text-blue-400">4. Google DoubleClick DART Cookie & Third-Party Advertising</h2>
          <p>
            Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.knowora.in and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL:
          </p>
          <p>
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">
              https://policies.google.com/technologies/ads
            </a>
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">5. Our Advertising Partners</h2>
          <p>
            Some of advertisers on our site may use cookies and web beacons. Our advertising partners include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Google AdSense:</strong> Each of our advertising partners has their own Privacy Policy for their policies on user data. For easier access, we hyperlinked to their Privacy Policies above.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">6. Third Party Privacy Policies</h2>
          <p>
            Knowora's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">7. Non-Government Organization Disclaimer</h2>
          <p className="p-4 bg-gray-800/60 rounded-xl border border-yellow-500/30 text-yellow-200">
            <strong>Important Notice:</strong> Knowora is a privately owned educational news blog platform. We are NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with any Central Government, State Government, or Sarkari Board agency. All official notifications referenced on our site are property of their respective government bodies.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">8. Contact Us</h2>
          <p>
            If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us via email at <strong>support@knowora.in</strong> or visit our <Link href="/contact" className="text-blue-400 underline">Contact Us</Link> page.
          </p>
        </div>
      </div>
    </div>
  );
}
