import * as jose from 'jose';

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Decodes base64 string or parses plain JSON to get Google Credentials
 */
function parseCredentials(credentialsBase64OrJson: string): GoogleCredentials | null {
  try {
    const trimmed = credentialsBase64OrJson.trim();
    let jsonStr = trimmed;
    
    // Check if it's base64 encoded
    if (!trimmed.startsWith('{')) {
      jsonStr = Buffer.from(trimmed, 'base64').toString('utf8');
    }
    
    const parsed = JSON.parse(jsonStr);
    if (parsed.private_key && parsed.client_email) {
      return parsed as GoogleCredentials;
    }
  } catch (e) {
    console.error('[Google Indexing] Failed to parse credentials:', e);
  }
  return null;
}

/**
 * Obtains an OAuth2 access token from Google OAuth endpoint using JWT assertion
 */
async function getAccessToken(creds: GoogleCredentials): Promise<string | null> {
  try {
    const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
    const clientEmail = creds.client_email;
    const privateKeyStr = creds.private_key;

    // Load private key via jose (suitable for Serverless/Edge)
    const privateKey = await jose.importPKCS8(privateKeyStr, 'RS256');

    // Sign the JWT
    const jwt = await new jose.SignJWT({
      scope: 'https://www.googleapis.com/auth/indexing'
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience(tokenUri)
      .setExpirationTime('1h')
      .sign(privateKey);

    // Request the token
    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[Google Indexing] Failed to get access token:', error);
    return null;
  }
}

/**
 * Submits a URL to the Google Indexing API
 * @param url The URL to notify Google about
 * @param type The type of update ('URL_UPDATED' or 'URL_DELETED')
 * @param credentialsBase64OrJson The Base64 string or JSON string from Google Search Console service account
 */
export async function submitToGoogleIndexing(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED',
  credentialsBase64OrJson: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!credentialsBase64OrJson) {
      return { success: false, message: 'No Google Indexing Credentials configured.' };
    }

    const creds = parseCredentials(credentialsBase64OrJson);
    if (!creds) {
      return { success: false, message: 'Invalid Google Indexing Credentials JSON/Base64 format.' };
    }

    const accessToken = await getAccessToken(creds);
    if (!accessToken) {
      return { success: false, message: 'Failed to authorize with Google Indexing OAuth.' };
    }

    const apiEndpoint = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: url,
        type: type
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { 
        success: false, 
        message: `Google Indexing API responded with error ${res.status}: ${errText}` 
      };
    }

    const data = await res.json();
    console.log(`[Google Indexing] Successfully submitted URL: ${url}`, data);
    return { success: true, message: `Successfully requested indexing for: ${url}` };
  } catch (error: any) {
    console.error(`[Google Indexing] Error submitting URL ${url}:`, error);
    return { success: false, message: error.message || 'Unknown error occurred during indexing submission.' };
  }
}

/**
 * Checks the Google indexing status of a URL using URL Inspection API
 */
export async function checkGoogleIndexingStatus(
  url: string,
  siteUrl: string,
  credentialsBase64OrJson: string
): Promise<{ success: boolean; isIndexed: boolean; detail?: string }> {
  try {
    const trimmed = credentialsBase64OrJson.trim();
    let jsonStr = trimmed;
    if (!trimmed.startsWith('{')) {
      jsonStr = Buffer.from(trimmed, 'base64').toString('utf8');
    }
    const creds = JSON.parse(jsonStr);
    if (!creds.private_key || !creds.client_email) {
      return { success: false, isIndexed: false, detail: 'Invalid credentials key/email' };
    }

    const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
    const privateKey = await jose.importPKCS8(creds.private_key, 'RS256');
    const jwt = await new jose.SignJWT({
      scope: 'https://www.googleapis.com/auth/webmasters.readonly'
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(creds.client_email)
      .setSubject(creds.client_email)
      .setAudience(tokenUri)
      .setExpirationTime('1h')
      .sign(privateKey);

    const tokenRes = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    if (!tokenRes.ok) {
      return { success: false, isIndexed: false, detail: 'OAuth request failed' };
    }
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    const inspectRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: siteUrl
      })
    });

    if (!inspectRes.ok) {
      const err = await inspectRes.text();
      return { success: false, isIndexed: false, detail: `API error ${inspectRes.status}: ${err}` };
    }

    const inspectData = await inspectRes.json();
    const verdict = inspectData.inspectionResult?.indexStatusResult?.verdict;
    const isIndexed = verdict === 'PASS';
    return { success: true, isIndexed, detail: verdict || 'UNKNOWN' };
  } catch (err: any) {
    console.error('[Google Indexing] Check status error:', err);
    return { success: false, isIndexed: false, detail: err.message || 'Error occurred' };
  }
}
