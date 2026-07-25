# Documentación técnica e infraestructura — Mi Premio

Plataforma web del programa de lealtad **Mi Premio** (Germán Morales Hoteles). Los afiliados
inician sesión con un código enviado por correo, consultan su saldo de puntos y su historial
(datos vivos en Zoho CRM), exploran el catálogo de bonos (contenido en Sanity CMS) y solicitan
redenciones que se registran en Zoho y se auditan en Sanity.

- **Repositorio:** `git@github.com:Geniorama/app-mi-premio.git`
- **Rama principal:** `main`
- **Dominio de producción:** `https://mipremiogermanmoraleshoteles.com`
- **Última actualización de este documento:** 24 de julio de 2026

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.1 |
| UI | React | 19.2.3 |
| Lenguaje | TypeScript (`strict: true`) | ^5 |
| Estilos | Tailwind CSS v4 (vía `@tailwindcss/postcss`) | ^4 |
| CMS | Sanity (`next-sanity`, `@sanity/image-url`) | ^12.3.0 / ^2.1.1 |
| Texto enriquecido | `@portabletext/react` | ^6.0.3 |
| Carruseles | `swiper` | ^12.1.2 |
| Iconos | `react-icons` | ^5.5.0 |
| Linting | ESLint 9 + `eslint-config-next` | ^9 |
| Tipografía | Montserrat vía `next/font/google` | — |

**Sistemas externos:**

- **Zoho CRM v6** — fuente de verdad de contactos, membresías, puntos y redenciones.
- **ZeptoMail (Zoho)** — envío transaccional de correos (código de acceso, confirmación de
  redención al usuario, alerta al administrador).
- **Sanity CMS** — contenido editorial, catálogo de bonos, auditoría de redenciones y avatares.
- **Zoho Forms** — formulario de registro embebido (`registroPage.zohoFormUrl`).

### Scripts de npm

```bash
npm run dev     # servidor de desarrollo (next dev)
npm run build   # build de producción
npm run start   # servidor de producción
npm run lint    # eslint
```

### Nota sobre `next.config.ts`

El proyecto vive en una ruta con espacio en el nombre (`.../Proyectos web/...`). Next infería mal
el *workspace root* y rompía la resolución de módulos como `tailwindcss`, por lo que la raíz se
fija explícitamente:

```ts
turbopack: { root: projectRoot },
outputFileTracingRoot: projectRoot,
```

No modificar sin verificar que `npm run dev` y `npm run build` siguen resolviendo Tailwind.

---

