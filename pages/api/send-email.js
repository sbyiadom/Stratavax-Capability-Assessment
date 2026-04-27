// pages/api/send-email.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, type, candidateName, assessmentTitle, scheduledStart, scheduledEnd, supervisorName } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const formatDateTime = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const startFormatted = formatDateTime(scheduledStart);
    const endFormatted = formatDateTime(scheduledEnd);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A5F, #0A1929); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; }
          .schedule-details { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
          .button { display: inline-block; padding: 12px 24px; background: #0A1929; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🏢 Stratavax</h2>
            <p>Talent Assessment Platform</p>
          </div>
          <div class="content">
            <h3>Hello ${candidateName},</h3>
            <p>Your supervisor <strong>${supervisorName}</strong> has scheduled an assessment for you.</p>
            
            <div class="schedule-details">
              <h4 style="margin-top: 0;">📋 ${assessmentTitle}</h4>
              <p><strong>🕒 Start Time:</strong> ${startFormatted}</p>
              <p><strong>⏰ End Time:</strong> ${endFormatted}</p>
              <p><strong>⏱️ Duration:</strong> 3 hours (timer starts when you begin)</p>
            </div>
            
            <p><strong>⚠️ Important:</strong></p>
            <ul>
              <li>You can only take this assessment ONCE</li>
              <li>The assessment will ONLY be available during the scheduled time window</li>
              <li>Once you start, you have 3 hours to complete it</li>
            </ul>
            
            <a href="https://stratavax-capability-assessment.vercel.app/login" class="button">Go to Assessment Portal</a>
          </div>
          <div class="footer">
            <p>© 2026 Stratavax - Talent Assessment Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // For now, just log success (email will be implemented later)
    console.log(`Email would be sent to: ${to}`);
    console.log(`Subject: ${subject}`);
    
    return res.status(200).json({ success: true, message: 'Email notification queued' });
    
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
