// Fetch candidate data - UNIVERSAL FIX FOR ALL CANDIDATES
useEffect(() => {
  if (!isSupervisor || !user_id) return;

  const fetchCandidateData = async () => {
    try {
      setLoading(true);
      
      // 1. FETCH FROM candidate_assessments VIEW (SAME AS index.js)
      // This is the single source of truth that already works
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidate_assessments")
        .select(`
          user_id,
          total_score,
          classification,
          email,
          full_name
        `)
        .eq("user_id", user_id)
        .single();
      
      // 2. HANDLE THE RESULTS
      if (candidateError) {
        console.error("Error fetching candidate:", candidateError);
        
        // If not in candidate_assessments, check if user exists in talent_classification
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("total_score, classification")
          .eq("user_id", user_id)
          .single();
        
        if (!classificationError && classificationData) {
          // Candidate has assessment but might not be in the VIEW yet
          setUserEmail("Email not found");
          setUserName(`Candidate ${
