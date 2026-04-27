// utils/emailService.js
import { supabase } from '../supabase/client';

/**
 * Send email notification to candidate about scheduled assessment
 */
export const sendScheduleNotification = async (candidateEmail, candidateName, assessmentTitle, scheduledStart, scheduledEnd, supervisorName) => {
  try {
    const formatDateTime = (dateString) => {
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

    // Email content
    const emailSubject = `📋 Assessment Scheduled: ${assessmentTitle}`;
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
          .detail-item { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #1565C0; }
          .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #1E3A5F, #0A1929); color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .warning { background: #fff3e0; padding: 10px; border-radius: 8px; margin: 15px 0; font-size: 13px; border-left: 4px solid #ff9800; }
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
              <h4 style="margin-top: 0; color: #0A1929;">📋 ${assessmentTitle}</h4>
              <div class="detail-item">
                <span class="detail-label">🕒 Start Time:</span> ${startFormatted}
              </div>
              <div class="detail-item">
                <span class="detail-label">⏰ End Time:</span> ${endFormatted}
              </div>
              <div class="detail-item">
                <span class="detail-label">⏱️ Duration:</span> 3 hours (timer starts when you begin)
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul style="margin: 8px 0 0 20px; padding: 0;">
                <li>You can only take this assessment ONCE</li>
                <li>The assessment will ONLY be available during the scheduled time window</li>
                <li>Once you start, you have 3 hours to complete it</li>
                <li>Your answers are auto-saved as you progress</li>
              </ul>
            </div>
            
            <p>Click the button below when you're ready to begin (only available during the scheduled window):</p>
            <a href="https://stratavax-capability-assessment.vercel.app/login" class="button">Go to Assessment Portal</a>
            
            <p style="margin-top: 20px;">If you have any questions, please contact your supervisor.</p>
          </div>
          <div class="footer">
            <p>© 2026 Stratavax - Talent Assessment Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      Hello ${candidateName},
      
      Your supervisor ${supervisorName} has scheduled an assessment for you.
      
      Assessment: ${assessmentTitle}
      Start Time: ${startFormatted}
      End Time: ${endFormatted}
      Duration: 3 hours (timer starts when you begin)
      
      Important:
      - You can only take this assessment ONCE
      - The assessment will ONLY be available during the scheduled time window
      - Once you start, you have 3 hours to complete it
      - Your answers are auto-saved as you progress
      
      Go to the assessment portal when you're ready:
      https://stratavax-capability-assessment.vercel.app/login
      
      If you have any questions, please contact your supervisor.
      
      © 2026 Stratavax - Talent Assessment Platform
    `;

    // Using Supabase Edge Function or email API
    // Option 1: If you have Resend/SendGrid configured
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: candidateEmail,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      })
    });

    return await response.json();
    
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send reminder email to candidate (24 hours before)
 */
export const sendReminderEmail = async (candidateEmail, candidateName, assessmentTitle, scheduledStart) => {
  const startFormatted = new Date(scheduledStart).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E3A5F, #0A1929); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .reminder-box { background: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🏢 Stratavax</h2>
        </div>
        <div class="content">
          <h3>Reminder: ${assessmentTitle}</h3>
          <p>Hello ${candidateName},</p>
          <div class="reminder-box">
            <p><strong>⏰ Your assessment starts in 24 hours!</strong></p>
            <p><strong>Start Time:</strong> ${startFormatted}</p>
          </div>
          <p>Please ensure you:</p>
          <ul>
            <li>Find a quiet space with stable internet</li>
            <li>Have 3 hours of uninterrupted time available</li>
            <li>Log in a few minutes before your scheduled start</li>
          </ul>
          <a href="https://stratavax-capability-assessment.vercel.app/login" style="display: inline-block; padding: 12px 24px; background: #0A1929; color: white; text-decoration: none; border-radius: 8px;">Go to Portal</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: candidateEmail,
      subject: `Reminder: ${assessmentTitle} starts tomorrow`,
      html: emailHtml
    })
  });

  return await response.json();
};
