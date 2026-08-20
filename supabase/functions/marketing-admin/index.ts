import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

type GooglePublishResult = {
  campaignResource: string;
  assetGroupResource: string;
  channels: string[];
};

type MetaPublishResult = {
  campaignId: string;
  adSetId: string;
  adId: string;
  placementMode: 'AUTOMATIC';
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...CORS, 'cache-control': 'no-store' } });
}

function clean(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE,
    authorization: `Bearer ${SERVICE}`,
    'content-type': 'application/json',
    ...extra,
  };
}

async function db(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error('UNAUTHORIZED');
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE, authorization },
  });
  if (!userResponse.ok) throw new Error('UNAUTHORIZED');
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  const email = clean(user?.email, 180);
  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error('FORBIDDEN');
  const row = (await adminResponse.json())?.[0];
  const permissions = row?.permissions && typeof row.permissions === 'object' ? row.permissions : {};
  if (!row || (!['owner', 'admin'].includes(String(row.role)) && permissions['marketing.manage'] !== true)) {
    throw new Error('FORBIDDEN');
  }
  return { id, email };
}

function googleReady() {
  return [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ].every((key) => Boolean(Deno.env.get(key)?.trim()));
}

function metaReady() {
  return ['META_ADS_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_PAGE_ID', 'META_GRAPH_VERSION']
    .every((key) => Boolean(Deno.env.get(key)?.trim()));
}

async function list(request: Request) {
  await requireAdmin(request);
  const [integrationsResponse, campaignsResponse] = await Promise.all([
    db('marketing_integrations?select=*&order=provider.asc'),
    db('marketing_campaigns?select=*&order=created_at.desc&limit=500'),
  ]);
  if (!integrationsResponse.ok || !campaignsResponse.ok) throw new Error('MARKETING_READ_FAILED');
  const integrations = await integrationsResponse.json();
  for (const integration of integrations) {
    if (integration.provider === 'GOOGLE_ADS') {
      integration.runtime_configured = googleReady();
      integration.delivery_mode = 'PERFORMANCE_MAX';
      integration.channels = ['Search', 'YouTube', 'Display', 'Discover', 'Gmail', 'Maps'];
    }
    if (integration.provider === 'META_ADS') {
      integration.runtime_configured = metaReady();
      integration.delivery_mode = 'AUTOMATIC_PLACEMENTS';
      integration.channels = ['Facebook', 'Instagram', 'Messenger', 'Audience Network'];
    }
  }
  return json({ ok: true, integrations, campaigns: await campaignsResponse.json() });
}

async function save(body: any, admin: any) {
  const provider = clean(body?.provider, 30).toUpperCase();
  const targetType = clean(body?.targetType, 30).toUpperCase();
  const name = clean(body?.name, 180);
  if (!['GOOGLE_ADS', 'META_ADS'].includes(provider) || !['VEHICLE', 'TOUR', 'CAMPAIGN', 'SITE'].includes(targetType) || !name) {
    throw new Error('INVALID_CAMPAIGN');
  }
  const row = {
    provider,
    target_type: targetType,
    target_id: clean(body?.targetId, 80) || null,
    name,
    objective: clean(body?.objective, 40) || 'TRAFFIC',
    status: 'DRAFT',
    daily_budget: Number(body?.dailyBudget || 0) || null,
    total_budget: Number(body?.totalBudget || 0) || null,
    currency: clean(body?.currency, 10) || 'TRY',
    starts_at: clean(body?.startsAt, 64) || null,
    ends_at: clean(body?.endsAt, 64) || null,
    audience: body?.audience && typeof body.audience === 'object' ? body.audience : {},
    creative: body?.creative && typeof body.creative === 'object' ? body.creative : {},
    created_by: admin.id,
  };
  const id = clean(body?.id, 80);
  const response = id
    ? await db(`marketing_campaigns?id=eq.${encodeURIComponent(id)}&status=in.(DRAFT,READY,ERROR)`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
      })
    : await db('marketing_campaigns?select=*', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
      });
  if (!response.ok) throw new Error('CAMPAIGN_SAVE_FAILED');
  const saved = (await response.json())?.[0];
  await db('marketing_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      marketing_campaign_id: saved?.id,
      provider,
      action: id ? 'UPDATED' : 'CREATED',
      actor_user_id: admin.id,
      detail: { name },
    }),
  });
  return json({ ok: true, campaign: saved }, id ? 200 : 201);
}

