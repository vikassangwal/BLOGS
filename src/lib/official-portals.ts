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
