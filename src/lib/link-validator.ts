// =============================================================
// OFFICIAL LINK VALIDATOR & FIXER
// Validates all external links in blog HTML, blocks competitors,
// and replaces broken/fake links with verified official portals.
// =============================================================

// Curated mapping of recruitment bodies to their official portal homepages
const OFFICIAL_PORTALS: Record<string, string> = {
  // Central Government
  'ssc': 'https://ssc.gov.in',
  'staff selection commission': 'https://ssc.gov.in',
  'upsc': 'https://upsc.gov.in',
  'union public service commission': 'https://upsc.gov.in',
  'ibps': 'https://ibps.in',
  'nta': 'https://nta.ac.in',
  'national testing agency': 'https://nta.ac.in',
  'railway': 'https://indianrailways.gov.in',
  'rrb': 'https://indianrailways.gov.in',
  'indian army': 'https://joinindianarmy.nic.in',
  'indian navy': 'https://joinindiannavy.gov.in',
  'indian air force': 'https://afcat.cdac.in',
  'pib': 'https://pib.gov.in',
  'ugc': 'https://ugc.gov.in',
  'cbse': 'https://cbse.gov.in',
  'icse': 'https://cisce.org',
  'ignou': 'https://ignou.ac.in',
  'aiims': 'https://aiimsexams.ac.in',
  'aiimsexams': 'https://aiimsexams.ac.in',
  'kvs': 'https://kvsangathan.nic.in',
  'kendriya vidyalaya': 'https://kvsangathan.nic.in',
  'navodaya': 'https://navodaya.gov.in',
  'aicte': 'https://aicte-india.org',
  'ncte': 'https://ncte.gov.in',
  'neet': 'https://nta.ac.in',
  'jee': 'https://nta.ac.in',
  'cuet': 'https://nta.ac.in',
  'ugc net': 'https://nta.ac.in',
  'csir': 'https://csirhrdg.res.in',
  'drdo': 'https://drdo.gov.in',
  'isro': 'https://isro.gov.in',
  'ncs': 'https://ncs.gov.in',
  'national career service': 'https://ncs.gov.in',
  'employment news': 'https://employmentnews.gov.in',
  'gazette': 'https://egazette.gov.in',
  'egazette': 'https://egazette.gov.in',
  'sbi': 'https://sbi.co.in',
  'rbi': 'https://rbi.org.in',
  'epfo': 'https://epfindia.gov.in',
  'esic': 'https://esic.gov.in',
  'pmkvy': 'https://pmkvyofficial.org',
  // State Boards & PSCs
  'rpsc': 'https://rpsc.rajasthan.gov.in',
  'rsmssb': 'https://rsmssb.rajasthan.gov.in',
  'rssb': 'https://rsmssb.rajasthan.gov.in',
  'rajasthan': 'https://sso.rajasthan.gov.in',
  'uppsc': 'https://uppsc.up.nic.in',
  'upsssc': 'https://upsssc.gov.in',
  'uttar pradesh': 'https://uppsc.up.nic.in',
  'bpsc': 'https://bpsc.bih.nic.in',
  'bssc': 'https://bssc.bihar.gov.in',
  'bihar': 'https://bpsc.bih.nic.in',
  'mppsc': 'https://mppsc.mp.gov.in',
  'mpesb': 'https://esb.mp.gov.in',
  'madhya pradesh': 'https://mppsc.mp.gov.in',
  'hssc': 'https://hssc.gov.in',
  'hpsc': 'https://hpsc.gov.in',
  'haryana': 'https://hssc.gov.in',
  'ukpsc': 'https://ukpsc.gov.in',
  'uttarakhand': 'https://ukpsc.gov.in',
  'jssc': 'https://jssc.nic.in',
  'jharkhand': 'https://jssc.nic.in',
  'cgpsc': 'https://psc.cg.gov.in',
  'chhattisgarh': 'https://psc.cg.gov.in',
  'wbpsc': 'https://wbpsc.gov.in',
  'west bengal': 'https://wbpsc.gov.in',
  'appsc': 'https://psc.ap.gov.in',
  'andhra pradesh': 'https://psc.ap.gov.in',
  'tspsc': 'https://tspsc.gov.in',
  'telangana': 'https://tspsc.gov.in',
  'kpsc': 'https://kpsc.kar.nic.in',
  'karnataka': 'https://kpsc.kar.nic.in',
  'tnpsc': 'https://tnpsc.gov.in',
  'tamil nadu': 'https://tnpsc.gov.in',
  'kerala psc': 'https://keralapsc.gov.in',
  'kerala': 'https://keralapsc.gov.in',
  'gpsc': 'https://gpsc.gujarat.gov.in',
  'gujarat': 'https://gpsc.gujarat.gov.in',
  'mpsc': 'https://mpsc.gov.in',
  'maharashtra': 'https://mpsc.gov.in',
  'opsc': 'https://opsc.gov.in',
  'odisha': 'https://opsc.gov.in',
  'ppsc': 'https://ppsc.gov.in',
  'punjab': 'https://ppsc.gov.in',
  'apsc': 'https://apsc.nic.in',
  'assam': 'https://apsc.nic.in',
  'manipur': 'https://manipur.gov.in',
  'meghalaya': 'https://meghalaya.gov.in',
  'mizoram': 'https://mizoram.gov.in',
  'nagaland': 'https://nagaland.gov.in',
  'tripura': 'https://tripura.gov.in',
  'sikkim': 'https://sikkim.gov.in',
  'arunachal pradesh': 'https://arunachalpradesh.gov.in',
  'goa': 'https://goa.gov.in',
  'himachal pradesh': 'https://himachal.nic.in',
  'jammu kashmir': 'https://jkssb.nic.in',
  'jkssb': 'https://jkssb.nic.in',
  'delhi': 'https://dsssb.delhi.gov.in',
  'dsssb': 'https://dsssb.delhi.gov.in',
  // Universities
  'du': 'https://du.ac.in',
  'delhi university': 'https://du.ac.in',
  'bhu': 'https://bhu.ac.in',
  'amu': 'https://amu.ac.in',
  'jnu': 'https://jnu.ac.in',
  'iit': 'https://josaa.nic.in',
  'nit': 'https://josaa.nic.in',
  // Education Portals
  'digilocker': 'https://digilocker.gov.in',
  'scholarship': 'https://scholarships.gov.in',
  'national scholarship': 'https://scholarships.gov.in',
  'pm kisan': 'https://pmkisan.gov.in',
  'e shram': 'https://eshram.gov.in',
};

