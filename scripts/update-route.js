const fs = require('fs');
const path = require('path');

// Go UP one directory from scripts/ to the root
const file = path.join(__dirname, '..', 'src', 'app', 'api', 'auto-blog', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

const originalTrendsLogic = `      // 2. Fallback to random Top News in preferred niches if queue is empty
      // User specifically requested HIGHEST FOCUS on Education & Career
      let topics = [
        'Education News India', 'Sarkari Result Updates', 'Govt Jobs India', 
        'University Exam News India', 'Board Exam Results India', 'NEET/JEE Updates', 
        'Technology News', 'Finance News' // Tech/Finance kept but lower probability (2 out of 8)
      ];
      if (settings?.isNewsActive && settings?.newsTopics) {
          topics = settings.newsTopics.split(',').map((t: string) => t.trim());
      }
      topic = topics[Math.floor(Math.random() * topics.length)];
      
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        const rssUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' India')}&hl=en-IN&gl=IN&ceid=IN:en\`;
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
          // Pick from top 3 news to ensure it's very recent and top
          const item = feed.items[Math.floor(Math.random() * Math.min(3, feed.items.length))];
          newsContext = \`News Title: \${item.title}\\nLink: \${item.link}\\nSnippet: \${item.contentSnippet || item.content || ''}\`;
        } else {
          // If RSS fails to find items, generate a generalized trending topic
          newsContext = \`Generate a deep-researched, highly detailed comprehensive guide or top news analysis about the current trends in \${topic}.\`;
        }
      } catch (rssError) {
        console.error('Failed to fetch RSS:', rssError);
        newsContext = \`Generate a highly detailed educational or financial guide about \${topic}.\`;
      }`;

const newTrendsLogic = `      // 2. Fallback to Google Trends (Most Searched) if queue is empty
      let topics = [
        'Education News India', 'Sarkari Result Updates', 'Govt Jobs India', 
        'University Exam News India', 'Board Exam Results India', 'NEET/JEE Updates'
      ];
      if (settings?.isNewsActive && settings?.newsTopics) {
          topics = settings.newsTopics.split(',').map((t: string) => t.trim());
      }
      topic = topics[Math.floor(Math.random() * topics.length)];
      
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        
        // Fetch Daily Trending Searches in India
        const trendsUrl = \`https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN\`;
        const trendsFeed = await parser.parseURL(trendsUrl);
        
        if (trendsFeed.items && trendsFeed.items.length > 0) {
          // Try to find an education/job related trending topic first
          const eduKeywords = ['exam', 'result', 'admit card', 'recruitment', 'ssc', 'upsc', 'board', 'university', 'job', 'vacancy', 'school', 'college', 'syllabus'];
          const eduItem = trendsFeed.items.find((item) => 
            eduKeywords.some(kw => item.title?.toLowerCase().includes(kw) || item.contentSnippet?.toLowerCase().includes(kw))
          );
          
          const trendingItem = eduItem || trendsFeed.items[0]; // Fallback to #1 trending if no education news
          topic = trendingItem.title || topic;
          
          // Now fetch the actual news context for this trending topic
          const rssUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' India')}&hl=en-IN&gl=IN&ceid=IN:en\`;
          const feed = await parser.parseURL(rssUrl);
          
          if (feed.items && feed.items.length > 0) {
            const item = feed.items[Math.floor(Math.random() * Math.min(3, feed.items.length))];
            newsContext = \`News Title: \${item.title}\\nLink: \${item.link}\\nSnippet: \${item.contentSnippet || item.content || ''}\`;
          } else {
            newsContext = \`Generate a deep-researched, highly detailed comprehensive guide or top news analysis about the current trending topic: \${topic}.\`;
          }
        } else {
          // Fallback if Trends fails
          newsContext = \`Generate a highly detailed educational or trending guide about \${topic}.\`;
        }
      } catch (rssError) {
        console.error('Failed to fetch RSS:', rssError);
        newsContext = \`Generate a highly detailed educational or financial guide about \${topic}.\`;
      }`;

content = content.replace(originalTrendsLogic, newTrendsLogic);

content = content.replace(
  `8. FAQ: 8–15 प्रश्न जिनका उत्तर पहले नहीं दिया गया हो। उत्तर बिल्कुल नहीं लिखना। सभी प्रश्न <ul><li><a href="#">👉 [Question]? (Click Here)</a></li></ul> के रूप में लिखने हैं।`,
  `8. FAQ: 8–15 प्रश्न जिनका उत्तर पहले नहीं दिया गया हो। उत्तर बिल्कुल नहीं लिखना। सभी प्रश्न <ul><li><a href="https://www.google.com/search?q=[INSERT_QUESTION_HERE_URL_ENCODED]" target="_blank">👉 [Question]? (Click Here)</a></li></ul> के रूप में लिखने हैं। उदाहरण: <a href="https://www.google.com/search?q=What+is+this" target="_blank">👉 What is this? (Click Here)</a>. (This fixes the broken href="#" issue).`
);

const originalTechnicalRule = `IMPORTANT TECHNICAL RULE: You MUST format your entire response in valid HTML (using <h2>, <h3>, <p>, <table>, <ul>, <li>). Do NOT wrap the response in markdown code blocks like \`\`\`html. The user instruction "HTML Code नहीं लिखना" means do not write visible code for the user to read, but you MUST use HTML tags internally for formatting so the website can render it properly.

Google Spam Policy & Safety Rules (CRITICAL):
1. Helpful Content Update (HCU) Compliance: Provide original insights, expert analysis, and high-quality information. Add real value to the reader. Do NOT just spin or paraphrase existing news. 
2. Plagiarism-Free: Content MUST be 100% original, completely unique, and pass all plagiarism/AI detection checks. Do NOT copy-paste sentences from the news context.
3. Strict Safety Guidelines: Strictly prohibit any adult content (NSFW), hate speech, violence, or copyright violations. Keep the content 100% family-friendly and professional.`;

const legalString = `IMPORTANT LANGUAGE RULE: If the topic specifically concerns Non-Hindi speaking states (e.g., Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana, Maharashtra, West Bengal, Odisha, or North East India), you MUST write the ENTIRE ARTICLE in ENGLISH. Otherwise, write it in HINDI (or Hinglish).

IMPORTANT TECHNICAL RULE: You MUST format your entire response in valid HTML (using <h2>, <h3>, <p>, <table>, <ul>, <li>). Do NOT wrap the response in markdown code blocks like \`\`\`html. The user instruction "HTML Code नहीं लिखना" means do not write visible code for the user to read, but you MUST use HTML tags internally for formatting so the website can render it properly.

Google Spam Policy & Safety Rules (CRITICAL):
1. Helpful Content Update (HCU) Compliance: Provide original insights, expert analysis, and high-quality information. Add real value to the reader. Do NOT just spin or paraphrase existing news. 
2. Plagiarism-Free: Content MUST be 100% original, completely unique, and pass all plagiarism/AI detection checks. Do NOT copy-paste sentences from the news context.
3. Strict Safety & Legal Guidelines: Strictly prohibit any adult content (NSFW), hate speech, violence, or copyright violations. Keep the content 100% family-friendly, professional, and ensure it DOES NOT violate any laws.
4. Absolute Accuracy: Ensure 100% perfect grammar. Do NOT hallucinate or make assumptions. All information provided MUST be factually correct and highly accurate.`;

content = content.replace(originalTechnicalRule, legalString);

content = content.replace(
  `जहां आधिकारिक लिंक या वेबसाइट उपलब्ध हो वहां केवल "<a href='URL'>👉 Click Here</a>" लिखना।`,
  `जहां आधिकारिक लिंक या वेबसाइट उपलब्ध हो वहां केवल "<a href='URL' target='_blank'>👉 Click Here</a>" लिखना।`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Update success');
