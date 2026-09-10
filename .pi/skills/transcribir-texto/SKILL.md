---
name: transcribir-texto
description: Transcribe imágenes de páginas de un libro (materiales/raw/imagenes/textos/) a un markdown en sitio/textos/ con formato preservado (cursivas, párrafos, puntuación). Usar cuando haya que extraer un texto/cuento desde fotos de un libro para el sitio.
---

# Transcribir texto desde imágenes de libro

Convertí las fotos de páginas de un libro en `materiales/raw/imagenes/textos/<directorio>/` en un
markdown listo para publicar en `sitio/textos/`.

## Proceso

0. **Orden de lectura**: si quien te llama te pasó el orden de las imágenes, respetalo. Si no,
   determinálo vos: primero buscá el número de página impreso en cada imagen (suele estar en
   una esquina) y ordená por ahí; si no es visible, deducí el orden por continuidad del texto
   (frases cortadas entre páginas, principio/fin de capítulo). **No asumas que el nombre de
   archivo codifica el orden** — pueden ser hashes (ej: AC54F172...jpeg).

1. **Listá las imágenes** del directorio y leelas **en orden de lectura**. Usá la herramienta
   `read` — las imágenes llegan como attachments.

2. **Transcribí cada página** siguiendo las reglas de formato de abajo. Si una página salió
   borrosa y hay líneas ilegibles, transcribí el resto y dejá un comentario HTML
   `<!-- ... -->` al inicio del documento indicando qué falta y por qué.

3. **Uní páginas que cortan a mitad de párrafo**: si una página termina sin puntuación de cierre
   (ej: "...luego de echar"), el párrafo continúa en la página siguiente — unilos con espacio,
   no con salto de párrafo.

4. **Metadatos**: título y autor salen de las propias páginas. Si no aparecen, preguntale al
   usuario antes de inventar. El slug del archivo: título en minúsculas, sin acentos, con
   guiones (ej: `Desayuno perfecto` → `desayuno-perfecto.md`). Si ya existe un `.md` con ese
   slug, **sobreescribilo** con la nueva transcripción (está en git, se puede restaurar).

5. **Creá el archivo** con este frontmatter exacto (status draft siempre — la publicación es
   manual):

```markdown
---
title: "<Título>"
author: "<Autor/a>"
date: "<YYYY-MM-DD de hoy>"
status: draft
description: "<1-2 oraciones sobre el contenido>"
genre: "<cuento|poema|ensayo|fragmento>"
license: "Fragmento (derecho de cita)"
tags:
  - <genre>
---
```

6. **Verificá** que compila: `node scripts/build-textos.mjs` (el texto en draft se saltea el
   build — es lo esperado; para probar el render cambiá status a published temporalmente y
   volvé a draft). Verificá también `node scripts/build-epub.mjs`.

> Nota: el script `scripts/new-texto-ia` corre automáticamente una verificación posterior
> (`scripts/verify-texto.mjs`): checks deterministas + re-OCR independiente de cada imagen
> comparado contra tu transcripción. Si la verificación falla, corregí el texto.

## Reglas de formato de la transcripción

- **Cursivas**: toda palabra o frase en cursiva en el libro va entre asteriscos
  (ej: el *tatami*, el *natto*, los *ohashi*, *Oishi*). Es lo más importante — el libro usa
  muchas cursivas para extranjerismos.
- **Uní palabras cortadas** por guión al final de línea (`desgar-/bado` → `desgarbado`).
- **Párrafos**: separá con línea en blanco, respetando los del original.
- **Puntuación exacta**: mantené signos de exclamación de apertura, dos puntos, rayas de
  diálogo (—) y **comillas tipográficas del libro** (" ") tal cual están impresas — no las
  reemplaces por comillas rectas.
- **No incluyas** números de página ni el título del cuento que aparece como encabezado de la
  primera página (el título va en el frontmatter).
- **Conservá mayúsculas originales** (ej: títulos en caps del libro quedan en caps en el body).

## Referencias de estilo

Mirá `sitio/textos/jose-velez.md` y `sitio/textos/el-juego-de-cartas.md` como ejemplos del
formato final esperado.

## Al terminar

- El archivo queda en `status: draft` — avisale al usuario que la publicación es manual.
- Sugerí revisar la transcripción contra las imágenes (podés mostrar un resumen de longitud
  por página: N chars de la pág. X).
