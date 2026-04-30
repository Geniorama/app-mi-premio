/**
 * Envío de emails vía ZeptoMail (Zoho).
 * Fallback: log en consola si no hay token configurado.
 * Para EU: ZOHO_ZEPTOMAIL_EU=true (usa api.zeptomail.eu)
 */

const ZEPTOMAIL_URL =
  process.env.ZOHO_ZEPTOMAIL_EU === "true"
    ? "https://api.zeptomail.eu/v1.1/email"
    : "https://api.zeptomail.com/v1.1/email";

export async function sendLoginCodeEmail(
  to: string,
  code: string,
  options?: { baseUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  const subject = "Tu código de verificación - Mi Premio";
  const appUrl = (
    options?.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://mipremio.com.co"
  ).replace(/\/$/, "");
  const miPremioLogo = `${appUrl}/logo-mi-premio.svg`;
  const partnerLogo =
    "https://media.licdn.com/dms/image/v2/C4D0BAQHJaCxl6amgNw/company-logo_200_200/company-logo_200_200/0/1674594799365?e=2147483647&v=beta&t=t8qXZDeLmZGAPG1_Xt9LMFvrURUfd3tnktwxQsIMgto";
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-bottom: 1px solid #eee;">
        <tr>
          <td align="center" style="padding: 16px 0;">
            <img src="${miPremioLogo}" alt="Mi Premio" width="64" height="64" style="display:inline-block; height:64px; width:auto; vertical-align: middle; margin: 0 12px;" />
            <img src="${partnerLogo}" alt="Partner" width="84" height="84" style="display:inline-block; height:84px; width:auto; vertical-align: middle; margin: 0 12px;" />
          </td>
        </tr>
      </table>
      <h2 style="color: #417D30;">Tu código de verificación</h2>
      <p>Ingresa el siguiente código para iniciar sesión:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #417D30;">${code}</p>
      <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
      <p style="color: #666; font-size: 14px;">Si no solicitaste este código, puedes ignorar este correo.</p>
    </div>
  `;

  const zeptoToken = (process.env.ZOHO_ZEPTOMAIL_SEND_TOKEN || "").trim();

  if (zeptoToken) {
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
          to: [{ email_address: { address: to, name: to } }],
          subject,
          htmlbody: htmlBody,
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
        console.error("[ZeptoMail] Error:", response.status, JSON.stringify(errParsed, null, 2));
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

  console.log("[DEV] Código de login para", to, ":", code);
  return { success: true };
}
