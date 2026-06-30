export default function TermsOfService() {
  return (
    <div className="container mx-auto px-6 py-12" style={{ color: 'var(--color-text-primary)' }}>
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-invert max-w-none space-y-6" style={{ color: 'var(--color-text-secondary)' }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>1. Acceptance of Terms</h2>
        <p>By accessing and using our website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>2. Content Disclaimer</h2>
        <p>The content on this website is for informational purposes only. Some content may be AI-generated. We do not guarantee the accuracy, completeness, or usefulness of any information on the site and neither do we adopt nor endorse, nor are we responsible for, the accuracy or reliability of any opinion, advice, or statement made.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>3. Intellectual Property</h2>
        <p>The site and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>4. Termination</h2>
        <p>We may terminate your access to the site, without cause or notice, which may result in the forfeiture and destruction of all information associated with you.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: 'var(--color-text-primary)' }}>5. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us.</p>
      </div>
    </div>
  );
}
