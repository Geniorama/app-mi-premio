# Mi Premio

Plataforma web del programa de lealtad **Mi Premio** (Germán Morales Hoteles).

Los afiliados inician sesión con un código enviado por correo, consultan su saldo de puntos y su
historial (datos vivos en **Zoho CRM**), exploran el catálogo de bonos (contenido en **Sanity
CMS**) y solicitan redenciones que se registran en Zoho y se auditan en Sanity.

**Producción:** https://mipremiogermanmoraleshoteles.com

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Sanity CMS ·
Zoho CRM v6 · ZeptoMail

## Puesta en marcha

```bash
npm install
# copiar .env.local con las credenciales (pedir al equipo)
npm run dev   # http://localhost:3000
```

Sin `ZOHO_ZEPTOMAIL_SEND_TOKEN` los correos no se envían: el código de login se imprime en la
consola del servidor, así que se puede iniciar sesión con un correo real del CRM sin enviar nada.

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |

### Variables de entorno

`.env.local` (ignorado por git). Mínimo para arrancar:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_WRITE_TOKEN=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
CRON_SECRET=
```

El listado completo, con defaults y comportamiento cuando faltan, está en
[DOCUMENTACION-TECNICA.md § 8](./DOCUMENTACION-TECNICA.md#8-variables-de-entorno).

## Estructura

```
src/
├── app/          # App Router: páginas (server) y API routes
├── components/   # piezas reutilizables
├── views/        # composición por pantalla (client components)
├── lib/          # integraciones de servidor: zoho, email, session, auth-codes
├── sanity/       # cliente, queries GROQ, tipos, SEO, imágenes
└── middleware.ts # protección de /perfil, /extractos, /gracias
```

## Documentación

**[DOCUMENTACION-TECNICA.md](./DOCUMENTACION-TECNICA.md)** — arquitectura, rutas, flujo de
autenticación, API interna, integración con Zoho (estructura Padre/Hija y regla FIFO de puntos),
esquema de Sanity, variables de entorno, despliegue, operación del cron de sincronización y
deuda técnica conocida.

Notas importantes antes de tocar el código:

- El **esquema de Sanity no está en este repositorio** (Studio remoto). `src/sanity/queries.ts` y
  `src/sanity/types.ts` son un espejo manual: hay que actualizarlos a mano cuando cambie el Studio.
- **Zoho es la fuente de verdad** del saldo y las redenciones; Sanity guarda contenido y auditoría.
- Las redenciones consumen los puntos **más antiguos primero (FIFO)** y pueden dividirse en varios
  registros de Zoho.
- Al agregar una ruta protegida hay que actualizar **dos** listas en `src/middleware.ts`:
  `PROTECTED_PATHS` y `matcher`.
