import { requestPublicOrigin } from "./_lib/public-origin.js";

// V256 open discovery: every crawler (search engines, AI search/answer assistants and AI
// training crawlers alike) may read the public site, by owner decision. Only private
// operational surfaces stay disallowed; they are also noindex + no-store in vercel.json.
const privatePaths=['/admin','/branch-portal','/track-car','/booking-checkout','/api'];

const rules=[
  'User-agent: *',
  'Allow: /',
  ...privatePaths.map((path)=>`Disallow: ${path}`),
  '',
].join('\n');

export default{async fetch(request:Request){
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  const body=`${rules}\nSitemap: ${requestPublicOrigin(request)}/sitemap.xml\n`;
  return new Response(request.method==='HEAD'?null:body,{headers:{
    'content-type':'text/plain; charset=utf-8',
    'cache-control':'public, max-age=300, s-maxage=600',
    'x-content-type-options':'nosniff',
  }});
}};
