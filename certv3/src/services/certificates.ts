import {requireSupabase} from '../lib/supabase';
import {normalizeName} from '../lib/utils';
import type {Certificate} from '../types';
export async function publicFindCertificate(query:string){const q=query.trim();if(!q)return [];const {data,error}=await requireSupabase().rpc('search_certificate',{p_query:q});if(error)throw error;return (data??[]) as Certificate[];}
export async function listCertificates(page:number=0,pageSize:number=25,search=''){const sb=requireSupabase();let q=sb.from('certificates').select('id,certificate_id,recipient_name,normalized_name,template_id,status,created_at,updated_at,certificate_downloads(count)', {count:'exact'}).order('created_at',{ascending:false}).range(page*pageSize,(page+1)*pageSize-1); if(search.trim())q=q.or(`certificate_id.ilike.%${search.trim()}%,recipient_name.ilike.%${search.trim()}%`);const {data,error,count}=await q;if(error)throw error;return {data:(data??[]) as Certificate[],count:count??0};}
export async function updateCertificate(id:string,name:string){const sb=requireSupabase();const {data,error}=await sb.from('certificates').update({recipient_name:name,normalized_name:normalizeName(name)}).eq('id',id).select().single();if(error)throw error;return data as Certificate;}
export async function deleteCertificate(id:string){const {error}=await requireSupabase().from('certificates').delete().eq('id',id);if(error)throw error;}
