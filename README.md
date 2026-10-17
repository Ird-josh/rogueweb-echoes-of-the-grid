# RogueWeb: Ecos del Grid

RogueWeb es un roguelike de acción para navegador. Se puede jugar en solitario o en cooperativo de hasta tres jugadores. El cliente dibuja el juego en un canvas; un servidor Node.js ofrece la API, valida sesiones, guarda datos en PostgreSQL y coordina lobbies y partidas con Socket.IO.

Este documento sirve como mapa del código y guía para ejecutar, probar y modificar el proyecto.

## Contenido

- [Tecnologías y arquitectura](#tecnologías-y-arquitectura)
- [Mapa del repositorio](#mapa-del-repositorio)
- [Cómo fluye una partida](#cómo-fluye-una-partida)
- [Configurar el entorno local](#configurar-el-entorno-local)
- [Comandos de desarrollo y pruebas](#comandos-de-desarrollo-y-pruebas)
- [Dónde modificar cada característica](#dónde-modificar-cada-característica)
- [Buenas prácticas](#buenas-prácticas)
- [Despliegue y solución de problemas](#despliegue-y-solución-de-problemas)

## Tecnologías y arquitectura

| Parte | Tecnología | Responsabilidad |
|---|---|---|
| Cliente web | React, TypeScript y Vite | Pantallas, controles, configuración y renderizado del juego. |
| Gráficos | Canvas 2D | Escenario, personajes, enemigos, proyectiles, efectos y HUD. |
| API | Node.js y Express | Sesiones, lobbies, historial y telemetría. |
| Tiempo real | Socket.IO | Estado del lobby y mensajes de la partida cooperativa. |
| Identidad | Supabase Auth | Inicio de sesión con Google o GitHub y validación de tokens. |
| Datos | Supabase PostgreSQL | Lobbies, miembros e historial de partidas. |
| Producción | Render | Sitio estático del cliente y servicio web de API en servicios separados. |

```text
Navegador (React + Canvas)
  ├── Supabase Auth: iniciar sesión con Google/GitHub
  ├── HTTP /api/* ────────────────> API Express ──> PostgreSQL
  └── Socket.IO ──────────────────> API Express ──> demás jugadores
```

La clave pública/anon de Supabase puede estar en el cliente. La contraseña de PostgreSQL, los secretos OAuth y cualquier clave `service_role` son privados y nunca deben incluirse en el cliente ni en una variable `VITE_*`.

## Mapa del repositorio

### Cliente (`client/`)

| Archivo | Qué contiene |
|---|---|
| `src/main.tsx` | Punto de entrada: monta React y la aplicación en la página. |
| `src/App.tsx` | Coordina menú/partida, audio, ajustes, progresión y guardado al terminar. |
| `src/LobbyUI.tsx` | Menú principal, selección de personaje, OAuth, creación/unión a lobbies y estado de sala. |
| `src/GameCanvas.tsx` | Bucle y estado de juego; dibujo Canvas, mapa, combate, enemigos, HUD, controles táctiles, fullscreen y sincronización cooperativa. Es el módulo más grande: procura hacer cambios acotados aquí. |
| `src/RunContent.ts` | Tipos y datos de personajes, armas, mejoras y contenido de las partidas. |
| `src/FloorLayout.ts` | Generación y estructura de las salas del piso. |
| `src/GameSettings.ts` | Tipos, valores iniciales, acciones y controles configurables. |
| `src/SettingsMenu.tsx` | Interfaz para cambiar los ajustes. |
| `src/RunProgression.ts` | Progreso local del jugador, guardado en `localStorage`, y coste de mejoras. |
| `src/TelemetryDashboard.tsx` | Interfaz del historial/telemetría de partidas. |
| `src/backend.ts` | Cliente Supabase, URL de API, tipos compartidos de lobby y helper `apiRequest`. |
| `src/index.css`, `src/App.css` | Estilos globales y de la aplicación. |
| `src/*.test.ts` | Pruebas del cliente (actualmente incluye generación de pisos). |
| `public/audio/game-music.wav` | Música predeterminada del juego. Se pide al navegador al reproducirla, no al cargar el menú. |
| `public/` | Recursos estáticos que Vite copia tal cual a la compilación. |

### Servidor (`server/`)

| Archivo | Qué contiene |
|---|---|
| `index.js` | Arranque del proceso: comprueba variables, abre PostgreSQL, configura Express y Socket.IO y escucha en el puerto de Render. |
| `app.js` | Rutas HTTP, CORS, autenticación por ruta, validaciones de petición y manejo de errores. |
| `auth.js` | Extrae el bearer token y pregunta a Supabase quién es el usuario. El servidor no confía en el nombre/ID enviados por el navegador. |
| `lobbies.js` | Reglas de negocio y consultas PostgreSQL para crear, buscar, entrar, salir, iniciar y marcar listo un lobby. |
| `passwords.js` | Hash y verificación de contraseñas de lobby con `scrypt` y comparación segura. |
| `socket.js` | Eventos de lobby y juego en tiempo real, autenticación de conexiones, límites de frecuencia y validación del estado compartido. |
| `validation.js` | Validación de estadísticas y paginación antes de consultar/escribir datos. |
| `client-origins.js` | Normalización de los orígenes web permitidos para CORS. |
| `db/schema.sql` | Esquema PostgreSQL, restricciones, índices y permisos/RLS. |
| `db/migrate.js` | Aplica el esquema usando `DATABASE_URL`. |
| `*.test.js` | Pruebas del servidor con el runner nativo `node:test`. |

### Configuración del proyecto

- `package.json`: comandos y dependencias del servidor.
- `client/package.json`: comandos y dependencias del cliente.
- `.env.example`, `client/.env.example`: plantillas de configuración local; no contienen contraseñas.
- `render.yaml`: definición de los dos servicios de Render y sus variables públicas/de conexión.
- `.gitignore`: evita subir dependencias, builds y archivos locales.

## Cómo fluye una partida

1. `main.tsx` monta `App.tsx`. La aplicación muestra el menú (`LobbyUI`) hasta que el jugador inicia una partida.
2. Supabase abre el flujo OAuth con Google o GitHub. Al volver, el cliente conserva la sesión de Supabase.
3. `backend.ts` agrega el token de sesión como `Authorization: Bearer ...` en llamadas autenticadas.
4. Express (`app.js`) valida el token preguntando a Supabase (`auth.js`) y después ejecuta las reglas de `lobbies.js` o persiste estadísticas.
5. Los lobbies guardan código, nombre, estado, anfitrión y miembros en PostgreSQL. Los códigos tienen seis caracteres, el lobby admite hasta tres jugadores y su contraseña se almacena como hash.
6. Socket.IO autentica cada conexión. Los eventos `lobby:*` actualizan la sala; `game:input` lleva controles al anfitrión y `game:state` distribuye el estado del juego a los demás.
7. En cooperativo, el anfitrión ejecuta la simulación y es la autoridad del estado compartido. Si se desconecta, la partida cooperativa actual no puede continuar. Es una arquitectura para jugar juntos, no un sistema anti-trampas.
8. Al concluir una partida, `App.tsx` envía sus estadísticas a `POST /api/runs`. La progresión de mejoras del menú es local al navegador; el historial guardado se consulta en la API.

### Rutas HTTP principales

Todas las rutas están bajo `/api`:

| Método y ruta | Uso | Requiere sesión |
|---|---|---|
| `GET /api/health` | Comprueba que la API puede consultar la base de datos. | No |
| `GET /api/auth/me` | Devuelve la identidad del token actual. | Sí |
| `POST /api/runs` | Valida y guarda el resultado de una partida. | Sí |
| `GET /api/telemetry?page=1&pageSize=8` | Consulta historial paginado para administradores. | Sí y correo incluido en `TELEMETRY_ADMIN_EMAILS` |
| `POST /api/lobbies` | Crea un lobby protegido con contraseña. | Sí |
| `GET /api/lobbies/:code` | Consulta el lobby si el usuario pertenece a él. | Sí |
| `POST /api/lobbies/:code/join` | Entra a un lobby con contraseña y personaje. | Sí |

Socket.IO usa eventos como `lobby:join`, `lobby:ready`, `lobby:start`, `lobby:leave`, `lobby:update`, `game:join`, `game:input`, `game:state` y `game:error`. Si cambias un nombre o el formato de un evento, actualiza cliente, servidor y pruebas en el mismo cambio.

### Datos persistentes

`server/db/schema.sql` define:

- `game_runs`: usuario, personaje, resultado, piso, bajas, duración, inventario y código del lobby.
- `game_lobbies`: código, nombre, hash de contraseña, anfitrión y estado.
- `game_lobby_members`: jugadores, personaje elegido, indicador de listo y fecha de entrada.

Las tablas tienen RLS activado y revocan acceso directo a `anon` y `authenticated`. El servidor accede a PostgreSQL mediante su conexión privada. Cambios de esquema deben ser compatibles con los datos existentes y probarse con una migración antes de producción.

## Configurar el entorno local

Requisitos: Node.js compatible con Vite 8 (Node 20.19+ o 22.12+), npm y un proyecto Supabase con PostgreSQL.

1. Clona el repositorio y abre una terminal en su carpeta raíz.
2. Copia las plantillas:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item client/.env.example client/.env.local
   ```

3. Completa las variables:

   | Variable | Dónde | Descripción |
   |---|---|---|
   | `DATABASE_URL` | `.env` raíz | Cadena PostgreSQL privada de Supabase; conserva `sslmode=require`. |
   | `SUPABASE_URL` | `.env` raíz | URL del proyecto Supabase para la API. |
   | `SUPABASE_ANON_KEY` | `.env` raíz | Clave pública que usa el servidor para consultar Supabase Auth; no es la service-role. |
   | `TELEMETRY_ADMIN_EMAILS` | `.env` raíz, opcional | Lista de correos administradores separados por coma. |
   | `VITE_SUPABASE_URL` | `client/.env.local` | La misma URL de Supabase para el navegador. |
   | `VITE_SUPABASE_ANON_KEY` | `client/.env.local` | Clave pública/anon; nunca pongas aquí una clave privada. |
   | `VITE_API_URL` | `client/.env.local` | En local, `http://localhost:3000`. |
   | `VITE_AUTH_REDIRECT_URL` | Cliente, opcional | Destino de retorno OAuth. En desarrollo local normalmente se usa el origen del navegador. |
   | `VITE_GAME_MUSIC_URL` | Cliente, opcional | URL que reemplaza la música incluida. |

4. En Supabase, configura **Authentication → URL Configuration**. Para desarrollo permite `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173` y `http://127.0.0.1:5174`. Configura Google/GitHub en **Authentication → Providers**; ambos usan como callback la URL indicada por Supabase, con forma `https://<project-ref>.supabase.co/auth/v1/callback`. Los secretos de proveedores se guardan en Supabase, nunca en el código.
5. Instala dependencias y crea/actualiza las tablas:

   ```powershell
   npm install
   npm --prefix client install
   npm run db:migrate
   ```

   Como alternativa, ejecuta `server/db/schema.sql` una vez en Supabase SQL Editor.

6. Inicia API y cliente en terminales separadas:

   ```powershell
   npm run dev
   npm --prefix client run dev
   ```

   La API local usa el puerto 3000 y Vite el 5173. El estado de la API se puede revisar en `http://localhost:3000/api/health`.

No compartas `.env`, `client/.env.local`, contraseñas, tokens de sesión, URL OAuth con tokens ni secretos en capturas o issues. En teléfonos, abre la URL pública del cliente: `localhost` desde un teléfono apunta al propio teléfono.

## Comandos de desarrollo y pruebas

Desde la raíz del repositorio:

```powershell
npm run dev                 # API con reinicio al cambiar archivos
npm start                   # API sin modo watch
npm test                    # Pruebas del servidor (node:test)
npm run db:migrate           # Aplica el esquema SQL de Supabase
npm --prefix client run dev  # Cliente Vite
npm --prefix client run build # Verificación TypeScript y build de producción
npm --prefix client test    # Pruebas del cliente (Vitest)
npm --prefix client run lint # Lint del cliente (oxlint)
```

Antes de enviar cambios, ejecuta al menos la prueba o build que cubre tu módulo. Para cambios que conectan cliente/API, prueba ambos lados y el flujo completo.

## Dónde modificar cada característica

| Quiero cambiar… | Empieza por… | Recuerda revisar… |
|---|---|---|
| Personajes, estadísticas, armas o mejoras | `client/src/RunContent.ts` | Simulación y dibujo de `GameCanvas.tsx`; validación de IDs en `server/lobbies.js` y `server/validation.js`. |
| Enemigos, combate, habitaciones o HUD | `client/src/GameCanvas.tsx` | Build, juego en escritorio y controles/tamaño/orientación en móvil. |
| Generación del piso | `client/src/FloorLayout.ts` | Su prueba `FloorLayout.test.ts` y cómo `GameCanvas.tsx` usa el layout. |
| Controles, dificultad, sonido o fullscreen | `GameSettings.ts`, `SettingsMenu.tsx`, `App.tsx` | Teclado, mouse y móvil; mantener valores por defecto válidos. |
| Menú, login o lobbies | `LobbyUI.tsx`, `backend.ts` | Rutas HTTP, eventos Socket.IO, OAuth y respuestas de error. |
| Reglas/validación del servidor | `server/validation.js`, `server/lobbies.js` | Pruebas correspondientes y validación tanto para HTTP como para Socket.IO. |
| Eventos en tiempo real | `server/socket.js` y el cliente (`LobbyUI.tsx`/`GameCanvas.tsx`) | Autenticación, pertenencia al lobby, límites de frecuencia, desconexiones y pruebas. |
| Historial o estructura SQL | `server/app.js`, `server/db/schema.sql` | `TelemetryDashboard.tsx`, pruebas, permisos y migración compatible con datos existentes. |
| Música | `client/public/audio/` o `VITE_GAME_MUSIC_URL` | Usa solo audio que tengas derecho a publicar; considera tamaño, formato y descarga móvil. |
| Dominios/servicios de producción | `render.yaml` y ajustes de Render/Supabase | URL del cliente, URL de API, CORS, OAuth redirect allowlist y estado de ambos despliegues. |

## Buenas prácticas

1. **Haz cambios pequeños y relacionados.** Antes de editar, busca dónde se usa la función o dato; no dupliques reglas entre cliente y servidor si pueden compartir un contrato claro.
2. **Mantén contratos sincronizados.** Si cambia un campo de API, mensaje Socket.IO, ID de personaje o fila SQL, actualiza todas las partes que lo leen/escriben y sus pruebas.
3. **Valida en el servidor.** Los datos del navegador no son confiables, aunque TypeScript los tipifique. Valida tamaños, tipos, IDs y permisos antes de hacer consultas o retransmitir eventos.
4. **Usa SQL parametrizado.** Pasa valores como parámetros (`$1`, `$2`); no armes consultas concatenando texto de usuario.
5. **Protege secretos y sesiones.** No registres tokens/contraseñas ni los pongas en commits, screenshots o variables `VITE_*`. La clave anon es pública; la contraseña de base de datos y service-role no.
6. **Conserva límites de recursos.** Mantén los límites de JSON, payloads, jugadores y frecuencia de eventos; aumentar un límite afecta memoria y tráfico.
7. **Cuida el bucle gráfico.** `GameCanvas.tsx` contiene lógica de frame y dibujo. Evita trabajo pesado/consultas por frame, asignaciones repetidas innecesarias y cambios grandes sin probar rendimiento en móvil.
8. **Mantén los cambios accesibles y móviles.** Comprueba tamaños de texto, contraste, foco/teclado, controles táctiles, orientación y pantalla estrecha.
9. **Prueba errores, no solo el caso feliz.** Considera sesión vencida, API dormida/no disponible, lobby lleno, contraseña incorrecta, anfitrión desconectado y respuesta inválida.
10. **Revisa antes del commit.** Ejecuta `git diff --check`, revisa `git diff`, corre tests/build/lint relevantes y confirma que `.env`, builds y archivos temporales no estén incluidos.
11. **Actualiza este README** cuando cambien comandos, variables, endpoints, tablas, arquitectura o despliegue.

## Despliegue y solución de problemas

`render.yaml` declara dos servicios:

- `rogueweb-echoes-grid-api`: servidor Node, PostgreSQL, Supabase Auth, REST y Socket.IO.
- `rogueweb-echoes-grid`: cliente estático React/Vite; su compilación recibe `VITE_*` y se publica como `dist/`.

El Blueprint de Render debe seguir la rama `main`. Las variables privadas `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` se configuran en el servicio API; el cliente recibe `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `render.yaml` configura el host público del cliente para CORS, el host de API para el cliente y el destino público OAuth.

Para publicar cambios, integra el cambio en `main` y espera a que los despliegues de cliente y/o API aparezcan como **Live** en Render. Un push exitoso a GitHub no significa que la compilación o el despliegue hayan terminado.

| Síntoma | Qué revisar |
|---|---|
| El juego apunta a `localhost` en producción | `VITE_API_URL` del cliente; Vite incorpora `VITE_*` durante el build, así que hay que volver a compilar/desplegar. |
| Error CORS al llamar a la API | El origen exacto del sitio en `CLIENT_ORIGIN` del servidor, incluyendo `https://` y sin ruta. |
| API no inicia o health devuelve error | Logs de Render y variables `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`; comprueba que se aplicó el esquema. |
| No vuelve de Google/GitHub | Proveedor habilitado en Supabase, Client ID/secret correcto, callback Supabase en el proveedor y URL pública incluida en **Authentication → URL Configuration**. |
| Lobby no conecta | Health de API, URL de API del bundle publicado, CORS y logs de API; también confirma que el usuario inició sesión. |
| El primer intento tras inactividad tarda | El servicio gratuito puede estar despertando; espera y vuelve a intentar. |
| No suena música | Ajustes de sonido, interacción del usuario (los navegadores bloquean autoplay), solicitud de `audio/game-music.wav` y consola de red. |
| El juego se ve mal o va lento en móvil | Prueba en orientación horizontal, revisa fullscreen/zoom, resolución, controles táctiles y carga del canvas en el dispositivo real. |

La API tiene el endpoint de salud `https://<api-service>.onrender.com/api/health`; una respuesta sana se ve así:

```json
{"status":"ok","database":"ok"}
```

Render en el plan gratuito puede dormir servicios inactivos. Los dos jugadores necesitan conexión a la API durante una partida cooperativa y el anfitrión debe permanecer conectado.
