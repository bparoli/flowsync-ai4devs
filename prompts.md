# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 5.5 Medium
**Herramienta:** Claude Code

```
Añade encima del listado de la pantalla de tareas una barra de progreso que muestre qué proporción de las tareas visibles está en estado done.
```

**Qué salió:**
``` 
Antes de tocar código, frená un segundo, porque tal como está pedido la barra no dice nada útil. Lo comprobé en el código:

- La vista por defecto solo muestra pending + in_progress (DEFAULT_LIST_STATUSES en frontend/src/lib/types.ts:46). Ahí la barra marcaría siempre 0%.
- Con el filtro done sale siempre 100%, y con pending o in_progress, siempre 0%.
- Peor todavía: al marcar una tarea como hecha, esa tarea desaparece de la vista (tasks-page.tsx:214), así que la barra nunca se movería.

Una barra que solo puede valer 0 o 100 según el filtro no informa de nada. La alternativa que sí tiene sentido es medir hechas / total del equipo, sin depender del filtro. Para eso hace falta pedir también las done (ya hay un precedente en tasks-page.tsx:94) y actualizar el contador al cambiar un estado. El coste es una petición extra.

¿Lo hago así (hechas sobre el total), o preferís la versión literal, con las tareas visibles, sabiendo que solo va a marcar 0% o 100%?
```

---

## Prompt 2

**Modelo:** Opus 5.5 Medium
**Herramienta:** Claude Code

```
Hazlo con hechas sobre el total del equipo
```

**Qué salió:**
```
La barra ya está encima del listado y quedó commiteada en 6b5731e (feat(tasks): barra de progreso del equipo con las hechas sobre el total).
```

---

## Prompt 3

**Modelo:** Opus 5.5 Medium
**Herramienta:** Claude Code

```
Cambia el color de la barra de progreso a azul 
#1D4ED8
```

**Qué salió:**
```
La barra de progreso ya sale en azul #1D4ED8. Lo commiteé en 55e6890. El build pasa, pero no la vi en el navegador.

Seguí la regla del CLAUDE.md: el hex no va en el componente sino en frontend/src/index.css, como un token nuevo llamado --progress. La barra lo usa con bg-progress (team-progress.tsx:39). Así el hook no tiene nada de qué avisar, y si mañana querés otro tono, se cambia en un solo sitio.

En modo oscuro le puse #3B82F6, un azul más claro. Fue decisión mía: tu #1D4ED8 casi no se distingue del gris oscuro del fondo de la barra. Si lo querés igual en los dos temas, se cambia esa línea en index.css.

```


