/**
 * Se ejecuta una vez por proceso de servidor, antes de atender la primera
 * petición. Next lo llama solo; no hay que importarlo desde ningún sitio.
 *
 * Aquí solo arranca el precalentado de la caché de informes.
 */
export async function register(): Promise<void> {
  // El mismo módulo se carga también en el runtime Edge (middleware), donde no
  // hay temporizadores largos ni sentido en precalentar.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startReportsWarmup } = await import("@/lib/reports-warmup");
  startReportsWarmup();
}