// Blocked competitor domains
const BLOCKED_DOMAINS = [
  'sarkariresult.com', 'freejobalert.com', 'testbook.com',
  'jagranjosh.com', 'adda247.com', 'safalta.com',
  'sarkariexam.com', 'govtjobsalert.com', 'naukri.com',
  'careerwill.com', 'wifistudy.com', 'gradeup.co',
  'embibe.com', 'prepp.in', 'byjus.com'
];

// Curated mapping of recruitment bodies to their official apply portals
const PORTAL_APPLY: Record<string, string> = {
  'ssc': 'https://ssc.gov.in/candidate-portal/login',
  'upsc': 'https://upsconline.nic.in',
  'ibps': 'https://ibps.in',
  'nta': 'https://nta.ac.in',
  'ncs': 'https://ncs.gov.in',
  'rpsc': 'https://rpsc.rajasthan.gov.in',
  'rsmssb': 'https://rsmssb.rajasthan.gov.in',
  'uppsc': 'https://uppsc.up.nic.in',
  'upsssc': 'https://upsssc.gov.in',
  'bpsc': 'https://bpsc.bih.nic.in',
  'ignou': 'https://ignou.ac.in',
  'aiims': 'https://aiimsexams.ac.in',
  'scholarship': 'https://scholarships.gov.in'
};

// Curated mapping of recruitment bodies to their official notifications listing pages
const PORTAL_NOTIFICATIONS: Record<string, string> = {
  'ssc': 'https://ssc.gov.in/candidate-portal/notices',
  'upsc': 'https://upsc.gov.in/examinations/Active-Examinations',
  'ibps': 'https://ibps.in',
  'ncs': 'https://ncs.gov.in',
  'national career service': 'https://ncs.gov.in',
  'nta': 'https://nta.ac.in/NoticeBoard',
  'cbse': 'https://cbse.gov.in/newtab/latest.html',
  'ignou': 'https://ignou.ac.in/ignou/bulletinboard/news',
  'aiims': 'https://aiimsexams.ac.in',
  'rpsc': 'https://rpsc.rajasthan.gov.in/advertisements',
  'rsmssb': 'https://rsmssb.rajasthan.gov.in/page?menuName=ApBuDetail&id=103',
  'uppsc': 'https://uppsc.up.nic.in/Candidate_Registration.aspx',
  'upsssc': 'https://upsssc.gov.in/AllNotifications.aspx',
  'bpsc': 'https://bpsc.bih.nic.in',
  'scholarship': 'https://scholarships.gov.in'
};

