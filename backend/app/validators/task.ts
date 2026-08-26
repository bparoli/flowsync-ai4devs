import vine from '@vinejs/vine'

/**
 * Validator to use when creating a task. Title is the only accepted
 * field: status and assignee are always assigned by the server.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1),
})

/**
 * Validator to use when updating a task: status, due date, or both.
 * A key left out of the payload means "don't touch it"; `dueDate: null`
 * means "clear it".
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(['pending', 'in_progress', 'done'] as const).optional(),
  dueDate: vine.date().nullable().optional(),
})
