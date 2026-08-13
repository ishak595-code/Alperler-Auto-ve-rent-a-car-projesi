export interface WebhookConfig {
  enabled: boolean;
  configured: boolean;
  url: string | null;
  secret: string | null;
}

function parseWebhookUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getWebhookConfig(): WebhookConfig {
  const enabled = process.env.WEBHOOK_ENABLED?.trim().toLowerCase() === "true";
  const url = parseWebhookUrl(process.env.WEBHOOK_URL);
  const secret = process.env.WEBHOOK_SECRET?.trim() || null;
  return {
    enabled,
    configured: enabled && Boolean(url && secret),
    url,
    secret,
  };
}
