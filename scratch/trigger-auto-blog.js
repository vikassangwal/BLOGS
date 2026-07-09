const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.post(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('⏰ Waiting 5 seconds for Next.js dev server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log('🚀 Triggering Step 1: Keyword Brainstorming...');
    // Since bg-run=true can go to background via waitUntil, we can override or just call standard trigger
    // Wait! Let's hit the endpoint without bg-run first, or with bg-run and query database status after 10 seconds.
    // If we call bg-run=true, Vercel waitUntil handles it, but in local Next.js dev server, waitUntil runs in the background.
    // Let's call with bg-run=false (bg-run query parameter omitted) but with x-force-run header.
    // Wait, the API check says: if (!isBgRun) then it calls itself with bg-run=true in background, and returns instantly with status 202.
    // So let's trigger it, and then wait 15 seconds for the background task to complete!
    
    const triggerUrl = 'http://localhost:3000/api/auto-blog?secret=knowora-cron-2026';
    
    // Call 1: Brainstorming
    const res1 = await fetch(triggerUrl, { method: 'POST', headers: { 'x-force-run': 'true' } });
    const json1 = await res1.json();
    console.log('Response 1:', json1);
    
    console.log('⏳ Waiting 25 seconds for background topic generation to finish...');
    await new Promise(resolve => setTimeout(resolve, 25000));

    // Call 2: Generate actual blog post
    console.log('🚀 Triggering Step 2: Blog Article Generation...');
    const res2 = await fetch(triggerUrl, { method: 'POST', headers: { 'x-force-run': 'true' } });
    const json2 = await res2.json();
    console.log('Response 2:', json2);

    console.log('⏳ Waiting 45 seconds for background blog post generation to complete...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    console.log('🏁 Diagnostic run completed! Run check-api-keys.js to see if a post was successfully added.');

  } catch (e) {
    console.error('❌ Request failed:', e);
  }
}

run();
