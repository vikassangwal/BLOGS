export function detectGridBox(title: string = '', content: string = ''): string {
  const text = (title + ' ' + content).toLowerCase();
  
  if (/admit card|प्रवेश पत्र|hall ticket|exam city|परीक्षा शहर/i.test(title)) return 'admitCards';
  if (/result|परिणाम|answer key|उत्तर कुंजी|cut.?off|कटऑफ|merit list|मेरिट|syllabus|सिलेबस/i.test(title)) return 'examResults';
  if (/upcoming|आगामी|जल्द आएगी|शीघ्र जारी/i.test(title)) return 'upcomingJobs';
  if (/scholarship|छात्रवृत्ति|स्कॉलरशिप/i.test(title)) return 'scholarship';
  if (/pm.?kisan|योजना|yojana|scheme|e-shram|ई-श्रम|pension|पेंशन|राशन|किसान सम्मान/i.test(title)) return 'scheme';
  if (/smartphone|5g|phone|mobile|tech|technology|realme|samsung|iphone|xiaomi|redmi|oneplus|poco|vivo|oppo|लॉन्च|specs/i.test(title)) return 'tech';
  if (/bank|finance|loan|लोन|gold|सोना|शेयर|ipo|budget|बजट|epfo|pension|tax|crude|rbi/i.test(title) && !/recruitment|भर्ती|vacancy/i.test(title)) return 'finance';
  if (/earning|कमाई|freelanc|part.?time|work from home|skill|course|कोर्स/i.test(title)) return 'earning';
  if (/cbse|school|स्कूल|board exam|10th|12th|कक्षा 10|कक्षा 12|बोर्ड परीक्षा|supplementary/i.test(title)) return 'school';
  if (/university|college|विश्वविद्यालय|कॉलेज|ignou|admission|दाखिला|counselling|degree|rmpu/i.test(title)) return 'university';
  if (/recruitment|bharti|भर्ती|vacancy|jobs?|पदों|salary|वेतन|po|sbi|police|constable|ssc|upsc|rpsc|railway|rrb|clerk|teacher/i.test(title)) return 'latestJobs';

  return 'latestJobs';
}
