import { requestPublicOrigin } from "./_lib/public-origin";

const privatePaths=['/admin','/branch-portal','/track-car','/booking-checkout','/api'];
const aiAgents=[
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'OAI-AdsBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'CCBot',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'meta-externalfetcher',
  'cohere-ai',
] as const;

const publicRules=[
  'User-agent: *',
  'Allow: /',
  ...privatePaths.map((path)=>`Disallow: ${path}`),
  '',
].join('\n');

const aiRules=aiAgents.map((agent)=>`User-agent: ${agent}\nDisallow: /\n`).join('\n');
const rules=`${publicRules}\n${aiRules}`;

export default{async fetch(request:Request){
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  const url=new URL(request.url);
  if(url.searchParams.get('block')==='ai'){
    return new Response(request.method==='HEAD'?null:'Automated AI crawler access is not permitted.',{
      status:403,
      headers:{
        'content-type':'text/plain; charset=utf-8',
        'cache-control':'private, no-store, max-age=0',
        'x-robots-tag':'noindex, nofollow, noarchive, nosnippet, noimageindex',
        'x-content-type-options':'nosniff',
        'referrer-policy':'no-referrer',
      },
    });
  }
  const body=`${rules}\nSitemap: ${requestPublicOrigin(request)}/sitemap.xml\n`;
  return new Response(request.method==='HEAD'?null:body,{headers:{
    'content-type':'text/plain; charset=utf-8',
    'cache-control':'public, max-age=300, s-maxage=600',
    'x-content-type-options':'nosniff',
  }});
}};
