import React from 'react';

const features = [
  { title: 'AI First Approach', desc: 'Native intelligence built into every system.' },
  { title: 'Human-Like Automation', desc: 'Interactions that feel personal and authentic.' },
  { title: 'Modern Technology Stack', desc: 'Next.js, Python, and scalable microservices.' },
  { title: 'Fast Delivery', desc: 'Rapid deployment without compromising quality.' },
  { title: 'Secure Systems', desc: 'Enterprise-grade encryption and security.' },
  { title: 'Full Admin Control', desc: 'Manage everything from a unified dashboard.' }
];

export default function Timeline() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Why Choose <span className="text-gradient">Our Blog</span></h2>
          <p className="text-gray" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            We don't just build websites; we build intelligent systems designed to scale.
          </p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          {/* Vertical Line */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '2px', height: '100%', background: 'linear-gradient(180deg, var(--color-accent-blue), var(--color-accent-purple))', opacity: 0.3 }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {features.map((feature, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                position: 'relative'
              }}>
                {/* Node */}
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  transform: 'translate(-50%, 0)', 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  background: 'var(--color-primary-black)',
                  border: '4px solid var(--color-accent-cyan)',
                  zIndex: 2
                }}></div>

                <div className="glass-card" style={{ width: '45%', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-white)' }}>{feature.title}</h3>
                  <p className="text-gray">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
