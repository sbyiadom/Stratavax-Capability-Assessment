import { supabase } from "../supabase/client";

export async function testSupabaseConnection() {
  console.log("Testing Supabase connection...");
  
  // Test 1: Check environment variables
  console.log("Env check:", {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  });

  // Test 2: Test authentication
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log("Auth test:", { authData, authError });
  } catch (authErr) {
    console.error("Auth test failed:", authErr);
  }

  // Test 3: Test table access
  try {
    const { data: tableData, error: tableError } = await supabase
      .from("responses")
      .select("count")
      .limit(1);
    
    console.log("Table access test:", { tableData, tableError });
    
    if (tableError) {
      console.error("Table error details:", {
        code: tableError.code,
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint,
      });
    }
  } catch (tableErr) {
    console.error("Table test failed:", tableErr);
  }

  // Test 4: Check RLS policies
  try {
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'responses' })
      .catch(() => ({ data: null, error: 'RPC not available' }));
    
    console.log("RLS policies test:", { policies, policiesError });
  } catch (policiesErr) {
    console.error("Policies test failed:", policiesErr);
  }
}

export function logSaveAttempt(assessment_id, question_id, answer_id, user_id, result) {
  console.group("Save Attempt Log");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Parameters:", { assessment_id, question_id, answer_id, user_id });
  console.log("Result:", result);
  console.groupEnd();
}
