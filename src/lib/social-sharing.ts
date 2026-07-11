/**
 * Shared Social Media Broadcast Helper Utilities
 */

export async function postToWhatsApp(token: string, phoneId: string, groupId: string, text: string, imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: groupId,
        type: 'image',
        image: {
          link: imageUrl,
          caption: text
        }
      })
    });
    return res.ok;
  } catch (e) {
    console.error('WhatsApp post error:', e);
    return false;
  }
}

export async function postToInstagram(token: string, accountId: string, imageUrl: string, caption: string): Promise<boolean> {
  try {
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`, { method: 'POST' });
    const containerData = await containerRes.json();
    
    if (containerData.id) {
      await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${containerData.id}&access_token=${token}`, { method: 'POST' });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Instagram post error:', e);
    return false;
  }
}

export async function postToTwitter(bearerToken: string, text: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return res.ok;
  } catch (e) {
    console.error('Twitter post error:', e);
    return false;
  }
}

export async function postToTelegram(token: string, chatId: string, text: string, imageUrl?: string): Promise<boolean> {
  try {
    if (imageUrl) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: text,
          parse_mode: 'HTML'
        })
      });
      if (res.ok) return true;
    }
    
    // Fallback to text message
    const resText = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return resText.ok;
  } catch (e) {
    console.error('Telegram post error:', e);
    return false;
  }
}
