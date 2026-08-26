## Why

FlowSync tiene hoy cuentas y sesión, pero ninguna forma de anotar ni ver el trabajo del equipo: no existe capability de tareas. Cinco historias de la base del backlog (E3-1, E2-1, E2-2, E2-3, E2-4) ya tienen criterios de aceptación cerrados para el primer recorte usable — una lista compartida con creación mínima y cambio de estado — y no dependen de nada más para implementarse.

## What Changes

- Nueva tabla `tasks`: título, estado (`pending` | `in_progress` | `done`) y responsable (usuario que la creó).
- Nueva API bajo `/api/v1`, protegida con el mismo guard de sesión que ya usa `/account/profile`, con exactamente tres operaciones: listar todas las tareas, crear una y actualizar el estado de una. **BREAKING**: no las hay hoy, así que no rompe nada existente, pero fija el contrato para todo lo que venga después (no habrá lectura individual ni borrado en este change).
- Crear una tarea solo pide el título; el backend asigna automáticamente el estado `pending` y el responsable (quien la crea) sin que el formulario los ofrezca.
- Cambiar el estado de cualquier tarea se hace desde la propia fila de la lista, sin abrir la tarea ni pedir confirmación, y sin restricción por responsable.
- Nueva pantalla de lista de tareas en el frontend, protegida por sesión igual que `/profile`, mostrando título, responsable (por nombre, con "Sin nombre" si no lo tiene) y estado de cada tarea, con estado vacío cuando no hay ninguna.
- Explícitamente fuera de alcance en este change (quedan como puntos abiertos, no se implementan ni se dejan preparados): fecha de vencimiento de la tarea, criterio de orden de la lista, reasignación del responsable, y límite de longitud del título.

## Capabilities

### New Capabilities
- `tasks`: alta, listado y cambio de estado de las tareas de la lista compartida del equipo — la capability de gestión de tareas.

### Modified Capabilities
(ninguna — `auth` no cambia; `tasks` solo reutiliza su guard de autenticación existente sin alterar su contrato)

## Impact

- **Backend** (`backend/`): nueva migración (tabla `tasks`, con `assignee_id` referenciando `users`), modelo `Task`, validador VineJS para creación y para cambio de estado, controlador(es) de tareas, transformer para la respuesta (título, estado, responsable por nombre), rutas nuevas en el grupo autenticado de `/api/v1`.
- **Frontend** (`frontend/`): página nueva de lista de tareas colgada de `ProtectedRoute`, funciones nuevas en `lib/api.ts` (listar, crear, cambiar estado), tipos nuevos en `lib/types.ts`, reutilizando exclusivamente componentes ya existentes en `frontend/src/components/ui/` — sin dependencias nuevas ni sistema de diseño propio.
- **Sin tests**: este change no monta base de pruebas ni añade tests, ni en el backend ni en el frontend.