## 2. Arquitectura de carpetas

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # layout raíz: fuente, metadata global, lang="es"
│   ├── globals.css               # tokens de diseño Tailwind v4
│   ├── (main)/                   # rutas públicas con Header/Footer
│   │   ├── layout.tsx            # delega en views/Layout
│   │   ├── page.tsx              # home
│   │   ├── catalogo/             # listado y detalle de bonos
│   │   ├── registro/             # formulario Zoho embebido
│   │   ├── [slug]/               # páginas legales (SSG)
│   │   └── (protected-routes)/   # perfil, extractos, gracias
│   ├── auth/login|logout/        # login sin Header/Footer
│   └── api/                      # route handlers (ver §5)
├── components/                   # piezas reutilizables (Header, Footer, Hero, …)
├── views/                        # composición por pantalla (client components)
├── lib/                          # integraciones de servidor (zoho, email, session, auth-codes)
├── sanity/                       # cliente, queries GROQ, tipos, SEO, imágenes
├── utils/                        # Button, Container, constantes de WhatsApp
└── middleware.ts                 # protección de rutas
```

**Convención de capas:**

- `app/**/page.tsx` — Server Components. Resuelven `generateMetadata` y hacen el fetch a Sanity.
- `views/*` — Client Components (`"use client"`). Reciben el contenido por props y consultan las
  APIs internas para los datos vivos del usuario.
- `lib/*` — solo servidor. Nunca importar desde un Client Component.
- Alias de importación: `@/*` → `./src/*`.

---

## 3. Rutas de la aplicación

| Ruta | Tipo | Contenido | Protegida |
|---|---|---|---|
| `/` | SSR + ISR 60s | `homePage` | No |
| `/catalogo` | SSR + ISR 60s | `catalogoPage` + `voucher[]` | No |
| `/catalogo/[id]` | SSR + ISR 60s | `voucher` por slug | No (redención sí requiere sesión) |
| `/registro` | SSR + ISR 60s | `registroPage` (iframe Zoho Forms) | No |
| `/[slug]` | SSG (`generateStaticParams`) | `legalPage` | No |
| `/perfil` | SSR, `noindex` | `perfilPage` + bonos destacados | **Sí** |
| `/extractos` | SSR, `noindex` | `extractosPage` | **Sí** |
| `/gracias` | SSR, `noindex` | `graciasPage` | **Sí** |
| `/auth/login` | SSR, `noindex` | `loginPage` | Redirige a `/perfil` si hay sesión |
| `/auth/logout` | Client | Llama a `/api/auth/logout` y redirige a `/` | No |

`middleware.ts` protege `/perfil`, `/extractos` y `/gracias` (con sus subrutas) y redirige a
`/auth/login` cuando no hay cookie de sesión válida. El `matcher` está declarado explícitamente:

```ts
matcher: ["/perfil/:path*", "/extractos/:path*", "/gracias/:path*", "/auth/login"]
```

> Al agregar una ruta protegida hay que actualizar **dos** listas: `PROTECTED_PATHS` y `matcher`.

---

## 4. Autenticación y sesión

### Flujo de acceso (passwordless por código)

```
Usuario ingresa email
   ↓  POST /api/auth/send-code
Zoho CRM: searchContactByEmail
   ├── no existe            → 404 "Este correo no está registrado."
   ├── existe pero inactivo → 403 (requiere Estado = Activo Y Estado_Fidelizaci_n = Activo)
   └── elegible → genera código de 6 dígitos (TTL 10 min) → ZeptoMail
   ↓  POST /api/auth/verify-code  { email, code }
verifyLoginCode (consume el código) + revalidación de elegibilidad en Zoho
   ↓
Cookie httpOnly "mi-premio-session" (7 días) → redirect a /perfil
```

### Cookie de sesión

`src/lib/session.ts` — cookie `mi-premio-session`, `httpOnly`, `sameSite: lax`,
`secure` en producción, `maxAge` 7 días. El payload es
`{ email, fullName, contactId, exp }` serializado en JSON y codificado en **base64url**.

> ⚠️ **No está firmada ni cifrada.** Es reversible y forjable por el cliente: cualquiera puede
> construir una cookie con otro email y leer la membresía de ese afiliado. El propio archivo lo
> anota como pendiente ("para producción considera JWT firmado o sesiones en DB"). Es la
> deuda de seguridad más relevante del proyecto — ver §10.

### Códigos de verificación

`src/lib/auth-codes.ts` — `Map` en memoria del proceso, con TTL de 10 minutos y persistencia
entre *hot reloads* vía `globalThis` en desarrollo.

> ⚠️ **Implicación de infraestructura:** en un despliegue serverless o con varias instancias, el
> código puede generarse en una instancia y verificarse en otra → "Código inválido o expirado"
> intermitente. Requiere un almacén compartido (Redis con TTL) para escalar horizontalmente.
> El mismo problema aplica al caché del *access token* de Zoho (`lib/zoho.ts`), que es una
> variable de módulo: cada instancia pedirá su propio token.

---

## 5. API interna (Route Handlers)

### Autenticación — `/api/auth/*`

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `send-code` | POST | pública | Valida el contacto en Zoho y envía el código. Acepta `{ debug: true }` para validar la conexión sin enviar correo. |
| `verify-code` | POST | pública | Verifica el código, revalida elegibilidad y emite la cookie. |
| `me` | GET | cookie | Devuelve el usuario de la sesión (401 si no hay). |
| `logout` | POST | pública | Expira la cookie. |
| `validate-contact` | POST | **ninguna** | Diagnóstico: devuelve datos del contacto de Zoho por email. |
| `dev-login` | POST | `NODE_ENV=development` o `DEV_LOGIN_ENABLED=true` | Crea una sesión arbitraria sin código. Responde 404 si no está habilitado. |
| `test-email` | POST | `Bearer $CRON_SECRET` | Prueba el envío del correo de código. |
| `test-redemption-email` | POST | `Bearer $CRON_SECRET` | Prueba los correos de redención (usuario y admin). |

> ⚠️ `validate-contact` **no exige autenticación** y expone si un correo existe en el CRM junto
> con nombre e ID del contacto. Es un endpoint de diagnóstico que no debería estar accesible en
> producción (ver §10).

> ⚠️ `dev-login` se habilita con la variable `DEV_LOGIN_ENABLED=true` incluso en producción.
> No debe existir en el entorno productivo.

### Datos del usuario — `/api/user/*`

**`GET /api/user/membership`** (requiere cookie) — agrega en paralelo `getMembershipByEmail`,
`getRedemptionsByEmail` y `searchContactByEmail`, y devuelve:

```jsonc
{
  "fullName": "…",
  "contact":  { "email", "telefono", "cargo", "empresa", "ubicacion",
                "fechaNacimiento", "estadoFidelizacion" },
  "membership": { "id", "puntos", "categoria" },   // puntos = saldo global de la red
  "puntosAcumulados": [ /* subformulario Puntos Membresía consolidado */ ],
  "redemptions":      [ /* módulo Redenciones */ ]
}
```

Consumido por `Header` (saldo), `PerfilAfiliadoView`, `ExtractosView` y `VoucherDetailView`.

**`/api/user/avatar`**

- `GET` — lee `userProfile.avatar` desde Sanity. Usa el *write client* (sin CDN) si hay token,
  para reflejar una subida reciente sin caché.
- `POST` — `multipart/form-data` con `file`. Valida `image/jpeg|png|webp` y ≤ 5 MB, sube el asset
  a Sanity y hace `createOrReplace` sobre el documento determinístico `userProfile.<contactId>`.

### Redenciones — `POST /api/redemptions`

Requiere cookie de sesión y `SANITY_API_WRITE_TOKEN`. Body:
`{ voucherSlug, termsAcceptedAt?, deliveryEmail? }`.

Secuencia:

1. **Valida el bono** en Sanity (`voucherBySlugQuery`, solo `active == true`) y que tenga
   `pointsValue >= 1`.
2. **Valida el saldo** contra el saldo global de la red en Zoho.
3. **Reparte los puntos en tramos FIFO** sobre `membership.redFifo`: consume primero el registro
   cuyos puntos son más antiguos; si no alcanza, divide la solicitud en varias redenciones.
4. **Crea las redenciones en Zoho** (fuente de verdad del descuento), tramo por tramo. Si un
   tramo falla, responde `502` e incluye `createdRedemptionIds` con los tramos ya creados para
   revisión manual — **no hay rollback automático**.
5. **Registra un documento `redemption` en Sanity por tramo** (auditoría y seguimiento de
   entrega). Un fallo aquí **no bloquea** la respuesta: Zoho ya descontó.
6. **Envía los correos** al usuario (`deliveryEmail` o el de la sesión) y al administrador.
   Los fallos se loguean y no bloquean.

Respuesta: `{ zohoRedemptionId, zohoRedemptionIds[], pointsRedeemed, newBalance }`.
El cliente redirige a `/gracias`.

### Sincronización — `GET /api/cron/sync-redemptions`

Auth: header `Authorization: Bearer $CRON_SECRET` (si `CRON_SECRET` no está definida, responde
401 siempre). `dynamic = "force-dynamic"`, `maxDuration = 60`.

Recorre los documentos `redemption` de Sanity en estado no terminal, trae cada registro completo
de Zoho por ID (el `GET` individual sí incluye subformularios, a diferencia de `/search`) y
deduce el estado actual:

1. **Bitácora de redención** — busca el subformulario cuya clave matchea `/bit.*cora/i`, ordena
   sus filas por `Fecha_Movimiento` (fallback `Modified_Time`, `Created_Time`) y toma el
   `Nuevo_Estado` de la más reciente.
2. **Fallback** — el campo `Estado_Redencion` del registro principal.

Mapeo tolerante a tildes y mayúsculas (`normalize` + NFD):

| Valor en Zoho (prefijo) | Estado en Sanity |
|---|---|
| `entrega…` | `entregada` |
| `aprob…` | `procesada` |
| `rechaz…` | `rechazada` |
| `cancel…` | `cancelada` |
| `proces…` (Estado_Redencion) | `procesada` |
| `cread…` (Estado_Redencion) | `pendiente` |

Estados terminales: `entregada`, `cancelada`, `rechazada`. Al pasar a `procesada` o a un estado
terminal se sella `processedAt` si estaba vacío. Todos los cambios se aplican en una única
transacción de Sanity. Respuesta: `{ summary: { checked, updated, unchanged, unknown, missing,
errors }, unknownValues }`. Con `?debug=1` incluye un registro crudo de Zoho de muestra — útil
para descubrir nombres API de subformularios desconocidos.

> **Infraestructura pendiente:** el repositorio **no contiene `vercel.json`** ni ninguna
> definición de cron. La ejecución periódica debe estar configurada fuera del código (cron de
> Vercel en el dashboard, o un scheduler externo). Documentar la frecuencia real y validarla es
> un pendiente operativo (ver §9).

---

## 6. Integración con Zoho CRM

`src/lib/zoho.ts` concentra toda la comunicación. Base: `https://www.zohoapis.com/crm/v6`
(configurable con `ZOHO_CRM_DOMAIN` para cuentas EU/IN/AU).

