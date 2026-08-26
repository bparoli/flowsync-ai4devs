/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/**
 * Espejo de `TaskTransformer` del backend (app/transformers/task_transformer.ts).
 */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export type Task = {
  id: number
  title: string
  status: TaskStatus
  assigneeName: string | null
  /** Fecha de calendario en formato `YYYY-MM-DD`, o `null` si no tiene. */
  dueDate: string | null
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTaskPayload = {
  title: string
}

/**
 * `status`/`dueDate` ausentes significa "no tocar"; `dueDate: null` significa
 * "quitar la fecha".
 */
export type UpdateTaskPayload = {
  status?: TaskStatus
  dueDate?: string | null
}
