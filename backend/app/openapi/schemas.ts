import type { TaskStatus } from '#models/task'
import type { OpenAPIV3 } from 'openapi-types'

/**
 * Los tres estados, repetidos aquí como valores literales a propósito.
 *
 * Este módulo lo importa `config/openapi.ts`, y los config se evalúan al
 * arrancar, antes de que hayan booteado los providers. Importar `TASK_STATUSES`
 * como valor arrastraría `#models/task` -> `#models/user` -> el servicio `hash`
 * hasta ese momento, y el mixin `withAuthFinder` se encontraría el servicio sin
 * construir: registrarse reventaría con un 500. La importación de `TaskStatus`
 * es `import type`, así que se borra al compilar y no arrastra nada.
 *
 * La copia no puede desincronizarse en silencio: el `satisfies` de abajo falla
 * si alguien renombra o elimina un estado, y `Exhaustive` falla si añade uno
 * nuevo sin tocar esta lista. Las dos comprobaciones son de tipos, y por eso no
 * cuestan un import en tiempo de ejecución.
 */
const TASK_STATUS_VALUES = [
  'pending',
  'in_progress',
  'done',
] as const satisfies readonly TaskStatus[]

type Exhaustive = TaskStatus extends (typeof TASK_STATUS_VALUES)[number] ? true : never
const todosLosEstadosCubiertos: Exhaustive = true
void todosLosEstadosCubiertos

type Schema = OpenAPIV3.SchemaObject
type Ref = OpenAPIV3.ReferenceObject

/**
 * Referencia a uno de los esquemas con nombre de `openapiSchemas`.
 *
 * Se devuelve tipado como `Schema` y no como `Ref` a conciencia: los decoradores
 * declaran su campo `schema` como `SchemaObject`, pero el generador lo devuelve
 * tal cual (`loadType()` empieza con `if (options.schema) return options.schema`),
 * así que un `$ref` llega intacto al documento. El tipo del paquete es más
 * estrecho que su runtime, y el cast dice exactamente eso.
 */
export const ref = (name: keyof typeof openapiSchemas): Schema =>
  ({ $ref: `#/components/schemas/${name}` }) as unknown as Schema

/**
 * Envuelve un esquema en el `{ data: ... }` que pone `ApiSerializer`
 * (`providers/api_provider.ts`) a toda respuesta de la API. Ninguna operación
 * devuelve el objeto pelado, así que ninguna debe documentarlo pelado.
 */
export const wrapData = (schema: Schema): Schema => ({
  type: 'object',
  properties: { data: schema },
  required: ['data'],
})

/**
 * Lo que Task y TaskDetail tienen en común. Se comparte aquí para que no se
 * separen por descuido, pero se emiten como dos esquemas independientes: la
 * diferencia entre uno y otro es justo lo que hay que poder leer en el documento.
 */
