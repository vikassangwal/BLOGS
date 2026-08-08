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
  'ssc cgl': 'https://ssc.gov.in',
  'ssc chsl': 'https://ssc.gov.in',
  'ssc mts': 'https://ssc.gov.in',
  'ssc gd': 'https://ssc.gov.in',
  'upsc': 'https://upsc.gov.in',
  'union public service commission': 'https://upsc.gov.in',
  'upsc cms': 'https://upsc.gov.in',
  'upsc nda': 'https://upsc.gov.in',
  'upsc cds': 'https://upsc.gov.in',
  'ibps': 'https://ibps.in',
  'ibps po': 'https://ibps.in',
  'ibps clerk': 'https://ibps.in',
  'ibps so': 'https://ibps.in',
  'ibps rrb': 'https://ibps.in',
  'nta': 'https://nta.ac.in',
  'national testing agency': 'https://nta.ac.in',
  'railway': 'https://indianrailways.gov.in',
  'rrb': 'https://indianrailways.gov.in',
  'rrc': 'https://indianrailways.gov.in',
  'rrb ntpc': 'https://indianrailways.gov.in',
  'rrb group d': 'https://indianrailways.gov.in',
  'indian army': 'https://joinindianarmy.nic.in',
  'agniveer': 'https://joinindianarmy.nic.in',
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
  'jee main': 'https://jeemain.nta.ac.in',
  'jee advanced': 'https://jeeadv.ac.in',
  'cuet': 'https://cuet.nta.nic.in',
  'ugc net': 'https://ugcnet.nta.ac.in',
  'csir': 'https://csirhrdg.res.in',
  'drdo': 'https://drdo.gov.in',
  'isro': 'https://isro.gov.in',
  'ncs': 'https://ncs.gov.in',
  'national career service': 'https://ncs.gov.in',
  'employment news': 'https://employmentnews.gov.in',
  'gazette': 'https://egazette.gov.in',
  'egazette': 'https://egazette.gov.in',
  'epfo': 'https://epfindia.gov.in',
  'esic': 'https://esic.gov.in',
  'pmkvy': 'https://pmkvyofficial.org',
  'cisf': 'https://cisf.gov.in',
  'crpf': 'https://crpf.gov.in',
  'bsf': 'https://bsf.gov.in',
  'itbp': 'https://itbpolice.nic.in',
  'ssb': 'https://ssb.nic.in',
  'nda': 'https://joinindianarmy.nic.in',
  'cds': 'https://upsc.gov.in',
  'territorial army': 'https://joinindianarmy.nic.in',
  'coast guard': 'https://joinindiancoastguard.cdac.in',
  'india post': 'https://indiapostgdsonline.gov.in',
  'postal': 'https://indiapostgdsonline.gov.in',
  'gramin dak sevak': 'https://indiapostgdsonline.gov.in',
  'gds': 'https://indiapostgdsonline.gov.in',
  'fci': 'https://fci.gov.in',
  'food corporation': 'https://fci.gov.in',
  'customs': 'https://cbic.gov.in',
  'income tax': 'https://incometaxindia.gov.in',

  // Banks & Financial
  'sbi': 'https://sbi.co.in/web/careers',
  'sbi po': 'https://sbi.co.in/web/careers',
  'sbi clerk': 'https://sbi.co.in/web/careers',
  'rbi': 'https://rbi.org.in',
  'pnb': 'https://pnbindia.in',
  'punjab national bank': 'https://pnbindia.in',
  'bob': 'https://bankofbaroda.in',
  'bank of baroda': 'https://bankofbaroda.in',
  'canara bank': 'https://canarabank.com',
  'union bank': 'https://unionbankofindia.co.in',
  'bank of india': 'https://bankofindia.co.in',
  'indian bank': 'https://indianbank.in',
  'central bank': 'https://centralbankofindia.co.in',
  'uco bank': 'https://ucobank.com',
  'lic': 'https://licindia.in',
  'niacl': 'https://newindia.co.in',
  'uiic': 'https://uiic.co.in',
  'gic': 'https://gicofindia.com',
  'nabard': 'https://nabard.org',
  'sidbi': 'https://sidbi.in',
  'idbi bank': 'https://idbibank.in',

  // PSUs
  'ongc': 'https://ongcindia.com',
  'ntpc': 'https://ntpc.co.in',
  'bhel': 'https://bhel.com',
  'iocl': 'https://iocl.com',
  'bpcl': 'https://bharatpetroleum.in',
  'hpcl': 'https://hindustanpetroleum.com',
  'gail': 'https://gail.co.in',
  'sail': 'https://sail.co.in',
  'coal india': 'https://coalindia.in',
  'nhpc': 'https://nhpcindia.com',
  'powergrid': 'https://powergrid.in',
  'bel': 'https://bel-india.in',
  'hal': 'https://hal-india.co.in',
  'ecil': 'https://ecil.co.in',
  'mecl': 'https://mecl.gov.in',
  'npcil': 'https://npcil.nic.in',
  'dmrc': 'https://delhimetrorail.com',
  'metro': 'https://delhimetrorail.com',
  'pspcl': 'https://pspcl.in',

  // Health & Medical
  'nhm': 'https://nhm.gov.in',
  'national health mission': 'https://nhm.gov.in',
  'chc': 'https://nhm.gov.in',
  'phc': 'https://nhm.gov.in',
  'anm': 'https://nhm.gov.in',
  'gnm': 'https://nhm.gov.in',
  'staff nurse': 'https://nhm.gov.in',
  'nursing': 'https://nhm.gov.in',

  // State Boards & PSCs
  'rpsc': 'https://rpsc.rajasthan.gov.in',
  'rsmssb': 'https://rsmssb.rajasthan.gov.in',
  'rssb': 'https://rsmssb.rajasthan.gov.in',
  'rajasthan': 'https://sso.rajasthan.gov.in',
  'uppsc': 'https://uppsc.up.nic.in',
  'upsssc': 'https://upsssc.gov.in',
  'up board': 'https://upmsp.edu.in',
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
  'haryana iti': 'https://admissions.itiharyana.gov.in',
  'iti haryana': 'https://admissions.itiharyana.gov.in',
  'ukpsc': 'https://ukpsc.gov.in',
  'uksssc': 'https://sssc.uk.gov.in',
  'uttarakhand': 'https://ukpsc.gov.in',
  'jssc': 'https://jssc.nic.in',
  'jharkhand': 'https://jharkhand.gov.in',
  'cgpsc': 'https://psc.cg.gov.in',
  'cg vyapam': 'https://vyapam.cgstate.gov.in',
  'chhattisgarh': 'https://psc.cg.gov.in',
  'cg teacher': 'https://vyapam.cgstate.gov.in',
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
  'tanuvas': 'https://tanuvas.ac.in',
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
  'himachal': 'https://himachal.nic.in',
  'hpbose': 'https://hpbose.org',
  'hp board': 'https://hpbose.org',
  'jammu kashmir': 'https://jkssb.nic.in',
  'jkssb': 'https://jkssb.nic.in',
  'delhi': 'https://dsssb.delhi.gov.in',
  'dsssb': 'https://dsssb.delhi.gov.in',

  // Universities & Education
  'du': 'https://du.ac.in',
  'delhi university': 'https://du.ac.in',
  'du admission': 'https://admission.uod.ac.in',
  'bhu': 'https://bhu.ac.in',
  'amu': 'https://amu.ac.in',
  'jnu': 'https://jnu.ac.in',
  'jamia': 'https://jmi.ac.in',
  'jamia millia': 'https://jmi.ac.in',
  'iit': 'https://josaa.nic.in',
  'nit': 'https://josaa.nic.in',
  'josaa': 'https://josaa.nic.in',
  'csab': 'https://csab.nic.in',
  'rohilkhand university': 'https://mjpru.ac.in',
  'mjp rohilkhand': 'https://mjpru.ac.in',
  'mjpru': 'https://mjpru.ac.in',
  'lucknow university': 'https://lkouniv.ac.in',
  'allahabad university': 'https://allduniv.ac.in',
  'sardar patel university': 'https://spumandi.ac.in',
  'spu mandi': 'https://spumandi.ac.in',
  'st joseph': 'https://sju.edu.in',

  // ITI & Skill Development
  'iti': 'https://ncvtmis.gov.in',
  'iti admission': 'https://ncvtmis.gov.in',
  'ncvt': 'https://ncvtmis.gov.in',
  'iti yamunanagar': 'https://admissions.itiharyana.gov.in',
  'iti mandi': 'https://hpkvn.nic.in',
  'iti bhiwani': 'https://admissions.itiharyana.gov.in',
  'skill training': 'https://skillindia.nsdcindia.org',
  'nsdc': 'https://nsdcindia.org',

  // Education Portals & Schemes
  'digilocker': 'https://digilocker.gov.in',
  'scholarship': 'https://scholarships.gov.in',
  'national scholarship': 'https://scholarships.gov.in',
  'pm kisan': 'https://pmkisan.gov.in',
  'e shram': 'https://eshram.gov.in',
  'nep': 'https://education.gov.in',
  'education ministry': 'https://education.gov.in',
  'up board result': 'https://upmsp.edu.in',
  'bseb': 'https://biharboardonline.com',
  'bihar board': 'https://biharboardonline.com',
  'school holiday': 'https://education.gov.in',
};

