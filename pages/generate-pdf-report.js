import { createClient } from '@supabase/supabase-js';
import { generateStratavaxReport } from '../../utils/stratavaxReportGenerator';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import Handlebars from 'handlebars';

// Tell Handlebars to use regular JavaScript functions (no need for fs)
Handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
});

Handlebars.registerHelper('percentageColor', function(percentage) {
  if (percentage >= 80) return '#4CAF50';
  if (percentage >= 60) return '#2196F3';
  if (percentage >= 40) return '#FF9800';
  return '#F44336';
});

export const config = {
  maxDuration: 30, // Set max execution time to 30 seconds
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📄 Vercel-Optimized PDF Report Generation started');

  try {
    const { userId, assessmentId, sessionId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Supabase client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ===== STEP 1: Fetch candidate information =====
    const { data: candidate, error: candidateError } = await serviceClient
      .from('candidate_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (candidateError) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidateName = candidate?.full_name || candidate?.email?.split('@')[0] || 'Candidate';

    // ===== STEP 2: Fetch assessment information =====
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('*, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // ===== STEP 3: Fetch responses =====
    let query = serviceClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
        unique_questions!inner (
          id,
          section,
          subsection,
          question_text
        ),
        unique_answers!inner (
          id,
          score,
          answer_text
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: responses, error: responsesError } = await query;

    if (responsesError || !responses || responses.length === 0) {
      return res.status(404).json({ error: 'No responses found' });
    }

    // ===== STEP 4: Generate report data =====
    const reportData = generateStratavaxReport(
      userId,
      assessmentType,
      responses,
      candidateName
    );

    // ===== STEP 5: Prepare template data =====
    const templateData = {
      candidateName: reportData.candidateName,
      assessmentName: assessment.title || reportData.stratavaxReport.cover.assessmentName,
      dateTaken: reportData.stratavaxReport.cover.dateTaken,
      reportDate: reportData.stratavaxReport.cover.reportGenerated,
      totalScore: reportData.stratavaxReport.executiveSummary.totalScore,
      percentage: reportData.stratavaxReport.executiveSummary.percentage,
      grade: reportData.stratavaxReport.executiveSummary.grade,
      classification: reportData.stratavaxReport.executiveSummary.classification,
      classificationDescription: reportData.stratavaxReport.executiveSummary.classificationDescription,
      executiveNarrative: reportData.stratavaxReport.executiveSummary.narrative,
      scoreBreakdown: reportData.stratavaxReport.scoreBreakdown,
      strengths: reportData.stratavaxReport.strengths.items,
      strengthsNarrative: reportData.stratavaxReport.strengths.narrative,
      topStrengths: reportData.stratavaxReport.strengths.topStrengths,
      weaknesses: reportData.stratavaxReport.weaknesses.items,
      weaknessesNarrative: reportData.stratavaxReport.weaknesses.narrative,
      topWeaknesses: reportData.stratavaxReport.weaknesses.topWeaknesses,
      recommendations: reportData.stratavaxReport.recommendations,
      logo: process.env.NEXT_PUBLIC_SITE_URL + '/images/stratavax-logo.png',
      confidentiality: 'CONFIDENTIAL - For internal use only',
      reportId: `SR-${userId.substring(0, 8)}-${Date.now()}`
    };

    // ===== STEP 6: Generate HTML =====
    const html = generateHTMLTemplate(templateData);

    // ===== STEP 7: Launch browser with Vercel-optimized configuration =====
    let browser;
    
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      // Production: Use @sparticuz/chromium-min
      const executablePath = await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar'
      );
      
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      // Development: Use local Chrome
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    // ===== STEP 8: Generate PDF =====
    const page = await browser.newPage();
    
    // Set content and wait for it to load
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 8px; text-align: center; width: 100%; color: #666; font-family: Arial, sans-serif;">
          <span>Stratavax - Confidential</span> | 
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });
    
    await browser.close();

    // ===== STEP 9: Save report metadata (optional) =====
    try {
      await serviceClient
        .from('assessment_reports')
        .insert([{
          user_id: userId,
          assessment_id: assessmentId,
          session_id: sessionId,
          report_data: reportData,
          generated_at: new Date().toISOString()
        }]);
    } catch (saveError) {
      console.error('Failed to save report metadata:', saveError);
      // Don't fail the request
    }

    // ===== STEP 10: Return PDF =====
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${candidateName.replace(/\s+/g, '_')}_report.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF report',
      message: error.message
    });
  }
}

/**
 * HTML Template for PDF generation
 */
function generateHTMLTemplate(data) {
  // Include your full HTML template here from the previous version
  // (I'm omitting it for brevity, but keep your existing template)
  return `<!DOCTYPE html>...`; // Your existing HTML template
}
