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

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, resolveReferenceDate(request)))
  }

  async show({ request, params, serialize }: HttpContext) {
    const task = await Task.findOrFail(Number(params.id))
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

  async update({ request, params, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateTaskValidator)
    const body = request.body()

    const task = await Task.findOrFail(Number(params.id))
    if ('status' in body) task.status = payload.status!
    if ('dueDate' in body) task.dueDate = payload.dueDate ?? null
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, resolveReferenceDate(request)))
  }
}
