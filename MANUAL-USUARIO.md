# Manual del panel administrativo — Mi Premio

Guía para el equipo que consulta los informes del programa de lealtad **Mi Premio**
(Germán Morales Hoteles). No necesitas conocimientos técnicos para usarlo.

- **Dirección del panel:** `https://mipremiogermanmoraleshoteles.com/admin`
- **Última actualización:** 9 de septiembre de 2026

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

- **Informes** — todo lo relativo a puntos y redenciones. Se despliega en siete secciones:
  Resumen, Redenciones, Puntos, Afiliados, Comerciales, Hoteles y Puntos por vencer.
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

### 3.3 Puntos

Responde a una sola pregunta: **de todo lo que se ha cargado, ¿dónde está?**

| Tarjeta | Qué significa |
|---|---|
| **Cargado** | Todos los puntos que ha emitido el programa |
| **Disponible** | Lo que sigue vivo y el afiliado aún puede gastar |
| **Redimido** | Lo que ya se canjeó por bonos |
| **Vencido** | Lo que caducó sin que nadie lo usara |

Las tres últimas **suman exactamente la primera**. El panel lo comprueba en cada carga; si
alguna vez no cuadrara, te lo diría en pantalla en vez de callarlo.

Debajo hay dos cifras de gestión:

- **Vence en menos de 90 días** — el saldo en riesgo ahora mismo. Es la señal de cuándo lanzar
  una campaña de recordatorio; el detalle de a quién avisar está en *Puntos por vencer*.
- **Consumo del programa** — qué porcentaje de lo cargado ya canjearon los afiliados.

Y tres bloques más: el **valor cargado por mes** (pasa el cursor sobre una columna), el
**detalle por mes** —de lo que se cargó en cada mes, cuánto sigue vivo y cuánto se perdió— y el
reparto de **lotes por estado** tal y como están en el CRM.

Con el selector **Meses en la serie** eliges si mirar los últimos 12, 24 o 36 meses.

> **Cómo se reparten los meses.** Un lote suma en el mes en que **se cargó**. Si además caducó
> sin usarse, resta en el mes en que **venció**, que casi nunca es el mismo. Por eso un mes
> puede tener muchos puntos vencidos sin haber cargado ninguno.

> **La primera carga tarda.** Este informe lee el detalle de cada membresía una por una. Después
> queda guardado unos minutos y responde al instante. Lo comparte con *Hoteles* y *Puntos por
> vencer*: si acabas de abrir uno de los tres, los otros dos van rápidos.

### 3.4 Afiliados

Una fila por afiliado, con sus puntos entregados, redimidos, saldo disponible, vencidos y su
número de redenciones.

Puedes buscar por nombre, correo o número de membresía, filtrar por tipo de afiliado, filtrar
por **comercial** y mostrar solo quienes tienen saldo. **Pulsa el encabezado de una columna para
ordenar** por ella.

La columna **Comercial** te dice quién atiende a cada afiliado. Si buscas la cartera completa de
una persona, el filtro **Comercial** te la deja sola en pantalla; para ver los totales de todos,
usa el informe de Comerciales.

#### Agencias y corporativos

La columna **Sector** separa a los afiliados de **agencia** de los **corporativos**, y el filtro
del mismo nombre te deja ver solo unos u otros. Arriba, el bloque **Agencias frente a
corporativos** compara los dos grupos: cuántos afiliados y empresas hay en cada uno, cuántos
tienen saldo, cuántos han redimido y cuántos puntos mueven.

> **Cómo se decide el sector.** Zoho no tiene ningún campo que diga a qué se dedica una empresa,
> así que el panel lo deduce del **nombre**: si menciona "agencia", es agencia; si no,
> corporativo. Hoy son 53 afiliados de agencia (6 empresas) frente a 363 corporativos.

