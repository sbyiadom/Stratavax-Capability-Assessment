// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the pathname
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Check for supervisor session
  const supervisorSession = request.cookies.get('supervisorSession');
  
  // Protect supervisor routes
  if (pathname.startsWith('/supervisor') && pathname !== '/supervisor-login') {
    if (!supervisorSession) {
      return NextResponse.redirect(new URL('/supervisor-login', request.url));
    }
    
    try {
      const session = JSON.parse(supervisorSession.value);
      
      // Check if session is expired
      if (session.expires < Date.now()) {
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
    // Skip all internal paths (_next)
    '/((?!_next).*)',
  ],
};
