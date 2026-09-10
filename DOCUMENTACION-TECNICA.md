# Documentación técnica e infraestructura — Mi Premio

Plataforma web del programa de lealtad **Mi Premio** (Germán Morales Hoteles). Los afiliados
inician sesión con un código enviado por correo, consultan su saldo de puntos y su historial
(datos vivos en Zoho CRM), exploran el catálogo de bonos (contenido en Sanity CMS) y solicitan
redenciones que se registran en Zoho y se auditan en Sanity.

Incluye además un **panel administrativo** (`/admin`) con informes de puntos y redenciones y la
gestión de quién accede a él (§5.b).

- **Repositorio:** `git@github.com:Geniorama/app-mi-premio.git`
- **Repositorio del Studio:** `git@github.com:Geniorama/studio-mi-premio-cms.git` (esquema de
  Sanity; se despliega aparte — ver §7)
- **Rama principal:** `main` (rama de integración; `develop` quedó en desuso y está por detrás)
- **Dominio de producción:** `https://mipremiogermanmoraleshoteles.com`
- **Studio:** `https://mipremio.sanity.studio/`
- **Manual para el usuario del panel:** `MANUAL-USUARIO.md` (sin tecnicismos, para el equipo)
- **Última actualización de este documento:** 4 de agosto de 2026

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
│   ├── admin/                    # panel administrativo (ver §5.b)
│   │   ├── login/                # acceso al panel
│   │   ├── informes/[seccion]/   # una ruta por sección de informes
│   │   └── usuarios/             # gestión de administradores
│   └── api/                      # route handlers (ver §5)
├── components/
│   ├── admin/                    # ui.tsx (tabla, tarjetas, paginación) y charts.tsx
│   └── …                         # piezas del sitio público (Header, Footer, Hero, …)
├── views/                        # composición por pantalla (client components)
│   └── admin/                    # AdminShell, UsuariosView e informes/
├── lib/                          # integraciones de servidor (zoho, email, session, auth-codes)
│   ├── admin.ts                  # control de acceso del panel
│   ├── admin-roles.ts            # roles y permisos (SIN dependencias de servidor)
│   ├── zoho-reports.ts           # agregación de los informes
│   ├── pagination.ts             # paginación en el servidor
│   └── csv.ts                    # exportación a CSV
├── sanity/                       # cliente, queries GROQ, tipos, SEO, imágenes
├── utils/                        # Button, Container, constantes de WhatsApp
└── middleware.ts                 # protección de rutas
```

**Convención de capas:**

- `app/**/page.tsx` — Server Components. Resuelven `generateMetadata` y hacen el fetch a Sanity.
- `views/*` — Client Components (`"use client"`). Reciben el contenido por props y consultan las
  APIs internas para los datos vivos del usuario.
- `lib/*` — solo servidor. Nunca importar desde un Client Component.
  - **Excepción:** `lib/admin-roles.ts` no tiene dependencias de servidor precisamente para poder
    compartirse con el cliente. Importar `lib/admin.ts` desde un Client Component arrastraría
    `next/headers` y el cliente de Sanity al bundle del navegador.
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
| `/admin` | Redirect | Redirige a `/admin/informes` | **Sí** (admin) |
| `/admin/informes` | Redirect | Redirige a la primera sección (`/resumen`) | **Sí** (admin) |
| `/admin/informes/[seccion]` | SSR dinámico, `noindex` | Una sección del módulo por slug | **Sí** (admin) |
| `/admin/usuarios` | SSR dinámico, `noindex` | Gestión de administradores | **Sí** (`owner`/`admin`) |
| `/admin/login` | SSR, `noindex` | Acceso al panel | Redirige a `/admin/informes` si hay sesión |

`middleware.ts` protege `/perfil`, `/extractos` y `/gracias` (con sus subrutas) y redirige a
`/auth/login` cuando no hay cookie de sesión válida. El `matcher` está declarado explícitamente:

```ts
matcher: [
  "/perfil/:path*", "/extractos/:path*", "/gracias/:path*",
  "/auth/login", "/admin/:path*",
]
```

> Al agregar una ruta protegida hay que actualizar **dos** listas: `PROTECTED_PATHS` y `matcher`.

El bloque `/admin` se resuelve antes que el de afiliados y usa su propia cookie. El middleware
corre en Edge y **solo puede validar la firma de la cookie**: no consulta Sanity. La revalidación
de que el administrador sigue activo la hacen la página y los route handlers con
`requireActiveAdmin()` — así, desactivar a alguien en el Studio le cierra el panel de inmediato.

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

`src/lib/session.ts` — token **firmado con HMAC-SHA256**, en formato
`<payload base64url>.<firma base64url>`. Usa Web Crypto (no `node:crypto`) porque el middleware
corre en el runtime Edge, así que todas las funciones son asíncronas.

| Cookie | Ámbito | Duración | Payload |
|---|---|---|---|
| `mi-premio-session` | `user` | 7 días | `{ email, fullName, contactId }` |
| `mi-premio-admin-session` | `admin` | 12 horas | `{ email, fullName, adminId, role }` |
| `mi-premio-preview` | `preview` | 30 minutos | `{ email, fullName, contactId, adminEmail }` |

Todas son `httpOnly`, `sameSite: lax` y `secure` en producción. El campo `scope` del payload
impide que un token sirva fuera de su área: uno de afiliado no abre el panel, y el de
previsualización **no autoriza ninguna escritura** (ver §5.b).

El secreto sale de `SESSION_SECRET` (respaldo: `CRON_SECRET`). **Si no hay ninguno, la firma
lanza excepción**: es un fallo ruidoso a propósito, no un modo degradado que acepte cualquier
cookie.

> El payload sigue siendo legible (base64url, no cifrado): nunca debe llevar secretos. Lo que la
> firma garantiza es que el cliente no puede alterarlo.

> ⚠️ **Cambiar `SESSION_SECRET` invalida todas las sesiones activas** — afiliados y
> administradores tendrán que volver a entrar. Rotarlo es justamente el mecanismo para expulsar
> a todo el mundo.

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

> **Infraestructura pendiente:** el repositorio **no declara ningún cron**. La app corre en AWS
> sobre un proceso largo (`next start`), así que la ejecución periódica de `sync-redemptions`
> debe estar configurada fuera del código (EventBridge Scheduler contra la URL pública, o un
> `crontab` en la máquina). Documentar la frecuencia real y validarla es un pendiente operativo
> (ver §9). El precalentado de informes, en cambio, **no necesita nada externo**: va dentro del
> proceso (abajo).

### Precalentado de informes — temporizador en proceso

El informe de lotes —el que sostiene **Puntos**, **Puntos por vencer** y **Hoteles**— recorre
Zoho membresía por membresía (≈320 GET, unos 7-9 s), porque el subformulario `Puntos_Membresia`
no llega en el endpoint de lista. Alguien tiene que pagar esa espera; el precalentado la paga en
frío para que el administrador llegue siempre a una caché caliente.

**Por qué va dentro del proceso y no en un cron externo:** la caché de `zoho-reports` vive en la
memoria del proceso. Un scheduler que llame por HTTP calienta la réplica que le asigne el
balanceador, que no tiene por qué ser la que atienda al administrador. El temporizador interno
calienta siempre su propia memoria, y si mañana hay tres tareas en ECS, cada una calienta la
suya.

| Pieza | Archivo |
|---|---|
| Hook de arranque (Next lo llama solo, una vez por proceso) | `src/instrumentation.ts` |
| Temporizador y política | `src/lib/reports-warmup.ts` |
| Las cargas que se fuerzan | `warmReportsCache()` en `src/lib/zoho-reports.ts` |

Ritmo: primera pasada a los ~5-30 s del arranque (el salto aleatorio evita que dos réplicas que
arrancan juntas golpeen el CRM a la vez) y luego **cada 30 minutos**. El TTL de la caché de lotes
son 35 minutos, algo más que el intervalo, para que entre dos pasadas nadie encuentre la caché
caducada. **Si se cambia una de las dos cifras hay que mover la otra** (`INTERVAL_MS` en
`reports-warmup.ts`, `LOTS_TTL_MS` en `zoho-reports.ts`).

Interruptor: `REPORTS_WARMUP`. Encendido en producción por defecto; `off` lo apaga (útil para un
contenedor que no sirve el panel) y `on` lo enciende en desarrollo, donde por defecto está
apagado para no gastar ~330 llamadas a Zoho en cada arranque.

En el log, el arranque deja una línea y cada pasada otra:

```
[reports-warmup] Activo: primera pasada en 24 s, luego cada 30 min.
[reports-warmup] (arranque) Caché lista en 8971 ms. points-lots: 9991 en 8971 ms | redemptions: 51 en 1466 ms | affiliate-contacts: 405 en 2651 ms
```

Una carga que falle no tumba a las demás: se reporta aparte y la línea pasa a `console.error`
con el prefijo `Caché incompleta`.

> **Coste en Zoho:** cada pasada son ~330 llamadas a la API; cada 30 minutos, unas 16.000 al día
> por réplica. Antes de acortar el intervalo —o si se levantan varias réplicas— contrastar
> contra el límite diario de créditos de la cuenta (Setup → API usage en el CRM). Alargar el
> intervalo a 60 min lo deja en la mitad, a cambio de que la caché caduque entre pasadas si no
> se sube también `LOTS_TTL_MS`.

### Precalentado a mano — `GET /api/cron/warm-reports`

Auth: header `Authorization: Bearer $CRON_SECRET`, igual que `sync-redemptions`.
`dynamic = "force-dynamic"`, `maxDuration = 300`.

Hace exactamente lo mismo que el temporizador, pero a petición: sirve para forzar la recarga tras
un despliegue o al depurar. **No hace falta programarlo**; con el temporizador interno en marcha
es solo una herramienta de mano.

```json
{ "ok": true, "ms": 8793,
  "cargas": [ { "clave": "points-lots", "registros": 9991, "ms": 8793 } ] }
```

Devuelve **500** si alguna carga falló, para que un scheduler externo —si algún día se usa— lo
marque como fallido en vez de darlo por bueno.

> Ojo con el balanceador: si hay varias réplicas, esta llamada calienta **solo la que la atienda**.
> Para el uso normal, el temporizador interno es el que cuenta.

---

## 5.b Panel administrativo (`/admin`)

Área separada del sitio de afiliados: vive fuera de `(main)`, así que no hereda Header ni Footer,
y se marca `noindex`. Su primer y único módulo es **Informes**.

### Quién es administrador

Documentos `adminUser` de Sanity — los administradores **no son contactos del CRM**, así que el
flujo OTP no valida contra Zoho. Solo cuenta el documento **publicado** y con `active == true`:
un borrador en el Studio no otorga acceso.

`getAdminByEmail()` devuelve una lista y se queda con el de **menor privilegio** si hubiera
varios documentos con el mismo correo, además de dejar un `console.warn`. Ante una configuración
ambigua conviene conceder de menos.

`requireActiveAdmin()` devuelve los datos **frescos de Sanity**, no la instantánea que guardó el
token al iniciar sesión: de la cookie solo se toma el correo (la identidad firmada), mientras que
nombre y rol se releen en cada petición. Así, cambiar el nombre o el rol de alguien en el Studio
se refleja en la barra superior del panel sin esperar a que vuelva a entrar.

**Gestión desde el Studio.** El tipo `adminUser` está desplegado (ago. 2026) y aparece en
<https://mipremio.sanity.studio/> bajo **"Administradores del panel"**. Dar de alta a alguien es
crear el documento y **publicarlo**; revocarlo es desmarcar "Activo".

Su definición vive en el repositorio del Studio, `../studio-mi-premio-cms`:
`schemaTypes/documents/adminUser.ts`, registrado en `schemaTypes/index.ts` y en `structure.ts`.

### Roles y permisos

Definidos en `src/lib/admin-roles.ts` — módulo **sin dependencias de servidor** a propósito, para
poder compartirlo con los Client Components (importar `lib/admin.ts` desde el cliente arrastraría
`next/headers` y el cliente de Sanity al bundle del navegador).

| Rol | Informes | Gestionar administradores |
|---|---|---|
| `owner` (Propietario) | Sí | Sí, incluidos otros propietarios |
| `admin` (Administrador) | Sí | Sí, salvo propietarios |
| `viewer` (Consulta) | Sí | No |

Dos reglas sostienen el modelo, y ambas existen para impedir escaladas de privilegio:

- **Nadie otorga un rol por encima del suyo** (`canAssignRole`): un `admin` no puede crear ni
  ascender a un `owner`.
- **Nadie modifica una cuenta con más privilegio que la suya**: un `admin` no puede desactivar a
  un `owner`.

> Los roles **no** acotan qué informes se ven: cualquier administrador activo los ve todos. Lo que
> acotan es la gestión de administradores.

### Autenticación

Mismo mecanismo que el de afiliados (código de 6 dígitos por correo, TTL 10 min), con tres
diferencias:

1. Los códigos se guardan con ámbito (`admin:<correo>` vs `user:<correo>`), así que no se pisan
   ni son intercambiables.
2. `send-code` responde **siempre lo mismo** exista o no el administrador, para no revelar qué
   correos tienen acceso al panel.
3. `verify-code` revalida contra Sanity antes de emitir la cookie: si desactivaron la cuenta
   mientras el código estaba vigente, no entra.

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/admin/auth/send-code` | POST | Envía el código si el correo es un `adminUser` activo |
| `/api/admin/auth/verify-code` | POST | Verifica, revalida y emite `mi-premio-admin-session` |
| `/api/admin/auth/me` | GET | Administrador de la sesión (401 si no hay o fue revocado) |
| `/api/admin/auth/logout` | POST | Expira la cookie |

### Módulo Usuarios — `/admin/usuarios`

Primer módulo de **escritura** del panel. Da de alta administradores sin pasar por el Studio.
Solo visible y accesible para `owner` y `admin`; a un `viewer` la página lo devuelve a Informes.

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/admin/users` | GET | Lista todos los administradores, activos e inactivos |
| `/api/admin/users` | POST | Alta: `{ name, email, role }` |
| `/api/admin/users/[id]` | PATCH | Cambia `role` o `active` |

Todos exigen `requireAdminManager()` (sesión válida + admin activo + permiso de gestión).

**Salvaguardas** — cada una responde a una forma concreta de romper el panel:

| Regla | Qué evita |
|---|---|
| El correo se normaliza a minúsculas y se rechazan duplicados (409) | Que `getAdminByEmail` quede ambiguo y conceda el rol equivocado |
| No puedes cambiar tu propia cuenta (400) | Dejarte fuera del panel, o ascenderte a ti mismo |
| No puedes tocar a quien tiene más privilegio (403) | Que un `admin` desactive a un propietario |
| No se puede desactivar ni degradar al **último propietario activo** (409) | Un estado sin propietarios, irreversible desde la propia aplicación |

El alta usa un `_id` determinístico derivado del correo (`adminUser.<correo-saneado>`), de modo
que un duplicado choca a nivel de documento y no solo en la comprobación previa. Se crea
**publicado** (sin prefijo `drafts.`): un borrador no daría acceso y confundiría a quien lo crea.

> **No hay borrado**, solo desactivación: revoca el acceso igual de rápido, es reversible y
> conserva el rastro de quién tuvo acceso. Para eliminar de verdad está el Studio.

### Modo previsualización — ver el sitio como un afiliado

Desde el informe de Afiliados, el botón **Ver como** abre el área de afiliados tal y como la ve
esa persona: su saldo, su historial y su perfil. Es una herramienta de soporte, **de solo
lectura**.

`POST /api/admin/preview` valida al administrador, comprueba que el correo exista como contacto
en Zoho y emite la cookie `mi-premio-preview`. `DELETE` la limpia (no exige sesión de admin:
siempre debe poder salirse).

**Cómo se garantiza que no pueda escribir.** No basta con ocultar botones. `src/lib/viewer.ts`
expone dos funciones deliberadamente separadas:

| Función | Devuelve | La usan |
|---|---|---|
| `getViewer()` | sesión real **o** previsualización | rutas de lectura: `auth/me`, `user/membership`, `GET user/avatar` |
| `getWritableUser()` | **solo** la sesión real de afiliado | rutas de escritura: `POST /api/redemptions`, `POST /api/user/avatar` |

La garantía es estructural, no una comprobación que haya que recordar: una ruta de escritura no
puede recibir una identidad de previsualización porque la función que llama nunca la devuelve.
Si aparece una previsualización, responde **403** y lo deja registrado en el log.

> **Al añadir una ruta que escriba en nombre del afiliado, usa `getWritableUser()`.** Si usas
> `getViewer()` estarás permitiendo que un administrador actúe suplantando a un afiliado.

El middleware deja pasar la previsualización a las rutas protegidas —corre en Edge y solo valida
la firma—, y `PreviewBanner` muestra un aviso fijo con el nombre del afiliado y la salida. Ese
aviso es señalización: el bloqueo real está en el servidor.

Cada inicio de previsualización se registra: `[admin/preview] <admin> previsualiza a <afiliado>`.

### Informes — `/api/admin/reports/*`

Todos exigen `requireActiveAdmin()` y aceptan `?format=csv` y `?refresh=1` (salta la caché).

| Endpoint | Contenido | Filtros |
|---|---|---|
| `overview` | KPIs del programa, serie mensual de redenciones, top afiliados, top bonos | — |
| `redemptions` | Redenciones de Zoho enriquecidas con la auditoría de Sanity | `from`, `to`, `estado`, `bono`, `origen`, `q` |
| `points` | Ciclo de vida de los puntos por mes (cargados, vivos, vencidos) | — |
| `affiliates` | Una fila por red de membresía | `q`, `tipo`, `comercial`, `membresia`, `conSaldo`, `sort`, `dir` |
| `owners` | Una fila por comercial, con los afiliados que tiene a cargo y sus altas | `q`, `orden`, `sinComercial`, `desde`, `hasta` |
| `hotels` | Una fila por hotel, sobre los lotes de puntos que emitió | `q`, `orden`, `sinHotel` |
| `expiring` | Lotes de puntos con su fecha de vencimiento | `dias`, `incluirVencidos`, `q` |

El CSV usa `;` como separador y lleva BOM, porque el destino real es Excel en español; los
valores que empiezan por `= + - @` se neutralizan para que Excel no los ejecute como fórmula.

### Paginación

`redemptions`, `affiliates`, `owners`, `hotels` y `expiring` paginan **en el servidor** (`page`, `pageSize`; 25 por
defecto, 200 como máximo) y devuelven un objeto `pagination` con `total`, `totalPages`, `from` y
`to`. Se hace en el servidor y no en el navegador porque el informe de vencimientos produce miles
de lotes: enviarlos todos para recortarlos en el cliente desperdiciaría la transferencia y
montaría un DOM enorme.

Tres invariantes de `src/lib/pagination.ts` que hay que respetar al tocar un informe:

1. **Los resúmenes se calculan sobre el conjunto completo ya filtrado**, antes de paginar. Si no,
   las tarjetas mostrarían el total de la página en vez del total real.
2. **El CSV no se pagina**: exporta todo lo filtrado, ignorando `page`/`pageSize`.
3. Si `page` se pasa del final (por ejemplo al aplicar un filtro que deja menos páginas), se
   devuelve la última página existente en vez de una lista vacía; el cliente sincroniza su estado
   con la página que respondió el servidor.

### Estructura de la interfaz

Cada sección es una ruta propia bajo `/admin/informes/<slug>`, no una pestaña en memoria, así que
se puede enlazar y compartir. Los slugs se declaran en
`src/views/admin/informes/sections.ts`, única fuente de verdad para el submenú de la barra
lateral, la validación del slug y el título de cada página; un slug desconocido responde 404.

| Archivo | Rol |
|---|---|
| `sections.ts` | registro de secciones (slug, etiqueta, título, descripción) |
| `shared.tsx` | tipos, `useReport`, `usePagination` y el contexto de recarga |
| `InformesShell.tsx` | encabezado común y botón "Actualizar datos" |
| `resumen.tsx`, `redenciones.tsx`, `puntos.tsx`, `afiliados.tsx`, `comerciales.tsx`, `hoteles.tsx`, `por-vencer.tsx` | una sección cada uno |

El token de recarga viaja por **contexto** desde `InformesShell`: al ser cada sección una ruta
independiente, ya no existe un componente padre que pueda pasarlo por props.

### Cómo se calculan las cifras (`src/lib/zoho-reports.ts`)

Verificado contra el CRM real (304 membresías, 239 Padre / 64 Hija, 21 redenciones):

- **La lista de `Membresias` ya trae los agregados que Zoho calcula** (`TOTAL_PUNTOS`,
  `PUNTOS_DIPONIBLES` —sí, con esa errata en el nombre API—, `PUNTOS_VENCIDOS`,
  `Puntos_Globales_Red`, `Contacto_Membresia`, `Membresia_No`, `Tipo_Afiliado_1`). Por eso todo
  el informe se arma con 2-3 llamadas en vez de una por afiliado.
- **`PUNTOS_REDIMIDOS` no es fiable**: solo está poblado en 4 de 239 registros. Los puntos
  redimidos se calculan desde el módulo `Redenciones`, excluyendo las canceladas y rechazadas.
- **COQL no está disponible**: el token OAuth actual responde `OAUTH_SCOPE_MISMATCH`. Toda la
  agregación ocurre en el servidor.
- **Un afiliado = una red** (Padre + sus Hijas). El saldo autoritativo es `Puntos_Globales_Red`
  del Padre, el mismo criterio que usa `/api/user/membership`, para que panel y perfil nunca
  muestren cifras distintas.
- **`Categor_a` no existe en Zoho**: el código lo referencia pero siempre llega vacío.

**Comerciales.** El comercial que atiende a un afiliado **no es un campo del programa**: es el
propietario del contacto en Zoho (`Owner`, campo estándar del CRM, que llega como
`{ name, id, email }`). Es la asignación que ya mantiene el equipo comercial, así que el informe
la agrega y no la reinterpreta: para reasignar a alguien se cambia el propietario del contacto en
Zoho y el panel lo recoge en la siguiente lectura (caché de 5 min, o "Actualizar datos").

Tres cosas que conviene tener claras al leer ese informe:

1. **Se agrupa por `Owner.id`, no por el nombre.** Dos comerciales homónimos son dos filas, y
   renombrar a alguien en el CRM no le parte el histórico en dos.
2. **`afiliados` cuenta redes de membresía, `contactos` cuenta personas.** Son la misma unidad que
   usa el informe de Afiliados: un contacto con dos redes suma dos filas.
3. **El comercial cuelga del contacto, no de la membresía.** Una red cuyo contacto salió del
   padrón activo (`Estado_Fidelizaci_n ≠ Activo`) se queda sin propietario identificable y cae en
   *Sin comercial asignado*. Es el mismo hueco que ya reporta `padron.conMembresiaFueraDelPadron`.
   Al comprobarlo contra el CRM, los 405 contactos afiliados activos tenían `Owner` (15
   comerciales distintos), así que ese grupo debería estar vacío o casi.

Si Zoho no responde el módulo `Contacts`, **todo** cae en *Sin comercial asignado*. El informe lo
avisa en pantalla en vez de mostrar un cero silencioso, porque un listado vacío se lee como "no
hay comerciales" y no como "no se pudo leer el padrón".

**Altas: cuándo entró un afiliado al programa.** Es la pregunta más delicada del informe, porque
**Zoho no guarda esa fecha**. Comprobado contra el CRM:

| Fecha candidata | Por qué no sirve / sí sirve |
|---|---|
| `Contacts.Created_Time` | Cuándo entró la persona al CRM, no al programa. Los 543 afiliados (405 activos + 138 inactivos) se crearon **todos antes de junio de 2026**: mediría cero en los últimos meses |
| `Solicitud_de_Fidelizaci_n` | Es un sí/no **sin fecha**. Su población (426) es prácticamente la misma |
| `Membresias.Created_Time` | Es la fecha de la **migración**: 115 registros creados de golpe en febrero de 2026. No es el alta de nadie |
| **Primer lote de `Puntos_Membresia`** | ✅ El primer hecho de negocio con fecha real: el día en que el afiliado empezó a acumular |

El panel usa el **primer lote de puntos** (`lib/altas.ts`, `altaByNetwork()`: el mínimo
`Fecha_de_Entrega` de la red, excluyendo lotes `Cancelado` igual que el resto del panel).

Tres consecuencias que hay que conocer antes de interpretar el informe:

1. **Un afiliado registrado que nunca recibió puntos no tiene alta.** No hay fecha que contar, así
   que no entra en ninguna serie ni en ningún rango. El informe lo expone aparte (`sinAlta`) para
   que ese hueco no se lea como un cero.
2. **Febrero de 2026 es un pico artificial** (113 altas): es cuando la migración cargó los
   primeros puntos de casi todo el padrón, no cuando esa gente se inscribió. El ritmo real del
   programa se lee de junio de 2026 en adelante (4, 13, 7, 4 en jun-sep).
3. **Obliga a cargar `listPointsLots`**, la lectura cara del panel. Por eso este endpoint tiene
   `maxDuration = 300` como Hoteles: en frío son ~9 s, pero el precalentado la mantiene caliente.

El rango (`desde`/`hasta`, `AAAA-MM-DD`) solo afecta a la columna **Altas**; el resto de cifras
son del histórico. Los límites se comparan como texto ISO recortado a 10 caracteres, sin
construir `Date`, para que ningún corrimiento de zona horaria mueva los bordes del rango. La
respuesta devuelve el rango **aplicado**, no el pedido, y el panel pinta el encabezado con eso.

**Puntos por vencer.** El detalle de vencimientos vive en el subformulario `Puntos_Membresia`,
que Zoho solo entrega en el GET individual: es el informe caro (≈300 peticiones, ~20 s la primera
vez, concurrencia 6, caché 15 min). Dos ajustes importantes sobre el dato crudo:

1. Se **excluyen los lotes `Cancelado`** — son puntos anulados y coinciden exactamente con lo que
   Zoho reporta en `PUNTOS_VENCIDOS`.
2. Se aplica **consumo FIFO** contra el saldo autoritativo de la red. Hace falta porque Zoho casi
   nunca escribe `Puntos_Redimidos` de vuelta en la fila del subformulario: el consumo se refleja
   en el saldo del registro. Sin este ajuste, la suma de lotes de quien ya redimió supera su saldo
   real y el informe sobreestima. Con él, la suma de lotes cuadra al peso con el saldo global.

### Caché

Los informes se cachean en memoria del proceso (5 min las listas, 15 min los lotes). Igual que el
token de Zoho y los códigos de login, **no se comparte entre instancias serverless**: cada una
mantiene la suya. Para informes es aceptable —el peor caso es ver datos más frescos de lo
necesario—, pero conviene saberlo. El botón "Actualizar datos" del panel fuerza `?refresh=1`.

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

Los informes del panel leen el mismo módulo con su propia lista (`CONTACT_FIELDS` en
`zoho-reports.ts`), que añade **`Owner`** —el propietario del registro, es decir el comercial que
atiende al afiliado— y `Created_Time` / `Modified_Time`. `Owner` llega como
`{ name, id, email }`, así que no hace falta cruzar contra el módulo `Users`.

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
- **Studio en repositorio aparte.** El esquema no está aquí, pero **sí tiene código fuente**: vive
  en `../studio-mi-premio-cms` (`git@github.com:Geniorama/studio-mi-premio-cms.git`), desplegado en
  <https://mipremio.sanity.studio/>. Los cambios de esquema se hacen ahí y se publican con
  `npm run deploy`; **no** con las herramientas de esquema gestionado por MCP, que harían divergir
  el esquema desplegado de la fuente. Los tipos de `src/sanity/types.ts` y las queries de
  `src/sanity/queries.ts` son un espejo manual y deben actualizarse a mano cuando el Studio cambie.
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
| `adminUser` | acceso al panel: `email`, `name`, `role`, `active` (ver §5.b) |

> `userProfile` **no está en el esquema desplegado del Studio**: la app lo escribe por API (Sanity
> acepta tipos fuera del esquema desplegado). Funciona, pero no es editable desde el Studio hasta
> que se agregue su definición. `adminUser` sí está desplegado desde agosto de 2026.

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
| `SESSION_SECRET` | **Sí** | firma HMAC de las cookies de sesión. Sin él (ni `CRON_SECRET`) el login falla con excepción. Cambiarlo cierra todas las sesiones activas |
| `DEV_LOGIN_ENABLED` | No | `"true"` habilita `dev-login`. **No definir en producción** |
| `REPORTS_WARMUP` | No | precalentado de la caché de informes. Encendido en producción por defecto; `off` lo apaga, `on` lo enciende en desarrollo (cuesta ~330 llamadas a Zoho por arranque) |

---

## 9. Despliegue y operación

### Build

`npm run build` (Turbopack, raíz fijada). Requiere `NEXT_PUBLIC_SANITY_PROJECT_ID` y
`NEXT_PUBLIC_SANITY_DATASET` en tiempo de build: `src/sanity/env.ts` lanza excepción si faltan.
La ruta `/[slug]` se prerenderiza con `generateStaticParams`, así que el build también consulta
Sanity.

### Checklist de despliegue

1. Cargar todas las variables de §8 en el entorno del servicio de AWS que ejecuta la app.
2. **Definir `SESSION_SECRET`** con un valor aleatorio largo. Sin él (ni `CRON_SECRET`) el login
   falla con excepción, y cambiarlo después cierra todas las sesiones activas.
3. Verificar que existe al menos un `adminUser` publicado y activo, o nadie podrá entrar a
   `/admin`.
4. Verificar que `DEV_LOGIN_ENABLED` **no** esté definida.
5. Confirmar que el remitente de ZeptoMail está verificado para el dominio.
6. Registrar el dominio de producción como **CORS origin** en el proyecto de Sanity.
7. Configurar la ejecución periódica de `GET /api/cron/sync-redemptions` con el header
   `Authorization: Bearer $CRON_SECRET` (crontab o EventBridge; ver §9). El precalentado de
   informes no necesita configuración: comprobar en el arranque que el log trae
   `[reports-warmup] Activo`, y unos segundos después `Caché lista`.
8. Smoke test afiliado: login con código real → `/perfil` muestra saldo → detalle de bono →
   redención de prueba → correos recibidos → documento `redemption` creado en Sanity.
9. Smoke test panel: `/admin/login` con un correo `adminUser` → los cuatro informes cargan →
   una descarga CSV abre bien en Excel.

### Cron / sincronización

El despliegue es en **AWS sobre un proceso largo** (`next start`), no en Vercel: no hay
`vercel.json` ni crons de plataforma.

- **Precalentado de informes:** no requiere nada. Va dentro del proceso (§5, "Precalentado de
  informes"); arranca solo con el servidor.
- **Sincronización de redenciones:** sigue necesitando un disparador externo. Dos opciones, según
  cómo esté montada la máquina:

```bash
# crontab en la instancia (EC2), cada 6 horas
0 */6 * * * curl -fsS "https://<dominio>/api/cron/sync-redemptions" \
  -H "Authorization: Bearer $CRON_SECRET" >/dev/null
