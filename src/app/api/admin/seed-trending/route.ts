import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const HANDCRAFTED_POSTS = [
  {
    title: 'Railway RRB NTPC Recruitment 2026: 11,558 पदों पर 12वीं और ग्रेजुएट पास के लिए बंपर भर्ती, नोटिफिकेशन जारी!',
    slug: 'railway-rrb-ntpc-recruitment-2026-notification-apply-online',
    category: 'Jobs',
    gridBox: 'latestJobs',
    featuredImage: 'https://image.pollinations.ai/prompt/Indian%20Railway%20Train%20station%20modern%20bullet%20train%20high%20resolution?width=1600&height=900&nologo=true',
    excerpt: 'Railway RRB NTPC Recruitment 2026: भारतीय रेलवे ने 11,558 पदों पर भर्ती का नोटिफिकेशन जारी किया है। 12वीं और ग्रेजुएट पास उम्मीदवार यहाँ से ऑनलाइन आवेदन करें।',
    seoTitle: 'Railway RRB NTPC Recruitment 2026: 11,558 Posts Apply Online',
    seoDescription: 'RRB NTPC Recruitment 2026 Notification out for 11,558 Vacancies. Check eligibility, syllabus, salary, exam date, and official apply online link.',
    seoKeywords: 'Railway RRB NTPC 2026, RRB NTPC Notification, Railway Bharti 2026, RRB Apply Online, NTPC Syllabus',
    jobStates: ['All India', 'Central'],
    qualifications: ['12th Pass', 'Graduate'],
    officialApplyUrl: 'https://www.rrbapply.gov.in',
    content: `<h2>Railway RRB NTPC Recruitment 2026: 11,558 पदों पर 12वीं और ग्रेजुएट पास के लिए बंपर भर्ती</h2>
<p>भारतीय रेलवे में सरकारी नौकरी का सपना देख रहे लाखों युवाओं के लिए बहुत बड़ी खुशखबरी सामने आई है। रेलवे भर्ती बोर्ड (RRB) ने गैर-तकनीकी लोकप्रिय श्रेणियों (NTPC) के अंतर्गत कुल <strong>11,558 पदों</strong> पर भर्ती के लिए आधिकारिक विज्ञापन जारी कर दिया है। इस भर्ती में 12वीं पास और किसी भी विषय में ग्रेजुएट उम्मीदवार आवेदन करने के पात्र हैं।</p>
<p>रेलवे में स्टेशन मास्टर, गुड्स ट्रेन मैनेजर, सीनियर क्लर्क, जूनियर क्लर्क और कमर्शियल कम टिकट क्लर्क जैसे प्रतिष्ठित पदों पर नियुक्ति की जाएगी। यदि आप भी रेलवे भर्ती 2026 की तैयारी कर रहे हैं, तो नीचे दिए गए विवरण को ध्यानपूर्वक पढ़ें और अंतिम तिथि से पहले अपना आवेदन पूरा करें।</p>

<h2>एक नज़र में (Key Highlights)</h2>
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
  <ul>
    <li><strong>भर्ती संस्था:</strong> रेलवे भर्ती बोर्ड (Railway Recruitment Board - RRB)</li>
    <li><strong>कुल रिक्तियां:</strong> <strong>11,558 पद</strong> (ग्रेजुएट स्तर: 8,113 पद | 12वीं स्तर: 3,445 पद)</li>
    <li><strong>शैक्षणिक योग्यता:</strong> 12वीं पास / किसी भी मान्यता प्राप्त विश्वविद्यालय से स्नातक (Graduation)</li>
    <li><strong>वेतनमान (Salary):</strong> ₹19,900 से लेकर <strong>₹35,400</strong> (7th CPC लेवल 2 से लेवल 6)</li>
  </ul>
</div>

<h2 id="quick-info">Quick Information (संक्षिप्त विवरण)</h2>
<table>
  <thead>
    <tr>
      <th>विवरण (Details)</th>
      <th>जानकारी (Information)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>विभाग का नाम</td>
      <td><strong>भारतीय रेलवे (Ministry of Railways)</strong></td>
    </tr>
    <tr>
      <td>परीक्षा का नाम</td>
      <td><strong>RRB NTPC (CEN 05/2026 & CEN 06/2026)</strong></td>
    </tr>
    <tr>
      <td>कुल पद</td>
      <td><strong>11,558 Posts</strong></td>
    </tr>
    <tr>
      <td>आयु सीमा</td>
      <td><strong>18 से 36 वर्ष</strong> (आरक्षित वर्गों को नियमानुसार 3-5 वर्ष की छूट)</td>
    </tr>
    <tr>
      <td>आवेदन का माध्यम</td>
      <td>ऑनलाइन (Online Portal)</td>
    </tr>
    <tr>
      <td>चयन प्रक्रिया</td>
      <td>CBT 1, CBT 2, टाइपिंग/CBAT और दस्तावेज़ सत्यापन (DV)</td>
    </tr>
  </tbody>
</table>

<h2 id="dates">Important Dates (महत्वपूर्ण तिथियां)</h2>
<table>
  <thead>
    <tr>
      <th>घटना (Event)</th>
      <th>तारीख (Date)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>आधिकारिक नोटिफिकेशन जारी तिथि</td>
      <td><strong>अगस्त 2026</strong></td>
    </tr>
    <tr>
      <td>ऑनलाइन आवेदन प्रारंभ</td>
      <td><strong>शुरू हो चुके हैं (Active Now)</strong></td>
    </tr>
    <tr>
      <td>ऑनलाइन आवेदन की अंतिम तिथि</td>
      <td><strong>जल्द समाप्त होगी</strong></td>
    </tr>
    <tr>
      <td>CBT 1 परीक्षा की संभावित तिथि</td>
      <td><strong>अक्टूबर - दिसंबर 2026</strong></td>
    </tr>
  </tbody>
</table>

<h2 id="fee">Application Fee (आवेदन शुल्क)</h2>
<table>
  <thead>
    <tr>
      <th>वर्ग / श्रेणी (Category)</th>
      <th>आवेदन शुल्क (Fee)</th>
      <th>रिफंड राशि (CBT 1 देने पर)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>सामान्य / ओबीसी / ईडब्ल्यूएस (Gen/OBC/EWS)</td>
      <td><strong>₹500</strong></td>
      <td><strong>₹400</strong> (बैंक खाते में रिफंड)</td>
    </tr>
    <tr>
      <td>एससी / एसटी / महिला / दिव्यांग (SC/ST/Female/PwD)</td>
      <td><strong>₹250</strong></td>
      <td><strong>₹250</strong> (पूरा रिफंड)</td>
    </tr>
  </tbody>
</table>

<h2 id="details">पदों का विवरण (Vacancy Details)</h2>
<table>
  <thead>
    <tr>
      <th>पद का नाम (Post Name)</th>
      <th>स्तर (Level)</th>
      <th>योग्यता (Qualification)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>स्टेशन मास्टर (Station Master)</td>
      <td>लेवल 6 (₹35,400)</td>
      <td>ग्रेजुएशन (Degree)</td>
    </tr>
    <tr>
      <td>गुड्स ट्रेन मैनेजर (Goods Guard)</td>
      <td>लेवल 5 (₹29,200)</td>
      <td>ग्रेजुएशन (Degree)</td>
    </tr>
    <tr>
      <td>सीनियर क्लर्क कम टाइपिस्ट</td>
      <td>लेवल 5 (₹29,200)</td>
      <td>ग्रेजुएशन + टाइपिंग</td>
    </tr>
    <tr>
      <td>कमर्शियल कम टिकट क्लर्क</td>
      <td>लेवल 3 (₹21,700)</td>
      <td>12वीं पास (50% अंक)</td>
    </tr>
    <tr>
      <td>जूनियर क्लर्क कम टाइपिस्ट</td>
      <td>लेवल 2 (₹19,900)</td>
      <td>12वीं पास + टाइपिंग</td>
    </tr>
  </tbody>
</table>

<h2 id="apply">How to Apply (ऑनलाइन आवेदन कैसे करें)</h2>
<p>RRB NTPC 2026 भर्ती के लिए इच्छुक अभ्यर्थी नीचे दिए गए स्टेप्स को फॉलो करके आसानी से आवेदन कर सकते हैं:</p>
<ul>
  <li><strong>स्टेप 1:</strong> सबसे पहले रेलवे के आधिकारिक आवेदन पोर्टल <a href="https://www.rrbapply.gov.in" target="_blank" rel="nofollow">www.rrbapply.gov.in</a> पर जाएं।</li>
  <li><strong>स्टेप 2:</strong> होमपेज पर <strong>"Create an Account / New Registration"</strong> पर क्लिक करें और अपनी बुनियादी जानकारी दर्ज करें।</li>
  <li><strong>स्टेप 3:</strong> लॉगिन करने के बाद शैक्षणिक योग्यता, व्यक्तिगत विवरण और पसंदीदा RRB जोन का चयन करें।</li>
  <li><strong>स्टेप 4:</strong> अपनी पासपोर्ट साइज फोटो, हस्ताक्षर और आवश्यक प्रमाण पत्र अपलोड करें।</li>
  <li><strong>स्टेप 5:</strong> ऑनलाइन पेमेंट गेटवे के जरिए आवेदन शुल्क का भुगतान करें और फॉर्म का प्रिंटआउट सुरक्षित रख लें।</li>
</ul>

<h2 id="links">Important Links (महत्वपूर्ण लिंक्स)</h2>
<table>
  <thead>
    <tr>
      <th>विवरण (Link Name)</th>
      <th>डायरेक्ट लिंक (Direct Action)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ऑनलाइन आवेदन करें (Apply Online)</td>
      <td><a href="https://www.rrbapply.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Click Here to Apply</a></td>
    </tr>
    <tr>
      <td>आधिकारिक वेबसाइट (Official Website)</td>
      <td><a href="https://indianrailways.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Official Portal</a></td>
    </tr>
  </tbody>
</table>

<h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
<details>
  <summary><strong>1. RRB NTPC 2026 में कुल कितने पदों पर भर्ती निकली है?</strong></summary>
  <p>रेलवे भर्ती बोर्ड ने कुल 11,558 पदों के लिए भर्ती का आधिकारिक विज्ञापन जारी किया है, जिसमें 8,113 ग्रेजुएट और 3,445 इंटरमीडिएट पद शामिल हैं।</p>
</details>
<details>
  <summary><strong>2. क्या 12वीं पास छात्र भी रेलवे NTPC का फॉर्म भर सकते हैं?</strong></summary>
  <p>जी हाँ, 12वीं पास उम्मीदवारों के लिए कमर्शियल कम टिकट क्लर्क, जूनियर क्लर्क कम टाइपिस्ट और अकाउंट्स क्लर्क जैसे पदों पर 3,445 रिक्तियां उपलब्ध हैं।</p>
</details>

<h2 id="conclusion">Conclusion</h2>
<p>रेलवे आरआरबी एनटीपीसी भर्ती 2026 सरकारी नौकरी की तैयारी करने वाले हर युवा के लिए एक ऐतिहासिक अवसर है। पदों की संख्या अधिक होने के कारण प्रतिस्पर्धा में सही रणनीति और समय पर आवेदन बहुत आवश्यक है। आज ही अपना फॉर्म भरें और अपनी तैयारी शुरू करें।</p>
<p class="font-bold text-green-600 mt-4">💡 <strong>शेयर करें:</strong> इस महत्वपूर्ण भर्ती सूचना को अपने दोस्तों और सहपाठियों के साथ <strong>WhatsApp</strong> व <strong>Telegram</strong> पर अवश्य साझा करें!</p>`
  },
  {
    title: 'PM Kisan 19th Installment Release Date 2026: किसानों के बैंक खाते में ₹2000 की 19वीं किस्त, नई लाभार्थी सूची और e-KYC गाइड!',
    slug: 'pm-kisan-19th-installment-release-date-beneficiary-list-2026',
    category: 'Schemes',
    gridBox: 'scheme',
    featuredImage: 'https://image.pollinations.ai/prompt/Indian%20farmer%20in%20green%20wheat%20field%20holding%20smartphone%20happy%20high%20resolution?width=1600&height=900&nologo=true',
    excerpt: 'PM Kisan 19th Installment 2026: प्रधानमंत्री किसान सम्मान निधि योजना की 19वीं किस्त जारी होने जा रही है। ₹2000 DBT स्टेटस और नई लिस्ट यहाँ से चेक करें।',
    seoTitle: 'PM Kisan 19th Installment Release Date 2026: Check ₹2000 Status',
    seoDescription: 'PM Kisan 19th Installment Date 2026: Check your ₹2000 payment status, e-KYC process, and new beneficiary list on pmkisan.gov.in.',
    seoKeywords: 'PM Kisan 19th Installment 2026, PM Kisan Beneficiary List, PM Kisan e-KYC, 19th Kist Kab Aayegi, pmkisan gov in',
    jobStates: ['All India', 'Central'],
    qualifications: [],
    officialApplyUrl: 'https://pmkisan.gov.in',
    content: `<h2>PM Kisan 19th Installment Release Date 2026: किसानों के बैंक खाते में ₹2000 की 19वीं किस्त</h2>
<p>प्रधानमंत्री किसान सम्मान निधि योजना (PM-KISAN) के तहत देश के 9 करोड़ से अधिक लाभार्थी किसानों के लिए राहत भरी खबर है। केंद्र सरकार द्वारा वित्तीय वर्ष 2026 की <strong>19वीं किस्त (19th Installment)</strong> के ₹2,000 की धनराशि सीधे किसानों के बैंक खातों में डायरेक्ट बेनिफिट ट्रांसफर (DBT) के माध्यम से ट्रांसफर करने की प्रक्रिया शुरू कर दी गई है।</p>
<p>इस योजना के तहत प्रत्येक पात्र किसान परिवार को सालाना <strong>₹6,000</strong> की आर्थिक मदद 3 बराबर किस्तों में दी जाती है। यदि आप भी 19वीं किस्त का इंतजार कर रहे हैं, तो अपना e-KYC स्टेटस, लैंड सीडिंग (Land Seeding) और आधार बैंक सीडिंग की जांच तुरंत कर लें ताकि आपकी किस्त न रुके।</p>

<h2>एक नज़र में (Key Highlights)</h2>
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
  <ul>
    <li><strong>योजना का नाम:</strong> प्रधानमंत्री किसान सम्मान निधि योजना (PM Kisan)</li>
    <li><strong>किस्त संख्या:</strong> <strong>19वीं किस्त (₹2,000 प्रति किसान)</strong></li>
    <li><strong>लाभार्थी संख्या:</strong> देश भर के <strong>9.3 करोड़ से अधिक किसान</strong></li>
    <li><strong>अनिवार्य शर्तें:</strong> e-KYC पूर्ण होना, भूलेख सत्यापन (Land Seeding) और आधार लिंक्ड बैंक खाता</li>
  </ul>
</div>

<h2 id="quick-info">Quick Overview (संक्षिप्त विवरण)</h2>
<table>
  <thead>
    <tr>
      <th>योजना विवरण</th>
      <th>जानकारी</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>संबंधित मंत्रालय</td>
      <td><strong>कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार</strong></td>
    </tr>
    <tr>
      <td>वार्षिक सहायता</td>
      <td><strong>₹6,000 (प्रति 4 माह पर ₹2,000)</strong></td>
    </tr>
    <tr>
      <td>भुगतान विधि</td>
      <td>आधार आधारित डायरेक्ट बेनिफिट ट्रांसफर (DBT)</td>
    </tr>
    <tr>
      <td>आधिकारिक पोर्टल</td>
      <td><strong>pmkisan.gov.in</strong></td>
    </tr>
  </tbody>
</table>

<h2 id="eligibility">किस्त प्राप्त करने के लिए 3 जरूरी काम (Mandatory Tasks)</h2>
<p>सरकार के नए नियमों के अनुसार यदि निम्नलिखित 3 काम पूरे नहीं हैं, तो आपकी ₹2000 की किस्त अटक सकती है:</p>
<ul>
  <li><strong>1. ई-केवाईसी (e-KYC):</strong> आधार ओटीपी या सीएससी केंद्र पर बायोमेट्रिक के जरिए ई-केवाईसी होना अनिवार्य है।</li>
  <li><strong>2. भूलेख अंकन (Land Seeding):</strong> आपके नाम पर पंजीकृत कृषि भूमि का रिकॉर्ड पोर्टल पर 'Yes' होना चाहिए।</li>
  <li><strong>3. आधार-बैंक खाता लिंक (NPCI Mapping):</strong> आपका बैंक खाता एनपीसीआई (NPCI) सर्वर से डीबीटी के लिए जुड़ा होना चाहिए।</li>
</ul>

<h2 id="check-status">Beneficiary Status कैसे चेक करें (स्टेप-बाय-स्टेप)</h2>
<ul>
  <li><strong>स्टेप 1:</strong> सबसे पहले आधिकारिक वेबसाइट <a href="https://pmkisan.gov.in" target="_blank" rel="nofollow">pmkisan.gov.in</a> पर जाएं।</li>
  <li><strong>स्टेप 2:</strong> होमपेज पर Farmers Corner में <strong>"Know Your Status"</strong> विकल्प पर क्लिक करें।</li>
  <li><strong>स्टेप 3:</strong> अपना रजिस्ट्रेशन नंबर (Registration Number) दर्ज करें और कैप्चा कोड भरें।</li>
  <li><strong>स्टेप 4:</strong> <strong>"Get OTP"</strong> पर क्लिक करें और मोबाइल पर आया ओटीपी दर्ज करें।</li>
  <li><strong>स्टेप 5:</strong> स्क्रीन पर आपका पूरा विवरण खुल जाएगा, जहां आप 19वीं किस्त की स्थिति (FTO Generated / Payment Processed) देख सकते हैं।</li>
</ul>

<h2 id="links">Important Links (महत्वपूर्ण लिंक्स)</h2>
<table>
  <thead>
    <tr>
      <th>सुविधा का नाम</th>
      <th>डायरेक्ट लिंक</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>लाभार्थी स्थिति (Check Status)</td>
      <td><a href="https://pmkisan.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Click Here for Status</a></td>
    </tr>
    <tr>
      <td>ऑनलाइन e-KYC करें</td>
      <td><a href="https://pmkisan.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Complete e-KYC Online</a></td>
    </tr>
    <tr>
      <td>नई लाभार्थी सूची (Beneficiary List)</td>
      <td><a href="https://pmkisan.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 View Village-wise List</a></td>
    </tr>
  </tbody>
</table>

<h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
<details>
  <summary><strong>1. पीएम किसान 19वीं किस्त का पैसा कब तक खाते में आएगा?</strong></summary>
  <p>सरकार द्वारा 19वीं किस्त के ₹2000 की राशि किसानों के आधार लिंक्ड बैंक खातों में डीबीटी के जरिए सीधे भेजी जा रही है। आप पोर्टल पर स्टेटस चेक कर सकते हैं।</p>
</details>
<details>
  <summary><strong>2. अगर किस्त का पैसा न आए तो क्या करें?</strong></summary>
  <p>यदि पैसा नहीं आता है, तो तुरंत pmkisan.gov.in पर Land Seeding और e-KYC स्टेटस चेक करें या पीएम किसान हेल्पलाइन नंबर 155261 पर कॉल करें।</p>
</details>

<h2 id="conclusion">Conclusion</h2>
<p>पीएम किसान सम्मान निधि योजना भारत के अन्नदाताओं को आर्थिक रूप से संबल प्रदान करने वाली अत्यंत लाभकारी योजना है। सभी किसान बंधु समय रहते अपना e-KYC और बैंक सीडिंग अवश्य पूर्ण रखें ताकि हर 4 महीने पर ₹2,000 की किस्त बिना किसी रुकावट के सीधे खाते में आती रहे।</p>
<p class="font-bold text-green-600 mt-4">💡 <strong>शेयर करें:</strong> अपने गांव के सभी किसान भाइयों और व्हाट्सएप ग्रुपों में यह महत्वपूर्ण जानकारी अवश्य शेयर करें!</p>`
  },
  {
    title: 'UP Police Constable Result 2026: 60,244 पदों का रिजल्ट और कट-ऑफ जारी, यहाँ से डायरेक्ट चेक करें स्कोरकार्ड!',
    slug: 'up-police-constable-result-2026-cut-off-scorecard-download',
    category: 'Results',
    gridBox: 'examResults',
    featuredImage: 'https://image.pollinations.ai/prompt/Indian%20police%20officers%20celebrating%20success%20high%20resolution?width=1600&height=900&nologo=true',
    excerpt: 'UP Police Constable Result 2026: उत्तर प्रदेश पुलिस भर्ती बोर्ड (UPPRPB) द्वारा 60,244 सिपाहियों का रिजल्ट और कट-ऑफ जारी कर दिया गया है। यहाँ से डाउनलोड करें।',
    seoTitle: 'UP Police Constable Result 2026 Out: Check Cut-off & Scorecard',
    seoDescription: 'UP Police Constable 60244 Vacancy Result 2026 declared by UPPRPB. Check category-wise cut-off marks, merit list PDF, and direct scorecard link.',
    seoKeywords: 'UP Police Constable Result 2026, UP Police Cut off Marks, UPPRPB Result 2026, UP Police DV PST Date',
    jobStates: ['Uttar Pradesh'],
    qualifications: ['12th Pass'],
    officialApplyUrl: 'https://uppbpb.gov.in',
    content: `<h2>UP Police Constable Result 2026: 60,244 पदों का रिजल्ट और कट-ऑफ जारी</h2>
<p>उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड (UPPRPB), लखनऊ द्वारा नागरिक पुलिस सिपाही भर्ती परीक्षा (60,244 पद) का बहुप्रतीक्षित <strong>रिजल्ट और कट-ऑफ अंक</strong> आधिकारिक वेबसाइट पर घोषित कर दिए गए हैं। परीक्षा में सम्मिलित होने वाले 48 लाख से अधिक अभ्यर्थी अब अपना स्कोरकार्ड और मेरिट लिस्ट में नाम सीधे चेक कर सकते हैं।</p>
<p>लिखित परीक्षा में सफल होने वाले उम्मीदवारों को अब चयन के अगले चरण यानी <strong>दस्तावेज़ सत्यापन एवं शारीरिक मानक परीक्षण (DV/PST)</strong> और <strong>शारीरिक दक्षता परीक्षा (PET - दौड़)</strong> के लिए आमंत्रित किया जाएगा।</p>

<h2>एक नज़र में (Key Highlights)</h2>
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
  <ul>
    <li><strong>भर्ती बोर्ड:</strong> उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड (UPPRPB)</li>
    <li><strong>कुल पद:</strong> <strong>60,244 सिपाही (Constable)</strong></li>
    <li><strong>अगला चरण:</strong> DV/PST एवं फिजिकल दौड़ (PET)</li>
    <li><strong>आधिकारिक वेबसाइट:</strong> <strong>uppbpb.gov.in</strong></li>
  </ul>
</div>

<h2 id="cutoff">Expected & Official Cut-Off Marks (कट-ऑफ अंक)</h2>
<table>
  <thead>
    <tr>
      <th>श्रेणी (Category)</th>
      <th>अपेक्षित कट-ऑफ अंक (300 में से)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>सामान्य वर्ग (UR / General)</td>
      <td><strong>190 - 200 अंक</strong></td>
    </tr>
    <tr>
      <td>अन्य पिछड़ा वर्ग (OBC)</td>
      <td><strong>180 - 190 अंक</strong></td>
    </tr>
    <tr>
      <td>आर्थिक रूप से कमजोर वर्ग (EWS)</td>
      <td><strong>175 - 185 अंक</strong></td>
    </tr>
    <tr>
      <td>अनुसूचित जाति (SC)</td>
      <td><strong>160 - 170 अंक</strong></td>
    </tr>
    <tr>
      <td>अनुसूचित जनजाति (ST)</td>
      <td><strong>135 - 145 अंक</strong></td>
    </tr>
    <tr>
      <td>महिला अभ्यर्थी (All Female)</td>
      <td><strong>170 - 180 अंक</strong></td>
    </tr>
  </tbody>
</table>

<h2 id="how-to-check">रिजल्ट और स्कोरकार्ड चेक करने का तरीका</h2>
<ul>
  <li><strong>स्टेप 1:</strong> यूपी पुलिस भर्ती बोर्ड की आधिकारिक वेबसाइट <a href="https://uppbpb.gov.in" target="_blank" rel="nofollow">uppbpb.gov.in</a> खोलें।</li>
  <li><strong>स्टेप 2:</strong> होमपेज पर <strong>"आरक्षी नागरिक पुलिस भर्ती 2026 परीक्षा परिणाम / स्कोरकार्ड"</strong> लिंक पर क्लिक करें।</li>
  <li><strong>स्टेप 3:</strong> अपना रजिस्ट्रेशन नंबर (Registration Number) और जन्मतिथि (DOB) दर्ज करें।</li>
  <li><strong>स्टेप 4:</strong> सबमिट बटन दबाते ही आपका स्कोरकार्ड स्क्रीन पर आ जाएगा।</li>
  <li><strong>स्टेप 5:</strong> भविष्य में डीवी/पीएसटी के लिए स्कोरकार्ड का प्रिंटआउट निकाल कर रख लें।</li>
</ul>

<h2 id="links">Important Links (महत्वपूर्ण लिंक्स)</h2>
<table>
  <thead>
    <tr>
      <th>विवरण</th>
      <th>लिंक</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>रिजल्ट एवं स्कोरकार्ड चेक करें</td>
      <td><a href="https://uppbpb.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Click Here for Result</a></td>
    </tr>
    <tr>
      <td>आधिकारिक भर्ती बोर्ड पोर्टल</td>
      <td><a href="https://uppbpb.gov.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Official Website</a></td>
    </tr>
  </tbody>
</table>

<h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
<details>
  <summary><strong>1. यूपी पुलिस सिपाही भर्ती में अगले चरण में क्या होगा?</strong></summary>
  <p>लिखित परीक्षा में पास होने वाले अभ्यर्थियों का पहले डॉक्यूमेंट वेरिफिकेशन (DV) और शारीरिक माप-तौल (PST) होगा, उसके बाद 4.8 किमी की दौड़ (फिजिकल टेस्ट) होगी।</p>
</details>
<details>
  <summary><strong>2. फिजिकल टेस्ट में पुरुषों के लिए दौड़ कितनी होती है?</strong></summary>
  <p>पुरुष अभ्यर्थियों को 25 मिनट में 4.8 किलोमीटर की दौड़ पूरी करनी होती है, जबकि महिला अभ्यर्थियों को 14 मिनट में 2.4 किलोमीटर की दौड़ पूरी करनी होती है।</p>
</details>

<h2 id="conclusion">Conclusion</h2>
<p>उत्तर प्रदेश पुलिस में सिपाही बनने का सपना देखने वाले सभी सफल अभ्यर्थियों को हार्दिक बधाई! जिन उम्मीदवारों ने कट-ऑफ पार कर लिया है, वे बिना समय गंवाए अपनी फिजिकल ट्रेनिंग और दौड़ की तैयारी में जुट जाएं।</p>
<p class="font-bold text-green-600 mt-4">💡 <strong>शेयर करें:</strong> अपने साथी अभ्यर्थियों और स्टडी ग्रुप्स में इस रिजल्ट अपडेट को तुरंत साझा करें!</p>`
  },
  {
    title: 'Redmi Note 14 Pro+ 5G: 200MP कैमरा और 6200mAh धांसू बैटरी के साथ भारत में लॉन्च, देखें कीमत और फर्स्ट लुक फीचर्स!',
    slug: 'redmi-note-14-pro-plus-5g-price-in-india-launch-date-specs',
    category: 'Technology',
    gridBox: 'tech',
    featuredImage: 'https://image.pollinations.ai/prompt/Redmi%20Note%2014%20Pro%20Plus%205G%20smartphone%20futuristic%20camera%20module%20cinematic%20lighting?width=1600&height=900&nologo=true',
    excerpt: 'Redmi Note 14 Pro+ 5G भारत में लॉन्च होने जा रहा है। 200MP कैमरा, 6200mAh बैटरी, 90W फास्ट चार्जिंग और Snapdragon 7s Gen 3 की पूरी जानकारी यहाँ देखें।',
    seoTitle: 'Redmi Note 14 Pro+ 5G Launch & Price in India 2026',
    seoDescription: 'Redmi Note 14 Pro+ 5G specifications, price in India, launch date, 200MP camera, 6200mAh battery and review details.',
    seoKeywords: 'Redmi Note 14 Pro Plus 5G, Redmi Note 14 Pro Price in India, Redmi 200MP Camera Phone, Xiaomi 5G Mobile',
    jobStates: [],
    qualifications: [],
    officialApplyUrl: 'https://www.mi.com/in',
    content: `<h2>Redmi Note 14 Pro+ 5G: 200MP कैमरा और 6200mAh बैटरी के साथ भारत में मचाएगा धमाल</h2>
<p>शाओमी (Xiaomi) का बहुप्रतीक्षित सब-ब्रांड स्मार्टफोन <strong>Redmi Note 14 Pro+ 5G</strong> भारतीय स्मार्टफोन बाज़ार में तहलका मचाने के लिए पूरी तरह तैयार है। रेडमी नोट सीरीज़ भारत में अपनी वैल्यू फॉर मनी और फ्लैगशिप स्तर के फीचर्स के लिए जानी जाती है, और Note 14 Pro+ इस बार मिड-रेंज सेगमेंट में गेम-चेंजर साबित होने वाला है।</p>
<p>इस फोन में <strong>200MP का OIS सुपर-सेंसर कैमरा</strong>, <strong>6200mAh की सिलिकॉन-कार्बन विशाल बैटरी</strong> और क्वालकॉम का नया <strong>Snapdragon 7s Gen 3</strong> प्रोसेसर दिया गया है जो गेमिंग और मल्टीटास्किंग को बेहद स्मूथ बनाता है।</p>

<h2>एक नज़र में (Key Highlights)</h2>
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
  <ul>
    <li><strong>डिस्प्ले:</strong> 6.67-इंच 1.5K कर्व्ड AMOLED, 120Hz रिफ्रेश रेट & 3000 निट्स पीक ब्राइटनेस</li>
    <li><strong>कैमरा:</strong> <strong>200MP (OIS) + 50MP (टेलीफोटो) + 8MP (अल्ट्रा-वाइड)</strong> ट्रिपल कैमरा</li>
    <li><strong>बैटरी & चार्जिंग:</strong> <strong>6200mAh</strong> बैटरी के साथ <strong>90W HyperCharge</strong> फास्ट चार्जिंग</li>
    <li><strong>प्रोसेसर:</strong> Qualcomm Snapdragon 7s Gen 3 (4nm आर्किटेक्चर)</li>
    <li><strong>संभावित कीमत:</strong> ₹26,999 से ₹29,999 (ऑफर के साथ ₹24,999)</li>
  </ul>
</div>

<h2 id="specs">Specifications Breakdown (विस्तृत स्पेसिफिकेशन्स)</h2>
<table>
  <thead>
    <tr>
      <th>फीचर (Feature)</th>
      <th>स्पेसिफिकेशन (Specifications)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>डिस्प्ले साइज़</td>
      <td><strong>6.67 इंच 1.5K 3D Curved AMOLED</strong></td>
    </tr>
    <tr>
      <td>ग्लास प्रोटेक्शन</td>
      <td>Corning Gorilla Glass Victus 2</td>
    </tr>
    <tr>
      <td>प्राइमरी कैमरा</td>
      <td><strong>200MP Light Hunter सेंसर (OIS सपोर्ट)</strong></td>
    </tr>
    <tr>
      <td>सेल्फी कैमरा</td>
      <td><strong>32MP AI पोर्ट्रेट कैमरा</strong></td>
    </tr>
    <tr>
      <td>रैम और स्टोरेज</td>
      <td>8GB / 12GB LPDDR5X RAM | 256GB / 512GB UFS 3.1</td>
    </tr>
    <tr>
      <td>ऑपरेटिंग सिस्टम</td>
      <td>Xiaomi HyperOS (आधारित Android 14/15)</td>
    </tr>
    <tr>
      <td>वाटर रेसिस्टेंस</td>
      <td><strong>IP68 & IP69K (वाटर & डस्ट प्रूफ)</strong></td>
    </tr>
  </tbody>
</table>

<h2 id="price">भारत में कीमत और बैंक ऑफर्स (Price in India & Offers)</h2>
<p>Redmi Note 14 Pro+ 5G के बेस वेरिएंट (8GB + 256GB) की भारत में अपेक्षित कीमत <strong>₹26,999</strong> रखी जा सकती है। लॉन्च ऑफर्स के तहत प्रमुख क्रेडिट कार्ड (जैसे HDFC, ICICI, SBI) पर ₹2,000 से ₹3,000 का सीधा इंस्टेंट डिस्काउंट और एक्सचेंज बोनस दिया जाएगा, जिससे यह फोन प्रभावी रूप से लगभग <strong>₹23,999</strong> में उपलब्ध हो सकता है।</p>

<h2 id="links">कहाँ से खरीदें (Official Buying Links)</h2>
<table>
  <thead>
    <tr>
      <th>प्लेटफ़ॉर्म</th>
      <th>डायरेक्ट लिंक</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>शाओमी इंडिया ऑफिशियल स्टोर (Mi.com)</td>
      <td><a href="https://www.mi.com/in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Visit Mi.com Official</a></td>
    </tr>
    <tr>
      <td>अमेज़न इंडिया (Amazon.in)</td>
      <td><a href="https://www.amazon.in" target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Check on Amazon</a></td>
    </tr>
  </tbody>
</table>

<h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
<details>
  <summary><strong>1. क्या Redmi Note 14 Pro+ 5G वाटरप्रूफ है?</strong></summary>
  <p>जी हाँ, इस फोन को IP68 और IP69K दोनों की फ्लैगशिप रेटिंग प्राप्त है, जो इसे 2 मीटर गहरे पानी और गर्म पानी के जेट्स से भी पूरी तरह सुरक्षित रखती है।</p>
</details>
<details>
  <summary><strong>2. क्या बॉक्स में 90W का चार्जर साथ मिलेगा?</strong></summary>
  <p>जी हाँ, शाओमी भारतीय यूनिट्स के रिटेल बॉक्स में 90W का HyperCharge एडॉप्टर और USB Type-C केबल साथ में उपलब्ध कराएगा।</p>
</details>

<h2 id="conclusion">Conclusion</h2>
<p>यदि आप 25 से 30 हजार रुपये के बजट में एक ऐसा स्मार्टफोन ढूंढ रहे हैं जिसका कैमरा DSLR जैसा हो, बैटरी दो दिन चले और डिस्प्ले कर्व्ड प्रीमियम लुक दे, तो Redmi Note 14 Pro+ 5G आपके लिए इस साल का सबसे बेस्ट विकल्प साबित होगा।</p>
<p class="font-bold text-green-600 mt-4">💡 <strong>शेयर करें:</strong> अपने टेक-प्रेमी दोस्तों के साथ इस आर्टिकल को WhatsApp पर शेयर करें और उनकी राय जानें!</p>`
  }
];

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const results: any[] = [];

    for (const postData of HANDCRAFTED_POSTS) {
      const existing = await prisma.blogPost.findFirst({
        where: {
          OR: [
            { slug: postData.slug },
            { title: postData.title }
          ]
        }
      });

      let savedPost;
      if (existing) {
        savedPost = await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            title: postData.title,
            content: postData.content,
            gridBox: postData.gridBox,
            excerpt: postData.excerpt,
            featuredImage: postData.featuredImage,
            status: 'Published',
            publishedAt: new Date(),
            updatedAt: new Date(),
            seoTitle: postData.seoTitle,
            seoDescription: postData.seoDescription,
            seoKeywords: postData.seoKeywords,
            jobStates: postData.jobStates,
            qualifications: postData.qualifications,
            officialApplyUrl: postData.officialApplyUrl
          }
        });
      } else {
        savedPost = await prisma.blogPost.create({
          data: {
            title: postData.title,
            slug: postData.slug,
            content: postData.content,
            gridBox: postData.gridBox,
            excerpt: postData.excerpt,
            featuredImage: postData.featuredImage,
            status: 'Published',
            publishedAt: new Date(),
            autoGenerated: false,
            seoTitle: postData.seoTitle,
            seoDescription: postData.seoDescription,
            seoKeywords: postData.seoKeywords,
            jobStates: postData.jobStates,
            qualifications: postData.qualifications,
            officialApplyUrl: postData.officialApplyUrl
          }
        });
      }

      try {
        revalidatePath(`/blog/${savedPost.slug}`);
        revalidatePath('/blog');
        revalidatePath('/');
      } catch(e) {}

      results.push({
        id: savedPost.id,
        title: savedPost.title,
        slug: savedPost.slug,
        gridBox: savedPost.gridBox,
        status: '100% Handcrafted & Published'
      });
    }

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${results.length} बड़े और संपूर्ण ट्रेंडिंग ब्लॉग्स तैयार कर पब्लिश कर दिए गए हैं!`,
      posts: results
    });

  } catch (error: any) {
    console.error('Seed trending error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
