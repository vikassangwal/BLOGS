import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'social-settings.json');

// Helper to ensure file exists
function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      telegramBotToken: '',
      telegramChatId: '',
      twitterApiKey: '',
      twitterApiSecret: '',
      twitterAccessToken: '',
      twitterAccessSecret: '',
      facebookPageToken: '',
      facebookPageId: ''
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
}

export async function GET(request: NextRequest) {
  try {
    ensureFileExists();
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to read social settings:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Basic Auth Check
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    ensureFileExists();
    const currentDataRaw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const currentData = JSON.parse(currentDataRaw);

    const newData = { ...currentData, ...body };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newData, null, 2));

    return NextResponse.json({ success: true, settings: newData });
  } catch (error) {
    console.error('Failed to write social settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
