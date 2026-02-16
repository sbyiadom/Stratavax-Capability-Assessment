export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
}
