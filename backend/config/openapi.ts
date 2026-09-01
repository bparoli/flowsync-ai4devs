import { defineConfig } from '@foadonis/openapi'
import { openapiSchemas } from '#openapi/schemas'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La versión del documento es la de la API que describe, y esta API se
      // sirve bajo `/api/v1` (ver `start/routes.ts`). Si algún día aparece un
      // `/api/v2`, será otro documento y otra versión.
      version: '1.0.0',
    },
    components: {
      // Los modelos con nombre viven en `app/openapi/schemas.ts` y se
      // referencian con `$ref` desde los decoradores de los controladores.
      schemas: openapiSchemas,
      securitySchemes: {
        // El nombre `bearer` no es libre: es el que usa el decorador
        // `@ApiBearerAuth()` al declarar el requisito sobre cada operación.
        // Si se renombra aquí, las operaciones apuntarían a un esquema que no
        // existe y el documento dejaría de validar.
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Token de acceso opaco devuelto por `POST /api/v1/auth/signup` y `POST /api/v1/auth/login`. Se manda como `Authorization: Bearer <token>`.',
        },
      },
    },
  },
})
