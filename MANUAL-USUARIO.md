# Manual del panel administrativo — Mi Premio

Guía para el equipo que consulta los informes del programa de lealtad **Mi Premio**
(Germán Morales Hoteles). No necesitas conocimientos técnicos para usarlo.

- **Dirección del panel:** `https://mipremiogermanmoraleshoteles.com/admin`
- **Última actualización:** 4 de agosto de 2026

---

## 1. Cómo entrar

El panel **no usa contraseña**. Cada vez que entras recibes un código por correo.

1. Abre `https://mipremiogermanmoraleshoteles.com/admin`
2. Escribe tu correo electrónico y pulsa **Enviar código**
3. Revisa tu bandeja de entrada: llegará un correo de Mi Premio con un **código de 6 dígitos**
4. Escribe el código y pulsa **Entrar**

La sesión dura **12 horas**. Pasado ese tiempo el panel volverá a pedirte un código.

### Si no llega el código

| Situación | Qué hacer |
|---|---|
| No aparece en unos minutos | Revisa la carpeta de correo no deseado o spam |
| Sigue sin llegar | Confirma con quien te dio el acceso que tu correo está bien escrito y activo |
| Dice "código inválido o expirado" | El código dura 10 minutos. Pide uno nuevo con **Usar otro correo** → vuelve a escribir tu correo |

> **Por qué el mensaje al pedir el código es siempre el mismo.** Aunque tu correo no tenga
> acceso, la pantalla responde igual. Es a propósito: evita que alguien de fuera pueda averiguar
> qué correos entran al panel. Si crees que deberías tener acceso y no recibes nada, pregunta al
> responsable en vez de insistir.

**El acceso al panel es independiente del programa de afiliados.** No necesitas estar registrado
como afiliado en Zoho, y tener cuenta de afiliado tampoco te da acceso al panel.

---

## 2. Cómo moverte

A la izquierda está el menú. Hoy hay dos módulos:

- **Informes** — todo lo relativo a puntos y redenciones. Se despliega en cuatro secciones.
- **Usuarios** — quién puede entrar al panel. *Solo lo ven los perfiles autorizados.*

Arriba a la derecha aparecen tu nombre, tu rol y el botón **Salir**.

En móvil el menú se oculta: pulsa el botón **☰** de la esquina superior izquierda.

El botón **Actualizar datos**, arriba a la derecha de cada informe, vuelve a consultar Zoho
ignorando la información guardada temporalmente. Úsalo si acabas de hacer un cambio en el CRM y
quieres verlo reflejado de inmediato.

---

## 3. Informes

Los datos vienen **en vivo de Zoho CRM**, que es la fuente de verdad de puntos y redenciones. La
web añade el detalle de qué bono se pidió y a dónde se entregó.

### 3.1 Resumen

La foto general del programa:

| Cifra | Qué significa |
|---|---|
| **Puntos entregados** | Todo lo acumulado históricamente por los afiliados |
| **Puntos redimidos** | Lo que ya se canjeó por bonos |
| **Saldo en circulación** | Puntos vivos que los afiliados aún pueden usar |
| **Puntos vencidos** | Puntos que caducaron sin usarse |
| **Afiliados** | Personas del programa |
| **Membresías** | Registros en Zoho: cada afiliado tiene una principal y varias por ciclo |
| **Puntos por vencer** | Puntos con fecha de caducidad cercana |
| **Redenciones desde la web** | Cuántos canjes se hicieron desde el sitio; el resto se creó a mano en el CRM |

Debajo encontrarás la evolución mensual de puntos redimidos (pasa el cursor sobre una columna
para ver el detalle), el desglose por estado, los bonos más canjeados y los afiliados que más
han redimido.

### 3.2 Redenciones

Cada canje, uno por fila. Puedes filtrar por fechas, estado, origen y buscar por afiliado, correo
o bono.

**Estados de una redención:**

| Estado | Significa |
|---|---|
| **Pendiente** | Registrada, aún sin procesar |
| **Procesada** | Aprobada y en curso |
| **Entregada** | El afiliado ya recibió su bono |
| **Cancelada** | Anulada |
| **Rechazada** | No se aprobó |

La columna **Origen** distingue si el canje se hizo desde la web o directamente en el CRM. Las
creadas en el CRM no tienen bono asociado, porque esa información solo existe cuando el afiliado
lo pide desde el sitio.

### 3.3 Afiliados

Una fila por afiliado, con sus puntos entregados, redimidos, saldo disponible, vencidos y su
número de redenciones.

Puedes buscar por nombre, correo o número de membresía, filtrar por tipo de afiliado, y mostrar
solo quienes tienen saldo. **Pulsa el encabezado de una columna para ordenar** por ella.

> **Sobre "Ciclos".** En Zoho cada afiliado tiene una membresía principal y varias "hijas", una
> por ciclo. El panel las agrupa y te muestra el total consolidado, que es la cifra que el
> afiliado ve en su perfil.

### 3.4 Puntos por vencer

