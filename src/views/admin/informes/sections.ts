/**
 * Secciones del módulo de Informes.
 *
 * Fuente única de verdad para el submenú de la barra lateral, la validación
 * del slug en la ruta dinámica y el título de cada página. Agregar una
 * sección es añadir una entrada aquí y su componente en `[seccion]/page.tsx`.
 *
 * Sin "use client": lo consumen tanto el layout de servidor como la barra
 * lateral del cliente.
 */

export interface InformeSection {
  slug: string;
  /** Etiqueta corta para el submenú */
  label: string;
  /** Encabezado de la página */
  title: string;
  description: string;
}

export const INFORME_SECTIONS: InformeSection[] = [
  {
    slug: "resumen",
    label: "Resumen",
    title: "Resumen del programa",
    description:
      "Puntos y redenciones en cifras. Datos en vivo de Zoho CRM, enriquecidos con la auditoría de la web.",
  },
  {
    slug: "redenciones",
    label: "Redenciones",
    title: "Redenciones",
    description:
      "Cada canje con su afiliado, bono y estado de entrega. Incluye las creadas directamente en el CRM.",
  },
  {
    slug: "puntos",
    label: "Puntos",
    title: "Puntos cargados, disponibles y vencidos",
    description:
      "El ciclo de vida de los puntos del programa: cuánto se cargó, cuánto sigue vivo, cuánto se canjeó y cuánto caducó sin usarse.",
  },
  {
    slug: "afiliados",
    label: "Afiliados",
    title: "Afiliados y saldos",
    description:
      "Un registro por red de membresía: puntos entregados, redimidos, saldo disponible y vencidos.",
  },
  {
    slug: "comerciales",
    label: "Comerciales",
    title: "Gestión por comercial",
    description:
      "Cada comercial con los afiliados que tiene a cargo: puntos entregados, cuánto se ha redimido y qué saldo queda vivo. El comercial es el propietario del contacto en Zoho.",
  },
  {
    slug: "hoteles",
    label: "Hoteles",
    title: "Estadísticas por hotel",
    description:
      "Puntos emitidos por cada hotel del portafolio, cuánto se ha redimido y qué sigue vivo. El hotel se toma de la orden de compra del lote.",
  },
  {
    slug: "por-vencer",
    label: "Puntos por vencer",
    title: "Puntos por vencer",
    description:
      "Lotes de puntos con saldo vivo, ordenados por cercanía al vencimiento. Clave para la regla FIFO.",
  },
];

export const DEFAULT_SECTION = INFORME_SECTIONS[0];

export const informeSectionHref = (slug: string) => `/admin/informes/${slug}`;

export function findInformeSection(slug: string): InformeSection | undefined {
  return INFORME_SECTIONS.find((section) => section.slug === slug);
}
