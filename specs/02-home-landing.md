# SPEC 02 — Home (landing) y reubicación de Biblioteca a /library

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-08-17
> **Objective:** Portar la pantalla Home (landing) de `public/references/templates/home-about/home.jsx` a la ruta raíz `/`, reubicando la Biblioteca que hoy ocupa `/` a `/library`.

## Por qué existe este spec

SPEC 01 montó la pantalla Biblioteca (filtro + grid de juegos) directamente en `app/page.tsx`, ocupando la ruta raíz `/`. El template completo (`public/references/templates/`) en realidad distingue dos pantallas separadas: **Inicio** (landing con hero, features, preview de juegos, stats, actividad en vivo, pricing) y **Biblioteca** (el catálogo filtrable). Este spec introduce Home como landing real en `/` — como en el template — y mueve la Biblioteca actual a `/library` sin tocar su comportamiento.

`about.jsx` (Acerca de + Contacto) también vive en `public/references/templates/home-about/`, pero queda fuera de este spec: se implementará por separado.

## Scope

**In:**

- Nueva pantalla Home en `app/page.tsx` (reemplaza el contenido actual de Biblioteca, que se reubica): hero con eyebrow parpadeante y silhouettes pixel flotantes, sección "¿Por qué Arcade Vault?" (4 feature cards con iconos SVG), preview de juegos (6 mini-cards desde `GAMES`), sección de stats (3 bloques), sección "Actividad en vivo" (ticker de últimas puntuaciones + top 5 jugadores del día, con datos hardcodeados literalmente del template), sección de pricing con FAQ, CTA final.
- Animación de aparición al hacer scroll (`useReveal`, `IntersectionObserver` sobre `.reveal`) portada tal cual del template — es la primera pantalla del proyecto que la usa.
- Reubicación literal del contenido actual de `app/page.tsx` (pantalla Biblioteca: hero `flicker`, buscador, chips, grid de `GameCard`) a `app/library/page.tsx`, sin cambios de comportamiento ni de nombre de componente exportado más allá de lo necesario por la nueva ruta.
- Actualización de `components/nav.tsx`: agregar link "Inicio" → `/` (desktop y panel móvil), cambiar el link "Biblioteca" → `/library`, actualizar `isActive` para que "Inicio" solo esté activo en `/` exacto y "Biblioteca" en `/library` o `/games/*` (igual que hoy).
- Los botones de navegación del Home usan rutas reales existentes: "Explorar juegos" y "Ver todos los juegos" → `/library`; "Crear cuenta" y "Empezar gratis" → `/auth`; mini-cards de juegos → `/games/[id]`; "Ver salón" → `/leaderboard`; CTA final ("Insertar moneda") → `/library`.
- Estilos: agregar a `app/globals.css` el bloque `HOME PAGE` del template (`styles.css` líneas 930–1069: `.home`, `.home-hero`, `.home-hero-inner`, `.hero-eyebrow`, `.home-title`, `.home-sub`, `.home-ctas`, `.hero-scroll`, `.home-silos`, `.home-section`, `.section-head`, `.section-rule`, `.feature-grid`, `.feature-card`, `.mini-rail`, `.mini-card`, `.mini-cover`, `.mini-meta`, `.home-stats`, `.stats-inner`, `.stat-block`, `.home-final`, `.reveal`) y el bloque de Actividad/Pricing que vive más abajo en el mismo archivo (`styles.css` líneas 1622–1723: `.activity-grid`, `.activity-card`, `.ac-head`, `.ac-title`, `.ticker`, `.tick-row`, `.tk-*`, `.top-list`, `.top-row`, `.tp-*`, `.pricing-grid`, `.price-card`, `.pc-*`, `.pricing-faq`, `.faq-item`). Ninguna de estas clases existe hoy en `app/globals.css`.

**Out of scope (para futuros specs):**

- Pantalla About/Contacto (`about.jsx`), incluyendo el link "Acerca de" del nav.
- Leer `av_scores`/`av_user` en la sección "Actividad en vivo" — queda 100% estática con los datos de ejemplo del template, igual que Detalle y Salón de la Fama en SPEC 01.
- Sistema de créditos real.
- Cualquier lógica de juego real.
- Pruebas automatizadas (no hay test runner configurado).

## Data model

Sin estructuras nuevas. Home reutiliza `GAMES` de `lib/data.ts` (ya existente) para las 6 mini-cards de preview; el resto del contenido (features, stats, ticker de actividad, top jugadores, pricing/FAQ) es texto y arrays literales embebidos en el componente, portados tal cual del template.

## Implementation plan

