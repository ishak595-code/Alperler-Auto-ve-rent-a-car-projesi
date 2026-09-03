import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function headers(contentType = "application/json; charset=utf-8"): HeadersInit {
  return {
    "content-type": contentType,
    "cache-control": "no-store, max-age=0",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  };
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: headers() });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rpc(name: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

function passwordError(password: string): string | null {
  if (password.length < 12) return "Şifre en az 12 karakter olmalı.";
  if (!/[a-zçğıöşü]/.test(password)) return "En az bir küçük harf kullanın.";
  if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return "En az bir büyük harf kullanın.";
  if (!/[0-9]/.test(password)) return "En az bir rakam kullanın.";
  if (!/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(password)) return "En az bir özel karakter kullanın.";
  return null;
}

async function passwordSeenInBreach(password: string): Promise<boolean | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Alperler-Admin-Password-Safety" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const suffix = hash.slice(5);
    return (await response.text()).split(/\r?\n/).some((line) => line.split(":")[0]?.trim() === suffix);
  } catch {
    return null;
  }
}

async function updatePassword(userId: string, password: string): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) console.error("admin-first-access-v239 password update failed", response.status);
  return response.ok;
}

const PAGE = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>Alperler Yönetici Şifresi</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#050b16;color:#f8fafc;font:16px system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);border:1px solid #26364f;border-radius:24px;background:#0b1526;padding:24px;box-shadow:0 24px 70px #0008}.k{color:#d5b449;font-size:12px;font-weight:900;letter-spacing:.14em}.title{font:900 34px Georgia,serif;margin:10px 0}.muted{color:#a5b4c8;line-height:1.6}.field{display:grid;gap:7px;margin-top:18px}.field span{font-size:12px;font-weight:800;color:#cbd5e1}input{width:100%;min-height:56px;border:2px solid #334155;border-radius:14px;background:#f8fafc;color:#0f172a;padding:0 15px;font-size:17px}button{width:100%;min-height:56px;margin-top:20px;border:0;border-radius:14px;background:#356d9e;color:white;font-size:16px;font-weight:900}.msg{display:none;margin-top:16px;border-radius:13px;padding:14px;line-height:1.5}.err{display:block;background:#33141d;color:#fecdd3}.ok{display:block;background:#073b31;color:#bbf7d0}.rules{margin-top:14px;color:#94a3b8;font-size:12px;line-height:1.6}</style></head><body><main class="card"><div class="k">GÜVENLİ YÖNETİCİ ERİŞİMİ</div><h1 class="title">İlk Şifreni Oluştur</h1><p class="muted">Bu bağlantı tek kullanımlıktır. Yeni şifrenizi burada belirleyin, ardından Alperler yönetici ekranından normal şekilde giriş yapın.</p><form id="form"><label class="field"><span>Yeni şifre</span><input id="p1" type="password" autocomplete="new-password" minlength="12" required></label><label class="field"><span>Yeni şifre tekrar</span><input id="p2" type="password" autocomplete="new-password" minlength="12" required></label><div class="rules">En az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter kullanın.</div><button id="submit" type="submit">Yeni Şifreyi Güvenli Kaydet</button></form><div id="msg" class="msg" role="status" aria-live="polite"></div></main><script>
(()=>{const h=new URLSearchParams(location.hash.slice(1));let token=h.get('token')||'';history.replaceState(null,document.title,location.pathname);const f=document.getElementById('form'),m=document.getElementById('msg'),b=document.getElementById('submit');if(!/^[A-Za-z0-9_-]{40,100}$/.test(token)){f.style.display='none';m.className='msg err';m.textContent='Bu bağlantı geçersiz veya eksik. Yeni bir yönetici erişim bağlantısı isteyin.';return}f.addEventListener('submit',async(e)=>{e.preventDefault();m.className='msg';m.textContent='';const p1=document.getElementById('p1').value,p2=document.getElementById('p2').value;if(p1!==p2){m.className='msg err';m.textContent='Şifreler birbiriyle eşleşmiyor.';return}b.disabled=true;b.textContent='Güvenli şekilde kaydediliyor…';try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,password:p1,confirmPassword:p2})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.message||'Şifre kaydedilemedi.');token='';f.style.display='none';m.className='msg ok';m.textContent='Şifreniz oluşturuldu. Şimdi Alperler uygulamasındaki Yönetici Girişi ekranına dönüp e-posta adresiniz ve yeni şifrenizle giriş yapabilirsiniz.'}catch(err){m.className='msg err';m.textContent=err instanceof Error?err.message:'Şifre kaydedilemedi.';b.disabled=false;b.textContent='Yeni Şifreyi Güvenli Kaydet'}})})();
</script></body></html>`;

Deno.serve(async (request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, message: "Sunucu yapılandırması hazır değil." }, 503);
  if (request.method === "GET") return new Response(PAGE, { status: 200, headers: headers("text/html; charset=utf-8") });
  if (request.method !== "POST") return json({ ok: false, message: "İstek desteklenmiyor." }, 405);
  if (Number(request.headers.get("content-length") || 0) > 8_192) return json({ ok: false, message: "İstek çok büyük." }, 413);

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json({ ok: false, message: "Geçersiz istek." }, 400); }
  const token = clean(input.token, 120);
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return json({ ok: false, message: "Bağlantı geçersiz veya süresi dolmuş." }, 400);
  if (password !== confirmPassword) return json({ ok: false, message: "Şifreler birbiriyle eşleşmiyor." }, 400);
  const validation = passwordError(password);
  if (validation) return json({ ok: false, message: validation }, 400);

  const breached = await passwordSeenInBreach(password);
  if (breached === null) return json({ ok: false, message: "Şifre güvenlik denetimi şu anda tamamlanamadı. Lütfen biraz sonra tekrar deneyin." }, 503);
  if (breached) return json({ ok: false, message: "Bu şifre daha önce bir veri sızıntısında görülmüş. Farklı ve benzersiz bir şifre seçin." }, 400);

  const tokenHash = await sha256(token);
  const claim = await rpc("admin_first_access_claim_v239", { p_token_hash: tokenHash });
  if (!claim.ok) return json({ ok: false, message: "Bağlantı doğrulanamadı." }, 403);
  const rows = await claim.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  const userId = clean(row?.user_id, 80);
  if (!userId) return json({ ok: false, message: "Bağlantı geçersiz, kullanılmış veya süresi dolmuş." }, 403);

  const updated = await updatePassword(userId, password);
  await rpc("admin_first_access_finish_v239", { p_token_hash: tokenHash, p_success: updated }).catch(() => null);
  if (!updated) return json({ ok: false, message: "Şifre şu anda kaydedilemedi. Lütfen yeniden deneyin." }, 503);
  return json({ ok: true });
});
