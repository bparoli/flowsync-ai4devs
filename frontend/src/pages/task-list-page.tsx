import { useEffect, useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { useAuth } from '@/auth/use-auth'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskDueDateDialog } from '@/components/task-due-date-dialog'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as TaskStatus[]

export function TaskListPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | undefined>()

  const [statusError, setStatusError] = useState<string | null>(null)
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    api
      .listTasks(token)
      .then((data) => {
        if (!cancelled) setTasks(data)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No se pudo cargar la lista de tareas.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    setIsCreating(true)
    setCreateError(null)
    setTitleError(undefined)

    api
      .createTask(token, { title })
      .then((task) => {
        setTasks((current) => (current ? [...current, task] : [task]))
        setTitle('')
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) {
          setTitleError(error.fieldErrors.title)
          if (!error.fieldErrors.title) setCreateError(error.message)
        } else {
          setCreateError('Algo ha ido mal. Inténtalo de nuevo.')
        }
      })
      .finally(() => setIsCreating(false))
  }

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    if (!token) return

    setStatusError(null)
    setPendingStatusId(task.id)

    api
      .updateTask(token, task.id, { status })
      .then((updated) => {
        setTasks(
          (current) =>
            current?.map((t) => (t.id === updated.id ? updated : t)) ?? current,
        )
      })
      .catch((error: unknown) => {
        setStatusError(
          error instanceof ApiError
            ? error.message
            : 'No se pudo cambiar el estado de la tarea.',
        )
      })
      .finally(() => setPendingStatusId(null))
  }

  const handleTaskUpdated = (updated: Task) => {
    setTasks(
      (current) =>
        current?.map((t) => (t.id === updated.id ? updated : t)) ?? current,
    )
  }

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tareas del equipo
          </h1>
          <p className="text-muted-foreground text-sm">
            Una sola lista, compartida por todo el espacio.
          </p>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loadError && tasks === null && <FullScreenLoader />}

        {!loadError && tasks !== null && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Nueva tarea</CardTitle>
                <CardDescription>Solo hace falta el título.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreate}
                  className="flex flex-col gap-2 sm:flex-row sm:items-start"
                  noValidate
                >
                  <div className="flex-1">
                    <Label htmlFor="title" className="sr-only">
                      Título
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="¿Qué hay que hacer?"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      aria-invalid={Boolean(titleError)}
                      aria-describedby={titleError ? 'title-error' : undefined}
                    />
                    <FieldError id="title-error" message={titleError} />
                  </div>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creando…' : 'Crear tarea'}
                  </Button>
                </form>

                {createError && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircleIcon />
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {statusError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            )}

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground text-center text-sm">
                  Todavía no hay tareas en el espacio. Esto es la lista
                  compartida del equipo: crea la primera arriba para que empiece
                  a verse aquí.
                </CardContent>
              </Card>
            ) : (
              <div className="divide-border divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {task.assigneeName ?? 'Sin nombre'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <select
                        value={task.status}
                        disabled={pendingStatusId === task.id}
                        onChange={(event) =>
                          handleStatusChange(
                            task,
                            event.target.value as TaskStatus,
                          )
                        }
                        aria-label={`Estado de "${task.title}"`}
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                      <TaskDueDateDialog
                        taskId={task.id}
                        taskTitle={task.title}
                        onUpdated={handleTaskUpdated}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