1. Mover el contenido actual de `app/page.tsx` a `app/library/page.tsx` sin modificar su lógica (buscador, chips de categoría, grid de `GameCard`). Verificación: `/library` se ve y filtra igual que `/` antes del cambio.
2. Actualizar `components/nav.tsx`: agregar `Link` "Inicio" → `/` antes de "Biblioteca" (desktop y panel móvil), cambiar el `href` de "Biblioteca" a `/library`, y separar `isActive` en `home` (`pathname === "/"`) y `library` (`pathname === "/library" || pathname.startsWith("/games/")`). Verificación: el estado activo resalta correctamente en `/`, `/library` y `/games/[id]`.
3. Agregar a `app/globals.css` los dos bloques de estilos del template listados en Scope (HOME PAGE + Actividad/Pricing), pegados tal cual sin reescribir a Tailwind, igual que el resto del proyecto.
4. Escribir `app/page.tsx` (`"use client"`, nueva pantalla Home) portando `home.jsx`: hook `useReveal` local con `IntersectionObserver` sobre `.reveal`; componente `FloatingSilhouettes` (8 SVGs pixel decorativos) y `FeatureIcon` inline en el mismo archivo (no se reutilizan en otras pantallas); componente `MiniCard` inline usando `GAMES.slice(0, 6)`; secciones hero, features, preview de juegos, stats, actividad en vivo (arrays hardcodeados del template), pricing/FAQ y CTA final. Botones usan `useRouter().push(...)` hacia las rutas listadas en Scope.
5. Revisar manualmente `npm run dev`: comparar `/` contra `public/references/templates/home-about/arcade-vault-standalone.html` (o `home.jsx` renderizado), confirmar que `/library` no cambió de comportamiento, y que el nav resalta "Inicio"/"Biblioteca" correctamente en desktop y móvil. Correr `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] `/` muestra la pantalla Home: hero con silhouettes flotantes y eyebrow parpadeante, sección de 4 features, preview de 6 juegos desde `GAMES`, sección de stats, sección de actividad en vivo (ticker + top 5), sección de pricing con FAQ, CTA final.
- [ ] Las secciones marcadas `reveal` aparecen con animación de fade/slide al hacer scroll hasta ellas.
- [ ] "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" en Home navegan a `/library`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" en Home navegan a `/auth`.
- [ ] Cada mini-card de la preview de juegos navega a `/games/[id]` del juego correspondiente.
- [ ] "VER SALÓN →" en la tarjeta de top jugadores navega a `/leaderboard`.
- [ ] El CTA final ("INSERTAR MONEDA →") navega a `/library`.
- [ ] `/library` muestra la Biblioteca (hero, buscador, chips, grid) con el mismo comportamiento que tenía antes en `/`.
- [ ] En el nav, "Inicio" está activo solo en `/`; "Biblioteca" está activo en `/library` y en `/games/*`.
- [ ] El panel móvil (hamburguesa) incluye el link "Inicio" y navega correctamente.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** Home pasa a ocupar `/` y la Biblioteca se reubica a `/library`. Elegido por el usuario para que la estructura de rutas refleje la distinción Inicio/Biblioteca del template en vez de forzar la Biblioteca en la raíz.
- **Sí:** actualizar el nav para agregar el link "Inicio" en este mismo spec — sin eso, Home no sería alcanzable desde la navegación.
- **No:** incluir la pantalla About/Contacto (`about.jsx`) en este spec, ni el link "Acerca de" en el nav. El usuario confirmó que queda para un spec aparte, ya que trae su propia lógica de formulario y estado de envío.
- **Sí:** portar la sección "Actividad en vivo" con los mismos arrays hardcodeados del template (sin generarlos con `seededScores()`). El usuario confirmó que se mantiene igual de estática que el resto de las pantallas ya implementadas en SPEC 01 (Detalle y Salón de la Fama tampoco leen `av_scores`).
- **Sí:** `FloatingSilhouettes`, `FeatureIcon` y `MiniCard` se declaran inline dentro de `app/page.tsx` en vez de como componentes separados en `components/`, porque solo se usan en esta pantalla — igual de criterio que el template, que los define en el mismo archivo que `Home`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El bloque de estilos de Actividad/Pricing vive lejos (líneas 1622–1723) del resto de estilos de Home (930–1069) en `styles.css` del template — fácil de pasar por alto si solo se copia el primer bloque. | Este spec deja ambos rangos documentados explícitamente en Scope e Implementation plan. |
| Mover `app/page.tsx` a `app/library/page.tsx` sin actualizar referencias rotas (imports relativos, si los hubiera). | El componente actual solo usa imports absolutos (`@/components/...`, `@/lib/...`), por lo que mover el archivo no debería requerir tocar imports. |

## What is **not** in this spec

- Pantalla About/Contacto (`about.jsx`) y su link "Acerca de" en el nav.
- Lectura de `av_scores`/`av_user` en la sección de Actividad en vivo.
- Sistema de créditos funcional.
- Lógica real de cualquiera de los 8 juegos.
- Backend, API o base de datos.
- Pruebas automatizadas.
