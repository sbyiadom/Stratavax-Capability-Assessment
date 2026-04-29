// pages/api/send-email.js
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, candidateName, assessmentTitle, scheduledStart, scheduledEnd, supervisorName } = req.body;

  // Validate required fields
  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields: to and subject are required' });
  }

  try {
    // Format dates for display
    const formatDateTime = (dateString) => {
      if (!dateString) return 'Not specified';
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    };

    const startFormatted = formatDateTime(scheduledStart);
    const endFormatted = formatDateTime(scheduledEnd);

    // HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assessment Scheduled</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
          }
          .container {
            max-width: 550px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            color: white;
            letter-spacing: 2px;
            margin-bottom: 8px;
          }
          .subtitle {
            color: rgba(255,255,255,0.8);
            font-size: 14px;
          }
          .content {
            padding: 32px;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #0A1929;
          }
          .greeting-name {
            color: #1E3A5F;
          }
          .schedule-card {
            background: #F5F7FA;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid #2196F3;
          }
          .schedule-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 16px;
            color: #0A1929;
          }
          .schedule-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #E2E8F0;
          }
          .schedule-item:last-child {
            border-bottom: none;
          }
          .schedule-icon {
            font-size: 20px;
            min-width: 32px;
          }
          .schedule-label {
            font-weight: 500;
            color: #64748B;
            min-width: 100px;
          }
          .schedule-value {
            color: #1a202c;
            font-weight: 500;
          }
          .warning-box {
            background: #FFF3E0;
            border-radius: 10px;
            padding: 16px;
            margin: 24px 0;
            border-left: 4px solid #FF9800;
          }
          .warning-title {
            font-weight: 600;
            color: #E65100;
            margin-bottom: 12px;
          }
          .warning-list {
            margin: 0;
            padding-left: 20px;
            color: #E65100;
            font-size: 13px;
          }
          .warning-list li {
            margin: 6px 0;
          }
          .button-container {
            text-align: center;
            margin: 24px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%);
            color: white;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(10,25,41,0.2);
          }
          .footer {
            background: #F8FAFC;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
          }
          .footer p {
            margin: 4px 0;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="container">
          <div class="header">
            <div class="logo">STRATAVAX</div>
            <div class="subtitle">Talent Assessment Platform</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello, <span class="greeting-name">${candidateName || 'Candidate'}</span>
            </div>
            
            <p>Your supervisor <strong>${supervisorName || 'Your supervisor'}</strong> has scheduled an assessment for you.</p>
            
            <div class="schedule-card">
              <div class="schedule-title">📋 Assessment Details</div>
              <div class="schedule-item">
                <span class="schedule-icon">📝</span>
                <span class="schedule-label">Assessment:</span>
                <span class="schedule-value">${assessmentTitle}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-icon">🕒</span>
                <span class="schedule-label">Start Time:</span>
                <span class="schedule-value">${startFormatted}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-icon">⏰</span>
                <span class="schedule-label">End Time:</span>
                <span class="schedule-value">${endFormatted}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-icon">⏱️</span>
                <span class="schedule-label">Duration:</span>
                <span class="schedule-value">3 hours (timer starts when you begin)</span>
              </div>
            </div>
            
            <div class="warning-box">
              <div class="warning-title">⚠️ Important Information</div>
              <ul class="warning-list">
                <li>You can only take this assessment ONCE</li>
                <li>The assessment will ONLY be available during the scheduled time window</li>
                <li>Once you start, you have 3 hours to complete it</li>
                <li>Your answers are auto-saved as you progress</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="https://stratavax-capability-assessment.vercel.app/login" class="button">
                Go to Assessment Portal
              </a>
            </div>
            
            <p style="margin-top: 24px; font-size: 13px; color: #64748B; text-align: center;">
              If you have any questions, please contact your supervisor.
            </p>
          </div>
          
          <div class="footer">
            <p>© 2026 Stratavax - Talent Assessment Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const emailText = `
      STRATAVAX - Assessment Scheduled
      
      Hello ${candidateName || 'Candidate'},
      
      Your supervisor ${supervisorName || 'Your supervisor'} has scheduled an assessment for you.
      
      Assessment: ${assessmentTitle}
      Start Time: ${startFormatted}
      End Time: ${endFormatted}
      Duration: 3 hours (timer starts when you begin)
      
      IMPORTANT:
      - You can only take this assessment ONCE
      - The assessment will ONLY be available during the scheduled time window
      - Once you start, you have 3 hours to complete it
      
      Go to the assessment portal:
      https://stratavax-capability-assessment.vercel.app/login
      
      If you have any questions, please contact your supervisor.
      
      © 2026 Stratavax - Talent Assessment Platform
    `;

    // Send email using Resend
    // Using Resend's testing domain - works immediately
    const { data, error } = await resend.emails.send({
      from: 'Stratavax <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Email sent successfully:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
