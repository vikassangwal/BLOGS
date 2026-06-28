import React from 'react';

const testimonials = [
  { name: 'Sarah Jenkins', role: 'CEO, TechFlow', text: 'Our Blog completely transformed our operational speed. The AI agent they built handles 40% of our customer queries automatically.', rating: 5 },
  { name: 'David Chen', role: 'Founder, Elevate CRM', text: 'Their design aesthetic is unmatched. Combine that with a robust Next.js backend and you have a world-class product.', rating: 5 },
  { name: 'Elena Rodriguez', role: 'Director, HealthPlus', text: 'The automated booking system saved our clinic hundreds of hours a month. Truly futuristic solutions.', rating: 5 }
];

export default function Testimonials() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Client <span className="text-gradient">Success Stories</span></h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {testimonials.map((t, i) => (
            <div key={i} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', color: 'var(--color-accent-blue)' }}>
                {'★'.repeat(t.rating)}
              </div>
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{t.name}</h4>
                  <p className="text-gray" style={{ fontSize: '0.9rem', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