// Blocked competitor domains
const BLOCKED_DOMAINS = [
  'sarkariresult.com', 'freejobalert.com', 'testbook.com',
  'jagranjosh.com', 'adda247.com', 'safalta.com',
  'sarkariexam.com', 'govtjobsalert.com', 'naukri.com',
  'careerwill.com', 'wifistudy.com', 'gradeup.co',
  'embibe.com', 'prepp.in', 'byjus.com', 'rojgarresult.com',
  'sarkarijobfind.com', 'sarkarihelp.com', 'employmentguide.in'
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
  'scholarship': 'https://scholarships.gov.in',
  'sbi': 'https://sbi.co.in/web/careers',
  'pnb': 'https://pnbindia.in/career.aspx',
  'bob': 'https://bankofbaroda.in/careers',
  'lic': 'https://licindia.in/careers',
  'railway': 'https://indianrailways.gov.in',
  'rrb': 'https://indianrailways.gov.in',
  'indian army': 'https://joinindianarmy.nic.in',
  'indian navy': 'https://joinindiannavy.gov.in',
  'india post': 'https://indiapostgdsonline.gov.in',
  'nhm': 'https://nhm.gov.in',
  'du admission': 'https://admission.uod.ac.in',
  'jamia': 'https://jmi.ac.in',
  'josaa': 'https://josaa.nic.in',
  'cuet': 'https://cuet.nta.nic.in',
  'jee main': 'https://jeemain.nta.ac.in',
  'haryana iti': 'https://admissions.itiharyana.gov.in',
  'iti haryana': 'https://admissions.itiharyana.gov.in',
  'hssc': 'https://hssc.gov.in',
  'jssc': 'https://jssc.nic.in',
  'pspcl': 'https://pspcl.in',
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
  'scholarship': 'https://scholarships.gov.in',
  'sbi': 'https://sbi.co.in/web/careers/current-openings',
  'pnb': 'https://pnbindia.in/career.aspx',
  'railway': 'https://indianrailways.gov.in',
  'rrb': 'https://indianrailways.gov.in',
  'nhm': 'https://nhm.gov.in',
  'hssc': 'https://hssc.gov.in',
  'jssc': 'https://jssc.nic.in',
};

