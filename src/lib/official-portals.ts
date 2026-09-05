export const OFFICIAL_PORTALS: Array<{ pattern: RegExp; official: string; apply: string; notification: string; name: string }> = [
  {
    pattern: /\b(sebi|sebi grade a)\b/i,
    name: 'SEBI Official Portal',
    official: 'https://www.sebi.gov.in',
    apply: 'https://www.sebi.gov.in/department/human-resources-department-37/career.html',
    notification: 'https://www.sebi.gov.in'
  },
  {
    pattern: /\b(lic|lic aao|life insurance corporation)\b/i,
    name: 'LIC India Portal',
    official: 'https://licindia.in',
    apply: 'https://licindia.in/careers',
    notification: 'https://licindia.in/careers'
  },
  {
    pattern: /\b(csir|csir net|csir ugc net)\b/i,
    name: 'NTA CSIR NET Portal',
    official: 'https://csirnet.nta.ac.in',
    apply: 'https://csirnet.nta.ac.in',
    notification: 'https://csirnet.nta.ac.in'
  },
  {
    pattern: /\b(ugc net|ugc)\b/i,
    name: 'NTA UGC NET Portal',
    official: 'https://ugcnet.nta.ac.in',
    apply: 'https://ugcnet.nta.ac.in',
    notification: 'https://ugcnet.nta.ac.in'
  },
  {
    pattern: /\b(rrb|railway|ntpc|rrb alp|group d|rrc)\b/i,
    name: 'Railway RRB Official Portal',
    official: 'https://www.rrbapply.gov.in',
    apply: 'https://www.rrbapply.gov.in',
    notification: 'https://indianrailways.gov.in'
  },
  {
    pattern: /\b(bpsc|tre|tre 4|bihar teacher|bpsc cce)\b/i,
    name: 'Bihar BPSC Portal',
    official: 'https://www.bpsc.bih.nic.in',
    apply: 'https://www.bpsc.bih.nic.in',
    notification: 'https://www.bpsc.bih.nic.in'
  },
  {
    pattern: /\b(upsssc|pet|upsssc pet|vdo|lekhpal)\b/i,
    name: 'UPSSSC Official Portal',
    official: 'https://upsssc.gov.in',
    apply: 'https://upsssc.gov.in',
    notification: 'https://upsssc.gov.in'
  },
  {
    pattern: /\b(home guard|up police|uppbpb|constable)\b/i,
    name: 'UP Police Recruitment Board',
    official: 'https://uppbpb.gov.in',
    apply: 'https://uppbpb.gov.in',
    notification: 'https://uppbpb.gov.in'
  },
  {
    pattern: /\b(anganwadi|anganwari|wcd)\b/i,
    name: 'UP Anganwadi Portal',
    official: 'https://upanganwadibharti.in',
    apply: 'https://upanganwadibharti.in',
    notification: 'https://upanganwadibharti.in'
  },
  {
    pattern: /\b(rsmssb|rssb|jen|junior engineer|rajasthan)\b/i,
    name: 'Rajasthan RSSB Portal',
    official: 'https://rsmssb.rajasthan.gov.in',
    apply: 'https://rsmssb.rajasthan.gov.in',
    notification: 'https://rsmssb.rajasthan.gov.in'
  },
  {
    pattern: /\b(ssc|chsl|cgl|ssc gd|mts)\b/i,
    name: 'Staff Selection Commission (SSC)',
    official: 'https://ssc.gov.in',
    apply: 'https://ssc.gov.in',
    notification: 'https://ssc.gov.in/notices'
  },
  {
    pattern: /\b(gds|dak sevak|post office|india post)\b/i,
    name: 'India Post GDS Portal',
    official: 'https://indiapostgdsonline.gov.in',
    apply: 'https://indiapostgdsonline.gov.in',
    notification: 'https://indiapostgdsonline.gov.in'
  },
  {
    pattern: /\b(pm kisan|kisan samman|kisan)\b/i,
    name: 'PM Kisan Samman Nidhi Portal',
    official: 'https://pmkisan.gov.in',
    apply: 'https://pmkisan.gov.in',
    notification: 'https://pmkisan.gov.in'
  },
  {
    pattern: /\b(redmi|xiaomi|mi)\b/i,
    name: 'Xiaomi India Store',
    official: 'https://www.mi.com/in',
    apply: 'https://www.mi.com/in/product/redmi-note-14-pro-plus-5g',
    notification: 'https://www.mi.com/in'
  },
  {
    pattern: /\b(5g|telecom|dot)\b/i,
    name: 'Department of Telecommunications',
    official: 'https://dot.gov.in',
    apply: 'https://dot.gov.in',
    notification: 'https://dot.gov.in'
  },
  {
    pattern: /\b(ai|artificial intelligence|chatgpt|openai)\b/i,
    name: 'AI Official Platform',
    official: 'https://openai.com',
    apply: 'https://openai.com',
    notification: 'https://openai.com'
  }
];

