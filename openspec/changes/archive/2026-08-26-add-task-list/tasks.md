## 1. Backend — datos

- [x] 1.1 Crear la migración `create_tasks_table`: `id`, `title` (string, not nullable), `status` (string, not nullable), `assignee_id` (integer, FK a `users.id`, `onDelete('CASCADE')`, not nullable), `created_at`, `updated_at`. Sin columna de vencimiento.
- [x] 1.2 Ejecutar `node ace migration:run` y confirmar que `database/schema.ts` regenera `TaskSchema` con esas columnas.
- [x] 1.3 Crear el modelo `app/models/task.ts` extendiendo `TaskSchema`, con la relación `belongsTo` hacia `User` como `assignee`.

## 2. Backend — validación y transformación

- [x] 2.1 Crear `app/validators/task.ts` con `createTaskValidator` (`title: vine.string().trim().minLength(1)`, sin ningún otro campo aceptado) y `updateTaskValidator` (`status: vine.enum(['pending', 'in_progress', 'done'])`, sin ningún otro campo aceptado).
- [x] 2.2 Crear `app/transformers/task_transformer.ts` que exponga `id`, `title`, `status`, `assigneeName` (a partir de `assignee.fullName`, puede ser `null`), `createdAt`, `updatedAt` — nunca `assigneeId` ni el email del responsable.

## 3. Backend — rutas y controlador

- [x] 3.1 Crear `app/controllers/tasks_controller.ts` con `index` (lista todas las tareas cargando la relación `assignee`), `store` (valida con `createTaskValidator`, crea con `status: 'pending'` y `assigneeId: auth.user.id`) y `update` (valida con `updateTaskValidator`, busca la tarea por id y actualiza solo `status`, sin comprobar quién es el responsable).
- [x] 3.2 Registrar en `start/routes.ts`, dentro del prefijo `/api/v1` y protegidas con `middleware.auth()` (mismo grupo que `/account`): `GET tasks`, `POST tasks`, `PATCH tasks/:id`.
- [x] 3.3 Arrancar el servidor una vez para que se regeneren `.adonisjs/server/controllers.ts` y el registro Tuyau, y commitear ese diff generado.

## 4. Frontend — tipos y cliente API

- [x] 4.1 Añadir a `lib/types.ts`: `TaskStatus = 'pending' | 'in_progress' | 'done'`, `Task` (`id`, `title`, `status`, `assigneeName: string | null`, `createdAt`, `updatedAt`), `CreateTaskPayload` (`title`), `UpdateTaskStatusPayload` (`status`).
- [x] 4.2 Añadir a `lib/api.ts`: `listTasks(token)`, `createTask(token, payload)`, `updateTaskStatus(token, id, payload)`, siguiendo el mismo `request()` y el mismo desenvuelto de `{ data }` que ya usan `login`/`signup`/`getProfile`.

## 5. Frontend — pantalla de la lista

- [x] 5.1 Crear `pages/task-list-page.tsx`: al montar, pide el listado con el token de la sesión (`useAuth`) y lo guarda en estado local; mientras carga, reutiliza `FullScreenLoader`; si falla, muestra el error con `Alert`/`AlertDescription`.
- [x] 5.2 Estado vacío: si el listado cargó y no hay tareas, mostrar una explicación breve de qué es la lista y un modo de crear la primera tarea, en vez de una lista en blanco.
- [x] 5.3 Formulario de creación (un único campo de título + botón "Crear tarea"): valida en el propio backend (título vacío o solo espacios → error 422 mostrado junto al campo con `FieldError`); al crear con éxito, añade la tarea devuelta por la API al estado local sin volver a pedir el listado ni recargar la página.
- [x] 5.4 Fila de cada tarea: título, responsable (`task.assigneeName ?? 'Sin nombre'`) y un `<select>` nativo de estado con las tres opciones fijas (Pendiente/En curso/Hecho) mapeadas a `pending`/`in_progress`/`done`; sin fecha ni marca de vencida en ningún punto de la fila.
- [x] 5.5 Cambiar el `<select>` de una fila llama a `updateTaskStatus`, deshabilitando ese control mientras la petición está en curso, y sustituye esa tarea en el estado local por la que devuelve la API al confirmar (sin optimistic UI ni refetch del listado completo).
- [x] 5.6 Añadir la constante de traducción de estados (`{ pending: 'Pendiente', in_progress: 'En curso', done: 'Hecho' }`) junto a la página, no en `lib/api.ts` ni en el backend.

## 6. Frontend — enrutado

- [x] 6.1 Añadir la ruta `/tasks` con `TaskListPage` dentro del mismo `<Route element={<ProtectedRoute />}>` donde ya vive `/profile`, en `routes/app-routes.tsx`. Sin tocar el resto de rutas ni añadir ningún enlace de navegación desde `/profile` (fuera de alcance de este change).