const taskCoreProperties: Record<string, Schema | Ref> = {
  id: { type: 'integer', example: 7 },
  title: { type: 'string', maxLength: 200, example: 'Revisar el informe' },
  status: {
    type: 'string',
    enum: [...TASK_STATUS_VALUES],
    description: 'Los tres estados del dominio. No se añaden, ni se renombran, ni se eliminan.',
  },
  assignee: { $ref: '#/components/schemas/TaskAssignee' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time', nullable: true },
}

const taskCoreRequired = ['id', 'title', 'status', 'assignee', 'createdAt', 'updatedAt']

/**
 * Los esquemas con nombre del documento. Se declaran una vez aquí y se
 * referencian con `ref()` desde los decoradores, para que el documento tenga
 * modelos reutilizables en vez de la misma forma copiada en cada operación.
 *
 * `config/openapi.ts` los cuelga de `components.schemas`.
 */
export const openapiSchemas = {
  /**
   * El responsable tal y como viaja junto a una tarea.
   *
   * Requirement «Lo que cada tarea muestra de su responsable»: el nombre y las
   * iniciales, y ningún otro dato de la cuenta. Que el email no esté aquí no es
   * un olvido del documento, es el contrato — ver `TaskAssigneeTransformer`.
   */
  TaskAssignee: {
    type: 'object',
    description:
      'Lo justo para identificar a quien lleva la tarea. No incluye el email ni ningún otro dato de acceso de la cuenta.',
    properties: {
      id: { type: 'integer', example: 12 },
      fullName: {
        type: 'string',
        nullable: true,
        description:
          'Nulo si la cuenta se registró sin nombre. Las iniciales siguen llegando, para poder representarla sin recurrir a su email.',
        example: 'Ada Lovelace',
      },
      initials: { type: 'string', example: 'AL' },
    },
    required: ['id', 'fullName', 'initials'],
  },

  /**
   * La tarea tal y como la devuelve la lista y los cambios de estado.
   *
   * Requirement «La lista no lleva el vencimiento»: aquí NO hay `dueDate` ni
   * `isOverdue`, y esa ausencia es el requisito. Si algún día aparecen en este
   * esquema, el documento estará describiendo una filtración.
   */
  Task: {
    type: 'object',
    description:
      'Una tarea sin datos de vencimiento. La lista devuelve exactamente esto: ni fecha de vencimiento ni condición de vencida.',
    properties: { ...taskCoreProperties },
    required: [...taskCoreRequired],
  },

  /**
   * La tarea con todo lo que tiene. Es un esquema aparte de `Task` y no una
   * versión suya con campos opcionales, por el mismo motivo por el que hay dos
   * transformers: la lista no debe poder enseñar el vencimiento.
   */
  TaskDetail: {
    type: 'object',
    description: 'Una tarea suelta, con su fecha de vencimiento y su condición de vencida.',
    properties: {
      ...taskCoreProperties,
      dueDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description:
          'Un día del calendario en formato AAAA-MM-DD, sin hora ni huso. Nulo cuando la tarea no tiene fecha, que es su estado normal y no un dato a medio rellenar.',
        example: '2026-09-30',
      },
      isOverdue: {
        type: 'boolean',
        description:
          'Resuelto por el servidor contra el `today` de quien consulta. Es verdadero si, y solo si, la tarea tiene fecha, esa fecha es anterior a `today` y su estado no es `done`.',
      },
    },
    required: [...taskCoreRequired, 'dueDate', 'isOverdue'],
  },

  /**
   * La cuenta tal y como la devuelven las rutas de cuenta (`UserTransformer`).
   *
   * Aquí el email SÍ va, y no contradice a `TaskAssignee`: son dos contratos
   * distintos a propósito. Estos son tus propios datos de cuenta; aquello es lo
   * que se enseña de un tercero junto a una tarea. Nunca sale la contraseña ni
   * su hash: la columna está marcada `serializeAs: null` en el esquema generado.
   */
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 12 },
      fullName: { type: 'string', nullable: true, example: 'Ada Lovelace' },
      email: { type: 'string', format: 'email', maxLength: 254, example: 'ada@example.com' },
      initials: {
        type: 'string',
        description:
          'Dos letras mayúsculas, calculadas a partir del nombre cuando lo hay y del email cuando no.',
        example: 'AL',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time', nullable: true },
    },
    required: ['id', 'fullName', 'email', 'initials', 'createdAt', 'updatedAt'],
  },

  /**
   * Lo que devuelven el registro y el login: la cuenta y un token ya utilizable,
   * de modo que registrarse deje la sesión iniciada sin un login aparte.
   */
  AuthResult: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/User' },
      token: {
        type: 'string',
        description:
          'Token de acceso opaco. Es el único momento en que se ve: no se puede recuperar después.',
      },
    },
    required: ['user', 'token'],
  },

  /**
   * La forma de error de la API, tal y como la emite el handler de excepciones:
   * `{"errors":[{"message":"Unauthorized access"}]}`.
   */
  ApiError: {
    type: 'object',
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
      },
    },
    required: ['errors'],
  },

  /**
   * El error de validación de VineJS, que además del mensaje señala el campo y
   * la regla que ha fallado. El `field` es lo que permite distinguir «has pedido
   * algo que no existe» de «no hay nada de eso», que la spec exige que no se
   * confundan.
   */
  ValidationError: {
    type: 'object',
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'The title field must be defined' },
            rule: { type: 'string', example: 'required' },
            field: { type: 'string', example: 'title' },
            meta: { type: 'object', additionalProperties: true },
          },
          required: ['message', 'rule', 'field'],
        },
      },
    },
    required: ['errors'],
  },
} satisfies Record<string, Schema>
