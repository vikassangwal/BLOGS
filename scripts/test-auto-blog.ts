import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/auto-blog/route';

async function main() {
  console.log('Testing Auto-Blog POST locally...');
  // Mock a NextRequest
  const req = new Request('http://localhost/api/auto-blog', { method: 'POST' });
  
  const res = await POST(req as any);
  
  const json = await res.json();
  console.log('Response:', json);
}

main();
