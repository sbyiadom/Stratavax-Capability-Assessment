// pages/api/send-email.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Option 1: Using Resend (Recommended - easiest to set up)
    // Sign up at https://resend.com (free tier: 100 emails/day)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Stratavax <notifications@stratavax.com>',
          to: [to],
          subject: subject,
          html: html,
          text: text || html.replace(/<[^>]*>/g, '')
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return res.status(200).json({ success: true, data });
      } else {
        throw new Error(data.message);
      }
    }
    
    // Option 2: Using Supabase Auth Email (only works for auth-related emails)
    // Option 3: Using SendGrid, Mailgun, or other email service
    // Add your preferred email service here
    
    return res.status(200).json({ success: true, message: 'Email sent (mock mode)' });
    
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
