# SPEC 03 — Acerca de + formulario de contacto con envío real por Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-17
> **Objective:** Portar la pantalla Acerca de + Contacto de `public/references/templates/home-about/about.jsx` a la ruta `/about` y conectar su formulario a un envío real de correo vía Resend.

## Por qué existe este spec

SPEC 02 portó Home y dejó `about.jsx` explícitamente fuera de scope ("trae su propia lógica de formulario y estado de envío"), junto con el link "Acerca de" del nav. Este spec cierra esa deuda y agrega lo que el template no tiene: el formulario del template solo simula el envío (`setSent(form.name)` sin red), así que aquí se introduce la primera pieza de backend del proyecto — un Route Handler que llama a Resend — y los estados de carga y error que un envío real necesita.

## Scope

**In:**

- Nueva pantalla en `app/about/page.tsx` (`"use client"`) portando `about.jsx`: hero Acerca de (kicker, título con gradiente, párrafo de misión), fila de 3 `highlight` con iconos SVG pixel (`HighlightIcon`: `HEART`, `BROWSER`, `PLANT`), divisor animado (`about-divider` con 24 píxeles parpadeantes), y sección de contacto (intro + tips con LEDs + formulario).
- Formulario de contacto con los 3 campos del template (`name`, `email`, `msg`), validación en cliente igual que el template (campos vacíos ⇒ animación `shake`, sin envío) y terminal de éxito `VAULT-OS // TERMINAL` con el nombre en mayúsculas y botón "ENVIAR OTRO MENSAJE".
- Envío real: `POST /api/contact` en `app/api/contact/route.ts` que llama a Resend con el SDK `resend`.
- Estados nuevos que el template no tiene: **enviando** (botón `disabled` con texto `▸ ENVIANDO…`, bloquea doble submit) y **error** (banner rojo estilo arcade sobre el botón + `shake`, conservando lo escrito para reintentar).
- Validación en el servidor dentro del route handler: `name`, `email` y `msg` presentes y no vacíos tras `trim()`, `email` con formato válido, y límites de largo (`name` ≤ 80, `email` ≤ 160, `msg` ≤ 4000). Falla ⇒ `400` con `{ error }`.
- Nueva dependencia `resend` en `package.json`.
- Variables de entorno `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, documentadas en `.env.example` versionado (con excepción en `.gitignore`, que hoy ignora `.env*`).
- Extraer `useReveal` de `app/page.tsx` a `lib/use-reveal.ts` y consumirlo desde Home y About.
- Actualizar `components/nav.tsx`: link "Acerca de" → `/about` en desktop y en el panel móvil, y `isActive` reconoce `about` (`pathname === "/about"`).
- Estilos: agregar a `app/globals.css` el bloque `ABOUT PAGE` del template (`public/references/templates/home-about/styles.css` líneas 1071–1146: `.about`, `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight`, `.hl-icon`, `.hl-text`, `.about-divider`, `.div-bar`, `.div-pixels`, `@keyframes pxblink`, `.about-contact`, `.contact-grid`, `.contact-intro`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.tip`, `.tip-led`, `.contact-form`, `@keyframes shake`, `.btn.press`, `.terminal-success`, `.term-bar`, `.term-body`), más una clase nueva `.form-error` para el banner de error (no existe en el template).

**Out of scope (para futuros specs):**

- Honeypot, captcha y rate limiting por IP.
- Correo de confirmación / acuse de recibo al visitante.
- Dominio propio verificado en Resend y remitente personalizado.
- Plantillas de correo con `react-email` o JSX.
- Persistir los mensajes enviados (base de datos, log, dashboard).
- Sistema de créditos real y lógica de juego.
- Pruebas automatizadas (no hay test runner configurado).

## Data model

Sin estructuras persistidas nuevas. Solo el contrato del endpoint y el estado local del formulario:

```ts
// Body de POST /api/contact
type ContactRequest = { name: string; email: string; msg: string };

// Respuestas
// 200 -> { ok: true }
// 400 -> { error: "..." }   validación fallida
// 500 -> { error: "..." }   Resend falló o falta configuración

// Estado local en app/about/page.tsx
const [form, setForm] = useState({ name: "", email: "", msg: "" });
const [sent, setSent] = useState<string | null>(null); // nombre enviado
const [shake, setShake] = useState(false);
const [sending, setSending] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Variables de entorno (`.env.example`):

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
CONTACT_TO_EMAIL=tu-correo@ejemplo.com
```

