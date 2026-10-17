# Análisis local de partidas

Winchesstar distribuye Stockfish.js 19 Lite de un solo hilo y WASM en `public/analysis/stockfish/`. El motor se carga a demanda, después de una partida local u online finalizada; no se descarga al abrir el lobby, no bloquea el hilo de la interfaz y no cambia las reglas ni el resultado. Recorre cada posición con 0,3 segundos de búsqueda, muestra el progreso y estima la calidad comparando las evaluaciones antes y después de la jugada. La barra indica la evaluación de la posición seleccionada y el tablero permite recorrer cada medio movimiento.

## Arquitectura

- `src/analysis/contract.ts` define el contrato, líneas UCI y la coordinación/cancelación de solicitudes.
- `src/analysis/stockfish.ts` implementa UCI sobre un Web Worker; valida historial, variantes y límites, y drena `bestmove` al detener una búsqueda.
- `src/ui/AnalysisPanel.tsx` presenta la revisión posición por posición, barra de evaluación, anotaciones (`!!`, `!`, `?!`, `?`, `??`) y comentarios locales de tutor solo en partidas terminadas.
- `public/analysis/stockfish/` contiene los dos archivos del motor Lite single-threaded, autores y licencia GPL-3.0.

La partida se reconstruye desde `RulesEngine.initialFen` y la secuencia UCI completa para cada búsqueda, conservando el historial de repetición. El análisis usa una copia lógica del historial y jamás realiza una jugada en la partida viva. Las categorías se basan en la diferencia de evaluación y son orientativas con este límite de tiempo, no calificaciones oficiales ni prueba de que una jugada sea única. El símbolo `!!` se reserva para una jugada táctica principal con alternativas claramente inferiores. Los comentarios del tutor son plantillas locales basadas en la categoría, la pieza, la captura y el jaque; no se envía la partida a un servicio de IA. La variante multi-hilo requiere aislamiento de origen cruzado; por eso Winchesstar usa el paquete pequeño de un hilo y no necesita encabezados COOP/COEP.

## Procedencia e integridad

Motor: [Stockfish.js v19.0.1](https://github.com/nmrugg/stockfish.js/tree/v19.0.1), compilación Lite single-threaded publicada por el proyecto para análisis en navegador. Descargas fijadas:

- `stockfish-19-lite-single.js` SHA-256 `CCB130D7FF29408531C47D859A49F91D59D4F482D05A53EB1A3231A4F624C91A`
- `stockfish-19-lite-single.wasm` SHA-256 `EE4F115BDB2D32CADF96CADA104A05B5EC257D7AD6F57582190B49BC71F096DE`

Se conservan `COPYING.txt` y `AUTHORS` junto a los binarios. Stockfish.js está bajo GPL-3.0; el repositorio fuente fijado arriba contiene el código y el proceso de compilación correspondientes. Antes de redistribuir o modificar estos artefactos, mantener el aviso de licencia y cumplir las obligaciones de la GPL para el código fuente y la distribución. La licencia de Stockfish no sustituye la licencia de Winchesstar ni cubre las imágenes del juego.

La variante Lite prioriza inicio rápido y tamaño de descarga; usa una red neuronal menor que la compilación completa. El motor evalúa ajedrez estándar. No interpreta la ambientación histórica ni atribuye valor estratégico a la identidad narrativa de las piezas.
