# Auditoría del módulo OCR

Fecha: 2026-11-10  
Rama: `codex/ocr-stabilization` (base `origin/main`)  
Alcance: escaneo de tickets, reconocimiento local, parser, revisión, IndexedDB, movimientos e inventario.

## Arquitectura actual

- `Market.tsx` ofrece cámara/selección de imagen, progreso, revisión editable y confirmación explícita.
- `receiptOcr.ts` carga perezosamente Tesseract.js 7, crea un worker para `spa`, usa los archivos WASM y `spa.traineddata.gz` locales, corrige inclinación con `rotateAuto` y termina el worker tras reconocer.
- `receiptParser.ts` procesa texto plano mediante expresiones regulares; no consume palabras, coordenadas ni confianza del OCR.
- `useFinance.saveTicket` crea el ticket y un movimiento de gasto; aplica al inventario únicamente las líneas que el usuario selecciona.
- `saveReceiptTicket` usa una transacción IndexedDB conjunta con `add` para ticket/movimiento y `put` para productos. El rollback es atómico.
- No se guarda el archivo de imagen. Se conserva el texto OCR en el registro del ticket.
- `public/sw.js` precarga los motores, el modelo español y el wrapper clásico del worker OCR junto a Tesseract para uso posterior sin red.

## Hallazgos priorizados

### P1 — El reconocimiento puede quedarse cargando indefinidamente

`recognizeReceipt` espera tanto la inicialización de Tesseract (incluida la carga de `traineddata`) como `recognize` sin timeout ni cancelación. El estado visual termina dependiendo de que esas promesas resuelvan; en caso de worker bloqueado el usuario no puede reintentar dentro del flujo. El estado `loading language traineddata` al 50 % concuerda con la fase de descarga/descompresión/escritura en la caché del worker, pero el código actual no identifica cuál de ellas se detuvo ni impone un límite temporal.

### P1 — El ticket no crea historial de compras por producto

En esta base, `saveTicket` escribe el ticket, el movimiento y los cambios de inventario, pero no crea registros `MarketPurchase`. Por ello el gasto total entra en finanzas, pero las líneas no aparecen en el historial de compras del mercado. La transacción atómica existe, pero no incluye el store `purchases`.

### P1 — Parser con supuestos demasiado estrechos

El parser toma el último número de cada línea como importe y solo reconoce cantidad explícita en el patrón `n x precio`. Cantidades por peso como `0,620 kg`, precio por unidad/kg, columnas con formatos distintos y descuentos no se modelan; pueden convertirse en cantidad 1 o en una línea mal interpretada. No hay confianza por línea ni advertencia específica para valores dudosos. La discrepancia entre suma de líneas y total sí se avisa y no modifica automáticamente el total.

### P1 — No se detecta la importación repetida del mismo ticket

`savingRef` evita doble pulsación mientras una instancia de pantalla guarda, e IndexedDB revierte colisiones de ID. Sin embargo, volver a seleccionar o procesar la misma foto crea un ID nuevo; no hay huella estable del recibo para advertir de duplicados plausibles.

### P2 — No hay preparación explícita de la imagen

El archivo original se entrega directamente al worker. No hay límites de tamaño/dimensiones, reescalado ni mejora de contraste. `rotateAuto` estima inclinación con Tesseract, pero no se ha verificado como corrección general de orientación EXIF en Safari/Android. Imágenes grandes pueden elevar memoria y latencia móvil.

### P2 — El parser descarta la salida estructurada del OCR

Se usa `result.data.text` y se ignoran palabras, cajas y confianza. La interfaz permite corregir los campos manualmente, pero no puede resaltar automáticamente fragmentos de baja confianza ni reconstruir con seguridad columnas alineadas.

### P2 — Progreso y errores del motor no se traducen

Los valores de `logger.status` se presentan directamente. Tesseract emite estados técnicos en inglés, por ejemplo `loading language traineddata`; los rechazos sí se muestran, pero no se clasifican en mensajes de reintento útiles.

### P2 — Reintentar el mismo archivo no siempre dispara una nueva lectura

Los inputs de archivo no vacían su valor al terminar. Algunos navegadores no emiten `change` al volver a seleccionar exactamente el mismo archivo.

### P3 — Cobertura automatizada insuficiente para producción

El baseline tiene 39 pruebas en 8 archivos; las pruebas OCR cubren solo dos ejemplos del parser. No hay pruebas de worker, timeout, progreso, imagen inválida, múltiples layouts, peso/descuentos, ticket de referencia Hiper Kyra ni fallo/duplicación de integración. El build funciona, pero avisa que el bundle principal minificado supera 500 kB. No existe script de lint.

## Hallazgos de causa y alcance

