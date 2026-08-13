import { getMailerConfig, sendConfiguredMail } from "./_lib/mailer";

interface ContactPayload {
  name?: unknown;
  surname?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    let payload: ContactPayload;
    try {
      payload = (await request.json()) as ContactPayload;
    } catch {
      return Response.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
    }

    const name = text(payload.name, 80);
    const surname = text(payload.surname, 80);
    const phone = text(payload.phone, 40);
    const email = text(payload.email, 160).toLowerCase();
    const message = text(payload.message, 4000);

    if (!name || !surname || !message) {
      return Response.json({ ok: false, code: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }
    if (!/^[+0-9()\s-]{7,24}$/.test(phone)) {
      return Response.json({ ok: false, code: "INVALID_PHONE" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ ok: false, code: "INVALID_EMAIL" }, { status: 400 });
    }

    const mail = getMailerConfig();
    if (!mail.configured) {
      return Response.json(
        {
          ok: false,
          code: "CONTACT_DELIVERY_NOT_CONFIGURED",
          message: "İletişim e-posta servisi henüz yapılandırılmamış.",
        },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    const fullName = `${name} ${surname}`.trim();
    const adminText = [
      "Yeni web iletişim mesajı",
      `Ad Soyad: ${fullName}`,
      `Telefon: ${phone}`,
      `E-posta: ${email}`,
      "",
      message,
    ].join("\n");

    try {
      await sendConfiguredMail({
        to: mail.adminTo,
        subject: `Yeni İletişim Mesajı - ${fullName}`,
        text: adminText,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>Yeni iletişim mesajı</h2><p><strong>Ad Soyad:</strong> ${escapeHtml(fullName)}</p><p><strong>Telefon:</strong> ${escapeHtml(phone)}</p><p><strong>E-posta:</strong> ${escapeHtml(email)}</p><hr><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p></div>`,
      });

      await sendConfiguredMail({
        to: email,
        subject: "Mesajınız Alındı - Alperler Auto",
        text: `Sayın ${fullName},\n\nMesajınız tarafımıza ulaştı. Ekibimiz en kısa sürede sizinle iletişime geçecektir.\n\nAlperler Auto`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>Mesajınız alındı</h2><p>Sayın ${escapeHtml(fullName)},</p><p>Mesajınız tarafımıza ulaştı. Ekibimiz en kısa sürede sizinle iletişime geçecektir.</p><p><strong>Alperler Auto</strong></p></div>`,
      });

      return Response.json(
        { ok: true, status: "sent" },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      console.error("Contact delivery failed.", error);
      return Response.json(
        { ok: false, code: "CONTACT_DELIVERY_FAILED" },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
  },
};
