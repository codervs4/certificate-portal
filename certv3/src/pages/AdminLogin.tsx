import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button, Input, Alert } from '../components/ui';
import { getAdminSession, signIn } from '../services/auth';
import { requireSupabase } from '../lib/supabase';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState(false);

  useEffect(() => {
    let active = true;
    const sb = requireSupabase();
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (session?.user.app_metadata?.role === 'admin') nav('/secure-admin-panel/dashboard', { replace: true });
      else setChecking(false);
    });
    return () => { active = false; };
  }, [nav]);

  if (checking) return <div className="grid min-h-screen place-items-center bg-[#080b12] text-slate-300">Checking secure session…</div>;

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080b12] px-4 py-10 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.12),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,.12),transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#101722]/95 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-7 flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20"><LockKeyhole size={21}/></div>
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Certificate Portal</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Secure administration</h1><p className="mt-1 text-sm text-slate-400">Sign in with your authorized Supabase account.</p></div>
        </div>
        <form onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(''); setRoleError(false); setLoading(true);
          try {
            await signIn(email.trim(), password);
            const adminSession = await getAdminSession();
            if (!adminSession) {
              setRoleError(true);
              setError('Login succeeded, but this account is not marked as an administrator. Add role=admin to its Supabase Auth app metadata, then sign in again.');
              await requireSupabase().auth.signOut();
              return;
            }
            nav('/secure-admin-panel/dashboard', { replace: true });
          } catch {
            setError('The email or password is incorrect, or Supabase is not configured correctly.');
          } finally { setLoading(false); }
        }} className="space-y-4">
          <label className="block text-sm font-medium text-slate-200">Email<Input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 bg-[#0b111b] text-slate-100 placeholder:text-slate-400"/></label>
          <label className="block text-sm font-medium text-slate-200">Password<Input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 bg-[#0b111b] text-slate-100 placeholder:text-slate-400"/></label>
          {error && <Alert>{error}</Alert>}
          {roleError && <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200"><ShieldCheck size={15} className="mb-1 inline mr-1"/> Your credentials are valid. The account simply needs administrator metadata in Supabase.</div>}
          <Button loading={loading} type="submit" className="w-full">Sign in securely</Button>
        </form>
      </div>
    </div>
  );
}
