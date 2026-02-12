// FIX THIS FUNCTION - It's causing the infinite loading
const startOrResumeTimer = async (userId, assessmentId) => {
  try {
    // Check if timer already exists
    const { data: existingTimer, error: fetchError } = await supabase
      .from("assessment_timer_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingTimer) {
      // Resume timer - return elapsed seconds so far
      console.log("Resuming timer from:", existingTimer.elapsed_seconds, "seconds");
      return existingTimer.elapsed_seconds;
    } else {
      // Start new timer
      const { error } = await supabase
        .from("assessment_timer_progress")
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          started_at: new Date().toISOString(),
          elapsed_seconds: 0,
          status: 'in_progress'
        });

      if (error) throw error;
      console.log("New timer started");
      return 0;
    }
  } catch (error) {
    console.error("Timer error:", error);
    return 0; // Default to 0 if error
  }
};
