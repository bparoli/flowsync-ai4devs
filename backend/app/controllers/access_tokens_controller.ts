import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class AccessTokensController {
  @ApiOperation({
    summary: 'Inicio de sesión',
    description: 'Emite un token de acceso nuevo y devuelve también los datos de la cuenta.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', maxLength: 254 },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La cuenta y su token de acceso nuevo.',
    schema: wrapData(ref('AuthResult')),
  })
  @ApiResponse({
    status: 400,
    description:
      'Las credenciales no son correctas. La respuesta es la misma tanto si la contraseña falla como si ese email no tiene cuenta, para no revelar cuáles existen. No se emite ningún token.',
    schema: ref('ApiError'),
  })
  @ApiResponse({
    status: 422,
    description: 'El email no tiene formato válido. Ni se llegan a comprobar las credenciales.',
    schema: ref('ValidationError'),
  })
  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }

  @ApiOperation({
    summary: 'Cierre de sesión',
    description:
      'Revoca el token presentado, que deja de servir a partir de ese momento. Los demás tokens de la misma cuenta siguen valiendo.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description:
      'Sesión cerrada. Es la única respuesta de la API que NO va envuelta en `data`: el controlador devuelve el objeto tal cual.',
    schema: {
      type: 'object',
      properties: { message: { type: 'string', example: 'Logged out successfully' } },
      required: ['message'],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'El token falta, está mal formado o ya no es válido.',
    schema: ref('ApiError'),
  })
  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
