export function getResearchPrompt(targetTopic: string, liveNewsContext: string, customSourceUrl: string, currentDateStr: string, currentYearNum: number | string) {\r\n\r\n  // Detect if this is an Education & Career topic\r\n  const topicLower = (targetTopic || '').toLowerCase();
  // Detect if this is an Education & Career / Study topic
  const isEducationTopic = topicLower.includes('job') || topicLower.includes('vacancy') || topicLower.includes('recruitment') ||
    topicLower.includes('exam') || topicLower.includes('admit') || topicLower.includes('notification') ||
    topicLower.includes('scholarship') || topicLower.includes('counselling') || topicLower.includes('apprentice') ||
    topicLower.includes('bharti') || topicLower.includes('भर्ती') || topicLower.includes('ssc') || topicLower.includes('upsc') ||
    topicLower.includes('ibps') || topicLower.includes('railway') || topicLower.includes('rpsc') || topicLower.includes('nta') ||
    topicLower.includes('cutoff') || topicLower.includes('cut-off') || topicLower.includes('answer key') ||
    topicLower.includes('internship') || topicLower.includes('rojgar') || topicLower.includes('career') ||
    topicLower.includes('admission') || topicLower.includes('merit list') || topicLower.includes('iti') ||
    topicLower.includes('college') || topicLower.includes('university') || topicLower.includes('daakhila') || topicLower.includes('दाखिला');

  // Topics to COMPLETELY EXCLUDE from Education & Career blogging
  const isResultTopic = topicLower.includes('result') || topicLower.includes('परिणाम');
  const isSyllabusTopic = topicLower.includes('syllabus') || topicLower.includes('सिलेबस');
  const isEarningTopic = topicLower.includes('earning') || topicLower.includes('कमाई') || topicLower.includes('online earning');

  // If it's an excluded Education topic, return ABORT signal immediately
  if (isEducationTopic && (isResultTopic || isSyllabusTopic || isEarningTopic)) {
    return `ABORT_EXCLUDED_TOPIC: This topic falls under Results/Syllabus/Earning which are EXCLUDED from auto-blogging. Do not write this blog.`;
  }

  const educationNotificationRule = isEducationTopic ? `
🚨🚨🚨 MANDATORY NOTIFICATION VERIFICATION RULE (Education & Career Topics) 🚨🚨🚨
This is an Education & Career blog. You MUST verify the following BEFORE providing research data:

1. Has an OFFICIAL NOTIFICATION/ADVERTISEMENT been released by the department?
   - If YES (notification exists): Provide ALL research details as requested below.
   - If NO (notification NOT released, only rumors): Output exactly "ABORT_NO_NOTIFICATION" and nothing else.
   - If UNCERTAIN (only news/rumors exist, no official PDF): Output exactly "ABORT_NO_NOTIFICATION"

2. OFFICIAL LINKS ONLY (Zero Tolerance for Fake Links):
   - ✅ ALLOWED: Official government portal homepages like ssc.gov.in, rpsc.rajasthan.gov.in, ibps.in, nta.ac.in, upsc.gov.in, rssb.rajasthan.gov.in, employmentnews.gov.in, sarkariresult.com (only official redirects)
   - ✅ ALLOWED: Direct official notification PDF links ONLY if they end in .pdf (or point to a PDF document) AND are from .gov.in, .nic.in, or .s3waas.gov.in domains. If no direct PDF URL is available in the search results, you MUST use the official department homepage URL instead of guessing a PDF link.
   - 💡 INFO: Official notification PDFs are often hosted on the S3WaaS (Secure, Scalable and Sugamya Website as a Service) government CDN. Look for direct PDF URLs containing ".s3waas.gov.in/uploads/" or ending in ".pdf" and prioritize them for the "Download Notification PDF" link.
   - ❌ BANNED: Any link from private sites (sarkariresult.com editorial content, testbook.com, freejobalert.com, rojgarresult.com, naukri.com articles)
   - ❌ BANNED: Google search result links (google.com/search?q=...)
   - ❌ BANNED: Any made-up or guessed URLs — if you don't have the exact official link, write the department homepage ONLY
   - ❌ BANNED: Placeholder links like "#" or "[LINK_COMING_SOON]"

3. OTR / SSO REGISTRATION (Only mention when actually required):
   - ⚠️ OTR/SSO is NOT required for every vacancy. Only mention it if it is genuinely part of this specific recruitment process.
   - Check ONLY for these departments where OTR is mandatory:
     • RPSC (Rajasthan Public Service Commission) → SSO ID at sso.rajasthan.gov.in
     • RSSB/RSMSSB (Rajasthan Staff Selection) → SSO ID at sso.rajasthan.gov.in  
     • SSC (Staff Selection Commission) → OTR at ssc.gov.in/candidate-registration
     • UPSSSC (UP Subordinate Service) → Online Registration at upsssc.gov.in
     • UP Police → uppbpb.gov.in registration
   - For all OTHER departments (e.g. Railways, Banks, IBPS, NTA/JEE/NEET, Army, Navy, State Police outside above states, PSUs): 
     DO NOT mention OTR — these departments have their own direct apply portal without OTR.
   - Rule: Only mention OTR/SSO if you are CERTAIN it applies to THIS specific vacancy. If unsure, do NOT mention it.

4. EXCLUDED TOPICS (DO NOT RESEARCH):
   - परिणाम (Results) - Excluded
   - सिलेबस (Syllabus) - Excluded  
   - कमाई & कोर्सेज (Earning & Courses) - Excluded
   Only these are ALLOWED: Vacancy/Notification, Admit Card, Answer Key, Counselling, Expected Cut-off (only if exam already conducted), Scholarship, Apprenticeship, Internship, Career Guide

5. APPLY LINK VERIFICATION:
   - Apply Online Link: Only provide if Application Form is currently ACTIVE and accepting submissions
   - Notification PDF Link: Only from official .gov.in or .nic.in source
   - If Apply link is not yet active, write: "आवेदन लिंक जल्द सक्रिय होगा (Coming Soon)" — DO NOT guess or fabricate a link
` : '';

  return `You are an expert Internet Researcher and SEO Analyst. The user wants to write a blog post about: "${targetTopic}".
  Today's exact date in India (IST) is ${currentDateStr}. Current active year is ${currentYearNum}. All dates, deadlines, and schedules MUST be accurate and consistent relative to today (${currentDateStr}).
  ${liveNewsContext}
  ${educationNotificationRule}
  
  CRITICAL RULE (STRICT): 
  - FOR ALL EDUCATION & CAREER TOPICS (Jobs, Recruitment, Vacancies, Admissions, Scholarships): YOU MUST VERIFY THAT AN OFFICIAL NOTIFICATION, ADVERTISEMENT, OR OFFICIAL BULLETIN HAS BEEN RELEASED BY THE DEPARTMENT. IF NO OFFICIAL NOTIFICATION OR OFFICIAL PDF HAS BEEN RELEASED YET (OR IF IT IS ONLY A RUMOR/NEWS ARTICLE WITHOUT OFFICIAL PDF), YOU MUST OUTPUT EXACTLY "ABORT_NO_NOTIFICATION" AND NOTHING ELSE. DO NOT WRITE ANY EDUCATION BLOG WITHOUT AN OFFICIAL NOTIFICATION.
  - FOR NON-EDUCATION TOPICS (Gadgets, Finance, General News): Only output "ABORT_FAKE_NEWS" if the topic is a malicious or provably false rumor. Otherwise, provide informative research.

  ${isEducationTopic ? `
🚨 EDUCATION TOPIC MANDATORY ABORT INSTRUCTION:
- If the official notification or advertisement HAS NOT been released yet by the conducting body, output "ABORT_NO_NOTIFICATION".
- If the live search results above DO NOT contain an official .gov.in, .nic.in, .ac.in link or official notification PDF for this vacancy, output "ABORT_NO_NOTIFICATION".
- NEVER write about jobs or vacancies based on rumors, blog articles, or unconfirmed news.
` : ''}

  You MUST extract the FULL NOTIFICATION DETAILS. Provide an exhaustive breakdown of ALL of the following (if available):
  1. FULL SUMMARY: What is the notification/scholarship/result/scheme about? (Department, Post name, Total Vacancies, Scheme benefits, or University name).
  2. IMPORTANT DATES: Application Start Date, Last Date, Fee Payment Last Date, Exam/Rally Date, Counselling Date, or Result Date (if any).
  3. VACANCY/SCHOLARSHIP/COURSE DETAILS: Category-wise breakdown (UR, OBC, SC, ST, EWS), Scholarship Amount, or Scheme Eligibility if available.
  4. ELIGIBILITY & AGE LIMIT: Educational qualifications required (EXACT degree — e.g. B.Tech NOT just Graduate), Minimum/Maximum Age, and Age Relaxation rules (if applicable). न्यूनतम योग्यता (Minimum Qualification) स्पष्ट रूप से लिखें।
  5. APPLICATION FEES: Fees for General/OBC and SC/ST/Women.
  6. SELECTION PROCESS: How will candidates be selected? (Written, Physical, Interview) and basic syllabus topics (if job).
  7. SALARY/PAY SCALE: What is the expected salary or pay band? (7th CPC Pay Level if govt job)
  8. REQUIRED DOCUMENTS (SHORT LIST): Provide a concise bulleted list in Hindi of all necessary documents needed to apply (e.g., Educational Certificates (10th/12th/Graduation), Identity Proof (Aadhaar/PAN/Voter ID), Caste Certificate (if applicable), Domicile/Residence Certificate (मूल निवास), Passport size photograph, Signature scan, etc.).
  9. OFFICIAL LINKS & HOW TO APPLY: 
     - Official Website: The EXACT conducting department's official homepage (e.g., rpsc.rajasthan.gov.in, ssc.gov.in)
     - Apply Online Link: ONLY if form is currently active — provide the exact official portal login/apply page
     - Download Notification PDF: Only from official .gov.in or .nic.in — if not available, write "Official Notification PDF - Check official website"
     - OTR/Registration Portal: If OTR/SSO required, mention the exact portal (sso.rajasthan.gov.in, ssc.gov.in/otr etc.)
     - (WARNING: NEVER provide links from private competitor sites. NEVER guess PDF URLs. If exact link unknown, give department homepage only.)
      
     🚨 URL PATH TOKENS CLASSIFICATION RULES:
     To correctly identify and sort the live search URLs, inspect the URL string characters and path tokens:
     - **Apply Online / Registration Link:** Look for URLs containing "apply", "registration", "register", "login", "sso", "otr", "onlineform", "candidate", "recruitment", "enrollment", "application", "candidate-portal", "dashboard", "sign-up", "signup", "sign-in", "signin", "new-registration", "apply-online", "online-application", "post-selection", or "form-submission".
     - **Download Notification PDF Link:** Look for URLs containing "notification", "advertisement", "notice", "storage/advertisement_item", "uploads", "rules", "advt", "advertisement-detail", "vacancy-circular", "circular", "press-release", "pressnote", "press-note", "public-notice", "detail-advertisement", "bulletin", "information-bulletin", or "pdf" AND ending in ".pdf".
     - **Admit Card / Hall Ticket Link:** Look for URLs containing "admitcard", "admit-card", "hallticket", "hall-ticket", "callletter", "call-letter", "exam-city", "city-intimation", "admit-card-download", "download-admitcard", "hall-ticket-download", or "login-admitcard".
     - **Syllabus / Exam Pattern Link:** Look for URLs containing "syllabus", "syllabus_item", "exam-pattern", or "syllabus-pdf" (usually ending in ".pdf").
     - **Result / Scorecard Link:** Look for URLs containing "result", "cutoff", "cut-off", "meritlist", "scorecard", "marks", "selected-list", "selection-list", "shortlisted-candidates", "merit-list", "declared-result", "result-sheet", "cutoff-marks", "final-answer-key", "answerkey", or "answer-key".
     - **Exam Calendar Link:** Look for URLs containing "calendar", "schedule", "exam-schedule", "time-table", "timetable", "exam-calendar", "annual-calendar", "tentative-dates", or "exam-schedule".

  🚨 FOR TECHNOLOGY & GADGETS: You MUST provide COMPLETE specs! (Processor, RAM/Storage, Camera MP, Battery/Charging, Display size). You MUST provide the exact Price in India and the Launch Date.
  🚨 FOR TELECOM/APPS: Provide exact old vs new recharge prices, validity, or step-by-step guide to use the new App feature.
  🚨 FOR FINANCE: Provide exact Interest Rates, new rules, financial benefits, and eligibility criteria.
  9. SEO KEYWORDS: 5-7 high-traffic Hindi+English keywords.
  
  Be extremely detailed. If a specific piece of information is not found, state "Data not available". Do not write the article, just provide structured exhaustive research data.
  ${customSourceUrl ? `\n\n🚨 MANDATORY OFFICIAL APPLY / NOTIFICATION URL: You MUST use the following URL for the application/notification link: ${customSourceUrl}. Do NOT use any other link or guess the official link.` : ''}`;
}