El remitente queda fijo en el código como `Arcade Vault <onboarding@resend.dev>` (sandbox de Resend, no requiere dominio verificado). El `replyTo` del correo es el `email` que escribió el visitante.

## Implementation plan

1. Agregar a `app/globals.css` el bloque `ABOUT PAGE` del template (líneas 1071–1146 de `public/references/templates/home-about/styles.css`), pegado tal cual sin reescribir a Tailwind, más la regla nueva `.form-error`. Verificación: `npm run dev` levanta sin errores de CSS.
2. Crear `lib/use-reveal.ts` con el hook `useReveal` movido literal desde `app/page.tsx`, y hacer que `app/page.tsx` lo importe en vez de definirlo. Verificación: `/` sigue animando las secciones `.reveal` al hacer scroll.
3. Instalar `resend` (`npm i resend`) y crear `.env.example` con `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, agregando `!.env.example` a `.gitignore` para que no lo trague la regla `.env*`. Verificación: `git status` muestra `.env.example` como archivo nuevo rastreable.
4. Crear `app/api/contact/route.ts` con el handler `POST`: leer y validar el body, devolver `400` si falla, `500` si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, y en el camino feliz llamar a `resend.emails.send` con `from` sandbox, `to: CONTACT_TO_EMAIL`, `replyTo` del visitante, asunto `Arcade Vault — mensaje de <nombre>` y cuerpo HTML inline con los tres campos (mensaje escapado). Antes de escribirlo, leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`. Verificación: `curl -X POST localhost:3000/api/contact` con body válido devuelve `{"ok":true}` y llega el correo; con body vacío devuelve `400`.
5. Crear `app/about/page.tsx` portando `about.jsx`: `useReveal()`, secciones hero + highlights + divisor + contacto, `HighlightIcon` declarado inline en el mismo archivo (solo se usa aquí), y el formulario con `onSubmit` que valida en cliente, hace `fetch("/api/contact")`, maneja `sending`/`error` y en éxito pasa a la terminal `terminal-success`. Verificación: `/about` se ve igual que el template y el envío completa el ciclo.
6. Actualizar `components/nav.tsx`: agregar `Link` "Acerca de" → `/about` después de "Salón de la Fama" en desktop y en el panel móvil, y extender el tipo y el cuerpo de `isActive` con `about`. Verificación: el link resalta solo en `/about`.
7. Revisión manual con `npm run dev`: comparar `/about` contra `public/references/templates/home-about/arcade-vault-standalone.html`, probar los cuatro caminos del formulario (campos vacíos, envío OK, error del servidor con API key inválida, reintento tras error). Correr `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] `/about` muestra el hero "ACERCA DE ARCADE VAULT" con kicker, título en gradiente y párrafo de misión.
- [ ] La fila de highlights muestra las 3 tarjetas (corazón/magenta, navegador/cyan, planta/verde) con sus iconos SVG pixel.
- [ ] El divisor animado aparece entre Acerca de y Contacto con los 24 píxeles parpadeando desfasados.
- [ ] Enviar el formulario con cualquiera de los 3 campos vacío dispara la animación `shake` y no hace ninguna petición de red.
- [ ] Durante el envío el botón muestra `▸ ENVIANDO…`, queda deshabilitado y un segundo clic no dispara una segunda petición.
- [ ] Un envío exitoso reemplaza el formulario por la terminal `VAULT-OS // TERMINAL` con el nombre en mayúsculas y el botón "ENVIAR OTRO MENSAJE" que restaura el formulario vacío.
- [ ] El correo llega a la dirección de `CONTACT_TO_EMAIL` con el nombre, correo y mensaje del formulario, y responder al correo dirige al `email` del visitante (`replyTo`).
- [ ] Si `/api/contact` responde con error, se muestra el banner `.form-error`, el formulario se agita y los datos escritos siguen ahí para reintentar.
- [ ] `POST /api/contact` con un campo vacío o un correo malformado responde `400` sin llamar a Resend.
- [ ] `POST /api/contact` sin `RESEND_API_KEY` configurada responde `500` y la app no crashea.
- [ ] En el nav, "Acerca de" navega a `/about` y está activo solo en esa ruta, tanto en desktop como en el panel móvil.
- [ ] `/` (Home) sigue animando sus secciones `.reveal` después de mover `useReveal` a `lib/use-reveal.ts`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** Route Handler `app/api/contact/route.ts` en vez de Server Action. Mantiene el componente del template casi intacto (`fetch` desde el `onSubmit` que ya existe), permite probar el envío con `curl` sin abrir el navegador y da control explícito sobre los códigos de estado.
- **No:** Server Action con `useActionState`. Habría obligado a reescribir el manejo de estado del formulario del template.
- **Sí:** remitente sandbox `onboarding@resend.dev`, destino en `CONTACT_TO_EMAIL`. No requiere verificar un dominio ni tocar DNS, así que el spec es verificable el mismo día. Costo aceptado: en sandbox Resend solo entrega a la dirección dueña de la cuenta.
- **No:** dominio propio verificado en este spec. Es un cambio de infraestructura, no de código; se hace cuando exista el dominio.
- **Sí:** cuerpo del correo en HTML inline armado como string en el route handler, con `replyTo` al visitante. Cero dependencias extra y se responde directo desde el cliente de correo.
- **No:** `react-email`. Dos dependencias y un directorio `emails/` para un solo correo transaccional.
- **Sí:** SDK `resend` en vez de `fetch` crudo a `api.resend.com`. Trae tipos y el shape del error ya normalizado.
- **Sí:** estados `sending` y `error`, que el template no tiene. El template simula el envío; con red real, sin ellos el usuario no sabría si se mandó y el doble clic mandaría dos correos.
- **Sí:** banner `.form-error` (clase nueva) en vez de reusar `.terminal-success` en rojo. La terminal reemplaza el formulario, y en un error hay que conservar lo escrito.
- **Sí:** validación duplicada en cliente y servidor. La del cliente es UX (shake instantáneo); la del servidor es la que cuenta, porque el endpoint es público.
- **No:** honeypot, captcha y rate limiting. El usuario los dejó fuera para no meter almacenamiento ni piezas nuevas en este spec; si el endpoint recibe spam, van en su propio spec.
- **No:** correo de confirmación al visitante. Duplica los puntos de falla y con el remitente sandbox ni siquiera se entregaría.
- **Sí:** extraer `useReveal` a `lib/use-reveal.ts` y hacer que `app/page.tsx` lo importe. Segundo consumidor del hook; duplicarlo garantizaba que las dos copias se desincronizaran.
- **Sí:** `HighlightIcon` declarado inline en `app/about/page.tsx`, no en `components/`. Solo se usa en esta pantalla — mismo criterio que `FloatingSilhouettes` y `FeatureIcon` en SPEC 02.
- **Sí:** `.env.example` versionado con la excepción `!.env.example` en `.gitignore`. Sin eso, la regla `.env*` existente lo ignora y nadie sabe qué variables hacen falta.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El remitente sandbox `onboarding@resend.dev` solo entrega a la dirección dueña de la cuenta de Resend; con otro `CONTACT_TO_EMAIL` la API responde OK pero el correo no llega. | Documentarlo en `.env.example` como comentario y usar en desarrollo la dirección de la cuenta de Resend. |
| `.gitignore` ignora `.env*`, así que `.env.example` no se rastrea si no se agrega la excepción. | El paso 3 del plan agrega `!.env.example` y verifica con `git status`. |
| Filtrar `RESEND_API_KEY` al cliente si se lee desde el componente. | La clave solo se lee dentro de `app/api/contact/route.ts` (código de servidor) y nunca lleva el prefijo `NEXT_PUBLIC_`. |
| Inyección de HTML en el correo con el contenido del campo mensaje. | Escapar `<`, `>`, `&` y comillas antes de interpolarlos en el HTML del correo. |
| Endpoint público sin rate limit, abusable para mandar correos en masa a la casilla del equipo. | Aceptado conscientemente en este spec; los límites de largo acotan el tamaño y la protección real queda anotada como spec futuro. |
| `next@16.3.0` puede haber cambiado la convención de Route Handlers respecto a lo que el modelo recuerda. | El paso 4 obliga a leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` antes de escribir el archivo, como manda `AGENTS.md`. |

## What is **not** in this spec

- Honeypot, captcha o rate limiting del endpoint de contacto.
- Correo de acuse de recibo al visitante.
- Dominio propio verificado en Resend.
- Plantillas de correo con `react-email`.
- Guardar los mensajes en base de datos o mostrarlos en un panel.
- Sistema de créditos funcional y lógica real de los juegos.
- Pruebas automatizadas.

Cada uno, si aterriza, va en su propio spec.
