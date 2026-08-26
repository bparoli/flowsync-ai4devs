## Context

FlowSync no tiene todavía ninguna tabla ni ruta de dominio propio: solo cuentas y sesión (`users`, `auth_access_tokens`). Este change añade el primer recorte vertical de negocio real, reutilizando en todo lo posible la infraestructura que el vertical de auth ya dejó sentada (guard de sesión, convención `serialize()`/transformer, `lib/api.ts` como único cliente HTTP, `ProtectedRoute`).

Restricciones de partida (ver `proposal.md`): API de tres operaciones exactas, sin fecha de vencimiento, sin orden decidido, lista única sin privacidad, responsable identificado solo por nombre, sin reasignación de responsable ni límite de título en este change, y sin tests.

## Goals / Non-Goals

**Goals:**
- Persistir tareas (título, estado, responsable) y exponerlas por una API mínima y coherente con las convenciones ya usadas en `account`/`auth`.
- Una pantalla de lista de tareas, protegida por sesión, que cubra los criterios de las 5 historias en alcance reutilizando componentes ya existentes.
- Mantener cerrado el contrato: tres operaciones, tres estados, un solo dato de entrada al crear.

**Non-Goals (deliberado, no placeholders):**
- Fecha de vencimiento, lectura individual de una tarea, borrado, endpoints de equipo/usuarios, criterio de orden, reasignación de responsable, límite de longitud de título, tests.
- Navegación cruzada entre `/profile` y `/tasks`: este change no toca ninguna pantalla ni requisito ya documentado en la capability `auth` (el proposal declara "Modified Capabilities: ninguna"). `/tasks` es una ruta protegida nueva, alcanzable por URL directa; enlazarla desde el resto de la app queda para un change posterior.

## Decisions

- **Tabla `tasks`**: `id`, `title` (string, requerido), `status` (string, uno de `pending`/`in_progress`/`done`), `assignee_id` (FK a `users`, requerido, `onDelete('CASCADE')` igual que `auth_access_tokens`), `created_at`, `updated_at`. Sin columna de vencimiento ni siquiera nullable: no se deja preparada.
- **Rutas**, bajo el mismo grupo autenticado que `/account`: `GET /api/v1/tasks` (listar), `POST /api/v1/tasks` (crear), `PATCH /api/v1/tasks/:id` (actualizar estado). Nada de `GET /api/v1/tasks/:id` ni `DELETE`: el PATCH por id no es lectura individual, es la única forma de decir *qué* tarea se actualiza.
- **Validadores VineJS**: `createTaskValidator` con `title: vine.string().trim().minLength(1)` (el `.trim()` hace que un título de solo espacios falle `minLength`, sin necesitar una regla aparte). `updateTaskValidator` con `status: vine.enum(['pending', 'in_progress', 'done'])`, siguiendo el mismo `vine.create({...})` que ya usa `app/validators/user.ts`.
- **Sin reglas de autorización por dueño**: cualquier usuario autenticado puede hacer `PATCH` sobre cualquier tarea; no hay chequeo de `assignee_id === auth.user.id` en ningún punto (restricción 5).
- **`TaskTransformer` expone `assigneeName: string | null`, nunca `assigneeId` ni el email del responsable.** Igual que la nota de la propia historia E3-1 advierte, devolver el registro de usuario completo (o su id) filtra datos de cuenta a una vista que no los necesita y, una vez consumido por el cliente, ya no se puede recortar sin romperlo. El fallback a "Sin nombre" se aplica en el frontend (mismo patrón que ya usa `profile-page.tsx` con `user.fullName ?? 'Sin nombre'`), no en el backend.
- **`Task.create` fija `status: 'pending'` y `assigneeId: auth.user.id` en el controlador**, no en el validador ni en un default de columna: el validador de creación no acepta esos campos en absoluto (si el cliente los manda, se ignoran), así que no hay forma de que un payload los sobrescriba.
- **Frontend — nueva página `/tasks`** colgada del mismo `<Route element={<ProtectedRoute />}>` donde ya vive `/profile`, en `app-routes.tsx`.
- **Frontend — sin componente `Select` ni `Table` nuevos.** El único control de `frontend/src/components/ui/` que serviría (un `Select` de shadcn) no existe todavía en el repo, y añadirlo sería un paso más de lo que "reutiliza lo que ya hay" pide. El cambio de estado se resuelve con un `<select>` HTML nativo estilado con las mismas clases utilitarias que ya usa `Input`, y las filas de la lista con marcado semántico simple (no una tabla ni un `Card` por fila), coherente con el resto de páginas del repo.
- **Estado local, sin refetch**: al crear una tarea o cambiar un estado, la página actualiza su lista en memoria con la tarea que devuelve la propia respuesta (`POST`/`PATCH` ya devuelven la tarea completa), en vez de volver a pedir el listado entero. Sin optimistic UI: el `<select>` de estado se deshabilita mientras la petición está en curso y solo se refleja el cambio cuando el backend confirma, igual que los formularios de auth deshabilitan su botón con `isSubmitting`.
- **Traducción de estados a español (`Pendiente`/`En curso`/`Hecho`) vive en el frontend**, como una constante junto a la página de tareas — mismo patrón que la traducción de errores de VineJS ya vive en `lib/api.ts` y no en el backend.
- **Formulario de creación con estado local propio**, sin reutilizar literalmente `useAuthForm` (vive en `src/auth/` y está pensado para formularios multi-campo con `fieldErrors`); el de crear tarea es un único campo, así que replica el mismo patrón (deshabilitar mientras envía, mostrar el error del backend con el `Alert`/`FieldError` ya existentes) con un estado más simple en la propia página.