async function googleAccessToken() {
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: Deno.env.get('GOOGLE_ADS_CLIENT_ID') || '',
    client_secret: Deno.env.get('GOOGLE_ADS_CLIENT_SECRET') || '',
    refresh_token: Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN') || '',
  });
  const response = await fetch('https://www.googleapis.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error('GOOGLE_OAUTH_FAILED');
  return String(data.access_token);
}

function googleCustomer() {
  return (Deno.env.get('GOOGLE_ADS_CUSTOMER_ID') || '').replace(/-/g, '');
}

async function googlePost(path: string, body: unknown) {
  const token = await googleAccessToken();
  const customer = googleCustomer();
  const login = (Deno.env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || '').replace(/-/g, '');
  const response = await fetch(`https://googleads.googleapis.com/v25/customers/${customer}/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') || '',
      'content-type': 'application/json',
      ...(login ? { 'login-customer-id': login } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Google Ads', response.status, data);
    throw new Error('GOOGLE_ADS_PUBLISH_FAILED');
  }
  return data;
}

function requireHttpsUrl(value: unknown, code: string) {
  const raw = clean(value, 1800);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error(code);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '127.0.0.1' || host === '::1') throw new Error(code);
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) throw new Error(code);
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) throw new Error(code);
    return url.toString();
  } catch {
    throw new Error(code);
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function fetchGoogleImage(urlValue: unknown, code: string) {
  const url = requireHttpsUrl(urlValue, code);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(code);
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(type)) throw new Error(code);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 5_120_000) throw new Error(code);
  return bytesToBase64(bytes);
}

async function googleCreateTextAssets(texts: string[]) {
  const operations = texts.map((text) => ({ create: { textAsset: { text } } }));
  const data = await googlePost('assets:mutate', { operations });
  const names = (data?.results || []).map((result: any) => clean(result?.resourceName, 180)).filter(Boolean);
  if (names.length !== texts.length) throw new Error('GOOGLE_ASSET_CREATE_FAILED');
  return names;
}

async function googleCreateImageAssets(items: { url: unknown; name: string; code: string }[]) {
  const operations = [];
  for (const item of items) {
    const data = await fetchGoogleImage(item.url, item.code);
    operations.push({ create: { name: item.name.slice(0, 120), imageAsset: { data } } });
  }
  const result = await googlePost('assets:mutate', { operations });
  const names = (result?.results || []).map((row: any) => clean(row?.resourceName, 180)).filter(Boolean);
  if (names.length !== items.length) throw new Error('GOOGLE_ASSET_CREATE_FAILED');
  return names;
}

async function publishGoogle(campaignRecord: any): Promise<GooglePublishResult> {
  if (!googleReady()) throw new Error('GOOGLE_ADS_NOT_CONFIGURED');
  const creative = campaignRecord.creative || {};
  const landing = requireHttpsUrl(creative.landingUrl, 'GOOGLE_CREATIVE_INCOMPLETE');
  const headlines = [
    clean(creative.headline, 30),
    clean(creative.headline2, 30),
    clean(creative.headline3, 30),
  ];
  const longHeadline = clean(creative.longHeadline, 90);
  const descriptions = [clean(creative.description, 90), clean(creative.description2, 90)];
  const businessName = clean(creative.businessName || 'Alperler Rent A Car', 25);
  if (headlines.some((x) => !x) || !longHeadline || descriptions.some((x) => !x) || !businessName) {
    throw new Error('GOOGLE_PMAX_ASSETS_INCOMPLETE');
  }
  const budgetMicros = Math.round(Number(campaignRecord.daily_budget || 0) * 1_000_000);
  if (budgetMicros <= 0) throw new Error('BUDGET_REQUIRED');

  const textValues = [...headlines, longHeadline, ...descriptions, businessName];
  const textAssets = await googleCreateTextAssets(textValues);
  const [landscapeAsset, squareAsset, logoAsset] = await googleCreateImageAssets([
    { url: creative.landscapeImageUrl, name: `${campaignRecord.name} Landscape`, code: 'GOOGLE_LANDSCAPE_IMAGE_INVALID' },
    { url: creative.squareImageUrl, name: `${campaignRecord.name} Square`, code: 'GOOGLE_SQUARE_IMAGE_INVALID' },
    { url: creative.logoUrl, name: `${campaignRecord.name} Logo`, code: 'GOOGLE_LOGO_INVALID' },
  ]);

  const budget = await googlePost('campaignBudgets:mutate', {
    operations: [{ create: {
      name: `${campaignRecord.name} Budget ${campaignRecord.id.slice(0, 6)}`,
      amountMicros: String(budgetMicros),
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    } }],
  });
  const budgetResource = clean(budget?.results?.[0]?.resourceName, 180);
  if (!budgetResource) throw new Error('GOOGLE_BUDGET_FAILED');

  const campaign = await googlePost('campaigns:mutate', {
    operations: [{ create: {
      name: campaignRecord.name,
      status: 'PAUSED',
      advertisingChannelType: 'PERFORMANCE_MAX',
      campaignBudget: budgetResource,
      maximizeConversions: {},
      brandGuidelinesEnabled: false,
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
    } }],
  });
  const campaignResource = clean(campaign?.results?.[0]?.resourceName, 180);
  if (!campaignResource) throw new Error('GOOGLE_CAMPAIGN_FAILED');

  const customer = googleCustomer();
  const assetGroupTemporary = `customers/${customer}/assetGroups/-1`;
  const links = [
    [textAssets[0], 'HEADLINE'], [textAssets[1], 'HEADLINE'], [textAssets[2], 'HEADLINE'],
    [textAssets[3], 'LONG_HEADLINE'],
    [textAssets[4], 'DESCRIPTION'], [textAssets[5], 'DESCRIPTION'],
    [landscapeAsset, 'MARKETING_IMAGE'], [squareAsset, 'SQUARE_MARKETING_IMAGE'],
    [textAssets[6], 'BUSINESS_NAME'], [logoAsset, 'LOGO'],
  ];
  const mutateOperations: any[] = [{
    assetGroupOperation: { create: {
      resourceName: assetGroupTemporary,
      name: `${campaignRecord.name} Asset Group`,
      campaign: campaignResource,
      finalUrls: [landing],
    } },
  }];
  for (const [asset, fieldType] of links) {
    mutateOperations.push({
      assetGroupAssetOperation: { create: { assetGroup: assetGroupTemporary, asset, fieldType } },
    });
  }
  const groupResult = await googlePost('googleAds:mutate', { mutateOperations });
  const groupResponse = (groupResult?.mutateOperationResponses || []).find((row: any) => row?.assetGroupResult?.resourceName);
  const assetGroupResource = clean(groupResponse?.assetGroupResult?.resourceName, 180) || assetGroupTemporary;

  return {
    campaignResource,
    assetGroupResource,
    channels: ['Search', 'YouTube', 'Display', 'Discover', 'Gmail', 'Maps'],
  };
}

async function metaCall(path: string, params: Record<string, string>) {
  const version = Deno.env.get('META_GRAPH_VERSION') || '';
  const token = Deno.env.get('META_ADS_ACCESS_TOKEN') || '';
  const body = new URLSearchParams({ ...params, access_token: token });
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    console.error('Meta Ads', response.status, data);
    throw new Error('META_ADS_PUBLISH_FAILED');
  }
  return data;
}

async function publishMeta(campaignRecord: any): Promise<MetaPublishResult> {
  if (!metaReady()) throw new Error('META_ADS_NOT_CONFIGURED');
  const account = (Deno.env.get('META_AD_ACCOUNT_ID') || '').replace(/^act_/, '');
  const page = Deno.env.get('META_PAGE_ID') || '';
  const creativeData = campaignRecord.creative || {};
  const landing = requireHttpsUrl(creativeData.landingUrl, 'META_CREATIVE_INCOMPLETE');
  const headline = clean(creativeData.headline, 255);
  const message = clean(creativeData.primaryText, 1000);
  const description = clean(creativeData.description, 255);
  const imageUrl = clean(creativeData.imageUrl, 1800);
  if (!headline || !message) throw new Error('META_CREATIVE_INCOMPLETE');

  const campaign = await metaCall(`act_${account}/campaigns`, {
    name: campaignRecord.name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: '[]',
  });
  const targeting = campaignRecord.audience?.metaTargeting && typeof campaignRecord.audience.metaTargeting === 'object'
    ? campaignRecord.audience.metaTargeting
    : { geo_locations: { countries: ['TR'] } };
  if (targeting && typeof targeting === 'object') {
    delete targeting.publisher_platforms;
    delete targeting.facebook_positions;
    delete targeting.instagram_positions;
    delete targeting.messenger_positions;
    delete targeting.device_platforms;
  }
  const daily = Math.round(Number(campaignRecord.daily_budget || 0) * 100);
  if (daily <= 0) throw new Error('BUDGET_REQUIRED');

  const adSet = await metaCall(`act_${account}/adsets`, {
    name: `${campaignRecord.name} Hedef`,
    campaign_id: String(campaign.id),
    daily_budget: String(daily),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: JSON.stringify(targeting),
    status: 'PAUSED',
  });
  const linkData: Record<string, unknown> = {
    link: landing,
    message,
    name: headline,
    description,
    call_to_action: { type: 'LEARN_MORE', value: { link: landing } },
  };
  if (imageUrl) linkData.picture = requireHttpsUrl(imageUrl, 'META_IMAGE_INVALID');
  const creative = await metaCall(`act_${account}/adcreatives`, {
    name: `${campaignRecord.name} Kreatif`,
    object_story_spec: JSON.stringify({ page_id: page, link_data: linkData }),
  });
  const ad = await metaCall(`act_${account}/ads`, {
    name: campaignRecord.name,
    adset_id: String(adSet.id),
    creative: JSON.stringify({ creative_id: String(creative.id) }),
    status: 'PAUSED',
  });
  return {
    campaignId: String(campaign.id),
    adSetId: String(adSet.id),
    adId: String(ad.id),
    placementMode: 'AUTOMATIC',
  };
}

async function publish(body: any, admin: any) {
  const id = clean(body?.id, 80);
  if (!id) throw new Error('ID_REQUIRED');
  const readResponse = await db(`marketing_campaigns?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  if (!readResponse.ok) throw new Error('CAMPAIGN_READ_FAILED');
  const campaignRecord = (await readResponse.json())?.[0];
  if (!campaignRecord) throw new Error('CAMPAIGN_NOT_FOUND');
  await db(`marketing_campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'PUBLISHING', last_error: null }),
  });

  try {
    let result: GooglePublishResult | MetaPublishResult;
    let patch: Record<string, unknown>;
    if (campaignRecord.provider === 'GOOGLE_ADS') {
      const googleResult = await publishGoogle(campaignRecord);
      result = googleResult;
      patch = {
        status: 'READY',
        external_campaign_id: googleResult.campaignResource,
        external_ad_group_id: googleResult.assetGroupResource,
        external_ad_id: null,
        last_sync_at: new Date().toISOString(),
      };
    } else if (campaignRecord.provider === 'META_ADS') {
      const metaResult = await publishMeta(campaignRecord);
      result = metaResult;
      patch = {
        status: 'READY',
        external_campaign_id: metaResult.campaignId,
        external_ad_group_id: metaResult.adSetId,
        external_ad_id: metaResult.adId,
        last_sync_at: new Date().toISOString(),
      };
    } else {
      throw new Error('INVALID_PROVIDER');
    }
    await db(`marketing_campaigns?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch),
    });
    await db('marketing_audit_events', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        marketing_campaign_id: id,
        provider: campaignRecord.provider,
        action: 'PUBLISHED_PAUSED',
        actor_user_id: admin.id,
        detail: result,
      }),
    });
    return json({ ok: true, status: 'READY', note: 'Provider campaign created in PAUSED state for review.', result });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PUBLISH_FAILED';
    await db(`marketing_campaigns?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'ERROR', last_error: code }),
    });
    throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (!SUPABASE_URL || !SERVICE) return json({ ok: false, code: 'SERVER_CONFIG_MISSING' }, 503);
  try {
    if (request.method === 'GET') return await list(request);
    if (request.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
    const admin = await requireAdmin(request);
    let body: any;
    try { body = await request.json(); } catch { return json({ ok: false, code: 'INVALID_JSON' }, 400); }
    const action = clean(body?.action, 40);
    if (action === 'save_campaign') return await save(body, admin);
    if (action === 'publish') return await publish(body, admin);
    return json({ ok: false, code: 'UNKNOWN_ACTION' }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'MARKETING_FAILED';
    const status = code === 'UNAUTHORIZED' ? 401
      : code === 'FORBIDDEN' ? 403
      : code.endsWith('_NOT_CONFIGURED') ? 503
      : code.startsWith('INVALID_') || code.endsWith('_REQUIRED') || code.endsWith('_INCOMPLETE') || code.endsWith('_INVALID') ? 400
      : 500;
    console.error('marketing-admin', code);
    return json({ ok: false, code }, status);
  }
});