### OAuth

`getZohoAccessToken()` intercambia el `refresh_token` por un `access_token` en
`$ZOHO_ACCOUNTS_DOMAIN/oauth/v2/token` y lo cachea en memoria del proceso hasta 5 minutos antes
de su expiración. El `refresh_token` es de larga vida: si se revoca, **toda** la integración cae
(login incluido).

### Módulos y campos usados

**`Contacts`** — `searchContactByEmail(email)` con lista explícita de campos:
`Full_Name`, `First_Name`, `Last_Name`, `Email`, `Estado`, `Estado_Fidelizaci_n`, `Phone`,
`Mobile`, `Cargo` (personalizado; el `Title` estándar viene vacío), `Account_Name` (lookup),
`Ciudad_Principal` (lookup cuyo `name` ya incluye "Ciudad / Departamento / País"),
`Date_of_Birth`.

Elegibilidad para login: `Estado === "Activo" && Estado_Fidelizaci_n === "Activo"`.

**`Membresias`** — estructura **Padre / Hija**:

- Una membresía **Hija** por ciclo; suele tener el email en `Correo_electr_nico_1`.
- La membresía **Padre** concentra el saldo consolidado en `Puntos_Globales_Red`, la lista
  `Membresias_Hijas_Relacionadas` y el puntero `ID_Ultima_Hija_Activa`.
