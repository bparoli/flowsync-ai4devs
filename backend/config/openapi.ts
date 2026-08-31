import { defineConfig } from '@foadonis/openapi'

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
  },
})
