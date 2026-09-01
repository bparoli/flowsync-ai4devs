import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class NewAccountController {
  @ApiOperation({
    summary: 'Registro de una cuenta nueva',
    description:
      'Crea una cuenta y devuelve, en la misma respuesta, sus datos y un token ya utilizable: registrarse deja la sesión iniciada, sin un login aparte.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          nullable: true,
          description: 'Opcional: la clave debe viajar siempre, aunque valga `null`.',
        },
        email: { type: 'string', format: 'email', maxLength: 254 },
        password: { type: 'string', minLength: 8, maxLength: 32 },
        passwordConfirmation: {
          type: 'string',
          description: 'Debe coincidir exactamente con `password`.',
        },
      },
      required: ['fullName', 'email', 'password', 'passwordConfirmation'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La cuenta creada y su token de acceso.',
    schema: wrapData(ref('AuthResult')),
  })
  @ApiResponse({
    status: 422,
    description:
      'El email no es válido o supera 254 caracteres, la contraseña no mide entre 8 y 32, la confirmación no coincide, o ese email ya tiene cuenta (`rule: database.unique`). No se crea ninguna cuenta y la existente queda intacta.',
    schema: ref('ValidationError'),
  })
  async store({ request, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const user = await User.create({ fullName, email, password })
    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
