import Task from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { DateTime } from 'luxon'

/**
 * The day the client is looking from, used to decide whether a task is
 * overdue. Falls back to the server's own day when the client doesn't
 * send one.
 */
function resolveReferenceDate(request: HttpContext['request']) {
  const raw = request.qs().referenceDate
  if (typeof raw === 'string') {
    const parsed = DateTime.fromISO(raw)
    if (parsed.isValid) return parsed
  }
  return DateTime.now()
}

/**
 * Looks up a task by an id coming straight from the URL. Returns `null`
 * for anything that isn't a real row — including a non-numeric id —
 * instead of letting `findOrFail` throw and leak a stack trace.
 */
async function findTask(id: string) {
  const parsedId = Number(id)
  if (!Number.isInteger(parsedId)) return null
  return Task.find(parsedId)
}

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, resolveReferenceDate(request)))
  }

  async show({ request, params, response, serialize }: HttpContext) {
    const task = await findTask(params.id)
    if (!task) return response.notFound({ errors: [{ message: 'Task not found' }] })
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, resolveReferenceDate(request)))
  }

  async store({ request, auth, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    const task = await Task.create({ title, status: 'pending', assigneeId: user.id })
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, resolveReferenceDate(request)))
  }

  async update({ request, params, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateTaskValidator)

    const task = await findTask(params.id)
    if (!task) return response.notFound({ errors: [{ message: 'Task not found' }] })
    if ('status' in payload) task.status = payload.status!
    if ('dueDate' in payload) task.dueDate = payload.dueDate ?? null
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, resolveReferenceDate(request)))
  }
}
