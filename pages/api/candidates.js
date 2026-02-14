import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize regular client for session verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Get the authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' })
    }

    const token = authHeader.split(' ')[1];
    
    // Set the session for this request
    supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    // Check if user is supervisor
    const role = user.user_metadata?.role;
    const isSupervisor = user.user_metadata?.is_supervisor;
    
    if (role !== 'supervisor' && !isSupervisor) {
      return res.status(403).json({ error: 'Forbidden: Not a supervisor' })
    }

    console.log(`Supervisor ${user.email} accessing candidates API`);

    // Initialize admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get ALL users from auth (admin privilege)
    const { data: { users: allUsers }, error: adminError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000 // Get all users
    });

    if (adminError) {
      console.error('Admin API error:', adminError);
      return res.status(500).json({ error: 'Failed to fetch users: ' + adminError.message })
    }

    console.log(`Total users in system: ${allUsers?.length || 0}`);

    // Get all completed assessments from the new structure
    const { data: completedAssessments, error: assessmentsError } = await supabase
      .from('candidate_assessments')
      .select(`
        user_id,
        assessment_id,
        assessment_type:assessment_types(code, name),
        score,
        completed_at,
        status,
        result_id
      `)
      .eq('status', 'completed');

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
    }

    // Group assessments by user
    const userAssessments = {};
    completedAssessments?.forEach(assessment => {
      if (!userAssessments[assessment.user_id]) {
        userAssessments[assessment.user_id] = [];
      }
      userAssessments[assessment.user_id].push({
        assessment_id: assessment.assessment_id,
        type: assessment.assessment_type?.code || 'unknown',
        type_name: assessment.assessment_type?.name || 'Unknown',
        score: assessment.score,
        completed_at: assessment.completed_at,
        result_id: assessment.result_id
      });
    });

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('candidate_profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    const profilesMap = {};
    profiles?.forEach(profile => {
      profilesMap[profile.id] = profile;
    });

    // Get response counts per user
    const { data: responseCounts, error: responseError } = await supabase
      .from('responses')
      .select('user_id, count')
      .group('user_id');

    if (responseError) {
      console.error('Error fetching response counts:', responseError);
    }

    const responseCountMap = {};
    responseCounts?.forEach(item => {
      responseCountMap[item.user_id] = item.count;
    });

    // Filter candidates: exclude supervisors and current user
    const currentUserEmail = user.email.toLowerCase();
    const candidates = [];

    if (allUsers && allUsers.length > 0) {
      for (const authUser of allUsers) {
        const userEmail = authUser.email?.toLowerCase() || '';
        const userRole = authUser.user_metadata?.role;
        const userIsSupervisor = authUser.user_metadata?.is_supervisor;
        
        // Skip if it's the current user (supervisor)
        if (userEmail === currentUserEmail) {
          continue;
        }
        
        // Skip if user is a supervisor
        if (userRole === 'supervisor' || userIsSupervisor === true) {
          continue;
        }
        
        // Get profile data
        const profile = profilesMap[authUser.id];
        
        // Get assessments for this user
        const assessments = userAssessments[authUser.id] || [];
        
        // Calculate statistics
        const totalAssessments = assessments.length;
        const completedCount = assessments.length;
        const inProgressCount = responseCountMap[authUser.id] > 0 && assessments.length === 0 ? 1 : 0;
        
        // Calculate average score
        let totalScore = 0;
        assessments.forEach(a => totalScore += a.score || 0);
        const averageScore = totalAssessments > 0 ? Math.round(totalScore / totalAssessments) : 0;

        // Group by assessment type
        const assessmentBreakdown = {};
        assessments.forEach(a => {
          assessmentBreakdown[a.type] = (assessmentBreakdown[a.type] || 0) + 1;
        });

        candidates.push({
          id: authUser.id,
          email: authUser.email,
          name: profile?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown',
          created_at: authUser.created_at,
          last_sign_in: authUser.last_sign_in_at,
          status: totalAssessments > 0 ? 'completed' : 
                  responseCountMap[authUser.id] > 0 ? 'in_progress' : 'not_started',
          role: userRole || 'candidate',
          
          // Assessment stats
          total_assessments: totalAssessments,
          completed_count: completedCount,
          in_progress_count: inProgressCount,
          average_score: averageScore,
          highest_score: assessments.length > 0 ? Math.max(...assessments.map(a => a.score || 0)) : 0,
          
          // Detailed assessments
          assessments: assessments.sort((a, b) => 
            new Date(b.completed_at) - new Date(a.completed_at)
          ),
          
          assessment_breakdown: assessmentBreakdown,
          
          // Raw metadata
          raw_metadata: authUser.user_metadata,
          profile: profile
        });
      }
    }

    console.log(`Found ${candidates.length} candidates`);

    // Calculate overall statistics
    const statistics = {
      totalCandidates: candidates.length,
      totalAssessments: candidates.reduce((sum, c) => sum + c.total_assessments, 0),
      candidatesWithAssessments: candidates.filter(c => c.total_assessments > 0).length,
      candidatesInProgress: candidates.filter(c => c.in_progress_count > 0).length,
      averageScorePerCandidate: candidates.length > 0 
        ? Math.round(candidates.reduce((sum, c) => sum + c.average_score, 0) / candidates.length)
        : 0,
      
      // Breakdown by assessment type
      assessmentBreakdown: {}
    };

    // Aggregate assessment type counts
    candidates.forEach(candidate => {
      if (candidate.assessment_breakdown) {
        Object.entries(candidate.assessment_breakdown).forEach(([type, count]) => {
          statistics.assessmentBreakdown[type] = (statistics.assessmentBreakdown[type] || 0) + count;
        });
      }
    });

    res.status(200).json({
      candidates,
      statistics,
      debug: {
        totalUsers: allUsers?.length || 0,
        currentUser: user.email,
        totalAssessments: completedAssessments?.length || 0,
        totalProfiles: profiles?.length || 0
      }
    });

  } catch (error) {
    console.error('Unexpected API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
