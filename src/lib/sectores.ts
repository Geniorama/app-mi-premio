/**
 * Sector del afiliado, deducido del nombre de su empresa.
 *
 * Regla del negocio: si el nombre de la empresa menciona "agencia", el
 * afiliado es de una **agencia**; en cualquier otro caso, **corporativo**.
 *
 * No hay ningún campo en Zoho que dé el sector: `Tipo_Afiliado` distingue
 * usuario único / múltiple / grupo empresarial, `Tipo_de_Contatco` es el rol
 * en la cuenta (GDR, decisor, facturación) y `rea_a_la_que_Pertenece` es el
 * departamento de la persona. Ninguno habla del negocio de la empresa, así que
 * el nombre es lo único que hay.
 *
 * **La comparación ignora mayúsculas y acentos, y es deliberado.** Los nombres
 * de empresa del CRM están escritos en mayúsculas ("AGENCIA DE VIAJES Y
 * TURISMO AVIATUR S.A.S"), de modo que buscar la palabra tal cual —con la A
 * mayúscula y el resto en minúsculas— no encontraría ni una sola. Comprobado
 * contra el CRM: 0 coincidencias distinguiendo mayúsculas, 6 empresas
 * ignorándolas.
 *
 * Dos límites conocidos de la regla, que conviene recordar antes de sacar
 * conclusiones de una cifra por sector:
 *
 * 1. **Deja fuera agencias que no se llaman "agencia".** En el padrón hay
 *    empresas como "PANAMERICANA DE VIAJES SAS", "DE UNA COLOMBIA TOURS" o
 *    "BUSINESS TRAVEL EXPERIENCE SAS" que la regla clasifica como
 *    corporativas.
 * 2. **Puede colar lo que no es una agencia de viajes.** "AGENCIA COLOCADORA
 *    DE SEGUROS BOYACÁ CASANARE LIMITADA" cuenta como agencia porque la
 *    palabra está en el nombre.
 *
 * Si algún día el CRM incorpora un campo de sector, este módulo es el único
 * sitio que hay que tocar.
 */

export const SECTOR_AGENCIA = "Agencia";
export const SECTOR_CORPORATIVO = "Corporativo";

export type Sector = typeof SECTOR_AGENCIA | typeof SECTOR_CORPORATIVO;

export const SECTORES: Sector[] = [SECTOR_AGENCIA, SECTOR_CORPORATIVO];

/**
 * Marcas diacríticas que `normalize("NFD")` separa de su letra base.
 *
 * Se construye desde una cadena escapada en vez de escribir el rango dentro de
 * una expresión regular literal: así el archivo no lleva caracteres
 * combinantes invisibles, que en un editor parecen un corchete vacío y se
 * pierden en cuanto alguien reindenta o cambia la codificación.
 */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

/** Minúsculas y sin acentos, para que la comparación no dependa de cómo se escribió. */
const normalizar = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();

/**
 * Sector de una empresa por su nombre.
 *
 * Una empresa sin nombre cae en corporativo: es el sector por defecto de la
 * regla, y son casos aislados (1 de 405 contactos del padrón).
 */
export function sectorDeEmpresa(empresa: string | null | undefined): Sector {
  if (!empresa) return SECTOR_CORPORATIVO;
  return normalizar(empresa).includes("agencia")
    ? SECTOR_AGENCIA
    : SECTOR_CORPORATIVO;
}
