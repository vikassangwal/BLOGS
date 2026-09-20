import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'संपादकीय नीति (Editorial Policy) | Knowora — E-E-A-T व तथ्य सत्यापन',
  description: 'Knowora की आधिकारिक संपादकीय नीति, प्राथमिक स्रोत सत्यापन प्रक्रिया, और शुद्धता मानक। जानिए हम सरकारी नौकरियों और योजनाओं की खबरें कैसे सत्यापित करते हैं।',
  alternates: {
    canonical: 'https://knowora.in/editorial-policy',
  },
  openGraph: {
    title: 'Editorial Policy & Verification Standards | Knowora',
    description: 'Knowora editorial ethics, source validation standards, and factual accuracy guidelines.',
    url: 'https://knowora.in/editorial-policy',
    siteName: 'Knowora',
    type: 'website',
    locale: 'hi_IN',
  },
};

export default function EditorialPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Editorial Policy of Knowora',
    url: 'https://knowora.in/editorial-policy',
    description: 'Guidelines and verification procedures for publishing government recruitment and educational news on Knowora.',
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <span>आधिकारिक नीति</span>
            <span>•</span>
            <span>E-E-A-T Trust Protocol</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Knowora संपादकीय नीति (Editorial Policy)
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
            सत्यता, निष्पक्षता, और प्रामाणिक स्रोतों पर आधारित शिक्षा एवं सरकारी नौकरी पोर्टल।
          </p>
          <p className="text-xs text-neutral-500 mt-3">
            अंतिम अपडेट: जनवरी 2026 | प्रधान संपादक: विकास सांगवाल
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-neutral-300 leading-relaxed text-sm sm:text-base">
          
          {/* Section 1 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">1.</span> हमारा उद्देश्य एवं मिशन (Our Mission)
            </h2>
            <p className="mb-4">
              Knowora का मुख्य उद्देश्य भारत के करोड़ों प्रतियोगी परीक्षा अभ्यर्थियों (UPSC, SSC, Railway, State PSC, Banking) और विद्यार्थियों को <strong>100% सटीक, निष्पक्ष और आधिकारिक रूप से सत्यापित</strong> जानकारी सरल हिंदी भाषा में उपलब्ध कराना है।
            </p>
            <p>
              इंटरनेट पर फैलने वाली फर्जी भर्तियों (Fake Recruitment Notices) और भ्रामक जानकारियों से विद्यार्थियों को बचाना हमारी सर्वोच्च प्राथमिकता है।
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">2.</span> 3-चरणीय सामग्री सत्यापन प्रक्रिया (3-Step Verification)
            </h2>
            <p className="mb-6">
              हमारी संपादकीय टीम किसी भी लेख या अधिसूचना को प्रकाशित करने से पहले निम्नलिखित 3 कड़े चरणों से गुजरती है:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                <div className="text-blue-400 text-sm font-bold mb-2">चरण 1: प्राथमिक स्रोत</div>
                <p className="text-xs text-neutral-400">
                  सिर्फ भारत सरकार या राज्य सरकारों के आधिकारिक पोर्टल्स (जैसे ssc.gov.in, upsc.gov.in, indianrailways.gov.in) तथा भारत के राजपत्र (Gazette of India) से अधिसूचना डाउनलोड की जाती है।
                </p>
              </div>

              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                <div className="text-emerald-400 text-sm font-bold mb-2">चरण 2: क्रॉस-वेरिफिकेशन</div>
                <p className="text-xs text-neutral-400">
                  पदों की संख्या, आयु सीमा, आवेदन शुल्क, पात्रता मानदंड और तिथियों का मिलान आधिकारिक पीडीएफ से शब्द-दर-शब्द किया जाता है।
                </p>
              </div>

              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                <div className="text-purple-400 text-sm font-bold mb-2">चरण 3: वरिष्ठ संपादक समीक्षा</div>
                <p className="text-xs text-neutral-400">
                  प्रकाशन से पहले मुख्य संपादक द्वारा समीक्षा की जाती है कि लेख में सभी आवश्यक सूचनाएं स्पष्ट हैं और कोई भ्रामक दावा नहीं है।
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">3.</span> स्रोत पदानुक्रम मानक (Source Standards)
            </h2>
            <p className="mb-4">हम समाचार संकलन हेतु केवल निम्नलिखित प्राथमिक स्रोतों को स्वीकार करते हैं:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-neutral-300">
              <li><strong>टियर 1 (Tier 1):</strong> आधिकारिक सरकारी वेबसाइट्स (.gov.in, .nic.in, .ac.in, .edu.in) एवं राजपत्र अधिसूचनाएं।</li>
              <li><strong>टियर 2 (Tier 2):</strong> पत्र सूचना कार्यालय (Press Information Bureau - PIB) की प्रेस विज्ञप्तियां।</li>
              <li><strong>टियर 3 (Tier 3):</strong> भर्ती बोर्डों और मंत्रालयों के सत्यापित सोशल मीडिया हैंडल्स।</li>
              <li><strong>गैर-स्वीकार्य:</strong> बिना आधिकारिक पुष्टि के सोशल मीडिया वायरल दावे, व्हाट्सएप फॉरवर्ड, या असत्यापित ब्लॉग्स।</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">4.</span> शुद्धिपत्र एवं सुधार नीति (Corrections Policy)
            </h2>
            <p className="mb-4">
              यदि किसी भर्ती बोर्ड द्वारा कोई शुद्धिपत्र (Corrigendum / Addendum) जारी किया जाता है या परीक्षा तिथि में बदलाव होता है, तो हमारी टीम <strong>2 घंटे के भीतर</strong> मूल लेख को अपडेट करती है।
            </p>
            <p className="mb-4">
              यदि हमारे किसी लेख में अनजाने में कोई तथ्यात्मक त्रुटि पाई जाती है, तो उसे तुरंत सुधारा जाता है और लेख के शीर्ष पर अपडेट नोट जोड़ा जाता है।
            </p>
            <p className="text-sm bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              📌 पाठक किसी भी त्रुटि की सूचना सीधे हमारे संपादकीय ईमेल <strong>support@knowora.in</strong> पर विषय &ldquo;Editorial Correction&rdquo; के साथ दे सकते हैं।
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">5.</span> लेखक स्वतंत्रता एवं पारदर्शिता (Editorial Independence)
            </h2>
            <p className="mb-4">
              Knowora किसी भी राजनीतिक दल, कोचिंग संस्थान, या व्यावसायिक भर्ती एजेंट से प्रायोजित पक्षपाती लेख प्रकाशित नहीं करता। हमारी समीक्षाएं और विश्लेषण विद्यार्थियों के हित को ध्यान में रखकर पूरी तरह स्वतंत्र रूप से लिखे जाते हैं।
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-500">6.</span> संपादकीय संपर्क एवं शिकायत निवारण
            </h2>
            <p className="mb-2"><strong>मुख्य संपादक:</strong> विकास सांगवाल (Vikas Sangwal)</p>
            <p className="mb-2"><strong>संपादकीय डेस्क:</strong> support@knowora.in</p>
            <p className="mb-4"><strong>पोर्टल:</strong> https://knowora.in</p>
            <div className="flex gap-4 pt-4 border-t border-neutral-800">
              <Link href="/fact-check-policy" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                तथ्य-जांच नीति पढ़ें →
              </Link>
              <Link href="/about" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                हमारे बारे में →
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