```

O un **EventBridge Scheduler** con destino HTTP (API destination) apuntando a la misma URL, con
el header `Authorization: Bearer $CRON_SECRET` guardado como connection secret. En ECS o App
Runner, donde no hay una máquina fija a la que meterle un `crontab`, EventBridge es la opción
natural.

> El endpoint no distingue quién lo invoca: cualquier scheduler que mande el header sirve.

> Validar en el primer despliegue que la invocación no devuelve 401: un secreto mal copiado se
> ve exactamente igual que un cron que nunca corrió.

### Observabilidad

Todo el diagnóstico es por `console.log`/`console.error` con prefijos consistentes:
`[Zoho]`, `[ZeptoMail]`, `[auth-codes]`, `[send-code]`, `[/api/redemptions]`,
`[cron/sync-redemptions]`, `[cron/warm-reports]`, `[reports-warmup]` y, en el panel, `[admin]`,
`[admin/send-code]`, `[admin/users]`,
`[zoho-reports]`. No hay APM ni agregador de errores.

Señales a vigilar en los logs:

- `[Zoho] Error de conexión al obtener token` → credenciales OAuth o refresh token revocado.
- `[/api/redemptions] Zoho POST error` con `createdRedemptionIds` → redención parcial que quedó a
  medias y necesita revisión manual en el CRM.
- `[/api/redemptions] Sanity write error` → la redención existe en Zoho pero no en la auditoría.
- `[cron/sync-redemptions] Valores de estado no mapeados` → apareció un valor nuevo en la bitácora
  de Zoho; hay que ampliar el mapeo.
- `[auth-codes] No hay código para …` recurrente → indicio del problema de memoria compartida
  entre instancias (§4).
- `[admin] N documentos adminUser con el correo …` → dos administradores con el mismo correo; el
  panel concede el de menor privilegio hasta que se resuelva.
- `[admin/users] X creó a Y con rol Z` → rastro de altas y cambios de rol del panel. Es el único
  registro de quién dio acceso a quién.
- `[zoho-reports] … se alcanzó el tope de páginas` → el módulo creció por encima de 8.000
  registros y el informe puede estar incompleto.

> ⚠️ El modo `debug` de `send-code` imprime datos del contacto. Conviene reducirlo antes de
> exponer los logs a terceros. (El log que imprimía el código de acceso en claro se eliminó al
> introducir el panel.)

---

## 10. Riesgos conocidos y deuda técnica

Ordenados por severidad.

| # | Tema | Riesgo | Acción sugerida |
|---|---|---|---|
| ~~1~~ | ~~**Cookie de sesión sin firmar**~~ | **Resuelto** (ago. 2026): las cookies se firman con HMAC-SHA256 y llevan `scope`. Pendiente derivado: `SESSION_SECRET` debe estar cargada en producción antes del despliegue | — |
| 2 | **`/api/auth/validate-contact` sin auth** | Enumeración de correos del CRM y fuga de nombre e ID de contacto | Proteger con `CRON_SECRET` o eliminar del build de producción |
| 3 | **`dev-login` habilitable por env** | Emisión de sesión arbitraria si `DEV_LOGIN_ENABLED=true` llega a producción | Restringir a `NODE_ENV !== "production"` sin escape por variable |
| 4 | **Estado en memoria del proceso** | Códigos de login y token de Zoho no se comparten entre instancias → logins fallidos intermitentes | Redis con TTL para los códigos; caché compartido o token por request para Zoho |
| 5 | **Redención sin transacción** | Un fallo a mitad de los tramos deja redenciones parciales en Zoho sin rollback | Registrar el intento antes de escribir en Zoho y reconciliar en el cron |
| 6 | **Sin rate limiting** | `send-code` (afiliados **y** admin) permite enviar correos ilimitados a cualquier dirección válida | Límite por IP y por email |
| ~~6b~~ | ~~**Roles del panel sin efecto**~~ | **Resuelto** (ago. 2026): los roles gobiernan la gestión de administradores (§5.b). Siguen sin acotar qué informes se ven, que es el comportamiento deseado hoy | — |
| ~~6c~~ | ~~**Esquema `adminUser` fuera del Studio**~~ | **Resuelto** (ago. 2026): desplegado desde `../studio-mi-premio-cms`; el equipo gestiona administradores desde el Studio | — |
| 7 | **Sin webhook de revalidación** | Los cambios editoriales tardan hasta 60 s | Endpoint `revalidateTag` + webhook de Sanity |
| 8 | **Esquema de Sanity fuera del repo** | Un cambio en el Studio puede romper queries y tipos sin aviso en CI | Versionar el esquema o generar tipos con `sanity typegen` |
| 9 | **Sin pruebas automatizadas ni CI** | El único control es `npm run lint` manual | Tests de `mapBitacoraToStatus`, del reparto FIFO y de `getMembershipByEmail` |
| 10 | **Logo de partner en URL externa** | `PARTNER_LOGO` en `lib/email.ts` apunta a un CDN de LinkedIn que puede caducar | Alojar el logo en `/public` o en Sanity |
| 11 | **Cron de sincronización no declarado** | El precalentado de informes ya corre dentro del proceso, pero `sync-redemptions` sigue dependiendo de un disparador externo: si nadie lo configuró, los estados de redención nunca se sincronizan | Montar el `crontab` o el EventBridge de §9 y verificar la ejecución |

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

Probar los crons en local:

```bash
curl "http://localhost:3000/api/cron/sync-redemptions?debug=1" \
  -H "Authorization: Bearer $CRON_SECRET"