## Risks / Trade-offs

- [Sin paginación en el listado] → con muchas tareas la respuesta crece sin límite. Mitigación: aceptable para el volumen de un equipo pequeño en el MVP; si crece, es trabajo futuro ligado a los puntos ya abiertos en el backlog sobre volumen y orden.
- [`assigneeName` sin id en la respuesta] → un change futuro que necesite reasignar por id tendrá que ampliar el contrato de la API. Mitigación: aceptado a propósito ahora, por la restricción de no filtrar datos de cuenta.
- [`/tasks` sin enlace de navegación desde el resto de la app] → hay que teclear la URL para llegar. Mitigación: aceptable como primer corte vertical; añadir el enlace es un follow-up de bajo riesgo que si tocara `auth` se documentaría como requisito modificado en ese momento.
- [Sin optimistic UI en el cambio de estado] → la interacción espera la respuesta del servidor antes de reflejar el cambio, algo menos inmediata a cambio de no dejar estados inconsistentes sin ningún test que los cubra.

## Migration Plan

- Nueva migración (`create_tasks_table`) — tabla vacía, sin datos que migrar. `node ace migration:run` la crea y regenera `database/schema.ts`.
- Sin cambios en tablas existentes ni en el modelo `User`.
- Rollback: `node ace migration:rollback` sobre esa única migración; no hay estado previo que restaurar.

## Open Questions

- Orden de la lista y si se agrupa por persona — depende de PA-3 del PRD, no se resuelve en este change (restricción 4).
- Cuántas tareas "En curso" puede acumular una persona — depende de PA-4, fuera de alcance.
- Reasignar el responsable de una tarea — fuera de alcance; requeriría además un endpoint para listar usuarios, hoy prohibido por la restricción de tres operaciones.
- Límite de longitud del título — la propia historia E2-2 lo deja sin decidir; no se implementa ningún tope en este change.
- Cómo se llega a `/tasks` desde el resto de la aplicación (enlace en `/profile`, o pasa a ser la pantalla de aterrizaje tras el login) — se deja para un change posterior que si toca `auth` lo documentará ahí.