Los puntos que caducan pronto, agrupados por cercanía al vencimiento y con el detalle de qué
afiliado y qué lote.

Es el informe clave para campañas de recordatorio: te dice a quién avisar antes de que pierda
sus puntos. Elige la ventana de tiempo —próximos 30, 60, 90 o 180 días, el próximo año, o todos
los lotes vigentes— y marca **Incluir lotes ya vencidos** si quieres ver también los que ya
caducaron.

> **Este informe tarda más.** Consulta el detalle de cada membresía una por una, así que la
> primera carga puede tomar hasta un minuto. Después queda guardado unos minutos y responde al
> instante.

### 3.5 Descargar a Excel

Cada informe tiene el botón **Descargar CSV**. Dos cosas importantes:

- Descarga **todo lo que coincide con tus filtros**, no solo la página que estás viendo.
- El archivo está preparado para abrirse en Excel en español, con las columnas ya separadas.

### 3.6 Paginación

Las tablas muestran 25 filas por página. Abajo puedes cambiar a 50, 100 o 200 y moverte entre
páginas. Al cambiar un filtro vuelves automáticamente a la primera página.

---

## 4. Usuarios (solo perfiles autorizados)

Aquí decides quién entra al panel.

### Los tres roles

| Rol | Ve informes | Gestiona usuarios |
|---|---|---|
| **Propietario** | Sí | Sí, incluidos otros propietarios |
| **Administrador** | Sí | Sí, salvo propietarios |
| **Consulta** | Sí | No |

Hoy **los tres roles ven todos los informes**. Lo que cambia es quién puede dar y quitar acceso.

### Dar de alta a alguien

1. Entra en **Usuarios**
2. Rellena nombre, correo y rol
3. Pulsa **Crear administrador**

Esa persona ya puede entrar. **No se le envía ningún correo de aviso**: pedirá su código de
acceso cuando entre al panel, así que conviene avisarle tú.

### Quitar el acceso

Pulsa **Desactivar** en su fila. El acceso se corta **de inmediato**, aunque la persona tenga la
sesión abierta. Es reversible: **Reactivar** lo devuelve.

No hay opción de borrar: desactivar cumple la misma función, se puede deshacer y deja constancia
de quién tuvo acceso.

### Cambiar el rol

Elige otro rol en el desplegable de su fila. El cambio surte efecto de inmediato.

### Reglas que el panel no te dejará saltarte

Si intentas algo de esto verás un mensaje de error. No es un fallo:

| No puedes… | Motivo |
|---|---|
| Cambiar tu propia cuenta | Evita que te quedes fuera del panel por accidente, o que te subas el rol tú mismo |
| Dar un rol superior al tuyo | Un Administrador no puede crear Propietarios |
| Modificar a alguien con más permisos | Un Administrador no puede desactivar a un Propietario |
| Desactivar al último Propietario | Dejaría el panel sin nadie que pueda gestionar accesos, y no habría forma de arreglarlo desde la web |
| Repetir un correo | Dos cuentas con el mismo correo harían impredecible qué permisos se aplican |

> **Si necesitas cambiar tu propia cuenta**, pídeselo a otro Propietario.

---

## 5. Preguntas frecuentes

**¿Los datos son en tiempo real?**
Casi. Para no saturar Zoho, el panel guarda los resultados unos minutos. Pulsa **Actualizar
datos** para forzar una consulta nueva.

**¿Por qué hay redenciones sin bono?**
Porque se crearon directamente en Zoho. El bono solo queda registrado cuando el afiliado lo pide
desde la web.

**¿Por qué "Puntos entregados" no cuadra exactamente con saldo más redimidos?**
Porque hay puntos vencidos y lotes anulados de por medio. Las cifras de saldo del panel son las
mismas que Zoho consolida y que el afiliado ve en su perfil.

**Cambié algo en Zoho y no aparece.**
Pulsa **Actualizar datos**. Si sigue sin verse, puede que el cambio esté en un campo que el panel
no consulta: repórtalo al equipo técnico.

**Me cambiaron el rol y sigo viendo lo mismo.**
Recarga la página. El panel relee tu rol en cada visita, así que no hace falta volver a entrar.

**¿Puedo entrar desde el móvil?**
Sí. El panel se adapta; el menú se abre con el botón **☰**.

**¿Puedo modificar puntos o redenciones desde aquí?**
No. El panel es **solo de consulta** en cuanto a puntos y redenciones. Cualquier corrección se
hace en Zoho CRM. Lo único que se modifica desde el panel son los usuarios que acceden a él.

---

## 6. A quién acudir

| Problema | Contacto |
|---|---|
| No puedo entrar o no recibo el código | Quien te dio el acceso (perfil Propietario o Administrador) |
| Una cifra parece incorrecta | Equipo que administra Zoho CRM: ahí está el dato original |
| El panel muestra un error o no carga | Equipo técnico (Geniorama) |
| Necesito un informe que no existe | Equipo técnico (Geniorama) |
