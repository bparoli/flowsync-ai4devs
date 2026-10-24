# Hallazgos

Aquí van **las tres líneas** del ejercicio, una por cada punto de abajo. Es lo único que hay que
traer hecho: un cambio de motor a medias con estas tres líneas escritas vale más que lo contrario,
porque lo que se discute en el directo es dónde te chocaste.

Escribe **una sola línea por punto**, con tus palabras y con lo que mediste, no con lo que suponías.

## 1. Dónde aterrizó la pieza y con qué valores

Para la parte A:
Quedó igual. 5 archivos en frontend/src/components/ui
El grep sobre frontend/src/index.css dio 59 al igual que antes del cambio

En la parte B:
la cantidad de archivos en fontend/src/compontents/ui sigue siendo la misma
el grep ahora dio 62 en lugar de 59

-

## 2. Qué crees que decidió eso

El agente decidió que el cambio de color de la barra de progreso debía hacerse en index.css y no en el componente, siguiendo la regla del CLAUDE.md, para centralizar el control del color y facilitar futuros cambios.

-

## 3. Qué avisó el guardarraíl y qué no pudo ver.

El agente modifico correctamente index.css en lugar de directamente el componente y de esta manera el hook no tuvo que avisar nada

-
