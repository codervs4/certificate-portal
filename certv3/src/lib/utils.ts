export const cn=(...v:Array<string|false|null|undefined>)=>v.filter(Boolean).join(' ');
export const normalizeName=(s:string)=>s.trim().toLocaleLowerCase();
export const formatDate=(s?:string|null)=>s?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s)):'—';
export const deviceType=(ua:string)=>/mobile|android|iphone|ipad/i.test(ua)?'Mobile':/tablet/i.test(ua)?'Tablet':'Desktop';
export const browserName=(ua:string)=>/edg/i.test(ua)?'Edge':/chrome/i.test(ua)?'Chrome':/firefox/i.test(ua)?'Firefox':/safari/i.test(ua)?'Safari':'Other';
export function debounce<T extends(...a:unknown[])=>void>(fn:T,ms:number){let t:number|undefined; return (...a:Parameters<T>)=>{window.clearTimeout(t);t=window.setTimeout(()=>fn(...a),ms)};}
