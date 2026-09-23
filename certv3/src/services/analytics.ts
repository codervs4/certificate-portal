import { requireSupabase } from '../lib/supabase';

export async function recordDownload(certificateId: string) {
  const sb = requireSupabase();
  const { error } = await sb.rpc('record_certificate_download', {
    p_certificate_id: certificateId,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export async function submitFeedback(input: { rating: number; message: string; certificateId?: string }) {
  const sb = requireSupabase();
  const { error } = await sb.rpc('submit_public_feedback', {
    p_rating: input.rating,
    p_message: input.message.trim(),
    p_certificate_id: input.certificateId || null,
  });
  if (error) throw error;
}

export async function dashboardStats() {
  const { data, error } = await requireSupabase().rpc('admin_dashboard_stats');
  if (error) throw error;
  return data as {
    live_certificates: number;
    revoked_certificates: number;
    draft_certificates: number;
    total_downloads: number;
    downloads_today: number;
    downloads_week: number;
    downloads_month: number;
    unique_downloaded_certificates: number;
    templates: number;
    feedback_total: number;
    feedback_unread: number;
  };
}

export async function recentDownloads(limit = 30) {
  const { data, error } = await requireSupabase()
    .from('certificate_downloads')
    .select('*,certificates(certificate_id,recipient_name)')
    .order('downloaded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function feedbackList(limit = 100) {
  const { data, error } = await requireSupabase()
    .from('public_feedback')
    .select('id,rating,message,certificate_id,created_at,status')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markFeedbackRead(id: string) {
  const { error } = await requireSupabase().from('public_feedback').update({ status: 'read' }).eq('id', id);
  if (error) throw error;
}
