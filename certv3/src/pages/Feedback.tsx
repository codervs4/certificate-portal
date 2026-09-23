import { FormEvent, useState } from 'react';
import { MessageSquare, Send, Star, CheckCircle2 } from 'lucide-react';
import { Alert, Button, Card, Input } from '../components/ui';
import { submitFeedback } from '../services/analytics';

export default function Feedback() {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) { setError('Please enter a little more feedback.'); return; }
    setLoading(true); setError('');
    try { await submitFeedback({ rating, message, certificateId }); setSent(true); setMessage(''); setCertificateId(''); }
    catch { setError('We could not send your feedback. Please try again.'); }
    finally { setLoading(false); }
  };

  if (sent) return <main className="mx-auto max-w-xl px-4 py-16 sm:py-24"><Card className="p-8 text-center sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={28}/></div><h1 className="mt-5 text-2xl font-bold">Thanks for your feedback</h1><p className="mt-2 text-sm leading-6 text-slate-400">Your response has been sent to the certificate team.</p><Button className="mt-6" onClick={() => setSent(false)}>Send another</Button></Card></main>;

  return <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-20"><div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101722] px-3 py-1 text-xs font-semibold text-slate-400"><MessageSquare size={14}/> Help us improve</div><h1 className="text-3xl font-bold tracking-tight">Send feedback</h1><p className="mt-2 text-sm leading-6 text-slate-400">Tell us what worked well or what we can make easier.</p></div><Card className="p-5 sm:p-7"><form onSubmit={submit} className="space-y-5"><div><label className="text-sm font-semibold">How was your experience?</label><div className="mt-3 flex gap-2">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={`${n} stars`} className="rounded-lg p-2 transition hover:bg-[#080b12]"><Star size={25} className={n<=rating?'fill-current text-amber-400':'text-slate-300'}/></button>)}</div></div><div><label className="text-sm font-semibold">Feedback</label><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} rows={5} placeholder="What should we improve?" className="mt-2 w-full resize-y rounded-lg border border-white/10 px-3.5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"/></div><div><label className="text-sm font-semibold">Certificate ID <span className="font-normal text-slate-400">(optional)</span></label><Input value={certificateId} onChange={e=>setCertificateId(e.target.value)} maxLength={50} placeholder="CTF26-000001" className="mt-2"/></div>{error&&<Alert>{error}</Alert>}<Button type="submit" loading={loading} className="w-full"><Send size={16}/> Send feedback</Button></form></Card></main>;
}
