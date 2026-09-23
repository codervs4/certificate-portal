import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminSession } from '../../services/auth';
import { requireSupabase } from '../../lib/supabase';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'ok'|'no'>('loading');
  useEffect(() => {
    const sb = requireSupabase();
    let active = true;
    const check = async () => {
      try {
        const adminSession = await getAdminSession();
        if (!active) return;
        setState(adminSession ? 'ok' : 'no');
      } catch {
        if (active) setState('no');
      }
    };
    check();
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(session?.user.app_metadata?.role === 'admin' ? 'ok' : 'no');
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  if (state === 'loading') return <div className="grid min-h-screen place-items-center bg-[#080b12] text-slate-300">Loading secure workspace…</div>;
  return state === 'ok' ? <>{children}</> : <Navigate to="/secure-admin-panel" replace />;
}
