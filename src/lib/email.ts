/**
 * Envío de emails vía ZeptoMail (Zoho).
 * Fallback: log en consola si no hay token configurado.
 * Para EU: ZOHO_ZEPTOMAIL_EU=true (usa api.zeptomail.eu)
 */

const ZEPTOMAIL_URL =
  process.env.ZOHO_ZEPTOMAIL_EU === "true"
    ? "https://api.zeptomail.eu/v1.1/email"
    : "https://api.zeptomail.com/v1.1/email";

const ADMIN_EMAIL =
  process.env.MI_PREMIO_ADMIN_EMAIL || "mipremio@germanmoraleshoteles.com";

const PARTNER_LOGO =
  "https://media.licdn.com/dms/image/v2/C4D0BAQHJaCxl6amgNw/company-logo_200_200/company-logo_200_200/0/1674594799365?e=2147483647&v=beta&t=t8qXZDeLmZGAPG1_Xt9LMFvrURUfd3tnktwxQsIMgto";

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

function resolveAppUrl(baseUrl?: string): string {
  return (
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://mipremio.com.co"
  ).replace(/\/$/, "");
}

function buildEmailHeader(appUrl: string): string {
  const miPremioLogo = `${appUrl}/logo-mi-premio.png`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-bottom: 1px solid #eee;">
      <tr>
        <td align="center" style="padding: 16px 0;">
          <img src="${miPremioLogo}" alt="Mi Premio" width="64" height="64" style="display:inline-block; height:64px; width:auto; vertical-align: middle; margin: 0 12px;" />
          <img src="${PARTNER_LOGO}" alt="Partner" width="84" height="84" style="display:inline-block; height:84px; width:auto; vertical-align: middle; margin: 0 12px;" />
        </td>
      </tr>
    </table>
  `;
}

async function sendZeptoEmail({
  to,
  toName,
  subject,
  htmlBody,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  const zeptoToken = (process.env.ZOHO_ZEPTOMAIL_SEND_TOKEN || "").trim();

  if (!zeptoToken) {
    console.log(`[DEV] Email no enviado (sin token) a ${to}: ${subject}`);
    return { success: true };
  }

  const authHeader = zeptoToken.startsWith("Zoho-enczapikey ")
    ? zeptoToken
    : `Zoho-enczapikey ${zeptoToken}`;

  try {
    const response = await fetch(ZEPTOMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        from: {
          address: process.env.ZOHO_EMAIL_FROM || "noreply@tu-dominio.com",
          name: process.env.ZOHO_EMAIL_FROM_NAME || "Mi Premio",
        },
        to: [{ email_address: { address: to, name: toName || to } }],
        subject,
        htmlbody: htmlBody,
        ...(replyTo
          ? { reply_to: [{ address: replyTo, name: "Mi Premio" }] }
          : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errParsed: unknown;
      try {
        errParsed = errText ? JSON.parse(errText) : null;
      } catch {
        errParsed = errText;
      }
      console.error(
        "[ZeptoMail] Error:",
        response.status,
        JSON.stringify(errParsed, null, 2)
      );
      const errMsg =
        typeof errParsed === "object" &&
        errParsed !== null &&
        "message" in errParsed
          ? String((errParsed as { message?: string }).message)
          : errText || `ZeptoMail error ${response.status}`;
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar email";
    console.error("[ZeptoMail] Excepción:", msg, e);
    return { success: false, error: msg };
  }
}

export async function sendLoginCodeEmail(
  to: string,
  code: string,
  options?: { baseUrl?: string }
): Promise<SendEmailResult> {
  const subject = "Tu código de verificación - Mi Premio";
  const appUrl = resolveAppUrl(options?.baseUrl);
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; text-align: center;">
      ${buildEmailHeader(appUrl)}
      <h2 style="color: #417D30;">Tu código de verificación</h2>
      <p>Ingresa el siguiente código para iniciar sesión:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #417D30;">${code}</p>
      <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
      <p style="color: #666; font-size: 14px;">Si no solicitaste este código, puedes ignorar este correo.</p>
    </div>
  `;

  const result = await sendZeptoEmail({ to, subject, htmlBody });
  if (!process.env.ZOHO_ZEPTOMAIL_SEND_TOKEN) {
    console.log("[DEV] Código de login para", to, ":", code);
  }
  return result;
}

interface RedemptionUserEmailParams {
  to: string;
  fullName: string;
  voucherTitle: string;
  points: number;
  baseUrl?: string;
}

