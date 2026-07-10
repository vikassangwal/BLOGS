const fs = require('fs');

const routePath = 'src/app/api/auto-blog/route.ts';
let content = fs.readFileSync(routePath, 'utf8');

// We want to extract postToWhatsApp, postToInstagram, postToTwitter to a new file.
const socialPosterFile = 'src/lib/services/social-poster.ts';
const socialFunctionsRegex = /\/\/\s*-+\n\/\/ HELPER: WhatsApp Auto-Poster[\s\S]+?(?=export async function POST)/;

const socialMatch = content.match(socialFunctionsRegex);
if (socialMatch) {
    let socialCode = socialMatch[0];
    socialCode = socialCode.replace(/async function postTo/g, 'export async function postTo');
    fs.mkdirSync('src/lib/services', { recursive: true });
    fs.writeFileSync(socialPosterFile, socialCode);
    
    // Remove from original and add import
    content = content.replace(socialMatch[0], '');
    const importStatement = `import { postToWhatsApp, postToInstagram, postToTwitter } from '@/lib/services/social-poster';\n`;
    content = content.replace(/import \{ verifyToken \} from '@\/lib\/auth';/, `import { verifyToken } from '@/lib/auth';\n${importStatement}`);
}

// Now let's extract the Prompts.
// We will create 'src/lib/services/autoBlogPrompts.ts'
const promptsFile = 'src/lib/services/autoBlogPrompts.ts';
let promptsCode = `
export function getResearchPrompt(targetTopic: string, liveNewsContext: string, customSourceUrl: string) {
    return \`You are an expert Internet Researcher and SEO Analyst. The user wants to write a blog post about: "\${targetTopic}".
    \${liveNewsContext}
    
    CRITICAL RULE (STRICT): If the topic is a COMPLETELY FAKE exam that does not exist or a totally made-up rumor, you MUST ONLY output the exact word "ABORT_FAKE_NEWS" and nothing else. 
    HOWEVER, if it is a real Upcoming Exam, an Expected Syllabus, an Ongoing Application, an Expected Result, a State Scholarship, a Board Exam update, an Answer Key, a Counselling/Merit List schedule, a Free Laptop/Coaching Scheme, an Internship, a Rojgar Mela/Apprenticeship, an Army/Defense Rally, an Entrance Exam/TET update, a Top MNC Off-Campus Drive, a Free Online Course, a Skill Development (PMKVY) update, a KVS/Navodaya Admission, an IGNOU/Open University update, a Nursing Course form, a Bank/PSU Job, a Telecom/Tech update, a Finance/Bank/Earning update, or a University Admission/Result, DO NOT ABORT! Provide research for it (mentioning it is expected/upcoming if applicable) so the writer can write an informative guide.

    You MUST extract the FULL NOTIFICATION DETAILS. Provide an exhaustive breakdown of ALL of the following (if available):
    1. FULL SUMMARY: What is the notification/scholarship/result/scheme about? (Department, Post name, Total Vacancies, Scheme benefits, or University name).
    2. IMPORTANT DATES: Application Start Date, Last Date, Fee Payment Last Date, Exam/Rally Date, Counselling Date, or Result Date (if any).
    3. VACANCY/SCHOLARSHIP/COURSE DETAILS: Category-wise breakdown (UR, OBC, SC, ST, EWS), Scholarship Amount, or Scheme Eligibility if available.
    4. ELIGIBILITY & AGE LIMIT: Educational qualifications required, Minimum/Maximum Age, and Age Relaxation rules (if applicable).
    5. APPLICATION FEES: Fees for General/OBC and SC/ST/Women.
    6. SELECTION PROCESS & SYLLABUS: How will candidates be selected? (Written, Physical, Interview) and basic syllabus topics (if job).
    7. SALARY/PAY SCALE: What is the expected salary or pay band?
    8. OFFICIAL LINKS & HOW TO APPLY: First, identify the exact conducting authority/department for the exam. Provide the OFFICIAL website link of THAT specific department (e.g., rpsc.rajasthan.gov.in, ssc.gov.in) where all information is available, and provide the step-by-step application/download process. If it is an Answer Key, Result, or Admit Card, provide the official portal/login link where students can check it. (WARNING: Do NOT provide direct .pdf links from private competitor sites, only provide official government/organization portal links).

    🚨 FOR TECHNOLOGY & GADGETS: You MUST provide COMPLETE specs! (Processor, RAM/Storage, Camera MP, Battery/Charging, Display size). You MUST provide the exact Price in India and the Launch Date.
    🚨 FOR TELECOM/APPS: Provide exact old vs new recharge prices, validity, or step-by-step guide to use the new App feature.
    🚨 FOR FINANCE: Provide exact Interest Rates, new rules, financial benefits, and eligibility criteria.
    8. SEO KEYWORDS: 5-7 high-traffic Hindi+English keywords.
    
    Be extremely detailed. If a specific piece of information is not found, state "Data not available". Do not write the article, just provide structured exhaustive research data.
    
    \${customSourceUrl ? \`\\n\\n🚨 MANDATORY OFFICIAL APPLY / NOTIFICATION URL: You MUST use the following URL for the application/notification link: \${customSourceUrl}. Do NOT use any other link or guess the official link.\` : ''}\`;
}
\n`;

fs.writeFileSync(promptsFile, promptsCode);

fs.writeFileSync(routePath, content);
console.log('Refactoring step 1 complete');
