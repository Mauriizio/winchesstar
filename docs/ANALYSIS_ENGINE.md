# Integración futura: Stockfish 18

El juego funciona sin Stockfish. No hay evaluaciones simuladas ni controles de análisis inactivos.

`src/analysis/contract.ts` define `AnalysisEngine`, los mensajes FEN/UCI, la perspectiva de puntuación, las variantes y un coordinador que descarta respuestas obsoletas. `RulesEngine.initialFen` y `RulesEngine.uci()` proporcionan el historial completo; nunca sustituirlo por el FEN final si se necesita conservar el contexto de repetición.

## Adaptador WebAssembly / Worker

1. Seleccionar una compilación **para navegador de Stockfish 18**. El lanzamiento oficial y el código del motor se encuentran en https://stockfishchess.org/blog/2026/stockfish-18/ y https://github.com/official-stockfish/Stockfish. Verificar el artefacto real, su código fuente, checksum y procedencia; un anuncio del motor nativo no certifica una compilación web de terceros.
2. Implementar la interfaz en un nuevo adaptador. Crear un `Worker` al inicializar bajo demanda; alojar JS, WASM y redes NNUE en rutas web versionadas. Esperar `uciok` e `isready`/`readyok`. Comprobar `id name`, opciones disponibles y versión 18; rechazar otra versión con un error visible.
3. Enviar `position fen <initialFen> moves <movesUci...>`. Configurar los límites de hilos, memoria y MultiPV anunciados por el motor. Enviar `go depth ...` o `go movetime ...`. No interpolar entradas arbitrarias: validar FEN, UCI y límites.
4. Convertir `info` a `AnalysisLine`, separando centipeones, mate, límites superior/inferior y perspectiva del jugador al turno. Validar cada variante en `RulesEngine.clone()` antes de mostrar notación; no mover nunca la partida real.
5. `stop()` debe enviar `stop` y **esperar/drenar `bestmove`** antes de resolver. UCI no contiene IDs de petición: etiquetar las respuestas en el transporte después de serializar las búsquedas. Un simple ID en la UI no resuelve mensajes atrasados del Worker.
6. `dispose()` cancela, drena y termina el Worker. Resolver/rechazar las promesas pendientes también ante fallos de carga, aborto y cierre. Mantener una búsqueda activa por instancia. El coordinador de este proyecto filtra generaciones antiguas, pero no sustituye ese protocolo de drenaje.
7. Preferir un Worker de un hilo para compatibilidad inicial. Si la compilación usa memoria compartida, verificar requisitos COOP/COEP y `crossOriginIsolated`, incluidos todos los recursos externos, antes de activar varios hilos. Proporcionar alternativa de un hilo.
8. Ofrecer la interfaz únicamente en un modo de análisis explícito posterior a la partida. El contrato legal y el catálogo no deben importar el adaptador de análisis.

## Distribución

Stockfish es GPLv3. Conservar avisos y licencia, identificar modificaciones y facilitar el código fuente correspondiente al binario distribuido, incluyendo redes/archivos y procedimientos necesarios conforme a las licencias aplicables. Registrar versión de compilador, revisión, opciones, fuentes, scripts de compilación y checksums. No basta enlazar una rama que pueda cambiar. Revisar también las obligaciones de la distribución web y de las dependencias del adaptador.

No se incluye ningún binario de Stockfish en esta entrega. La licencia de este proyecto no debe confundirse con la del módulo futuro ni con los derechos sobre las imágenes originales.
