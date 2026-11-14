// pages/api/supervisor/share-report.js
// Generates a PDF of the candidate report and emails it to them.
// Uses Puppeteer + @sparticuz/chromium (both already in package.json).

import { authorizeRequest } from '../../../utils/apiAuth';
import { sendEmail } from '../../../utils/email';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const auth = await authorizeRequest(req, ['admin', 'supervisor']);
    if (auth.error) return res.status(auth.status).json({ success: false, error: auth.error });

    const { serviceClient } = auth;
    const { candidateId, assessmentId } = req.body || {};

    if (!candidateId || !assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing candidateId or assessmentId' });
    }

    // 1. Fetch Candidate & Assessment
    const { data: candidate } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email')
      .eq('id', candidateId)
      .maybeSingle();

    const { data: assessment } = await serviceClient
      .from('assessments')
      .select('title')
      .eq('id', assessmentId)
      .maybeSingle();

    if (!candidate?.email) {
      return res.status(400).json({ success: false, error: 'Candidate has no email address.' });
    }

    // 2. Fetch Report Summary
    const { data: result } = await serviceClient
      .from('assessment_results')
      .select('percentage_score, classification, completed_at')
      .eq('user_id', candidateId)
      .eq('assessment_id', assessmentId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!result) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    // 3. Build HTML for PDF
    const score = Math.round(result.percentage_score || 0);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a202c; }
          .header { text-align: center; border-bottom: 2px solid #0A1929; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #0A1929; letter-spacing: 2px; }
          .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }
          .score { font-size: 48px; font-weight: bold; color: #0A1929; }
          .label { font-size: 14px; color: #64748b; text-transform: uppercase; }
          .details { margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .value { font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">STRATAVAX</div>
          <div style="color: #64748b; margin-top: 8px;">Talent Assessment Platform</div>
        </div>
        
        <h2 style="text-align: center; color: #0A1929;">Assessment Report</h2>
        
        <div class="score-box">
          <div class="label">Overall Score</div>
          <div class="score">${score}%</div>
        </div>

        <div class="details">
          <div class="row"><span class="label">Candidate Name</span><span class="value">${candidate.full_name}</span></div>
          <div class="row"><span class="label">Assessment</span><span class="value">${assessment.title}</span></div>
          <div class="row"><span class="label">Classification</span><span class="value">${result.classification || 'N/A'}</span></div>
          <div class="row"><span class="label">Completed Date</span><span class="value">${new Date(result.completed_at).toLocaleDateString()}</span></div>
        </div>

        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">
          This is a computer-generated report. If you have questions, please contact your supervisor.
        </p>
      </body>
      </html>
    `;

    // 4. Generate PDF with Puppeteer
    let pdfBuffer;
    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
    } catch (pdfError) {
      console.error('[share-report] PDF generation failed:', pdfError);
      return res.status(500).json({ success: false, error: 'Failed to generate PDF.' });
    }

    // 5. Send Email with Attachment
    const emailResult = await sendEmail({
      to: candidate.email,
      toName: candidate.full_name,
      subject: `📄 Your Assessment Report: ${assessment.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 550px; margin: 0 auto; color: #1a202c;">
          <div style="background: linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0; letter-spacing: 2px;">STRATAVAX</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Hello <strong>${candidate.full_name}</strong>,</p>
            <p>Please find attached the report for your recent <strong>${assessment.title}</strong>.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Overall Score</div>
              <div style="font-size: 24px; font-weight: bold; color: #0A1929;">${score}%</div>
            </div>
            <p>If you have any questions, please reach out to your supervisor.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Stratavax_Report_${candidate.full_name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: 'Email failed to send.' });
    }

    return res.status(200).json({ success: true, message: 'Report shared successfully.' });

  } catch (err) {
    console.error('[share-report] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