- Subformulario `Puntos_Membresia` con `Puntos_Entregados`, `Puntos_Redimidos`,
  `Fecha_de_Entrega`, `Fecha_de_vencimiento_Puntos`, `Estado_Puntos_Entregados`, `Entrega_OC`,
  `Redencion_No`, `Se_Redimen`.

`getMembershipByEmail(email)` resuelve la red completa:

1. Busca por `(Correo_electr_nico_1:equals:<email>)`. **Fallback:** si no hay resultado, busca por
   `(Name:equals:<email>)` — algunos afiliados solo tienen el correo en el "Nombre de Membresía",
   típicamente registros Padre.
2. Trae el registro completo por ID (el `GET` individual incluye subformularios y lookups).
3. Si tiene `Membresia_Padre`, trae el Padre y las demás Hijas (en paralelo).
4. Devuelve un objeto sintético con:
   - `Saldo_Puntos_Disponibles` = `Puntos_Globales_Red` del Padre (fallback a su saldo propio),
   - `Puntos_Membresia` = historial consolidado de Padre + Hijas, ordenado por fecha desc,
   - `redFifo` = **campo calculado, no existe en Zoho**: registros con saldo > 0 ordenados por su
     fecha de entrega más antigua,
   - `id` = el primer registro de `redFifo` (destino FIFO por defecto).

