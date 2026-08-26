import { useState } from 'react'
import { AlertTriangleIcon, CalendarIcon, Loader2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task } from '@/lib/types'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TaskDueDateDialogProps = {
  taskId: number
  taskTitle: string
  onUpdated: (task: Task) => void
}

/**
 * "Abrir la tarea" en este change es esto: no hay pantalla de detalle
 * todavía, así que ver y editar la fecha de vencimiento vive en un diálogo.
 */
export function TaskDueDateDialog({
  taskId,
  taskTitle,
  onUpdated,
}: TaskDueDateDialogProps) {
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dueDateInput, setDueDateInput] = useState('')
  const [dateError, setDateError] = useState<string | undefined>()

  const handleOpenChange = (open: boolean) => {
    if (!open || !token) {
      setTask(null)
      setLoadError(null)
      setDateError(undefined)
      return
    }

    api
      .getTask(token, taskId)
      .then((fetched) => {
        setTask(fetched)
        setDueDateInput(fetched.dueDate ?? '')
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No se pudo cargar la tarea.',
        )
      })
  }

  const handleDueDateChange = (value: string) => {
    if (!token) return

    const previous = task?.dueDate ?? ''
    setDueDateInput(value)
    setDateError(undefined)

    api
      .updateTask(token, taskId, { dueDate: value || null })
      .then((updated) => {
        setTask(updated)
        setDueDateInput(updated.dueDate ?? '')
        onUpdated(updated)
      })
      .catch((error: unknown) => {
        setDueDateInput(previous)
        setDateError(
          error instanceof ApiError && error.fieldErrors.dueDate
            ? error.fieldErrors.dueDate
            : 'No se pudo actualizar la fecha.',
        )
      })
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar fecha de vencimiento de "${taskTitle}"`}
        >
          <CalendarIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">{taskTitle}</DialogTitle>
        </DialogHeader>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loadError && !task && (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
          </div>
        )}

        {!loadError && task && (
          <div className="grid gap-3">
            {task.isOverdue && (
              <span className="text-destructive inline-flex w-fit items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-sm font-medium">
                <AlertTriangleIcon className="size-4" />
                Vencida
              </span>
            )}

            <div className="grid gap-2">
              <Label htmlFor="due-date">Fecha de vencimiento</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDateInput}
                onChange={(event) => handleDueDateChange(event.target.value)}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'due-date-error' : undefined}
              />
              <FieldError id="due-date-error" message={dateError} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
