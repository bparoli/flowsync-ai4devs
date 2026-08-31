# Arquitectura de FlowSync

Este documento describe las piezas que FlowSync ejecuta de verdad y cómo se
hablan entre ellas. El diagrama principal es el **de contenedores (C4 nivel 2)**:
tres cosas que se arrancan por separado —la SPA que sirve Vite, la API de
AdonisJS y el fichero SQLite— y las llamadas HTTP concretas que las unen. Debajo
hay dos diagramas de componentes (nivel 3) para el interior de cada aplicación,
y una tabla de las rutas reales.

Todo está sacado de leer el código: las rutas de `backend/start/routes.ts`, el
stack de middleware de `backend/start/kernel.ts`, los controladores, validadores,
transformers y modelos de `backend/app/`, las tablas de
`backend/database/migrations/`, y el lado cliente de `frontend/src/`. Las
etiquetas de las flechas son llamadas que existen en `frontend/src/lib/api.ts`,
el único sitio del frontend que hace `fetch`.

Lo que **no** se dibuja también es deliberado. No hay despliegue, ni cachés, ni
colas, ni un cliente tipado Tuyau en el frontend: el registro de
`backend/.adonisjs/client/` existe, pero hoy solo lo consume
`backend/tests/bootstrap.ts`. El guard `web` de sesión está configurado en
`config/auth.ts` y ninguna ruta lo usa, así que tampoco aparece.

## Contenedores (C4 nivel 2)

```mermaid
C4Container
  title FlowSync — diagrama de contenedores

  Person(usuario, "Miembro del equipo", "Se registra, inicia sesión y gestiona las tareas del espacio compartido")

  System_Boundary(flowsync, "FlowSync") {
    Container(spa, "SPA FlowSync", "React 19, Vite 8, react-router, Tailwind v4, shadcn/ui — :5173", "Pantallas /login, /register, /tasks, /tasks/:id y /profile. Guarda el token en localStorage bajo 'flowsync.token'")
    Container(api, "API FlowSync", "AdonisJS 7, TypeScript 6 — :3333", "API REST bajo /api/v1. Responde siempre JSON y envuelve todo payload en { data: ... }")
    ContainerDb(db, "Base de datos", "SQLite vía better-sqlite3 — backend/tmp/db.sqlite3", "Tablas users, auth_access_tokens y tasks")
  }

  Rel(usuario, spa, "Usa", "HTTPS")

  Rel(spa, api, "Registro y login: POST /auth/signup, POST /auth/login", "JSON")
  Rel(spa, api, "Sesión: GET /account/profile, POST /account/logout", "JSON + Bearer")
  Rel(spa, api, "Tareas: GET/POST /tasks, GET /tasks/:id", "JSON + Bearer")
  Rel(spa, api, "Cambios: PATCH /tasks/:id/status, PUT /tasks/:id/due-date", "JSON + Bearer")

  Rel(api, db, "Lee y escribe", "Lucid 22 / Knex")

  UpdateRelStyle(usuario, spa, $offsetY="-10")
  UpdateLayoutConfig($c4ShapeInRow="1", $c4BoundaryInRow="1")
```

## Componentes de la API (C4 nivel 3)

