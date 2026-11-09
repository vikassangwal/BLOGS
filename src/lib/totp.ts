import crypto from 'crypto';

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

/**
 * Generate a random base32-encoded secret for TOTP
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate TOTP code from secret at given time
 */
export function generateTOTP(secret: string, time?: number): string {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_PERIOD);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  
  const decodedSecret = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', decodedSecret);
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);
  
  return code.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code, allowing for time drift (±1 period)
 */
export function verifyTOTP(secret: string, code: string): boolean {
  const now = Date.now() / 1000;
  for (let i = -1; i <= 1; i++) {
    const expected = generateTOTP(secret, now + i * TOTP_PERIOD);
    if (expected === code) return true;
  }
  return false;
}

/**
 * Generate recovery codes
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Get the otpauth URI for QR code generation
 */
export function getTOTPUri(secret: string, email: string, issuer: string = 'Knowora'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// Base32 encoding/decoding
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
