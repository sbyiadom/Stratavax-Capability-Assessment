import { createClient } from '@supabase/supabase-js';
import { generateStratavaxReport } from '../../utils/stratavaxReportGenerator';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';

// Register Handlebars helpers for formatting
Handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

Handlebars.registerHelper('percentageColor', function(percentage) {
  if (percentage >= 80) return '#4CAF50';
  if (percentage >= 60) return '#2196F3';
  if (percentage >= 40) return '#FF9800';
  return '#F44336';
});

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📄 PDF Report Generation API called');

  try {
    const { userId, assessmentId, sessionId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields: userId, assessmentId' });
    }

    // Initialize Supabase clients
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ===== STEP 1: Fetch candidate information =====
    console.log('🔍 Fetching candidate information...');
    const { data: candidate, error: candidateError } = await serviceClient
      .from('candidate_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (candidateError) {
      console.error('❌ Candidate fetch error:', candidateError);
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidateName = candidate?.full_name || candidate?.email?.split('@')[0] || 'Candidate';

    // ===== STEP 2: Fetch assessment information =====
    console.log('🔍 Fetching assessment information...');
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('*, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error('❌ Assessment fetch error:', assessmentError);
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // ===== STEP 3: Fetch responses with question and answer details =====
    console.log('🔍 Fetching candidate responses...');
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

    // If sessionId provided, filter by session
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: responses, error: responsesError } = await query;

    if (responsesError) {
      console.error('❌ Responses fetch error:', responsesError);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }

    if (!responses || responses.length === 0) {
      console.error('❌ No responses found');
      return res.status(404).json({ error: 'No responses found for this candidate/assessment' });
    }

    console.log(`✅ Found ${responses.length} responses`);

    // ===== STEP 4: Fetch existing results if available =====
    console.log('🔍 Checking for existing results...');
    const { data: existingResult, error: resultError } = await serviceClient
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // ===== STEP 5: Generate Stratavax report =====
    console.log('📊 Generating Stratavax report...');
    const reportData = generateStratavaxReport(
      userId,
      assessmentType,
      responses,
      candidateName,
      existingResult?.completed_at || new Date().toISOString()
    );

    // ===== STEP 6: Generate PDF using HTML template =====
    console.log('📄 Generating PDF...');
    
    // Prepare template data
    const templateData = {
      // Candidate Info
      candidateName: reportData.candidateName,
      assessmentName: assessment.title || reportData.stratavaxReport.cover.assessmentName,
      dateTaken: reportData.stratavaxReport.cover.dateTaken,
      reportDate: reportData.stratavaxReport.cover.reportGenerated,
      
      // Executive Summary
      totalScore: reportData.stratavaxReport.executiveSummary.totalScore,
      percentage: reportData.stratavaxReport.executiveSummary.percentage,
      grade: reportData.stratavaxReport.executiveSummary.grade,
      classification: reportData.stratavaxReport.executiveSummary.classification,
      classificationDescription: reportData.stratavaxReport.executiveSummary.classificationDescription,
      executiveNarrative: reportData.stratavaxReport.executiveSummary.narrative,
      
      // Score Breakdown
      scoreBreakdown: reportData.stratavaxReport.scoreBreakdown,
      
      // Strengths
      strengths: reportData.stratavaxReport.strengths.items,
      strengthsNarrative: reportData.stratavaxReport.strengths.narrative,
      topStrengths: reportData.stratavaxReport.strengths.topStrengths,
      
      // Weaknesses
      weaknesses: reportData.stratavaxReport.weaknesses.items,
      weaknessesNarrative: reportData.stratavaxReport.weaknesses.narrative,
      topWeaknesses: reportData.stratavaxReport.weaknesses.topWeaknesses,
      
      // Recommendations
      recommendations: reportData.stratavaxReport.recommendations,
      
      // Visual Data
      chartData: JSON.stringify(reportData.stratavaxReport.visualData.chartData),
      
      // Branding
      confidentiality: 'CONFIDENTIAL - For internal use only',
      logo: process.env.NEXT_PUBLIC_SITE_URL + '/images/stratavax-logo.png',
      
      // Metadata
      reportId: `SR-${userId.substring(0, 8)}-${Date.now()}`
    };

    // Launch puppeteer
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML from template
    const html = generateHTMLTemplate(templateData);
    
    // Set content and wait for fonts/images to load
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 8px; text-align: center; width: 100%; color: #666; font-family: Arial, sans-serif;">
          <span>Stratavax Assessment Report - Confidential</span> | 
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span> | 
          <span>Report ID: ${templateData.reportId}</span>
        </div>
      `
    });
    
    await browser.close();
    
    console.log('✅ PDF generated successfully');

    // ===== STEP 7: Save PDF to database (optional) =====
    try {
      const { error: saveError } = await serviceClient
        .from('assessment_reports')
        .insert([{
          user_id: userId,
          assessment_id: assessmentId,
          session_id: sessionId,
          report_data: reportData,
          report_url: null, // You could store PDF in Supabase Storage and add URL here
          generated_at: new Date().toISOString()
        }]);

      if (saveError) {
        console.error('❌ Failed to save report metadata:', saveError);
      } else {
        console.log('✅ Report metadata saved');
      }
    } catch (saveError) {
      console.error('❌ Error saving report metadata:', saveError);
      // Don't fail the request if saving metadata fails
    }

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${candidateName.replace(/\s+/g, '_')}_${assessmentType}_report.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF report',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * HTML Template for PDF generation
 * Professional, clean design matching Stratavax branding
 */
function generateHTMLTemplate(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Stratavax Assessment Report - ${data.candidateName}</title>
    <style>
        /* Global Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', 'Helvetica', sans-serif;
        }
        
        body {
            background: white;
            color: #333;
            line-height: 1.5;
        }
        
        /* Page Break */
        .page-break {
            page-break-after: always;
        }
        
        /* Cover Page */
        .cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%);
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .cover::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            opacity: 0.1;
            pointer-events: none;
        }
        
        .cover-content {
            position: relative;
            z-index: 1;
            max-width: 80%;
        }
        
        .cover-logo {
            width: 200px;
            margin-bottom: 40px;
            filter: brightness(0) invert(1);
        }
        
        .cover-title {
            font-size: 42px;
            font-weight: 800;
            margin-bottom: 20px;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .cover-subtitle {
            font-size: 28px;
            margin-bottom: 40px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .cover-candidate {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 60px;
            padding: 20px 40px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 60px;
            display: inline-block;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        
        .cover-meta {
            font-size: 18px;
            color: rgba(255,255,255,0.7);
            margin-bottom: 10px;
        }
        
        .cover-confidential {
            margin-top: 60px;
            font-size: 14px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 2px;
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 20px;
        }
        
        /* Section Headers */
        .section-header {
            margin: 30px 0 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #0A1929;
            font-size: 24px;
            font-weight: 700;
            color: #0A1929;
            display: flex;
            align-items: center;
        }
        
        .section-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: #0A1929;
            color: white;
            border-radius: 8px;
            margin-right: 12px;
            font-size: 18px;
        }
        
        /* Executive Summary Card */
        .summary-card {
            background: linear-gradient(135deg, #F5F7FA 0%, #E9ECF0 100%);
            border-radius: 16px;
            padding: 30px;
            margin: 20px 0;
            border-left: 6px solid #0A1929;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        
        .summary-item {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .summary-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-value {
            font-size: 28px;
            font-weight: 800;
            color: #0A1929;
        }
        
        .classification-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 18px;
            background: ${data.classification === 'High Potential' ? '#4CAF50' : 
                        data.classification === 'Strong Performer' ? '#2196F3' :
                        data.classification === 'Developing' ? '#FF9800' : '#F44336'};
            color: white;
            margin: 10px 0;
        }
        
        /* Score Table */
        .score-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .score-table th {
            background: #0A1929;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        .score-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .score-table tr:last-child td {
            border-bottom: none;
        }
        
        .score-table tr:hover {
            background: #F9FAFB;
        }
        
        .percentage-bar-container {
            width: 100%;
            height: 8px;
            background: #E5E7EB;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .percentage-bar {
            height: 100%;
            background: ${data.percentage >= 80 ? '#4CAF50' : 
                        data.percentage >= 60 ? '#2196F3' :
                        data.percentage >= 40 ? '#FF9800' : '#F44336'};
            border-radius: 4px;
            width: ${data.percentage}%;
        }
        
        .grade-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            background: #0A1929;
            color: white;
            font-weight: 700;
            font-size: 12px;
        }
        
        /* Strengths & Weaknesses */
        .strengths-grid, .weaknesses-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        
        .strength-card, .weakness-card {
            padding: 20px;
            border-radius: 12px;
            border-left: 6px solid;
        }
        
        .strength-card {
            background: #E8F5E9;
            border-left-color: #4CAF50;
        }
        
        .weakness-card {
            background: #FFEBEE;
            border-left-color: #F44336;
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .card-percentage {
            font-size: 20px;
            font-weight: 800;
        }
        
        .card-grade {
            font-size: 14px;
            opacity: 0.7;
        }
        
        /* Recommendations */
        .recommendations-list {
            margin: 20px 0;
        }
        
        .recommendation-item {
            padding: 20px;
            background: white;
            border-radius: 12px;
            margin-bottom: 15px;
            border: 1px solid #E5E7EB;
            border-left-width: 6px;
        }
        
        .priority-high {
            border-left-color: #F44336;
        }
        
        .priority-medium {
            border-left-color: #FF9800;
        }
        
        .priority-leverage {
            border-left-color: #4CAF50;
        }
        
        .recommendation-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .priority-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-right: 12px;
        }
        
        .priority-high .priority-badge {
            background: #F44344;
            color: white;
        }
        
        .priority-medium .priority-badge {
            background: #FF9800;
            color: white;
        }
        
        .priority-leverage .priority-badge {
            background: #4CAF50;
            color: white;
        }
        
        .recommendation-category {
            font-weight: 700;
            font-size: 16px;
        }
        
        .recommendation-text {
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .recommendation-action {
            background: #F5F7FA;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 5px;
        }
        
        .recommendation-impact {
            font-size: 13px;
            color: #666;
            font-style: italic;
        }
        
        /* Narrative Box */
        .narrative-box {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            font-size: 15px;
            line-height: 1.6;
            border: 1px solid #E5E7EB;
        }
        
        /* Footer */
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <!-- SECTION 1: COVER PAGE -->
    <div class="cover">
        <div class="cover-content">
            <img src="${data.logo}" alt="Stratavax Logo" class="cover-logo">
            <div class="cover-title">STRATAVAX</div>
            <div class="cover-subtitle">Professional Assessment Report</div>
            <div class="cover-candidate">${data.candidateName}</div>
            <div class="cover-meta">Assessment: ${data.assessmentName}</div>
            <div class="cover-meta">Date Taken: ${new Date(data.dateTaken).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="cover-meta">Report Generated: ${new Date(data.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="cover-confidential">${data.confidentiality}</div>
        </div>
    </div>
    
    <div class="page-break"></div>
    
    <!-- SECTION 2: EXECUTIVE SUMMARY -->
    <div style="padding: 20px;">
        <div class="section-header">
            <span class="section-number">2</span>
            <span>Executive Summary</span>
        </div>
        
        <div class="summary-card">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Total Score</div>
                    <div class="summary-value">${data.totalScore}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Percentage</div>
                    <div class="summary-value">${data.percentage}%</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Grade</div>
                    <div class="summary-value">${data.grade}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Classification</div>
                    <div class="classification-badge">${data.classification}</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <p style="font-size: 16px; line-height: 1.6;">${data.executiveNarrative}</p>
                <p style="margin-top: 15px; font-size: 15px; color: #555;">${data.classificationDescription}</p>
            </div>
        </div>
    </div>
    
    <div class="page-break"></div>
    
    <!-- SECTION 3: SCORE BREAKDOWN TABLE -->
    <div style="padding: 20px;">
        <div class="section-header">
            <span class="section-number">3</span>
            <span>Performance Breakdown</span>
        </div>
        
        <table class="score-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Performance</th>
                </tr>
            </thead>
            <tbody>
                ${data.scoreBreakdown.map(item => `
                <tr>
                    <td style="font-weight: 500;">${item.category}</td>
                    <td>${item.score}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="min-width: 40px;">${item.percentage}%</span>
                            <div class="percentage-bar-container">
                                <div class="percentage-bar" style="width: ${item.percentage}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td><span class="grade-badge">${item.grade}</span></td>
                    <td>${item.comment}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="page-break"></div>
    
    <!-- SECTION 4: STRENGTHS & WEAKNESSES -->
    <div style="padding: 20px;">
        <div class="section-header">
            <span class="section-number">4</span>
            <span>Strengths & Development Areas</span>
        </div>
        
        <!-- Strengths -->
        <h3 style="margin: 20px 0 10px; color: #4CAF50;">🔷 Key Strengths</h3>
        <div class="narrative-box">
            ${data.strengthsNarrative}
        </div>
        
        <div class="strengths-grid">
            ${data.strengths.slice(0, 4).map(strength => `
            <div class="strength-card">
                <div class="card-title">
                    <span>${strength.area}</span>
                    <span class="card-percentage">${strength.percentage}%</span>
                </div>
                <div class="card-grade">Grade: ${strength.grade || 'N/A'}</div>
                <div style="margin-top: 10px; font-size: 14px;">
                    <div class="percentage-bar-container">
                        <div class="percentage-bar" style="width: ${strength.percentage}%; background: #4CAF50;"></div>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>
        
        <!-- Weaknesses -->
        <h3 style="margin: 30px 0 10px; color: #F44336;">⚠️ Development Areas</h3>
        <div class="narrative-box">
            ${data.weaknessesNarrative}
        </div>
        
        <div class="weaknesses-grid">
            ${data.weaknesses.slice(0, 4).map(weakness => `
            <div class="weakness-card">
                <div class="card-title">
                    <span>${weakness.area}</span>
                    <span class="card-percentage">${weakness.percentage}%</span>
                </div>
                <div class="card-grade">Grade: ${weakness.grade || 'N/A'}</div>
                <div style="margin-top: 10px; font-size: 14px;">
                    <div class="percentage-bar-container">
                        <div class="percentage-bar" style="width: ${weakness.percentage}%; background: #F44336;"></div>
                    </div>
                    ${weakness.gap ? `<div style="margin-top: 5px; color: #F44336;">Gap to 80%: +${weakness.gap} points needed</div>` : ''}
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    
    <div class="page-break"></div>
    
    <!-- SECTION 5: DEVELOPMENT RECOMMENDATIONS -->
    <div style="padding: 20px;">
        <div class="section-header">
            <span class="section-number">5</span>
            <span>Development Recommendations</span>
        </div>
        
        <div class="recommendations-list">
            ${data.recommendations.map(rec => `
            <div class="recommendation-item priority-${rec.priority.toLowerCase()}">
                <div class="recommendation-header">
                    <span class="priority-badge">${rec.priority} PRIORITY</span>
                    <span class="recommendation-category">${rec.category}</span>
                </div>
                <div class="recommendation-text">${rec.recommendation}</div>
                <div class="recommendation-action"><strong>Action:</strong> ${rec.action}</div>
                <div class="recommendation-impact"><strong>Expected Impact:</strong> ${rec.impact}</div>
            </div>
            `).join('')}
        </div>
        
        <!-- Top Strengths to Leverage -->
        ${data.topStrengths.length > 0 ? `
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 15px; color: #4CAF50;">🎯 Leverage Top Strengths</h3>
            <div style="background: #E8F5E9; padding: 20px; border-radius: 12px;">
                <p><strong>${data.topStrengths.join(', ')}</strong> - These areas can be leveraged for:</p>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <li>Mentoring and developing others</li>
                    <li>Taking on stretch assignments</li>
                    <li>Leading projects in these domains</li>
                    <li>Sharing best practices with the team</li>
                </ul>
            </div>
        </div>
        ` : ''}
        
        <!-- Top Weaknesses to Address -->
        ${data.topWeaknesses.length > 0 ? `
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 15px; color: #F44336;">🎯 Priority Development Focus</h3>
            <div style="background: #FFEBEE; padding: 20px; border-radius: 12px;">
                <p><strong>${data.topWeaknesses.join(', ')}</strong> - Immediate focus areas:</p>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <li>Complete targeted training within 30 days</li>
                    <li>Work with mentor for guided practice</li>
                    <li>Set weekly progress checkpoints</li>
                    <li>Apply learning in real projects</li>
                </ul>
            </div>
        </div>
        ` : ''}
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <p>Stratavax Assessment Report - Generated on ${new Date(data.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>Report ID: ${data.reportId} | This report is confidential and intended for the recipient only.</p>
    </div>
</body>
</html>
  `;
}
