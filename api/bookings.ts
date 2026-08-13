function unavailable(): Response {
  return Response.json(
    {
      ok: false,
      code: "BOOKING_BACKEND_NOT_CONFIGURED",
      message: "Kalıcı rezervasyon veri kaynağı henüz yapılandırılmadı.",
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

export default {
  async fetch(_request: Request): Promise<Response> {
    // This endpoint is the single booking persistence boundary.
    // It intentionally fails closed until the real Supabase backend is active.
    // Never fall back to the legacy AI Studio Firebase client configuration.
    return unavailable();
  },
};
