// pages/assessment/[id].js
// Update the useEffect that loads saved responses (around line 115)

// Load saved responses
if (sessionData?.id) {
  console.log("Loading responses for session:", sessionData.id);
  const responses = await getSessionResponses(sessionData.id);
  console.log("Loaded responses:", responses);
  
  // Make sure we're setting the answers correctly
  if (responses && responses.answerMap) {
    setAnswers(responses.answerMap);
  }
}

// Also update the handleAnswerSelect function to ensure it's working:

const handleAnswerSelect = async (questionId, answerId) => {
  if (alreadySubmitted || !session || !questionId || !answerId) {
    console.log("Cannot save:", { alreadySubmitted, hasSession: !!session, questionId, answerId });
    return;
  }

  console.log("Selected answer:", { questionId, answerId });

  // Update UI immediately
  setAnswers(prev => {
    const newAnswers = { ...prev, [questionId]: answerId };
    console.log("Updated answers state:", newAnswers);
    return newAnswers;
  });
  
  // Show saving indicator
  setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));

  // Save to Supabase
  try {
    console.log("Calling saveResponse with:", {
      sessionId: session.id,
      userId: user.id,
      assessmentId: assessmentId,
      questionId,
      answerId
    });

    const result = await saveResponse(
      session.id, 
      user.id, 
      assessmentId, 
      questionId, 
      answerId
    );
    
    console.log("Save result:", result);
    
    if (result && result.success) {
      console.log("✅ Saved successfully");
      setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      
      // Clear status after short delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1000);
    } else {
      console.error("❌ Save failed:", result?.error);
      setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
    }
    
  } catch (error) {
    console.error("❌ Save error:", error);
    setSaveStatus(prev => ({ ...prev, [questionId]: 'error' }));
    
    setTimeout(() => {
      setSaveStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[questionId];
        return newStatus;
      });
    }, 2000);
  }
};
