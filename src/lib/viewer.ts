/**
 * Quién está mirando el área de afiliados.
 *
 * Hay dos formas de estar ahí:
 *
 * 1. **Sesión de afiliado** — la persona entró con su código. Puede leer y
 *    escribir (redimir, cambiar su avatar).
 * 2. **Previsualización** — un administrador está viendo el sitio como ese
 *    afiliado desde el panel. Puede leer y **nada más**.
 *
 * La separación se hace con dos funciones distintas a propósito:
 *
 * - `getViewer()` resuelve ambas. La usan las rutas de **lectura**.
 * - `getWritableUser()` solo entiende la sesión real. La usan las rutas de
 *   **escritura**.
 *
 * Que sean funciones separadas es la garantía: una ruta de escritura no puede
 * recibir una identidad de previsualización ni por descuido, porque la función
 * que llama nunca la devuelve. No depende de acordarse de comprobar un flag.
 */

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  PREVIEW_COOKIE,
  verifySessionToken,
  verifyPreviewToken,
  type SessionUser,
} from "@/lib/session";

export interface Viewer extends SessionUser {
  /** true si es una previsualización: la vista es de solo lectura */
  isPreview: boolean;
  /** Correo del administrador que la inició (solo en previsualización) */
  previewedBy?: string;
}

/**
 * Identidad para **lectura**: sesión real o previsualización.
 * La sesión real tiene prioridad, para que un administrador que además es
 * afiliado siga viendo lo suyo si no ha iniciado ninguna previsualización.
 */
export async function getViewer(): Promise<Viewer | null> {
  const cookieStore = await cookies();

  const user = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (user) return { ...user, isPreview: false };

  const preview = await verifyPreviewToken(
    cookieStore.get(PREVIEW_COOKIE)?.value
  );
  if (preview) {
    return {
      email: preview.email,
      fullName: preview.fullName,
      contactId: preview.contactId,
      isPreview: true,
      previewedBy: preview.adminEmail,
    };
  }

  return null;
}

/**
 * Identidad para **escritura**. Solo devuelve la sesión real de afiliado:
 * una previsualización nunca pasa de aquí.
 */
export async function getWritableUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Mensaje único para cuando una previsualización intenta escribir. */
export const PREVIEW_WRITE_ERROR =
  "Estás en modo previsualización: solo puedes consultar, no realizar acciones en nombre del afiliado.";
