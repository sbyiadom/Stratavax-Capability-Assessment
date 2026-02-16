export default function handler(req, res) {
  res.status(200).json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
}
