#!/usr/bin/env bash
# PostToolUse (Write|Edit|MultiEdit): AVISA, no bloquea, cuando lo que se acaba
# de escribir en frontend/src/ trae un color a pelo en vez de un token del tema:
#   - hexadecimal: #fff, #1e293b, también dentro de una clase arbitraria
#     como `bg-[#1e293b]`
#   - funciones de color: rgb(), rgba(), hsl(), hsla(), hwb(), lab(), lch(),
#     oklab(), oklch(), color()
#   - la paleta fija de Tailwind: `bg-red-500`, `text-slate-700/80`,
#     `border-white`, `fill-black`…: esquivan los tokens igual que un hex
# frontend/src/index.css queda fuera: es la capa donde el valor literal SÍ se
# escribe, la que define los tokens que el resto del código consume
# (`bg-primary`, `text-muted-foreground`…).
#
# Solo mira el texto que entra en esta escritura (`content` en Write,
# `new_string` en Edit y MultiEdit), no el fichero entero: así un color que ya
# estaba no vuelve a avisar en cada edición ajena a él.
#
# ESTO ES UNA RED, NO UN CANDADO. Lo que NO ve:
#   - Lo que entra por Bash (`sed`, heredoc, `npx shadcn add`), que no pasa
#     por Write ni Edit.
#   - Un color armado por partes (`'#' + hex`, plantillas, variables) o
#     nombrado (`color: 'red'`, `currentColor` aparte).
#   - Clases de Tailwind construidas en tiempo de ejecución
#     (`bg-${color}-500`).
# Y avisa de más con un ancla o un texto que parezca hex (`#add`, `#bad`):
# por eso avisa y no bloquea.
# Por eso el aviso se dirige al agente: es un recordatorio de usar el token,
# no una prueba de que no queden colores a pelo.
set -uo pipefail

input=$(cat)

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

case "$file" in
  "$CLAUDE_PROJECT_DIR"/frontend/src/index.css) exit 0 ;;
  "$CLAUDE_PROJECT_DIR"/frontend/src/*) ;;
  *) exit 0 ;;
esac

text=$(printf '%s' "$input" | jq -r '
  .tool_input.content
  // .tool_input.new_string
  // ([.tool_input.edits[]?.new_string] | join("\n"))
  // empty')
[ -n "$text" ] || exit 0

palette='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
utilities='bg|text|border|border-[trblxyse]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder'

# El texto partido en piezas por espacios, comillas, llaves, corchetes,
# paréntesis y puntuación: así `bg-[#1e293b]` deja suelto `#1e293b` y dos
# clases seguidas se comparan cada una entera.
tokens=$(printf '%s' "$text" | tr -s "[:space:]\"'\`{}[]();,=<>" '\n')

found=$(
  {
    # Hex de 3, 4, 6 u 8 cifras como pieza entera (un import como
    # `#generated/...` no lo es).
    printf '%s\n' "$tokens" | grep -xE '#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})'
    printf '%s' "$text" | grep -oiE '(^|[^[:alnum:]_-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(' | sed -E 's/^[^[:alpha:]]//'
    # Clase de la paleta, con variantes delante (`hover:`, `dark:`, `!`) y
    # opacidad detrás (`/50`).
    printf '%s\n' "$tokens" | grep -xE "!?([[:alnum:]-]+:)*!?($utilities)-(($palette)-[0-9]{2,3}|white|black)(/[0-9]+)?"
  } | sort -u
)
[ -n "$found" ] || exit 0

rel=${file#"$CLAUDE_PROJECT_DIR"/}
list=$(printf '%s' "$found" | paste -sd ',' - | sed 's/,/, /g')
message="AVISO de color-a-pelo.sh: $rel trae color a pelo: $list. Los colores salen de los tokens de frontend/src/index.css (bg-primary, text-muted-foreground, border-destructive…). Si falta el token que necesitas, se añade allí, en claro y en oscuro, y aquí se usa por su nombre."

jq -n --arg m "$message" '{
  systemMessage: $m,
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: $m }
}'
exit 0
