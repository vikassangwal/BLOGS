import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'तथ्य-जांच नीति (Fact-Checking Policy) | Knowora — फर्जी भर्ती रोकथाम',
  description: 'Knowora की तथ्य-सत्यापन नीति और फर्जी भर्ती रोकथाम दिशानिर्देश। जानिए हम सरकारी विज्ञप्तियों की सत्यता कैसे जांचते हैं और फर्जी नोटिस से कैसे बचाते हैं।',
  alternates: {
    canonical: 'https://knowora.in/fact-check-policy',
  },
  openGraph: {
    title: 'Fact-Checking Policy & Verification Standards | Knowora',
    description: 'Guidelines on how Knowora verifies official notifications, combats job scams, and fact-checks recruitment notices.',
    url: 'https://knowora.in/fact-check-policy',
    siteName: 'Knowora',
    type: 'website',
    locale: 'hi_IN',
  },
};

export default function FactCheckPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Fact-Checking Policy of Knowora',
    url: 'https://knowora.in/fact-check-policy',
    description: 'Official fact-checking and verification standards of Knowora.',
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'Knowora',
      url: 'https://knowora.in',
      founder: {
        '@type': 'Person',
        name: 'Vikas Sangwal'
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 py-16 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 border-b border-neutral-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <span>सत्यापन मानक</span>
            <span>•</span>
            <span>Anti-Scam Protocol</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Knowora तथ्य-जांच नीति (Fact-Checking Policy)
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
            सरकारी भर्तियों और शिक्षा क्षेत्र में फर्जी विज्ञापनों और भ्रामक दावों के खिलाफ हमारा कड़ा रुख।
          </p>
          <p className="text-xs text-neutral-500 mt-3">
            सत्यापन डेस्क प्रभारी: विकास सांगवाल | संपादकीय ईमेल: support@knowora.in
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-neutral-300 leading-relaxed text-sm sm:text-base">
          
          {/* Section 1 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500">1.</span> तथ्य-जांच के मूल सिद्धांत (Core Principles)
            </h2>
            <p className="mb-4">
              सरकारी नौकरी (Sarkari Naukri) की तैयारी करने वाले युवाओं का भविष्य बहुत महत्वपूर्ण है। एक गलत तारीख या भ्रामक पात्रता के कारण किसी अभ्यर्थी का वर्ष बर्बाद हो सकता है। इसलिए Knowora की पॉलिसी <strong>&ldquo;सत्यापन के बिना कोई प्रकाशन नहीं&rdquo; (Zero Publication Without Verification)</strong> के सिद्धांत पर कार्य करती है।
            </p>
            <p>
              हम किसी भी सूचना को तब तक प्रकाशित नहीं करते जब तक कि वह आधिकारिक गजट या आयोग की मूल वेबसाइट पर उपलब्ध न हो।
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500">2.</span> फर्जी भर्ती पहचान गाइड (Fake Recruitment Detection)
            </h2>
            <p className="mb-6">
              सोशल मीडिया और व्हाट्सएप्प पर अक्सर जाली भर्ती विज्ञापन (Fake Notifications) वायरल होते हैं। Knowora पाठक एवं छात्र निम्न संकेतों से फर्जी सूचनाओं को पहचान सकते हैं:
            </p>

            <div className="space-y-4">
              <div className="bg-neutral-950 p-4 rounded-xl border border-red-500/20 flex items-start gap-4">
                <span className="text-red-400 text-xl font-bold">⚠️</span>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">असामान्य डोमेन नाम (Suspicious Domains)</h3>
                  <p className="text-xs text-neutral-400">
                    आधिकारिक सरकारी वेबसाइट्स हमेशा <code>.gov.in</code> या <code>.nic.in</code> पर समाप्त होती हैं। <code>.com</code>, <code>.org</code> या <code>.xyz</code> जैसी साइटों पर सरकारी भर्ती फॉर्म भरने से बचें।
                  </p>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-red-500/20 flex items-start gap-4">
                <span className="text-red-400 text-xl font-bold">⚠️</span>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">व्यक्तिगत खातों में आवेदन शुल्क मांगना</h3>
                  <p className="text-xs text-neutral-400">
                    कोई भी सरकारी भर्ती बोर्ड (SSC, UPSC, RRB) कभी भी Google Pay, PhonePe, या किसी निजी बैंक खाते में फीस नहीं लेता। फीस केवल आधिकारिक पोर्टल के एकीकृत चालान या पेमेंट गेटवे द्वारा ली जाती है।
                  </p>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-red-500/20 flex items-start gap-4">
                <span className="text-red-400 text-xl font-bold">⚠️</span>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">बिना परीक्षा सीधी भर्ती के दावे</h3>
                  <p className="text-xs text-neutral-400">
                    भ्रामक विज्ञापन अक्सर &ldquo;बिना परीक्षा सीधे रेलवे में भर्ती&rdquo; जैसे वादे करते हैं। ऐसे विज्ञापनों से पूरी तरह सावधान रहें।
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500">3.</span> हमारे सत्यापन का दायरा (Scope of Verification)
            </h2>
            <p className="mb-4">Knowora निम्नलिखित सभी प्रमुख मापदंडों का सत्यापन करता है:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>विज्ञापन संख्या (Notification No.):</strong> मूल राजपत्र से मिलान</div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>कुल पद व आरक्षण:</strong> कोटिवार (UR/OBC/EWS/SC/ST) सटीक मिलान</div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>आयु सीमा की गणना तिथि:</strong> Cut-off date का सटीक उल्लेख</div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>वेतनमान (Pay Matrix):</strong> 7वें वेतन आयोग के अनुरूप लेवल</div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>आवेदन की अंतिम तिथि:</strong> सर्वर समय व समय सीमा</div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">✅ <strong>आधिकारिक लिंक:</strong> सीधे .gov.in पोर्टल पर ले जाने वाले लिंक</div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500">4.</span> किसी दावे की शिकायत या जांच अनुरोध कैसे भेजें?
            </h2>
            <p className="mb-4">
              यदि आपको इंटरनेट या सोशल मीडिया पर किसी भर्ती से संबंधित संदिग्ध विज्ञापन दिखाई देता है, तो आप हमारी तथ्य-जांच टीम को जांच के लिए भेज सकते हैं:
            </p>
            <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 text-sm">
              <p className="mb-2"><strong>ईमेल:</strong> support@knowora.in</p>
              <p className="mb-2"><strong>विषय:</strong> Fact Check Request: [भर्ती का नाम]</p>
              <p className="text-neutral-400 text-xs">हमारी रिसर्च टीम 12 घंटे के भीतर संबंधित आयोग से पुष्टि कर रिपोर्ट प्रदान करती है।</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500">5.</span> संबंधित नीतियां व संपर्क
            </h2>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <Link href="/editorial-policy" className="text-blue-400 hover:text-blue-300">
                संपादकीय नीति पढ़ें →
              </Link>
              <Link href="/privacy-policy" className="text-blue-400 hover:text-blue-300">
                गोपनीयता नीति →
              </Link>
              <Link href="/terms-of-service" className="text-blue-400 hover:text-blue-300">
                नियम व शर्तें →
              </Link>
              <Link href="/about" className="text-blue-400 hover:text-blue-300">
                हमारे बारे में →
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
