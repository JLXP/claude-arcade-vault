# SPEC 01 — MVP visual de Arcade Vault (pantallas sin lógica de juego)

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-14
> **Objective:** Portar las 5 pantallas del prototipo estático en `public/references/templates/` a rutas reales de Next.js App Router, con datos mock y simulación visual de juego, sin implementar ningún juego real.

## Por qué existe este spec

El prototipo (`app.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `data.jsx`) es una SPA React sueltas vía CDN con routing por `location.hash`. Este spec rompe ese patrón a propósito: usa rutas reales de Next.js App Router en inglés en vez de hash routing, porque es el proyecto real (no un prototipo de un solo archivo HTML).

Además, `app/globals.css` ya contiene una copia casi 1:1 de `styles.css` del prototipo (portada en el commit `ddbd6a9`, con las fuentes migradas a `next/font/google`). Este spec no reescribe estilos: los reutiliza tal cual.

## Scope

**In:**

- 5 pantallas como rutas reales de Next.js: Library (`/`), GameDetail (`/games/[id]`), GamePlayer (`/games/[id]/play`), Auth (`/auth`), Leaderboard (`/leaderboard`).
- `Nav` (enlaces desktop + panel hamburguesa móvil) y footer, montados una vez en `app/layout.tsx`.
- Contexto de usuario en cliente (`UserProvider`): login con nombre, "jugar como invitado", logout. Persistido en `localStorage` bajo la clave `av_user`.
- Simulación visual de partida en GamePlayer: puntuación que sube sola por `setInterval` mientras no está en pausa/terminada, subida de nivel cada 2500 puntos, botón pausa, botón fin, modal de fin de partida con formulario para "guardar puntuación" (guarda en `localStorage` bajo `av_scores`, no lee de vuelta).
- Módulo de datos mock `lib/data.ts`: `GAMES` (8 juegos), `CATS`, `PLAYERS`, `seededScores()` — portados literalmente desde `data.jsx`.
- Reutilización de `app/globals.css` y sus clases existentes (`.card`, `.cover-bricks`, `.btn`, `.crt`, `.av-hall`, etc.) sin reescribir a utilidades de Tailwind.
- Comportamiento responsive del nav (panel móvil) igual al del template.

**Out of scope (para futuros specs):**

- Lógica real de cualquiera de los 8 juegos (colisiones, input de teclado/táctil, game loop real).
- Backend, API o base de datos — toda la persistencia es `localStorage` en el navegador.
- Autenticación real (hash de contraseñas, sesiones server-side, OAuth). Los botones sociales (Google/GitHub) quedan decorativos y no funcionales, igual que en el template.
- Leer `av_scores` de vuelta en Detalle o Salón de la Fama — esas tablas siguen usando datos sembrados (`seededScores`), igual que el template.
- Sistema de créditos real — el contador "CRÉDITOS · 03" del nav queda estático.
- Internacionalización — el texto de la interfaz permanece en español; solo los segmentos de ruta y nombres de archivo están en inglés.
- Pruebas automatizadas (no hay test runner configurado en el proyecto).

## Data model

```ts
// lib/types.ts
type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS, p.ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string; // p.ej. "12.4K"
};

type ScoreRow = { rank: number; name: string; score: number; date: string };

type User = { name: string } | null;
```

```ts
// lib/data.ts
export const GAMES: Game[]; // los 8 juegos, portados literalmente de data.jsx
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[]; // 18 nombres para el generador
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Contexto de usuario (`lib/user-context.tsx`), en cliente:

```ts
type UserContextValue = {
  user: User;
  login: (user: { name: string }) => void;
  loginGuest: () => void;
  logout: () => void;
};
```

Claves de `localStorage`:

- `av_user` — JSON de `User` (`null` si es invitado sin cuenta).
- `av_scores` — JSON array de `{ game: string; score: number; name: string; at: number }`, solo se escribe, nunca se lee en esta fase.

## Implementation plan

1. Crear `lib/types.ts` y `lib/data.ts` portando `GAMES`, `CATS`, `PLAYERS` y `seededScores()` desde `public/references/templates/data.jsx`. Verificación: `npm run lint` pasa, el módulo se puede importar sin errores de tipos.
2. Crear `lib/user-context.tsx` (`"use client"`) con `UserProvider` (lee/escribe `av_user` en `localStorage`, con `try/catch`) y hook `useUser()`. Envolver `{children}` en `app/layout.tsx` con `UserProvider`.
3. Crear `components/nav.tsx` (`"use client"`) portando `nav.jsx`: logo, links Library/Leaderboard vía `next/link`, estado activo vía `usePathname()`, contador de créditos estático, botón auth (usa `useUser()`), panel hamburguesa móvil. Montarlo en `app/layout.tsx` junto a un footer igual al de `app.jsx` (`© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`).
4. Crear `components/game-card.tsx` portando `GameCard` de `biblioteca.jsx` (tilt on hover, badge de mejor puntuación, botón JUGAR).
5. Reescribir `app/page.tsx` (reemplaza el scaffold de `create-next-app`) como pantalla Library: hero con `flicker`, buscador, chips de categoría, grid de `GameCard` navegando a `/games/[id]`.
6. Crear `app/games/[id]/page.tsx` (GameDetail): portada, tags, título, descripción, stat-strip, botones "Jugar ahora" (`→ /games/[id]/play`) y "Volver al Vault" (`→ /`), leaderboard lateral con `seededScores`. `notFound()` si el `id` no existe en `GAMES`.
7. Crear `app/games/[id]/play/page.tsx` (`"use client"`, GamePlayer): HUD (jugador/puntuación/vidas/nivel), botones pausa/fin/salir, arena CRT decorativa, modal de fin de partida con input de iniciales y botón "guardar puntuación" (escribe `av_scores`), botón reiniciar.
8. Crear `app/auth/page.tsx` (`"use client"`, Auth): tabs iniciar sesión / crear cuenta, campos de formulario, submit llama a `login()` y navega a `/`, botón "jugar como invitado" llama a `loginGuest()`, botones sociales decorativos, texto legal decorativo.
9. Crear `app/leaderboard/page.tsx` (Leaderboard): tabs por juego, podio (top 3), tabla completa, fila "tu mejor marca" cuando `useUser()` devuelve un usuario.
10. Revisar manualmente las 5 rutas con `npm run dev` comparando contra el prototipo en `public/references/templates/Arcade Vault.html` y correr `npm run lint` + `npm run build`.

