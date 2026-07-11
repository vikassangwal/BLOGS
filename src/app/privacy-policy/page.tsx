import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Knowora',
  description: 'Read our Privacy Policy to understand how we collect, use, and protect your information.',
  alternates: {
    canonical: 'https://knowora.in/privacy-policy'
  }
};

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-6 py-12" style={{ color: 'var(--color-text-primary)' }}>
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none space-y-6" style={{ color: 'var(--color-text-secondary)' }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>1. Information We Collect</h2>
        <p>We collect information you provide directly to us, such as when you subscribe to our newsletter, fill out a form, or communicate with us. This may include your name, email address, and phone number.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>2. How We Use Your Information</h2>
        <p>We use the information we collect to provide, maintain, and improve our services, as well as to communicate with you about updates, offers, and news.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>3. Cookies and Tracking</h2>
        <p>We use cookies and similar tracking technologies to track activity on our website and hold certain information to improve your experience.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>4. Third-Party Services</h2>
        <p>We may share your information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us.</p>
      </div>
    </div>
  );
}