**`Redenciones`** — `getRedemptionsByEmail` busca por `(Redencion_Membresia:equals:<email>)`;
`createRedemptionInZoho(membershipId, points)` crea con `{ Redencion_Membresia, Puntos_a_Redimir }`;
`getRedemptionById` trae el registro completo (con la bitácora) para el cron.

### Regla de negocio: FIFO

Las redenciones deben consumir **los puntos más antiguos primero**, para que los puntos no venzan
sin usarse. Como en Zoho el saldo vive por registro (Padre y cada Hija), una solicitud puede
requerir **varias redenciones**: `/api/redemptions` divide los puntos en tramos siguiendo el orden
de `redFifo`.

---

## 7. Sanity CMS

- **Proyecto:** `eq7vsxjb` · **Dataset:** `production` · **API version:** `2024-10-01` (default).
- **Studio remoto**, alojado en Sanity: **el esquema no está en este repositorio.** Los cambios de
  esquema se hacen en el Studio, no aquí. Los tipos de `src/sanity/types.ts` y las queries de
  `src/sanity/queries.ts` son un espejo manual del esquema y deben actualizarse a mano cuando el
  Studio cambie.
- **Clientes:**
  - `sanityClient` — lectura, `useCdn: true`, `perspective: "published"`.
  - `sanityWriteClient` — escritura, `useCdn: false`, `perspective: "raw"`, requiere
    `SANITY_API_WRITE_TOKEN`. `assertWriteClient()` falla rápido con 500 si falta el token.
- **Caché:** `sanityFetch` usa `no-store` en desarrollo y `force-cache` con
  `revalidate: 60` + tags en producción. Los tags se pasan por llamada (`["homePage"]`,
  `["voucher"]`, …) pero **no hay endpoint de revalidación por webhook**: los cambios editoriales
  tardan hasta 60 s en aparecer.
- **Imágenes:** `urlFor` y `buildImageSet(source, widths)` generan `src` + `srcSet` con
  `auto("format")`.

### Tipos de documento en uso

| Tipo | Rol |
|---|---|
| `siteSettings` (`_id` fijo) | logos, navegación, footer, redes, SEO por defecto |
| `homePage`, `catalogoPage`, `perfilPage`, `extractosPage`, `graciasPage`, `registroPage`, `loginPage` | singletons de contenido por pantalla |
| `voucher` | bono canjeable: `pointsValue`, `priceCOP`, `category`, `terms` (Portable Text), `active`, `featuredInPerfil`, `order`, `stackable`, `deliveryTime`, `validUntil` |
| `legalPage` | páginas legales por slug (términos, privacidad) |
| `redemption` | auditoría: `zohoRedemptionId`, `zohoMembershipId`, `email`, `pointsRedeemed`, referencia al `voucher`, `status`, `redeemedAt`, `termsAcceptedAt`, `deliveryEmail`, `processedAt` |
| `userProfile` | avatar del afiliado, `_id` determinístico `userProfile.<contactId>` |

Solo se listan bonos con `active == true`, ordenados por `coalesce(order, 9999) asc, _createdAt desc`.
`vouchersFeaturedQuery` limita a 12 los marcados con `featuredInPerfil`.

---

## 8. Variables de entorno

Archivo local: `.env.local` (ignorado por git — el `.gitignore` cubre `.env*`).

### Sanity

| Variable | Requerida | Notas |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | **Sí** | `env.ts` lanza error en build si falta |
| `NEXT_PUBLIC_SANITY_DATASET` | **Sí** | idem |
| `NEXT_PUBLIC_SANITY_API_VERSION` | No | default `2024-10-01` |
| `SANITY_API_WRITE_TOKEN` | **Sí** (server) | sin él fallan avatar, redenciones y el cron |

### Zoho CRM

| Variable | Requerida | Notas |
|---|---|---|
| `ZOHO_CLIENT_ID` | **Sí** | |
| `ZOHO_CLIENT_SECRET` | **Sí** | |
| `ZOHO_REFRESH_TOKEN` | **Sí** | de larga vida; si se revoca cae el login |
| `ZOHO_ACCOUNTS_DOMAIN` | No | default `https://accounts.zoho.com` |
| `ZOHO_CRM_DOMAIN` | No | default `https://www.zohoapis.com` |
| `ZOHO_SCOPE`, `ZOHO_API_KEY` | No | presentes en `.env.local`, no leídas por el código |

