async function main() {
  const url = 'https://www.knowora.in/api/auto-blog?secret=knowora-cron-2026';
  console.log("Triggering live auto-blog API call at:", url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-force-run': 'true'
      }
    });
    const status = res.status;
    const text = await res.text();
    console.log(`Status: ${status}`);
    console.log("Response text:", text.substring(0, 500));
  } catch (e) {
    console.error("Fetch request failed:", e.message);
  }
}

main();
