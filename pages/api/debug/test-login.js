export default async function handler(req, res) {
  // Only for debugging
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Debug endpoint not available in production' });
  }

  const { email, password } = req.body;

  return res.status(200).json({
    message: 'Debug endpoint working',
    received: { email, passwordProvided: !!password },
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
}
