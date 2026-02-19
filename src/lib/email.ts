/**
 * Envío de emails.
 * - Mail Relay (SMTP local): MAIL_RELAY_HOST (para desarrollo con MailDev, etc.)
 * - ZeptoMail: ZOHO_ZEPTOMAIL_SEND_TOKEN (producción)
 * - Fallback: solo log en consola
 */

import nodemailer from "nodemailer";

const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
}

async function sendViaMailRelay(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  const host = process.env.MAIL_RELAY_HOST;
  const port = parseInt(process.env.MAIL_RELAY_PORT || "1025", 10);
  const secure = process.env.MAIL_RELAY_SECURE === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.MAIL_RELAY_USER && process.env.MAIL_RELAY_PASS
        ? {
            user: process.env.MAIL_RELAY_USER,
            pass: process.env.MAIL_RELAY_PASS,
          }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: `"${process.env.MAIL_RELAY_FROM_NAME || "Mi Premio"}" <${process.env.MAIL_RELAY_FROM || "noreply@local.dev"}>`,
      to,
      subject,
      html: htmlBody,
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al enviar por SMTP",
    };
  }
}

export async function sendLoginCodeEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const subject = "Tu código de verificación - Mi Premio";
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #417D30;">Tu código de verificación</h2>
      <p>Ingresa el siguiente código para iniciar sesión:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #417D30;">${code}</p>
      <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
      <p style="color: #666; font-size: 14px;">Si no solicitaste este código, puedes ignorar este correo.</p>
    </div>
  `;

  // 1. Mail Relay (local) - prioridad para desarrollo
  if (process.env.MAIL_RELAY_HOST) {
    return sendViaMailRelay(to, subject, htmlBody);
  }

  // 2. ZeptoMail (producción)
  const zeptoToken = process.env.ZOHO_ZEPTOMAIL_SEND_TOKEN;
  if (zeptoToken) {
    try {
      const response = await fetch(ZEPTOMAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Zoho-enczapikey ${zeptoToken}`,
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
        const err = await response.text();
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al enviar email",
      };
    }
  }

  // 3. Fallback: solo log
  console.log("[DEV] Código de login para", to, ":", code);
  return { success: true };
}
