# Cobertura real del reglamento

## Motor y política

Motor fijado: chess.js 1.4.0. La documentación oficial https://jhlywa.github.io/chess.js/ confirma que `fen()` incluye al paso únicamente cuando existe una captura legal. El contrato se prueba con una captura legal y otra clavada.

La aplicación no llama a `isGameOver()` ni a `isDraw()`. El adaptador conserva la historia y cuenta claves formadas por los primeros cuatro campos del FEN normalizado. Mate precede a ahogado, posición muerta demostrada, cinco repeticiones y 150 medias jugadas. Tres repeticiones y 100 medias jugadas permiten reclamar y no finalizan automáticamente.

La reclamación prevista reproduce la historia en una copia, valida la promoción completa y registra la jugada declarada separada del historial ejecutado. El jugador conserva el turno mientras elige promoción. Las ofertas identifican el color oferente; el dispositivo compartido presenta explícitamente qué rival debe aceptar. Jugar rechaza una oferta del rival.

## Posiciones muertas: cobertura y límite pendiente

No existe en chess.js una prueba general de posiciones muertas. Esta entrega **no afirma cobertura exhaustiva de todas las posiciones muertas ni de toda incapacidad unilateral de mate**.

Se reconocen automáticamente:

- Los casos demostrados por material de chess.js: rey contra rey, única pieza menor frente a rey, y solo alfiles en casillas del mismo color además de los reyes.
- Bloqueos constituidos únicamente por reyes y peones inmóviles cuando se demuestra que ningún peón puede avanzar/capturar y ningún rey puede llegar a capturar un peón rival. La prueba explora las casillas accesibles de cada rey quitando las restricciones del otro rey (una sobreaproximación); si aun así no hay primera captura posible, el muro no puede abrirse. No declara tablas por agotamiento de tiempo ni por búsquedas truncadas.

Dos caballos frente a rey **no** se consideran muertos: existe mate cooperativo. No se confunde capacidad de mate con capacidad de forzarlo.

Para rendición se verifica la capacidad del **rival**: rey solo y material unilateral demostrado incapaz producen tablas; dos caballos, alfil/caballo, alfiles de distinto color y material suficiente conservan capacidad potencial. Se considera que material rival puede bloquear escapatorias y permitir mate. Los casos no demostrados se tratan como potencialmente capaces.

**Pendiente real:** posiciones cerradas excepcionales con otras piezas, bloqueos más complejos y restricciones geométricas unilaterales fuera de las pruebas anteriores pueden no reconocerse. En esos casos puede continuarse una posición muerta o asignarse victoria por rendición donde corresponderían tablas. La interfaz de ayuda declara el límite. Resolverlo de forma general requiere un verificador de alcanzabilidad de mate o certificados adicionales correctos, no un valor cero de Stockfish ni una tabla de finales de juego óptimo. Esto deja este punto del alcance estricto sin cumplimiento completo.

## Recursos e identidad editorial

Los 24 nombres se cotejan exactamente con el manifiesto; se comprueba PNG, alfa, dimensiones y SHA-256. Todos los píxeles de alfa mayor que cero cuentan, con margen del 1,2 % y sin borrar espadas, banderas o pedestales. Los originales se copian sin recomprimir. Los pares de color tienen diferencias de composición; cada diseño usa su encuadre medido, sin unir coordenadas de lienzos incompatibles ni asumir que son recoloraciones idénticas.

Las identidades se toman del catálogo expresamente aprobado por el creador. La inspección de imágenes comprueba correspondencia de función y archivos, no pretende identificar históricamente un retrato por su apariencia. No hay metadatos adicionales del autor que permitan certificar una identidad alternativa. Se conservan fuentes y distinciones entre personas, soldados anónimos y construcciones.

## Referencias

- Leyes FIDE: https://handbook.fide.com/chapter/E012023
- API y alcance de chess.js: https://jhlywa.github.io/chess.js/
- Casos de aceptación: `03_TABLERO_Y_ARQUITECTURA.md`, apartado 12.
