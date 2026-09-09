/**
 * Utilidades de periodos mensuales para los informes.
 *
 * Los meses se manejan como `AAAA-MM` en texto: es lo que ya devuelven las
 * fechas ISO de Zoho recortadas, ordena alfabéticamente igual que
 * cronológicamente y evita zonas horarias en el agrupado.
 */

/** `AAAA-MM` de una fecha ISO (vacío si no hay fecha). */
export function monthOf(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 7) : "";
}

/** Los últimos `count` meses en `AAAA-MM`, del más antiguo al más reciente. */
export function lastMonths(count = 12): string[] {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(cursor);
    date.setMonth(cursor.getMonth() - i);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return months;
}
