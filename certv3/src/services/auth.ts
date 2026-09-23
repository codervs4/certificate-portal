import { requireSupabase } from '../lib/supabase';

export const signIn = async (email: string, password: string) => {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Refresh once so newly-added Supabase app_metadata is present in the JWT/session.
  const { data: refreshed, error: refreshError } = await sb.auth.refreshSession();
  if (refreshError) throw refreshError;
  return refreshed.session ?? data.session;
};

export const getAdminSession = async () => {
  const sb = requireSupabase();
  const { data: refreshed, error } = await sb.auth.refreshSession();
  if (error) throw error;
  const session = refreshed.session;
  return session?.user.app_metadata?.role === 'admin' ? session : null;
};

export const signOut = async () => {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
};
