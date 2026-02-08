// middleware/auth.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Check for supervisor session
  const supervisorSession = request.cookies.get('supervisorSession');
  
  // For protected supervisor routes
  if (request.nextUrl.pathname.startsWith('/supervisor')) {
    if (!supervisorSession) {
      return NextResponse.redirect(new URL('/supervisor-login', request.url));
    }
    
    // Parse session data
    try {
      const session = JSON.parse(supervisorSession.value);
      
      // Check if session is expired
      if (session.expires < Date.now()) {
        // Clear expired session
        const response = NextResponse.redirect(new URL('/supervisor-login', request.url));
        response.cookies.delete('supervisorSession');
        return response;
      }
      
      // Update last activity
      session.lastActivity = Date.now();
      const updatedSession = JSON.stringify(session);
      
      // Update cookie
      const response = NextResponse.next();
      response.cookies.set('supervisorSession', updatedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8 // 8 hours
      });
      
      return response;
      
    } catch (error) {
      // Invalid session
      const response = NextResponse.redirect(new URL('/supervisor-login', request.url));
      response.cookies.delete('supervisorSession');
      return response;
    }
  }
  
  return NextResponse.next();
}

// Configure which routes to protect
export const config = {
  matcher: [
    '/supervisor/:path*',
    '/api/supervisor/:path*'
  ]
};