export function resolveOfficialLinks(title: string, rawContent: string): { official: string; apply: string; notification: string; sanitizedContent: string } {
  const combined = (title + ' ' + rawContent).toLowerCase();
  
  let target = {
    name: 'National Portal of India',
    official: 'https://www.india.gov.in',
    apply: 'https://www.india.gov.in',
    notification: 'https://www.india.gov.in'
  };

  for (const item of OFFICIAL_PORTALS) {
    if (item.pattern.test(combined)) {
      target = item;
      break;
    }
  }

  let sanitized = rawContent
    .replace(/\${data\.officialUrl\.replace\([^)]*\)\}/g, target.official.replace('https://', ''))
    .replace(/\${data\.officialUrl\}/g, target.official)
    .replace(/href=["'](https?:\/\/)?(www\.)?(example\.com|placeholder\.com|#)[^"']*["']/gi, `href="${target.apply}" target="_blank" rel="nofollow"`)
    .replace(/href=["']#["']/gi, `href="${target.official}" target="_blank" rel="nofollow"`);

  // Autolink plain URLs
  sanitized = sanitized.replace(/(?<!href=["']|src=["']|>)(https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"'()]*)?)/gi, '<a href="$1" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline hover:text-blue-400">$1</a>');

  // If no links table, append verified official links table
  const hasLinks = sanitized.includes('<a href=') && (sanitized.includes('Official Links') || sanitized.includes('आधिकारिक') || sanitized.includes('Important Links'));
  if (!hasLinks) {
    sanitized += `
<h2>महत्वपूर्ण आधिकारिक वेब लिंक्स (Important Official Links Table)</h2>
<table>
  <thead>
    <tr>
      <th>सुविधा / सेवा का नाम</th>
      <th>आधिकारिक डायरेक्ट लिंक</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>आधिकारिक पोर्टल (${target.name})</td><td><a href="${target.official}" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline">👉 Visit Official Website</a></td></tr>
    <tr><td>ऑनलाइन आवेदन / सूचना लिंक (Apply / Result Portal)</td><td><a href="${target.apply}" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline">👉 Click Here to Access</a></td></tr>
    <tr><td>विस्तृत अधिसूचना एवं दिशा-निर्देश (Official Notification)</td><td><a href="${target.notification}" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline">👉 Download Details</a></td></tr>
  </tbody>
</table>`;
  }

  return {
    official: target.official,
    apply: target.apply,
    notification: target.notification,
    sanitizedContent: sanitized
  };
}

export function detectGridBox(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (/\b(admit card|hall ticket|एडमिट कार्ड|प्रवेश पत्र|city intimation|call letter)\b/i.test(combined)) return 'admitCard';
  if (/\b(result|रिजल्ट|cut off|कट ऑफ|scorecard|score|answer key|उत्तर कुंजी|merit list|मेरिट)\b/i.test(combined)) return 'examResults';
  if (/\b(scholarship|छात्रवृत्ति|nsp|स्कॉलरशिप|admission|cuet|neet|jee main|cbse)\b/i.test(combined)) return 'scholarship';
  if (/\b(yojana|योजना|kisan|subsidy|आवास|ई-श्रम|ladli|ration card|राशन|ayushman|pm-kisan)\b/i.test(combined)) return 'scheme';
  if (/\b(mobile|smartphone|5g|phone|camera|tech|स्मार्टफोन|ai tool|chatgpt|gemini|apple|samsung|redmi|xiaomi)\b/i.test(combined)) return 'tech';
  if (/\b(bank|sebi|lic|fd interest|pension|पेंशन|loan|लोन|finance|rbi|credit card|income tax|epfo)\b/i.test(combined)) return 'finance';
  if (/\b(upcoming|आगामी|जल्द आएगी|soon|expected vacancy)\b/i.test(combined)) return 'upcomingJobs';
  return 'latestJobs';
}