```mermaid
C4Component
  title API FlowSync — componentes

  Container(spa, "SPA FlowSync", "React", "Cliente de la API")

  Container_Boundary(api, "API FlowSync") {
    Component(kernel, "Stack de middleware", "start/kernel.ts", "force_json_response y CORS a nivel de servidor; bodyparser, session, shield, initialize_auth y silent_auth a nivel de router")
    Component(authmw, "auth_middleware", "Middleware con nombre", "Protege los grupos /account y /tasks con el guard 'api' (access tokens opacos)")
    Component(ctrlAuth, "Controladores de cuenta", "NewAccount, AccessTokens, Profile", "Alta, login, logout y perfil. Emiten y revocan access tokens")
    Component(ctrlTasks, "Controladores de tareas", "Tasks, TaskStatuses, TaskDueDates", "Listar, crear y ver tareas; cambiar el estado; fijar, cambiar o retirar la fecha de vencimiento")
    Component(validators, "Validadores", "VineJS 4 — app/validators/", "Validan request.all(), así que cubren cuerpo y query string. El día de referencia 'today' es obligatorio y no tiene valor por defecto")
    Component(models, "Modelos Lucid", "app/models/", "User (mixin withAuthFinder, getter initials, accessTokens) y Task (belongsTo assignee, isOverdueOn)")
    Component(schema, "Esquema generado", "database/schema.ts", "Autogenerado desde las migraciones. Los modelos extienden estas clases en vez de declarar columnas")
    Component(transformers, "Transformers", "app/transformers/", "User, Task, TaskDetail y TaskAssignee. Recortan qué campos salen de cada modelo")
    Component(serializer, "ApiSerializer", "providers/api_provider.ts", "Inyecta ctx.serialize() en cada HttpContext y envuelve la respuesta en { data: ... }")
  }

  ContainerDb(db, "Base de datos", "SQLite", "users, auth_access_tokens, tasks")

  Rel(spa, kernel, "Petición HTTP", "JSON")
  Rel(kernel, authmw, "Rutas de /account y /tasks")
  Rel(kernel, ctrlAuth, "signup y login, sin autenticar")
  Rel(authmw, ctrlAuth, "profile y logout")
  Rel(authmw, ctrlTasks, "Todo /tasks")
  Rel(authmw, db, "Comprueba el token contra auth_access_tokens")

  Rel(ctrlAuth, validators, "request.validateUsing()")
  Rel(ctrlTasks, validators, "request.validateUsing()")
  Rel(ctrlAuth, models, "verifyCredentials, User.create, accessTokens.create")
  Rel(ctrlTasks, models, "query().preload('assignee'), findOrFail, create, save")
  Rel(models, schema, "Extienden")
  Rel(ctrlAuth, transformers, "UserTransformer")
  Rel(ctrlTasks, transformers, "TaskTransformer, TaskDetailTransformer")
  Rel(transformers, serializer, "El resultado se envuelve con")
  Rel(serializer, spa, "{ data: ... }", "JSON")
  Rel(models, db, "SQL", "Lucid 22 / Knex")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Componentes de la SPA (C4 nivel 3)

```mermaid
C4Component
  title SPA FlowSync — componentes

  Person(usuario, "Miembro del equipo", "Navega por la aplicación")

  Container_Boundary(spa, "SPA FlowSync") {
    Component(main, "main.tsx", "React 19", "Monta BrowserRouter, AuthProvider y AppRoutes")
    Component(routes, "AppRoutes", "react-router", "Declara las rutas. Cualquier ruta desconocida redirige a /tasks")
    Component(guards, "ProtectedRoute y PublicOnlyRoute", "Rutas de layout", "Dejan pasar según el estado de la sesión")
    Component(authprov, "AuthProvider", "Context de React", "Token en localStorage ('flowsync.token'), rehidratado contra GET /account/profile al arrancar. Expone login, signup y logout por use-auth")
    Component(pagesAuth, "Pantallas de cuenta", "login-page, register-page, profile-page", "Formularios de alta y acceso, y la ficha del usuario. Comparten use-auth-form")
    Component(pagesTasks, "Pantallas de tareas", "tasks-page, task-page", "La lista con su filtro por estado y el detalle de una tarea con su fecha de vencimiento")
    Component(comps, "Componentes propios", "task-item, task-filter, auth-layout, field-error, full-screen-loader", "Más los de shadcn/ui en components/ui/, que no se editan a mano")
    Component(apiclient, "lib/api.ts", "fetch", "Único punto de contacto con el backend: desenvuelve el { data }, adjunta Authorization: Bearer, calcula el día local y traduce los errores a ApiError con mensaje en castellano y fieldErrors por campo")
    Component(types, "lib/types.ts", "Tipos TypeScript", "Espejo de los transformers del backend. Task y TaskDetail son tipos distintos, no uno con campos opcionales")
  }

  Container(api, "API FlowSync", "AdonisJS", "API REST bajo /api/v1")

  Rel(usuario, routes, "Navega")
  Rel(main, routes, "Renderiza")
  Rel(main, authprov, "Envuelve la aplicación con")
  Rel(routes, guards, "Agrupa las rutas bajo")
  Rel(guards, authprov, "Leen status y user")
  Rel(guards, pagesAuth, "Solo sin sesión")
  Rel(guards, pagesTasks, "Solo con sesión")
  Rel(pagesTasks, comps, "Pintan con")
  Rel(pagesAuth, authprov, "login, signup, logout")
  Rel(authprov, apiclient, "signup, login, getProfile, logout")
  Rel(pagesTasks, apiclient, "listTasks, createTask, updateTaskStatus, getTask, setTaskDueDate")
  Rel(apiclient, types, "Tipa las respuestas con")
  Rel(apiclient, api, "VITE_API_URL, por defecto http://localhost:3333", "JSON")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Las rutas, una por una

