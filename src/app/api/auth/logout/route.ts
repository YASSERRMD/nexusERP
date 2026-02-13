import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, invalidateSession, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (user) {
      const token = request.cookies.get('session_token')?.value;
      if (token) {
        await invalidateSession(token);
      }
    }
    
    await clearSessionCookie();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