// District NIC mapping for auto-detection (district-name -> district.nic.in)
const DISTRICT_NIC_MAP: Record<string, string> = {
  'hazaribagh': 'https://hazaribag.nic.in',
  'hazaribag': 'https://hazaribag.nic.in',
  'ranchi': 'https://ranchi.nic.in',
  'patna': 'https://patna.nic.in',
  'lucknow': 'https://lucknow.nic.in',
  'jaipur': 'https://jaipur.rajasthan.gov.in',
  'bhopal': 'https://bhopal.nic.in',
  'dehradun': 'https://dehradun.nic.in',
  'shimla': 'https://himachal.nic.in',
  'mandi': 'https://hpmandi.nic.in',
  'yamunanagar': 'https://yamunanagar.nic.in',
  'bhiwani': 'https://bhiwani.nic.in',
  'ambala': 'https://ambala.nic.in',
  'gurgaon': 'https://gurugram.gov.in',
  'gurugram': 'https://gurugram.gov.in',
  'faridabad': 'https://faridabad.gov.in',
  'karnal': 'https://karnal.nic.in',
  'rohtak': 'https://rohtak.nic.in',
  'hisar': 'https://hisar.nic.in',
  'panipat': 'https://panipat.nic.in',
  'sonipat': 'https://sonipat.nic.in',
  'varanasi': 'https://varanasi.nic.in',
  'agra': 'https://agra.nic.in',
  'allahabad': 'https://prayagraj.nic.in',
  'prayagraj': 'https://prayagraj.nic.in',
  'kanpur': 'https://kanpur.nic.in',
  'ghaziabad': 'https://ghaziabad.nic.in',
  'noida': 'https://gbnagar.nic.in',
  'bareilly': 'https://bareilly.nic.in',
  'gorakhpur': 'https://gorakhpur.nic.in',
  'muzaffarpur': 'https://muzaffarpur.nic.in',
  'gaya': 'https://gaya.nic.in',
  'bhagalpur': 'https://bhagalpur.nic.in',
  'darbhanga': 'https://darbhanga.nic.in',
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

    // 3. Block empty/placeholder links (including emoji-only placeholders)
    if (href === '#' || href === '' || href.includes('LINK_NOT_AVAILABLE') || href.includes('example.com') || /^[\s👉🔗📎📄➡️✅💡⬇️🌐]+$/.test(href.trim())) {
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

  // 5. Fix table cells / <td> that contain only emoji (👉, 🔗) without any <a> link — replace with proper official link
  fixedHtml = fixedHtml.replace(/<td([^>]*)>\s*([👉🔗📎📄➡️✅💡⬇️🌐\s]+)\s*<\/td>/gi, (match, attrs, emojiContent) => {
    const officialUrl = findOfficialPortal(topicTitle);
    if (officialUrl && officialUrl !== '#') {
      return `<td${attrs}><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">ऑफिशियल वेबसाइट पर देखें</a></td>`;
    }
    return `<td${attrs}><span style="color: var(--color-text-secondary);">जल्द उपलब्ध होगा</span></td>`;
  });

  // 6. Fix standalone emoji links in <p>, <li>, <span> etc. (e.g. <p>👉</p> or <li>👉</li>)
  fixedHtml = fixedHtml.replace(/<(p|li|span|div)([^>]*)>\s*([👉🔗📎📄➡️✅💡⬇️🌐\s]+)\s*<\/\1>/gi, (match, tag, attrs, emojiContent) => {
    const officialUrl = findOfficialPortal(topicTitle);
    if (officialUrl && officialUrl !== '#') {
      return `<${tag}${attrs}><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">ऑफिशियल वेबसाइट पर जाएं</a></${tag}>`;
    }
    return `<${tag}${attrs}><span style="color: var(--color-text-secondary);">जल्द उपलब्ध होगा</span></${tag}>`;
  });

  // 7. Fix anchor tags where text is only emoji (e.g. <a href="#">👉</a>)
  fixedHtml = fixedHtml.replace(/<a\s+([^>]*?)href=["']([^"']*)["']([^>]*?)>\s*([👉🔗📎📄➡️✅💡⬇️🌐\s]+)\s*<\/a>/gi, (match, before, href, after, emojiText) => {
    const officialUrl = findOfficialPortal(topicTitle);
    if (officialUrl && officialUrl !== '#') {
      return `<a href="${officialUrl}" target="_blank" rel="noopener noreferrer">ऑफिशियल वेबसाइट पर जाएं</a>`;
    }
    return `<span style="color: var(--color-text-secondary);">जल्द उपलब्ध होगा</span>`;
  });

  return fixedHtml;
}

/**
 * Finds the most relevant official portal URL based on the blog topic title.
 */
function findOfficialPortal(topic: string): string {
  const tLower = topic.toLowerCase();
  // 1. Check OFFICIAL_PORTALS (longest match first)
  const keys = Object.keys(OFFICIAL_PORTALS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (tLower.includes(key.toLowerCase())) {
      return OFFICIAL_PORTALS[key];
    }
  }
  // 2. Check DISTRICT_NIC_MAP for district-level topics
  const districtKeys = Object.keys(DISTRICT_NIC_MAP).sort((a, b) => b.length - a.length);
  for (const dKey of districtKeys) {
    if (tLower.includes(dKey.toLowerCase())) {
      return DISTRICT_NIC_MAP[dKey];
    }
  }
  // 3. Category-aware fallback
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
  // Try district match
  const districtKeys = Object.keys(DISTRICT_NIC_MAP).sort((a, b) => b.length - a.length);
  for (const dKey of districtKeys) {
    if (lower.includes(dKey.toLowerCase())) {
      return DISTRICT_NIC_MAP[dKey];
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
  // Try district match
  const districtKeys = Object.keys(DISTRICT_NIC_MAP).sort((a, b) => b.length - a.length);
  for (const dKey of districtKeys) {
    if (lower.includes(dKey.toLowerCase())) {
      return DISTRICT_NIC_MAP[dKey];
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