# Precalentado: devuelve cuánto tardó cada carga. Sin el header, 401.
curl "http://localhost:3000/api/cron/warm-reports" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Dónde tocar qué

| Necesito… | Archivo |
|---|---|
| Agregar un campo de Zoho al perfil | `src/lib/zoho.ts` (interfaz + lista `fields`) → `src/app/api/user/membership/route.ts` → `src/views/PerfilAfiliadoView.tsx` |
| Cambiar contenido editorial | Sanity Studio (remoto); si es un campo nuevo: `queries.ts` + `types.ts` |
| Nueva ruta protegida | `middleware.ts` (`PROTECTED_PATHS` **y** `matcher`) + carpeta en `(protected-routes)` |
| Dar de alta un administrador | Panel → Usuarios (o Studio → "Administradores del panel", creando y **publicando**) |
| Cambiar quién puede gestionar administradores | `canManageAdmins` en `src/lib/admin-roles.ts` |
| Reasignar el comercial de un afiliado | Zoho CRM → contacto → cambiar **propietario**. No hay campo propio en el programa ni forma de hacerlo desde el panel |
| Cambiar un esquema de Sanity | Repositorio `../studio-mi-premio-cms` → `npm run deploy` (nunca por MCP) |
| Nuevo módulo del panel | `NAV_ITEMS` en `src/views/admin/AdminShell.tsx` + carpeta en `src/app/admin/` |
| Nueva sección de informes | `INFORME_SECTIONS` en `src/views/admin/informes/sections.ts` + su componente + entrada en `SECTION_COMPONENTS` de `[seccion]/page.tsx` |
| Nuevo informe o columna | `src/lib/zoho-reports.ts` (agregación) → route handler en `src/app/api/admin/reports/` → sección en `src/views/admin/informes/` |
| Ajustar plantillas de correo | `src/lib/email.ts` |
| Nuevos estados de redención | `mapBitacoraToStatus` / `mapEstadoRedencion` en `src/app/api/cron/sync-redemptions/route.ts` |
| Colores / tipografía | `src/app/globals.css` (`--custom-green: #417D30`, `--accent: #F24E1E`) |
| Número de WhatsApp | `src/utils/whatsapp.ts` |
