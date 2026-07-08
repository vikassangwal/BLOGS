const fs = require('fs');

let text = fs.readFileSync('src/app/api/auto-blog/route.ts', 'utf8');

const ultimate500RoadmapRules = `
    17. ULTIMATE 500 BLOGGING ROADMAP & EXCELLENCE RULES (500 मास्टर नियम):
    - OFFICIAL PDF & GAZETTE PARSING: जानकारी केवल आधिकारिक विज्ञापनों (.gov.in / .nic.in) से लें।
    - SELECTION FLOWCHART & PET TABLE: चयन प्रक्रिया (Selection Stages) और शारीरिक दक्षता (PET/PST) की साफ़ अलग तालिका बनाएं।
    - PAY LEVEL & IN-HAND CALCULATOR: 7th CPC का Exact Pay Level (Level 1 से 14) और सम्भावित इन-हैंड सैलरी दोनों दर्शाएं।
    - 5-YEAR CUT-OFF TREND: सम्भव हो तो पिछले वर्षों की श्रेणी-वार कट-ऑफ (UR, OBC, SC, ST, EWS) तालिका ज़रूर शामिल करें।
    - AGE CALCULATION CUT-OFF DATE: आयु सीमा की गणना किस कट-ऑफ तारीख से होगी, इसका स्पष्ट उल्लेख करें।
    - OTR & SSO MANDATORY STEP: RPSC/SSC जैसी भर्तियों में OTR (One Time Registration) का पहला चरण ज़रूर लिखें।
    - INSTANT INDEXING & SCHEMA READY: लेख को स्वच्छ HTML5 में रखें ताकि गूगल बोट 1 मिनट में इंडेक्स करे।
    - ADSENSE SAFETY & NO SPAM: अत्यधिक स्पैम बटन्स न लगाएं। लेख को 100% ज्ञानवर्धक और भरोसेमंद बनाएं।
    - WHATSAPP & TELEGRAM BROADCAST SUMMARY: अंत में 2 पंक्तियों का संक्षिप्त सारांश (Short Summary) व्हाट्सएप शेयर हेतु प्रदान करें।
    - LIFETIME DYNAMIC YEAR: हमेशा चालू वर्ष (\${new Date().getFullYear()}) का प्रयोग करें। बीती हुई तारीखें न लिखें।`;

text = text.replace(
  /16\. SEO, E-E-A-T & HELPFUL CONTENT MASTER RULES.*/,
  `$&${ultimate500RoadmapRules}`
);

fs.writeFileSync('src/app/api/auto-blog/route.ts', text, 'utf8');
console.log("Fix13 applied successfully with Ultimate 500 Roadmap Rules.");