## Acceptance criteria

- [ ] `/` muestra la Library: hero, buscador funcional (filtra por título) y chips de categoría (filtran por `cat`).
- [ ] Cada `GameCard` en `/` navega a `/games/[id]` al hacer clic en la tarjeta o en "JUGAR".
- [ ] `/games/[id]` muestra portada, descripción, stats y tabla de mejores puntuaciones para un `id` válido; un `id` inexistente da 404.
- [ ] "JUGAR AHORA" en Detalle navega a `/games/[id]/play`.
- [ ] `/games/[id]/play` incrementa la puntuación automáticamente cada ~220ms mientras no está en pausa ni terminada.
- [ ] El botón "PAUSA" detiene el incremento de puntuación y lo reanuda al pulsar de nuevo.
- [ ] El botón "FIN" abre el modal de fin de partida con la puntuación final.
- [ ] Guardar la puntuación en el modal escribe una entrada en `localStorage.av_scores` y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] "VOLVER AL VAULT" desde el modal navega a `/`.
- [ ] `/auth` permite alternar entre "INICIAR SESIÓN" y "CREAR CUENTA", enviar el formulario guarda el usuario en `localStorage.av_user` y navega a `/`.
- [ ] "JUGAR COMO INVITADO" en `/auth` navega a `/` sin requerir datos de formulario.
- [ ] Tras iniciar sesión, el nav muestra el nombre de usuario en vez de "Iniciar Sesión"; al cerrar sesión vuelve a mostrar "Iniciar Sesión".
- [ ] `/leaderboard` muestra tabs por juego, podio con top 3 y tabla completa; cambiar de tab cambia los datos mostrados.
- [ ] Con sesión iniciada, `/leaderboard` muestra la fila "TU MEJOR MARCA EN [JUEGO]"; sin sesión, no aparece.
- [ ] El panel de navegación móvil (hamburguesa) abre y cierra correctamente en viewport angosto.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** rutas reales de Next.js App Router, con segmentos en inglés (`/games/[id]`, `/games/[id]/play`, `/auth`, `/leaderboard`). Elegido por el usuario sobre mantener el hash routing del prototipo.
- **No:** SPA de una sola ruta con `location.hash` como `app.jsx`. Se descarta a favor de URLs reales por pantalla, más idiomático en Next.js.
- **Sí:** reutilizar `app/globals.css` tal como quedó portado en el commit `ddbd6a9` (variables CSS, clases `.card`/`.cover-*`/`.crt`/etc.) en vez de reescribir el diseño a utilidades de Tailwind.
- **Sí:** mantener la simulación visual de partida en GamePlayer (puntuación autoincremental, pausa, modal de fin) tal como en el prototipo. El usuario confirmó que "no implementar ningún juego" no excluye animaciones decorativas sin input real del jugador.
- **Sí:** persistir `av_user` y `av_scores` en `localStorage`, sin backend — coherente con "solamente la parte visual".
- **No:** leer `av_scores` de vuelta para alimentar Detalle o Salón de la Fama. El prototipo tampoco lo hace; esas tablas siguen usando `seededScores` con datos sembrados.
- **No:** sistema de créditos real. El contador "CRÉDITOS · 03" del nav queda como texto estático, igual que en el template.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` bloqueado (modo privado) o no disponible | Envolver lecturas/escrituras en `try/catch`, igual que hace el prototipo; la app sigue funcionando, solo no persiste. |
| `setInterval` de puntuación sigue corriendo tras desmontar el componente (navegación fuera de `/games/[id]/play`) | Limpiar el interval en el `return` del `useEffect`, igual que `reproductor.jsx`. |

## What is **not** in this spec

- Juegos reales (los 8 títulos del catálogo) — cada uno, si se implementa, va en su propio spec.
- Backend, API o base de datos.
- Autenticación real (contraseñas, sesiones, OAuth).
- Lectura de `av_scores` en las tablas de puntuaciones.
- Sistema de créditos funcional.
- Internacionalización de la interfaz.
- Pruebas automatizadas.