Todas cuelgan de `/api/v1` y salen de `backend/start/routes.ts`. «Auth» significa
que el grupo lleva `.use(middleware.auth())`.

| Método | Ruta | Controlador | Validador | Transformer | Auth |
|---|---|---|---|---|---|
| POST | `/auth/signup` | `NewAccountController.store` | `signupValidator` | `UserTransformer` | no |
| POST | `/auth/login` | `AccessTokensController.store` | `loginValidator` | `UserTransformer` | no |
| GET | `/account/profile` | `ProfileController.show` | — | `UserTransformer` | sí |
| POST | `/account/logout` | `AccessTokensController.destroy` | — | — (devuelve `{ message }` sin envolver) | sí |
| GET | `/tasks` | `TasksController.index` | `listTasksValidator` | `TaskTransformer` | sí |
| POST | `/tasks` | `TasksController.store` | `createTaskValidator` | `TaskTransformer` (201) | sí |
| GET | `/tasks/:id` | `TasksController.show` | `taskReferenceDayValidator` | `TaskDetailTransformer` | sí |
| PATCH | `/tasks/:id/status` | `TaskStatusesController.update` | `updateTaskStatusValidator` | `TaskTransformer` | sí |
| PUT | `/tasks/:id/due-date` | `TaskDueDatesController.update` | `setTaskDueDateValidator` | `TaskDetailTransformer` | sí |

Fuera de `/api/v1` solo existe `GET /`, que devuelve `{ hello: 'world' }`.

## Decisiones que el diagrama no puede enseñar

- **El token manda.** El guard por defecto es `api`: access tokens opacos vía
  `DbAccessTokensProvider`, guardados en `auth_access_tokens`. El frontend los
  mete en `localStorage` y los manda en cada petición protegida; un 401 se
  traduce a «Tu sesión ha caducado» y cierra la sesión local.
- **Nada sale crudo.** Ningún controlador devuelve un modelo: todo pasa por un
  transformer y por `serialize()`, que envuelve en `{ data }`. El frontend
  desenvuelve ese `data` en `lib/api.ts` y en ningún otro sitio.
- **El vencimiento se decide al mirar, no se guarda.** `isOverdue` no es una
  columna: lo calcula `Task.isOverdueOn(referenceDay)` con el día que manda el
  cliente. Por eso `today` es obligatorio en `GET /tasks/:id` y en
  `PUT /tasks/:id/due-date`, y por eso solo `TaskDetailTransformer` expone
  `dueDate` e `isOverdue` — la lista usa otro transformer y no puede enseñarlos.
- **El responsable viaja recortado.** `TaskAssigneeTransformer` expone `id`,
  `fullName` e `initials`, y no reutiliza `UserTransformer`, que incluiría el
  email y las fechas de la cuenta.
- **La lista es del espacio, no de cada uno.** `TasksController.index` no filtra
  por usuario. Sin `?status` devuelve `pending` e `in_progress`; lo hecho queda
  fuera salvo que se pida explícitamente.
- **Cualquiera con sesión puede cambiar cualquier tarea.** Ni el cambio de
  estado ni el de fecha comprueban quién es el responsable.
- **El esquema se genera.** `database/schema.ts` sale de las migraciones
  (`schemaGeneration.enabled` en `config/database.ts`) y no se edita a mano; los
  modelos solo añaden relaciones, mixins, getters y lógica.
- **Una sola base de datos.** `config/database.ts` define una única conexión
  SQLite sin override por entorno, así que los tests functional de
  `backend/tests/functional/` pegan contra el mismo fichero que el servidor de
  desarrollo.