> **Es una aproximación, no un dato del CRM.** La regla deja fuera agencias que no llevan esa
> palabra en el nombre —"PANAMERICANA DE VIAJES SAS" o "DE UNA COLOMBIA TOURS" salen como
> corporativas— y admite alguna que no es agencia de viajes, como "AGENCIA COLOCADORA DE SEGUROS".
> Sirve para hacerse una idea del reparto; para una cifra exacta habría que registrar el sector
> en Zoho.

> **Sobre "Ciclos".** En Zoho cada afiliado tiene una membresía principal y varias "hijas", una
> por ciclo. El panel las agrupa y te muestra el total consolidado, que es la cifra que el
> afiliado ve en su perfil.

#### Ver el sitio como lo ve un afiliado

El botón **Ver como**, al final de cada fila, abre el sitio tal y como lo ve esa persona: su
saldo, su historial de puntos y su perfil. Sirve para resolver dudas de soporte sin pedirle
capturas de pantalla.

Es un **modo de solo lectura**. Mientras estás en él verás una barra naranja arriba indicando de
quién es la vista, y **no podrás redimir bonos ni cambiar su foto**: los botones desaparecen y,
si aun así se intentara, el sistema lo rechaza. No hay forma de actuar en nombre del afiliado.

Para volver, pulsa **Salir de la previsualización** en esa barra. Si te olvidas, expira sola a
los 30 minutos.

> **Queda registrado.** Cada vez que alguien usa **Ver como** se guarda quién miró la cuenta de
> quién. Es una herramienta de soporte, no de curiosidad: estás accediendo a datos personales de
> un afiliado.

### 3.5 Comerciales

Una fila por comercial, con la cartera de afiliados que tiene a cargo: cuántos son, cuántos
puntos se les entregaron, cuánto se ha redimido y qué saldo queda vivo.

| Columna | Qué significa |
|---|---|
| **Afiliados** | Cuántos tiene asignados, y cuántos de ellos ya tienen membresía abierta |
| **Entregado** | Puntos que han recibido sus afiliados, en pesos y en puntos |
| **Redimido** | Cuánto de eso ya se canjeó por bonos |
| **Tasa de redención** | Qué porcentaje de lo entregado se ha usado |
| **Activados** | Cuántos de sus afiliados han redimido al menos una vez |
| **Altas** | Cuántos afiliados suyos entraron al programa en el periodo elegido |
| **Saldo** | Puntos vivos que su cartera todavía puede gastar |
| **Por vencer** | De ese saldo, cuánto caduca pronto |

Puedes ordenar por cualquiera de esas cifras, buscar por nombre o correo, y ocultar el grupo
*Sin comercial asignado*.

#### Cuántos afiliados entran en un periodo

El bloque **Periodo de altas** responde a "¿cuántos usuarios inscribió cada comercial el último
mes?". Elige un preset —**Mes en curso**, **Último mes cerrado**, **Últimos 3 meses**, **Últimos
12 meses** o **Todo el histórico**— o escribe un rango a mano en **Desde** y **Hasta**.

La columna **Altas** se recalcula con ese periodo. Al lado verás un minigráfico con la evolución
de los últimos 12 meses, y arriba el gráfico **Altas mes a mes** con el total de los comerciales
que tengas a la vista.

> **Ojo: el periodo solo afecta a la columna Altas.** Las demás cifras (entregado, redimido,
> saldo) son siempre del histórico completo. Es a propósito: el saldo de un afiliado no
> "pertenece" al mes en que entró.

> **Qué cuenta como alta.** Zoho no guarda una fecha de inscripción al programa, así que el panel
> cuenta a alguien el mes en que **recibió sus primeros puntos**: es el primer hecho con fecha
> que existe en el CRM. Un afiliado que está registrado pero aún no ha recibido puntos no aparece
> en ninguna alta; el pie del informe te dice cuántos están en esa situación.

> **Febrero de 2026 se sale de la escala** (113 altas). No fue un mes excepcional de captación:
> es cuando se cargaron los primeros puntos de casi todo el padrón al montar el programa. Para
> leer el ritmo real, mira de junio de 2026 en adelante.

