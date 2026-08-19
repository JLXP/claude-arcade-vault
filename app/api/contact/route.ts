import { Resend } from "resend";

const LIMITS = { name: 80, email: 160, msg: 4000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Remitente sandbox de Resend: no requiere dominio verificado, pero solo entrega
// a la dirección dueña de la cuenta (ver .env.example).
const FROM = "Arcade Vault <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición no es JSON válido.");
  }

  const { name, email, msg } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || typeof email !== "string" || typeof msg !== "string") {
    return badRequest("Faltan campos: name, email y msg son obligatorios.");
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMsg = msg.trim();

  if (!cleanName || !cleanEmail || !cleanMsg) {
    return badRequest("Completa los tres campos antes de enviar.");
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return badRequest("El correo no tiene un formato válido.");
  }
  if (cleanName.length > LIMITS.name) {
    return badRequest(`El nombre no puede pasar de ${LIMITS.name} caracteres.`);
  }
  if (cleanEmail.length > LIMITS.email) {
    return badRequest(`El correo no puede pasar de ${LIMITS.email} caracteres.`);
  }
  if (cleanMsg.length > LIMITS.msg) {
    return badRequest(`El mensaje no puede pasar de ${LIMITS.msg} caracteres.`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !to) {
    console.error(
      "[/api/contact] Falta configuración: RESEND_API_KEY y/o CONTACT_TO_EMAIL no están definidas."
    );
    return Response.json(
      { error: "El servicio de correo no está configurado." },
      { status: 500 }
    );
  }

  const html = `
    <div style="font-family: monospace; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Nuevo mensaje desde Arcade Vault</h2>
      <p style="margin: 0 0 4px;"><strong>Nombre:</strong> ${escapeHtml(cleanName)}</p>
      <p style="margin: 0 0 16px;"><strong>Correo:</strong> ${escapeHtml(cleanEmail)}</p>
      <p style="margin: 0 0 4px;"><strong>Mensaje:</strong></p>
      <div style="white-space: pre-wrap; padding: 12px; background: #f4f4f7; border-left: 3px solid #ff006e;">${escapeHtml(cleanMsg)}</div>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: cleanEmail,
      subject: `Arcade Vault — mensaje de ${cleanName}`,
      html,
    });

    if (error) {
      console.error("[/api/contact] Resend devolvió un error:", error);
      return Response.json(
        { error: "No se pudo enviar el mensaje. Inténtalo de nuevo." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/contact] Fallo inesperado al enviar el correo:", err);
    return Response.json(
      { error: "No se pudo enviar el mensaje. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
