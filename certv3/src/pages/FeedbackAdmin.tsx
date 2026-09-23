import { useEffect, useState } from 'react';
import { Check, MessageSquare, Star } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { feedbackList, markFeedbackRead } from '../services/analytics';
import { formatDate } from '../lib/utils';

export default function FeedbackAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); feedbackList().then(setRows).finally(()=>setLoading(false)); };
  useEffect(load, []);
  const read = async (id:string) => { await markFeedbackRead(id); setRows(x=>x.map(r=>r.id===id?{...r,status:'read'}:r)); };
  return <div><div className="mb-6"><h1 className="text-2xl font-bold">Feedback</h1><p className="mt-1 text-sm text-slate-400">Review public responses without exposing private admin data.</p></div><Card className="overflow-hidden"><div className="divide-y divide-white/10">{loading?<div className="p-8 text-center text-sm text-slate-400">Loading feedback…</div>:rows.length?rows.map(r=><div key={r.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-1">{[1,2,3,4,5].map(n=><Star key={n} size={14} className={n<=r.rating?'fill-current text-amber-400':'text-slate-300'}/>)}</div><p className="mt-2 text-sm leading-6 text-slate-300">{r.message}</p>{r.certificate_id&&<p className="mt-2 text-xs text-slate-400">Certificate: {r.certificate_id}</p>}</div><div className="text-right"><p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>{r.status!=='read'&&<Button variant="ghost" className="mt-2" onClick={()=>read(r.id)}><Check size={15}/> Mark read</Button>}</div></div></div>):<div className="p-10 text-center"><MessageSquare className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-400">No feedback yet.</p></div>}</div></Card></div>;
}