### ZeptoMail

| Variable | Requerida | Notas |
|---|---|---|
| `ZOHO_ZEPTOMAIL_SEND_TOKEN` | Recomendada | **si falta, los correos NO se envían**: se loguean en consola y la función devuelve `success: true`. En desarrollo el código de login se imprime en el log. |
| `ZOHO_EMAIL_FROM` | Sí en prod | default `noreply@tu-dominio.com` (placeholder) |
| `ZOHO_EMAIL_FROM_NAME` | No | default `Mi Premio` |
| `ZOHO_ZEPTOMAIL_EU` | No | `"true"` → `api.zeptomail.eu` |
| `MI_PREMIO_ADMIN_EMAIL` | No | default `mipremio@germanmoraleshoteles.com` |

### Aplicación

| Variable | Requerida | Notas |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Recomendada | base de canonicals, OG y enlaces/logos en correos. Default `https://mipremiogermanmoraleshoteles.com` |
| `CRON_SECRET` | **Sí** | protege el cron y los endpoints de prueba de correo |
| `DEV_LOGIN_ENABLED` | No | `"true"` habilita `dev-login`. **No definir en producción** |

---

## 9. Despliegue y operación

### Build

`npm run build` (Turbopack, raíz fijada). Requiere `NEXT_PUBLIC_SANITY_PROJECT_ID` y
`NEXT_PUBLIC_SANITY_DATASET` en tiempo de build: `src/sanity/env.ts` lanza excepción si faltan.
La ruta `/[slug]` se prerenderiza con `generateStaticParams`, así que el build también consulta
Sanity.

### Checklist de despliegue

1. Cargar todas las variables de §8 en el entorno (Vercel u equivalente).
2. Verificar que `DEV_LOGIN_ENABLED` **no** esté definida.
3. Confirmar que el remitente de ZeptoMail está verificado para el dominio.
4. Registrar el dominio de producción como **CORS origin** en el proyecto de Sanity.
5. Configurar la ejecución periódica de `GET /api/cron/sync-redemptions` con el header
   `Authorization: Bearer $CRON_SECRET`.
6. Smoke test: login con código real → `/perfil` muestra saldo → detalle de bono → redención de
   prueba → correos recibidos → documento `redemption` creado en Sanity.

### Cron / sincronización

No hay definición de cron en el repositorio. Si el despliegue es en Vercel, la opción natural es
un `vercel.json`:

```jsonc
{
  "crons": [
    { "path": "/api/cron/sync-redemptions", "schedule": "0 */6 * * *" }
  ]
}
```

> Nota: los crons de Vercel invocan la ruta con su propio header de autorización; este endpoint
> exige `Bearer $CRON_SECRET`, que es exactamente el esquema que Vercel envía cuando
> `CRON_SECRET` está definida como variable de entorno. Validar en el primer despliegue que la
> invocación no devuelve 401.

### Observabilidad

Todo el diagnóstico es por `console.log`/`console.error` con prefijos consistentes:
`[Zoho]`, `[ZeptoMail]`, `[auth-codes]`, `[send-code]`, `[/api/redemptions]`,
`[cron/sync-redemptions]`. No hay APM ni agregador de errores.

Señales a vigilar en los logs:

- `[Zoho] Error de conexión al obtener token` → credenciales OAuth o refresh token revocado.
- `[/api/redemptions] Zoho POST error` con `createdRedemptionIds` → redención parcial que quedó a
  medias y necesita revisión manual en el CRM.
- `[/api/redemptions] Sanity write error` → la redención existe en Zoho pero no en la auditoría.
- `[cron/sync-redemptions] Valores de estado no mapeados` → apareció un valor nuevo en la bitácora
  de Zoho; hay que ampliar el mapeo.
- `[auth-codes] No hay código para …` recurrente → indicio del problema de memoria compartida
  entre instancias (§4).

> ⚠️ Varios logs incluyen datos sensibles: `[auth-codes] Código no coincide. Esperado: …` imprime
> el código de acceso válido en claro, y el modo `debug` de `send-code` imprime datos del
> contacto. Conviene reducirlos antes de exponer los logs a terceros.