- El 50 % de `loading language traineddata` lo emite Tesseract durante carga y preparación del idioma. El código no permitía saber si un bloqueo concreto estaba en la red, descompresión o caché; por tanto, se considera una explicación compatible con el síntoma y no una causa única demostrada. Se elimina la caché interna de Tesseract para evitar esa ruta de persistencia y se añaden límites temporales al ciclo OCR.
- El ticket sí persistía el gasto global; faltaban las compras por línea, de ahí que el historial/inventario no reflejara lo escaneado. La corrección guarda líneas como compras incluso si no se vinculan a inventario.
- Los duplicados con IDs distintos no podían detectarse; ahora se compara una huella normalizada dentro de la transacción de escritura.
- La transacción de IndexedDB existente sí era atómica para los stores incluidos; su límite era omitir `purchases`. Ahora ticket, movimiento, productos y compras se guardan como unidad, con abort ante duplicado o colisión de IDs.

## Riesgos que no se reproducen con pruebas unitarias

- Los tests inyectan un worker simulado. La inicialización real de Tesseract/WASM, permisos de cámara/archivos y comportamiento de IndexedDB en navegador requieren navegador real.
- No se ha verificado físicamente en Safari iPhone ni Android; no se afirma compatibilidad física sin esos dispositivos.
- El fallback de Safari ante fallos de `createImageBitmap` y el wrapper clásico reducen diferencias del navegador, pero no sustituyen la validación con un iPhone real.
- La duración del primer procesamiento depende del dispositivo, memoria y descarga/precache del modelo. Se imponen límites de espera y cierre del worker, pero no se puede garantizar OCR offline hasta completar una instalación con recursos precargados.
- El preprocesado corrige orientación EXIF disponible y reduce imagen a un máximo de 5 MP con límite de archivo de 20 MB. La calidad puede variar con reflejos, desenfoque, tickets muy largos y columnas no estándar.
- No hay script de lint definido en el repositorio. La consola de navegador tampoco se pudo inspeccionar en un dispositivo real durante esta ejecución.

## Plan de estabilización

1. Aislar worker por intento, tiempos máximos y cleanup tanto si falla la creación como si falla el reconocimiento; traducir el progreso y exponer estados recuperables.
2. Preprocesar en cliente con límites de memoria, orientación cuando sea detectable y contraste; conservar siempre la imagen en memoria, no en IndexedDB.
3. Endurecer parser decimal y por filas, reconocer cantidad por peso/descuento sin inventar datos, marcar ambigüedades y cubrir Hiper Kyra.
4. Extender la transacción existente para guardar cada línea como compra y evitar registros financieros/inventario parciales; validar los datos antes de entrar a IndexedDB.
5. Añadir pruebas separadas de parser, worker con dependencias simuladas y persistencia real con IndexedDB falsa; validar build/errores disponibles y anotar pruebas de navegador que queden pendientes.

## Verificación base

- `npm test`: 8 archivos, 39 pruebas aprobadas.
- `npm run build`: aprobado; Vite avisa que el bundle principal es de aproximadamente 725 kB minificado.
- `npm run typecheck`: ejecución sin salida ni error reportado.

## Cambios y verificación final

- Worker OCR aislado, estados de progreso en español, tiempos máximos de inicialización/configuración/reconocimiento y limpieza tras error; no conserva la caché interna de Tesseract.
- Imagen limitada/preparada en memoria; OCR devuelve líneas, coordenadas y confianza cuando Tesseract los proporciona. La interfaz marca lecturas dudosas, permite editarlas y permite volver a elegir el mismo archivo.
- Parser con importes enteros en céntimos, cantidades y unidades por peso, descuentos, subtotal/impuestos y cambio excluido; las discrepancias se muestran y nunca se corrige el total automáticamente.
- Guardado de ticket, gasto, inventario y compras por producto en una transacción IndexedDB; huella de duplicados y pruebas de rollback ante colisión de clave.
- `npm run typecheck`: aprobado.
- `npm test`: 9 archivos, 46 pruebas aprobadas.
- `npm run build`: aprobado; el worker se emite en `dist/assets/receipt-worker.js`. Persiste una advertencia de Vite por el bundle principal de 734.78 kB minificado.
- Corrección iPhone posterior: worker clásico bajo `/ocr/receipt-worker.js`, con timeout de carga y cierre por inactividad; `createImageBitmap` tiene fallback a `Image.decode()` para imágenes que Safari no decodifica por esa vía.
- `npm test` tras la corrección iPhone: 11 archivos, 57 pruebas aprobadas.
- `npm run build` tras la corrección iPhone: aprobado; `dist/ocr/receipt-worker.js`, el worker oficial, y el modelo español están presentes.
- `npm audit`: 0 vulnerabilidades tras actualizar versiones compatibles en el lockfile.
- `git diff --check`: aprobado.
- No se detectó un script `lint`; la consola y las cámaras deben verificarse en los dispositivos físicos antes de afirmar compatibilidad final.

## Estado de producción

La integridad de datos y los casos de parser cubiertos están listos para revisión de PR. La recomendación es considerarlo **candidato a producción condicionado**: primero ejecutar el checklist manual de Safari iPhone y un navegador Android, incluyendo instalación offline, foto desde cámara/galería, reintento, revisión de importes y confirmar doble toque. No se presenta la prueba simulada como sustituto de esas comprobaciones.
