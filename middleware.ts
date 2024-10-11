import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const access_token = req.cookies.get('sb-access-token')?.value;
  const refresh_token = req.cookies.get('sb-refresh-token')?.value;

  if (access_token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      }
    );

    const { error } = await supabase.auth.getUser();

    if (error) {
      if (refresh_token) {
        const {
          data: refreshData,
          error: refreshError,
        } = await supabase.auth.refreshSession({ refresh_token });
        if (refreshError) {
          res.cookies.delete('sb-access-token');
          res.cookies.delete('sb-refresh-token');
        } else {
          res.cookies.set('sb-access-token', refreshData.session?.access_token || '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: refreshData.session?.expires_in || 0,
          });
          res.cookies.set('sb-refresh-token', refreshData.session?.refresh_token || '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        }
      } else {
        res.cookies.delete('sb-access-token');
        res.cookies.delete('sb-refresh-token');
      }
    }
  }

  return res;
}

export const config = {
  matcher: '/((?!_next/static|favicon.ico).*)',
};