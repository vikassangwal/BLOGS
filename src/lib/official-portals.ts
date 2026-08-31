export const OFFICIAL_PORTALS: Record<string, string> = {
  // Central Jobs
  'ssc': 'https://ssc.gov.in',
  'ssc cgl': 'https://ssc.gov.in',
  'ssc gd': 'https://ssc.gov.in',
  'ssc chsl': 'https://ssc.gov.in',
  'ssc mts': 'https://ssc.gov.in',
  'rrb': 'https://www.rrbapply.gov.in',
  'railway': 'https://www.rrbapply.gov.in',
  'rrb ntpc': 'https://www.rrbapply.gov.in',
  'rrb alp': 'https://www.rrbapply.gov.in',
  'rrb group d': 'https://www.rrbapply.gov.in',
  'upsc': 'https://upsconline.nic.in',
  'upsc ias': 'https://upsconline.nic.in',
  'upsc nda': 'https://upsconline.nic.in',
  'upsc cds': 'https://upsconline.nic.in',
  'ibps': 'https://www.ibps.in',
  'ibps po': 'https://www.ibps.in',
  'ibps clerk': 'https://www.ibps.in',
  'sbi': 'https://sbi.co.in/web/careers',
  'sbi po': 'https://sbi.co.in/web/careers',
  'post office': 'https://indiapostgdsonline.gov.in',
  'gds': 'https://indiapostgdsonline.gov.in',
  'army agniveer': 'https://joinindianarmy.nic.in',
  'air force': 'https://agnipathvayu.cdac.in',
  'navy': 'https://www.joinindiannavy.gov.in',

  // Entrance & Admit Cards
  'nta': 'https://nta.ac.in',
  'neet': 'https://neet.nta.nic.in',
  'jee': 'https://jeemain.nta.ac.in',
  'cuet': 'https://cuetug.ntaonline.in',
  'ugc net': 'https://ugcnet.nta.ac.in',
  'ctet': 'https://ctet.nic.in',
  'gate': 'https://gate2026.iitr.ac.in',
  'cbse': 'https://cbseresults.nic.in',

  // State Jobs
  'up police': 'https://uppbpb.gov.in',
  'uppbpb': 'https://uppbpb.gov.in',
  'up lekhpal': 'https://upsssc.gov.in',
  'upsssc': 'https://upsssc.gov.in',
  'rvunl': 'https://energy.rajasthan.gov.in/rvunl',
  'rpsc': 'https://rpsc.rajasthan.gov.in',
  'rsmssb': 'https://rsmssb.rajasthan.gov.in',
  'rajasthan police': 'https://police.rajasthan.gov.in',
  'bpsc': 'https://bpsc.bih.nic.in',
  'bssc': 'https://bssc.bihar.gov.in',
  'bihar police': 'https://csbc.bih.nic.in',
  'hssc': 'https://hssc.gov.in',
  'haryana cet': 'https://onetimeregn.haryana.gov.in',
  'mp esb': 'https://esb.mp.gov.in',
  'mp police': 'https://esb.mp.gov.in',
  'delhi police': 'https://delhipolice.gov.in',

  // Schemes
  'pm kisan': 'https://pmkisan.gov.in',
  'pm awas': 'https://pmaymis.gov.in',
  'pm vishwakarma': 'https://pmvishwakarma.gov.in',
  'pm surya ghar': 'https://pmsuryaghar.gov.in',
  'e shram': 'https://eshram.gov.in',
  'nsp': 'https://scholarships.gov.in',
  'scholarship': 'https://scholarships.gov.in',
};

export function resolveOfficialUrl(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, url] of Object.entries(OFFICIAL_PORTALS)) {
    if (lower.includes(key)) {
      return url;
    }
  }
  return 'https://knowora.in/blog';
}

export function detectGridBox(title: string, text: string): string {
  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('admit card') || combined.includes('hall ticket') || combined.includes('एडमिट कार्ड') || combined.includes('प्रवेश पत्र') || combined.includes('city intimation')) {
    return 'admitCard';
  }
  if (combined.includes('result') || combined.includes('रिजल्ट') || combined.includes('cut off') || combined.includes('कट ऑफ') || combined.includes('scorecard') || combined.includes('answer key') || combined.includes('उत्तर कुंजी')) {
    return 'examResults';
  }
  if (combined.includes('scholarship') || combined.includes('छात्रवृत्ति') || combined.includes('nsp') || combined.includes('स्कॉलरशिप')) {
    return 'scholarship';
  }
  if (combined.includes('yojana') || combined.includes('योजना') || combined.includes('kisan') || combined.includes('subsidy') || combined.includes('आवास') || combined.includes('ई-श्रम')) {
    return 'scheme';
  }
  if (combined.includes('mobile') || combined.includes('smartphone') || combined.includes('5g') || combined.includes('phone') || combined.includes('camera') || combined.includes('tech') || combined.includes('स्मार्टफोन')) {
    return 'tech';
  }
  if (combined.includes('bank') || combined.includes('fd interest') || combined.includes('pension') || combined.includes('पेंशन') || combined.includes('loan') || combined.includes('लोन') || combined.includes('finance')) {
    return 'finance';
  }
  if (combined.includes('upcoming') || combined.includes('आगामी') || combined.includes('जल्द आएगी') || combined.includes('soon')) {
    return 'upcomingJobs';
  }
  return 'latestJobs';
}