> **De dónde sale el comercial.** Es el **propietario del contacto en Zoho**: la asignación que
> el equipo ya mantiene en el CRM. El panel solo la lee. Si un afiliado aparece con el comercial
> equivocado, se corrige cambiando el propietario del contacto en Zoho; el panel lo recoge en
> unos minutos (o al pulsar **Actualizar datos**).

> **"Sin comercial asignado".** Normalmente está vacío. Si aparecen afiliados ahí, suelen ser
> personas que salieron del programa en el CRM pero conservan puntos: siguen contando porque su
> saldo es real, pero ya no tienen propietario que los reclame.

### 3.6 Hoteles

Una fila por hotel del portafolio, con los puntos que ha emitido y qué ha pasado con ellos.

| Columna | Qué significa |
|---|---|
| **Hotel** | Nombre del hotel; debajo, cuántos lotes emitió y a cuántos afiliados |
| **Entregado** | Puntos que emitió el hotel, en pesos y en puntos |
| **Redimido** | Cuánto de lo que emitió ya se gastó |
| **Saldo vivo** | Lo que sigue disponible de esos puntos |
| **Vencido** | Lo que caducó sin usarse |
| **Participación** | Qué porcentaje del total del programa emitió este hotel |
| **Última entrega** | Cuándo cargó puntos por última vez |

Puedes ordenar por cualquiera de esas cifras, buscar un hotel por nombre y, con el filtro
**Lotes sin hotel → Ocultar**, dejar fuera los que no identifican hotel. Arriba verás el gráfico
**Valor entregado por hotel** con los diez primeros del listado, respetando el orden que hayas
elegido.

> **De dónde sale el hotel.** Los puntos se emiten contra una **orden de compra**, y el nombre
> del hotel viene dentro de esa orden. El panel lo extrae de ahí, con el mismo criterio que ve
> el afiliado en sus extractos. Es la única forma: no existe un campo de hotel en el CRM.

> **Cuidado con "Redimido".** Los puntos no llevan etiqueta de qué hotel salieron: se gastan por
> antigüedad, los más viejos primero. Así que esta columna significa *cuánto de lo que emitió
> este hotel ya se consumió*, *no* "un afiliado canjeó este bono gracias a este hotel". Esa
> trazabilidad no existe.

> **"Sin hotel".** Son lotes cuya orden de compra no permite identificar el hotel. Al pie del
> informe verás cuántos puntos están en esa situación. Ocúltalos con el filtro si quieres
> comparar solo hoteles reales, pero recuerda que entonces los totales no suman el programa
> entero.

> **La primera carga tarda**, por lo mismo que *Puntos*: los dos leen el detalle de cada
> membresía.

### 3.7 Puntos por vencer

Los puntos que caducan pronto, agrupados por cercanía al vencimiento y con el detalle de qué
afiliado y qué lote.

Es el informe clave para campañas de recordatorio: te dice a quién avisar antes de que pierda
sus puntos. Elige la ventana de tiempo —próximos 30, 60, 90 o 180 días, el próximo año, o todos
los lotes vigentes— y marca **Incluir lotes ya vencidos** si quieres ver también los que ya
caducaron.

> **Este informe tarda más.** Consulta el detalle de cada membresía una por una, así que la
> primera carga puede tomar hasta un minuto. Después queda guardado unos minutos y responde al
> instante.

### 3.8 Descargar a Excel

Cada informe tiene el botón **Descargar CSV**. Dos cosas importantes:

- Descarga **todo lo que coincide con tus filtros**, no solo la página que estás viendo.
- El archivo está preparado para abrirse en Excel en español, con las columnas ya separadas.

### 3.9 Paginación

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

**Puntos, Hoteles o Puntos por vencer tardan mucho en abrir.**
Los tres leen el detalle de cada membresía una por una, y eso lleva unos segundos. Comparten esa
lectura: abierto uno, los otros dos van rápidos. Después queda guardada unos minutos, así que
normalmente los encontrarás ya cargados.

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