---

## 10. Riesgos conocidos y deuda técnica

Ordenados por severidad.

| # | Tema | Riesgo | Acción sugerida |
|---|---|---|---|
| 1 | **Cookie de sesión sin firmar** | Cualquiera puede forjar `mi-premio-session` con otro email y leer saldo/historial de ese afiliado, o redimir sus puntos | Firmar con HMAC o migrar a JWT (`jose`) / sesión en servidor |
| 2 | **`/api/auth/validate-contact` sin auth** | Enumeración de correos del CRM y fuga de nombre e ID de contacto | Proteger con `CRON_SECRET` o eliminar del build de producción |
| 3 | **`dev-login` habilitable por env** | Emisión de sesión arbitraria si `DEV_LOGIN_ENABLED=true` llega a producción | Restringir a `NODE_ENV !== "production"` sin escape por variable |
| 4 | **Estado en memoria del proceso** | Códigos de login y token de Zoho no se comparten entre instancias → logins fallidos intermitentes | Redis con TTL para los códigos; caché compartido o token por request para Zoho |
| 5 | **Redención sin transacción** | Un fallo a mitad de los tramos deja redenciones parciales en Zoho sin rollback | Registrar el intento antes de escribir en Zoho y reconciliar en el cron |
| 6 | **Sin rate limiting** | `send-code` permite enviar correos ilimitados a cualquier dirección del CRM | Límite por IP y por email |
| 7 | **Sin webhook de revalidación** | Los cambios editoriales tardan hasta 60 s | Endpoint `revalidateTag` + webhook de Sanity |
| 8 | **Esquema de Sanity fuera del repo** | Un cambio en el Studio puede romper queries y tipos sin aviso en CI | Versionar el esquema o generar tipos con `sanity typegen` |
| 9 | **Sin pruebas automatizadas ni CI** | El único control es `npm run lint` manual | Tests de `mapBitacoraToStatus`, del reparto FIFO y de `getMembershipByEmail` |
| 10 | **Logo de partner en URL externa** | `PARTNER_LOGO` en `lib/email.ts` apunta a un CDN de LinkedIn que puede caducar | Alojar el logo en `/public` o en Sanity |
| 11 | **Cron no declarado en el repo** | Si nadie lo configuró, los estados de redención nunca se sincronizan | Añadir `vercel.json` y verificar la ejecución |

---

## 11. Guía rápida para nuevos desarrolladores

```bash
git clone git@github.com:Geniorama/app-mi-premio.git
cd app-mi-premio
npm install
# copiar .env.local con las credenciales (pedir al equipo)
npm run dev   # http://localhost:3000
```

**Sin token de ZeptoMail**, el código de login aparece en la consola del servidor
(`[DEV] Código de login para …`), así que se puede iniciar sesión con un correo real del CRM sin
enviar correos. Alternativa más rápida en desarrollo:

```bash
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email":"afiliado@ejemplo.com"}' -c cookies.txt
```

Probar el cron en local:

```bash
curl "http://localhost:3000/api/cron/sync-redemptions?debug=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Dónde tocar qué

| Necesito… | Archivo |
|---|---|
| Agregar un campo de Zoho al perfil | `src/lib/zoho.ts` (interfaz + lista `fields`) → `src/app/api/user/membership/route.ts` → `src/views/PerfilAfiliadoView.tsx` |
| Cambiar contenido editorial | Sanity Studio (remoto); si es un campo nuevo: `queries.ts` + `types.ts` |
| Nueva ruta protegida | `middleware.ts` (`PROTECTED_PATHS` **y** `matcher`) + carpeta en `(protected-routes)` |
| Ajustar plantillas de correo | `src/lib/email.ts` |
| Nuevos estados de redención | `mapBitacoraToStatus` / `mapEstadoRedencion` en `src/app/api/cron/sync-redemptions/route.ts` |
| Colores / tipografía | `src/app/globals.css` (`--custom-green: #417D30`, `--accent: #F24E1E`) |
| Número de WhatsApp | `src/utils/whatsapp.ts` |
