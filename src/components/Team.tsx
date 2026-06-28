import React from 'react';

export default function Team() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Leadership</h2>
        </div>

        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'center', padding: '3rem' }}>
          {/* Image Placeholder */}
          <div style={{ width: '200px', height: '200px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))', flexShrink: 0 }}></div>
          
          <div>
            <h3 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Alex Mercer</h3>
            <p className="text-gradient" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Founder & AI Architect</p>
            <p className="text-gray" style={{ marginBottom: '1.5rem' }}>
              Building the future of business automation. With over a decade of experience in machine learning and scalable web architecture, Alex leads Our Blog's mission to make enterprise AI accessible to everyone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', fontSize: '0.8rem' }}>Next.js</span>
              <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', fontSize: '0.8rem' }}>Python</span>
              <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', fontSize: '0.8rem' }}>AI Engineering</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