export async function sendRedemptionUserEmail({
  to,
  fullName,
  voucherTitle,
  points,
  baseUrl,
}: RedemptionUserEmailParams): Promise<SendEmailResult> {
  const subject = "Tu recompensa está en camino - Mi Premio";
  const appUrl = resolveAppUrl(baseUrl);
  const formattedPoints = points.toLocaleString("es-CO");
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
      ${buildEmailHeader(appUrl)}
      <p>Hola, <strong>${fullName}</strong></p>
      <p>Es un gusto saludarte. Hemos recibido tu solicitud de redención en Mi Premio y queremos confirmarte que el proceso ha comenzado con éxito.</p>

      <h3 style="color: #417D30; margin-top: 24px;">Detalles de tu redención</h3>
      <table role="presentation" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin: 8px 0 16px 0;">
        <tr>
          <td style="color: #666;">Bono solicitado:</td>
          <td><strong>${voucherTitle}</strong></td>
        </tr>
        <tr>
          <td style="color: #666;">Puntos utilizados:</td>
          <td><strong>${formattedPoints}</strong></td>
        </tr>
      </table>

      <p>Estamos trabajando para que disfrutes de tu beneficio lo antes posible. Recibirás un segundo correo electrónico con tu bono digital en un plazo máximo de <strong>10 días hábiles</strong>.</p>

      <p style="background: #f6faf3; border-left: 4px solid #417D30; padding: 12px 16px; margin: 24px 0;">
        <strong>Recomendación importante:</strong><br />
        Debido a actualizaciones en nuestros sistemas de seguridad, te sugerimos revisar tu bandeja de Correo No Deseado o Spam. Para asegurar que nuestras futuras comunicaciones lleguen directamente a tu bandeja de entrada, por favor agréganos a tu lista de contactos seguros.
      </p>

      <p>Feliz día.</p>
      <p style="margin-top: 24px;">
        Atentamente,<br />
        <strong>El Equipo de Mi Premio</strong><br />
        Germán Morales Hoteles<br />
        <a href="${appUrl}" style="color: #417D30;">${appUrl}</a>
      </p>
    </div>
  `;

  return sendZeptoEmail({
    to,
    toName: fullName,
    subject,
    htmlBody,
  });
}

interface RedemptionAdminEmailParams {
  userFullName: string;
  userEmail: string;
  segment?: string | null;
  voucherTitle: string;
  points: number;
  requestDate?: Date;
  baseUrl?: string;
}

export async function sendRedemptionAdminEmail({
  userFullName,
  userEmail,
  segment,
  voucherTitle,
  points,
  requestDate,
  baseUrl,
}: RedemptionAdminEmailParams): Promise<SendEmailResult> {
  const subject = `ALERTA: Nueva redención de puntos - ${userFullName}`;
  const appUrl = resolveAppUrl(baseUrl);
  const formattedPoints = points.toLocaleString("es-CO");
  const fecha = (requestDate ?? new Date()).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });
  const segmentDisplay = segment?.trim() ? segment : "No especificado";

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      ${buildEmailHeader(appUrl)}
      <h2 style="color: #417D30;">Notificación de Gestión Mi Premio</h2>
      <p>Se ha registrado una nueva redención en la plataforma que requiere tu atención para el envío del beneficio.</p>

      <h3 style="color: #417D30; margin-top: 24px;">Información del Usuario</h3>
      <table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="color: #666;">Nombre:</td><td><strong>${userFullName}</strong></td></tr>
        <tr><td style="color: #666;">Empresa/Segmento:</td><td>${segmentDisplay}</td></tr>
        <tr><td style="color: #666;">Correo electrónico:</td><td><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
      </table>

      <h3 style="color: #417D30; margin-top: 24px;">Información de la Redención</h3>
      <table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="color: #666;">Premio:</td><td><strong>${voucherTitle}</strong></td></tr>
        <tr><td style="color: #666;">Puntos redimidos:</td><td><strong>${formattedPoints}</strong></td></tr>
        <tr><td style="color: #666;">Fecha de solicitud:</td><td>${fecha}</td></tr>
      </table>

      <p style="background: #fff8e6; border-left: 4px solid #d4a017; padding: 12px 16px; margin: 24px 0;">
        <strong>Compromiso de entrega:</strong> De acuerdo con nuestra promesa de valor y los lineamientos de automatización de 2026, este bono debe ser enviado al afiliado en un plazo máximo de <strong>10 días</strong>.
      </p>

      <p>Por favor, confirma una vez el envío haya sido procesado desde el correo oficial del programa.</p>
    </div>
  `;

  return sendZeptoEmail({
    to: ADMIN_EMAIL,
    toName: "Mi Premio - Admin",
    subject,
    htmlBody,
    replyTo: userEmail,
  });
}
