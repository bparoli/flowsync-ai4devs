type TeamProgressProps = {
  /** Tareas del equipo en estado «Hecho». */
  done: number
  /** Todas las tareas del equipo, en cualquier estado. */
  total: number
}

/**
 * El avance del equipo: hechas sobre el total, sea cual sea el filtro de la
 * lista. Medir solo lo visible no serviría — la vista por defecto deja fuera
 * las hechas, así que la barra marcaría siempre 0 % o 100 % según el filtro.
 *
 * Es un `div` con `role="progressbar"` y no un `<progress>` nativo para poder
 * pintarlo con los tokens del tema; los `aria-*` le dan la misma lectura.
 */
export function TeamProgress({ done, total }: TeamProgressProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="mb-6 grid gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span id="team-progress-label" className="font-medium">
          Progreso del equipo
        </span>
        <span className="text-muted-foreground tabular-nums">
          {done} de {total} hechas · {percent} %
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-labelledby="team-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${done} de ${total} tareas hechas`}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