/**
 * Validates and fixes all external links in blog HTML content.
 * - Blocks competitor domains
 * - Blocks Google search redirect links
 * - Replaces broken/fake links with verified official portal homepages or specific apply/notification pages
 * - Adds warning notes for unverified links
 */
export function validateAndFixLinks(html: string, topicTitle: string): string {
  if (!html) return html;

  const stripAttrs = (s: string) => s.replace(/\s*target=["'][^"']*["']/gi, '').replace(/\s*rel=["'][^"']*["']/gi, '');

  // Regex to find all anchor tags with href and text content
  const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi;

  let fixedHtml = html.replace(linkRegex, (match, before, href, after, text) => {
    const lowerHref = href.toLowerCase();
    const linkText = text.toLowerCase();

    const isApplyLink = linkText.includes('apply') || linkText.includes('आवेदन') || linkText.includes('रजिस्ट्रेशन') || linkText.includes('registration') || linkText.includes('अप्लाई');
    const isNotifLink = linkText.includes('notific') || linkText.includes('विज्ञापन') || linkText.includes('अधिसूचना') || linkText.includes('pdf') || linkText.includes('डाउनलोड') || linkText.includes('download');

    // Helper to find the appropriate replacement link
    const getReplacement = () => {
      if (isApplyLink) return findOfficialApplyPortal(topicTitle);
      if (isNotifLink) return findOfficialNotificationPortal(topicTitle);
      return findOfficialPortal(topicTitle);
    };

    // 1. Block Google search redirect URLs
    if (lowerHref.includes('google.com/search') || lowerHref.includes('google.com/url')) {
      const replacement = getReplacement();
      return `<a ${stripAttrs(before)}href="${replacement}"${stripAttrs(after)} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }

    // 2. Block competitor domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (lowerHref.includes(blocked)) {
        const replacement = getReplacement();
        return `<a ${stripAttrs(before)}href="${replacement}"${stripAttrs(after)} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
    }

    // 3. Block empty/placeholder links
    if (href === '#' || href === '' || href.includes('LINK_NOT_AVAILABLE') || href.includes('example.com')) {
      const replacement = getReplacement();
      return `<a ${stripAttrs(before)}href="${replacement}"${stripAttrs(after)} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }

    // 4. Ensure external links have target="_blank" and rel="noopener noreferrer"
    if (lowerHref.startsWith('http') && !lowerHref.includes('knowora.in')) {
      const hasTarget = /target=/i.test(before + after);
      const hasRel = /rel=/i.test(before + after);
      let attrs = '';
      if (!hasTarget) attrs += ' target="_blank"';
      if (!hasRel) attrs += ' rel="noopener noreferrer"';
      return `<a ${before}href="${href}"${after}${attrs}>${text}</a>`;
    }

    return match;
  });

  // Post-process to deduplicate identical links (e.g. when multiple rows point to the exact same homepage URL)
  try {
    const linksFound: { href: string; match: string; text: string }[] = [];
    const tempRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = tempRegex.exec(fixedHtml)) !== null) {
      linksFound.push({ href: m[2], match: m[0], text: m[4] });
    }

    const seenUrls = new Set<string>();
    const duplicateUrls = new Set<string>();
    for (const lnk of linksFound) {
      const cleanUrl = lnk.href.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      if (seenUrls.has(cleanUrl)) {
        duplicateUrls.add(cleanUrl);
      } else {
        seenUrls.add(cleanUrl);
      }
    }

    if (duplicateUrls.size > 0) {
      const urlFirstOccur = new Set<string>();
      fixedHtml = fixedHtml.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi, (match, before, href, after, text) => {
        const cleanUrl = href.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        if (duplicateUrls.has(cleanUrl)) {
          if (!urlFirstOccur.has(cleanUrl)) {
            urlFirstOccur.add(cleanUrl);
            return match; // Keep the first link active
          } else {
            // Strip the <a> tag and convert to text since it is a duplicate link
            let cleanText = text.replace(/👉|Click Here|यहाँ क्लिक करें/gi, '').trim();
            cleanText = cleanText.replace(/^\((.*?)\)$/, '$1').trim();
            return `<span style="color: var(--color-text-secondary); font-weight: 500; font-size: 0.9rem;">${cleanText || 'ऑफिशियल होमपेज पर उपलब्ध'}</span>`;
          }
        }
        return match;
      });
    }
  } catch (e) {
    console.error("Link deduplication processing failed:", e);
  }

  return fixedHtml;
}

/**
 * Finds the most relevant official portal URL based on the blog topic title.
 */
function findOfficialPortal(topic: string): string {
  const tLower = topic.toLowerCase();
  const keys = Object.keys(OFFICIAL_PORTALS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (tLower.includes(key.toLowerCase())) {
      return OFFICIAL_PORTALS[key];
    }
  }
  // Category-aware fallback
  const techKeywords = ['phone', 'launch', 'smartphone', 'gadget', 'app', 'ai', 'gaming', 'tech', 'whatsapp', 'instagram', '5g', 'ev', 'scooter', 'telecom', 'bgmi', 'laptop', 'tablet'];
  const financeKeywords = ['finance', 'stock', 'budget', 'market', 'bank', 'earn', 'epf', 'ipo', 'gold', 'lic', 'rbi', 'mutual fund', 'insurance', 'loan', 'pm kisan', 'e-shram'];
  if (techKeywords.some(k => tLower.includes(k))) return '#'; // No official portal for tech topics - keep original link
  if (financeKeywords.some(k => tLower.includes(k))) return 'https://www.rbi.org.in';
  return 'https://ncs.gov.in';
}

/**
 * Finds the most relevant official candidate login / apply page based on the blog topic.
 */
function findOfficialApplyPortal(topicTitle: string): string {
  const lower = topicTitle.toLowerCase();
  const sortedKeys = Object.keys(PORTAL_APPLY).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      return PORTAL_APPLY[keyword];
    }
  }
  // Try fallback to general portal homepage
  const portalHome = findOfficialPortal(topicTitle);
  if (portalHome !== 'https://ncs.gov.in') return portalHome;
  return 'https://ncs.gov.in';
}

/**
 * Finds the most relevant official notifications / vacancy bulletin listing page.
 */
function findOfficialNotificationPortal(topicTitle: string): string {
  const lower = topicTitle.toLowerCase();
  const sortedKeys = Object.keys(PORTAL_NOTIFICATIONS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      return PORTAL_NOTIFICATIONS[keyword];
    }
  }
  // Try fallback to general portal homepage
  const portalHome = findOfficialPortal(topicTitle);
  if (portalHome !== 'https://ncs.gov.in') return portalHome;
  return 'https://ncs.gov.in';
}

/**
 * Checks if a URL belongs to a trusted official domain (.gov.in, .nic.in, .ac.in, .org.in)
 */
export function isOfficialDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.endsWith('.gov.in') ||
           hostname.endsWith('.nic.in') ||
           hostname.endsWith('.ac.in') ||
           hostname.endsWith('.org.in') ||
           hostname.endsWith('.res.in') ||
           hostname === 'ibps.in' ||
           hostname === 'cisce.org' ||
           hostname === 'aicte-india.org' ||
           hostname === 'sbi.co.in' ||
           hostname === 'rbi.org.in';
  } catch {
    return false;
  }
}

/**
 * Cleans the Table of Contents in the generated article HTML.
 * Removes self-referential links (pointing to TOC itself) and redundant links (pointing to the main title).
 */
export function cleanTableOfContents(html: string, title: string): string {
  if (!html) return html;

  // Find all list items (<li>)
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  
  let cleanedHtml = html.replace(liRegex, (liMatch, liContent) => {
    // Check if there is an anchor link inside the list item
    const anchorMatch = liContent.match(/<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/i);
    if (anchorMatch) {
      const href = anchorMatch[1];
      const linkText = anchorMatch[2].replace(/<[^>]+>/g, '').trim();
      
      const lowerText = linkText.toLowerCase();
      const lowerHref = href.toLowerCase();
      const lowerTitle = title.toLowerCase();
      
      // 1. Remove Table of Contents references
      if (lowerText.includes('table of contents') || 
          lowerText.includes('विषय सूची') || 
          lowerText.includes('toc') ||
          lowerHref === '#table-of-contents' ||
          lowerHref === '#toc' ||
          lowerHref === '#') {
        return ''; // remove this item
      }
      
      // 2. Remove main title references
      if (lowerTitle.includes(lowerText) || lowerText.includes(lowerTitle)) {
        if (linkText.length > 20) {
          return ''; // remove this item
        }
      }
    }
    return liMatch;
  });

  // Clean up any empty <ul></ul> or <ol></ol> if we emptied them
  cleanedHtml = cleanedHtml.replace(/<(ul|ol)[^>]*>\s*<\/\1>/gi, '');

  return cleanedHtml;
}
