#!/usr/bin/env python3
"""
Extract text from materiales/raw/imagenes/textos/ subdirectories using Gemini
via OpenRouter, and create markdown documents in textos/.

Processes images one at a time (resized to 1200px max) for reliability.

Usage: OPENROUTER_API_KEY=sk-or-... python3 scripts/textos-from-images.py
"""

import json, base64, sys, os, re, time, subprocess, urllib.request
from pathlib import Path

IMAGES_DIR = Path("materiales/raw/imagenes/textos")
TEXTOS_DIR = Path("textos")

MODEL = "google/gemini-2.5-flash"


def _read_pi_auth_key():
    """Fallback: read OpenRouter key from pi's auth.json."""
    auth_path = Path.home() / ".pi" / "agent" / "auth.json"
    try:
        with open(auth_path) as f:
            data = json.load(f)
            return data.get("openrouter", {}).get("key", "")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return ""


API_KEY = os.environ.get("OPENROUTER_API_KEY", "") or _read_pi_auth_key()


def _resize_image(path, max_dim=1200):
    """Resize image to max_dim on longest side, return JPEG bytes."""
    result = subprocess.run(
        ["magick", str(path), "-resize", f"{max_dim}x{max_dim}>", "jpg:-"],
        capture_output=True,
    )
    if result.returncode != 0:
        # Fallback: read original
        with open(path, "rb") as f:
            return f.read()
    return result.stdout


def ask_gemini_single(image_bytes, prompt):
    """Send one image to Gemini and return the text response."""
    if not API_KEY:
        return "ERROR: Set OPENROUTER_API_KEY env var"

    b64 = base64.b64encode(image_bytes).decode()

    payload = {
        "model": MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        ]}],
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            return data.get("choices", [{}])[0].get("message", {}).get("content", "NO RESPONSE")
    except Exception as e:
        return f"ERROR: {e}"


def ask_gemini_multi(images, prompt):
    """Send multiple images to Gemini (for metadata extraction)."""
    if not API_KEY:
        return "ERROR: Set OPENROUTER_API_KEY env var"

    content = [{"type": "text", "text": prompt}]
    for img_path in images:
        img_bytes = _resize_image(img_path)
        b64 = base64.b64encode(img_bytes).decode()
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
        })

    payload = {
        "model": MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": content}],
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            return data.get("choices", [{}])[0].get("message", {}).get("content", "NO RESPONSE")
    except Exception as e:
        return f"ERROR: {e}"


def slugify(text):
    """Convert text to a filesystem-safe slug."""
    text = text.lower()
    text = re.sub(r"[áàäâ]", "a", text)
    text = re.sub(r"[éèëê]", "e", text)
    text = re.sub(r"[íìïî]", "i", text)
    text = re.sub(r"[óòöô]", "o", text)
    text = re.sub(r"[úùüû]", "u", text)
    text = re.sub(r"[ñ]", "n", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text


TRANSCRIBE_PROMPT = (
    "Transcribe TODO el texto de esta pagina de un libro EXACTAMENTE como esta escrito, "
    "sin resumir, sin omitir nada. Devolve SOLO el texto transcrito completo."
)

METADATA_PROMPT = (
    "Basado en todas las imagenes que te envio, proporciona los siguientes metadatos "
    "en formato JSON (sin markdown, solo JSON valido):\n"
    "\n"
    "{\n"
    '  "title": "Titulo del texto",\n'
    '  "author": "Autor del texto (si no aparece, usa Anonimo)",\n'
    '  "genre": "Genero literario (cuento/poema/ensayo/fragmento/carta/otro)",\n'
    '  "description": "Descripcion breve de 1-2 oraciones sobre el contenido"\n'
    "}\n"
    "\n"
    "No agregues nada mas que el JSON."
)


def process_directory(dir_path):
    """Process a single directory of images and create a markdown file."""
    print(f"\n  Processing: {dir_path.name}")

    # Collect images sorted by name
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp", ".gif"}
    images = sorted([img for img in dir_path.glob("*") if img.suffix.lower() in image_exts])

    if not images:
        print(f"  !! No images found in {dir_path.name}")
        return

    print(f"  Images: {len(images)} ({', '.join(img.name for img in images)})")

    # Step 1: Transcribe each image individually and concatenate
    all_text_parts = []
    for i, img_path in enumerate(images):
        print(f"  Transcribing image {i+1}/{len(images)}: {img_path.name}...")
        img_bytes = _resize_image(img_path)
        text = ask_gemini_single(img_bytes, TRANSCRIBE_PROMPT)
        if text.startswith("ERROR:"):
            print(f"    FAIL: {text}")
            continue
        all_text_parts.append(text.strip())
        print(f"    OK: {len(text)} chars")
        time.sleep(1)

    if not all_text_parts:
        print("  !! No text extracted from any image")
        return

    full_text = "\n\n".join(all_text_parts)
    print(f"  Total: {len(full_text)} chars across {len(all_text_parts)} pages")

    # Step 2: Extract metadata (send all images together)
    print(f"  Extracting metadata...")
    meta_raw = ask_gemini_multi(images, METADATA_PROMPT)
    if meta_raw.startswith("ERROR:"):
        print(f"    Could not get metadata: {meta_raw}")
        title = str(dir_path.name).replace("-", " ").title()
        author = "Anonimo"
        genre = "cuento"
        description = "Texto extraido de imagenes."
    else:
        json_match = re.search(r"\{[^{}]*\}", meta_raw, re.DOTALL)
        if json_match:
            try:
                meta = json.loads(json_match.group())
                title = meta.get("title", str(dir_path.name).replace("-", " ").title())
                author = meta.get("author", "Anonimo")
                genre = meta.get("genre", "cuento")
                description = meta.get("description", "Texto extraido de imagenes.")
            except json.JSONDecodeError:
                print(f"    Bad JSON, using defaults")
                title = str(dir_path.name).replace("-", " ").title()
                author = "Anonimo"
                genre = "cuento"
                description = "Texto extraido de imagenes."
        else:
            print(f"    No JSON in metadata response")
            title = str(dir_path.name).replace("-", " ").title()
            author = "Anonimo"
            genre = "cuento"
            description = "Texto extraido de imagenes."

    print(f"  Title: {title}")
    print(f"  Author: {author}")
    print(f"  Genre: {genre}")

    # Step 3: Create markdown file
    slug = slugify(title)
    out_path = TEXTOS_DIR / f"{slug}.md"

    frontmatter = (
        f"---\n"
        f'title: "{title}"\n'
        f'author: "{author}"\n'
        f'date: "{time.strftime("%Y-%m-%d")}"\n'
        f"status: draft\n"
        f'description: "{description}"\n'
        f'genre: "{genre}"\n'
        f'license: "Fragmento (derecho de cita)"\n'
        f"tags:\n"
        f"  - {genre}\n"
        f"---\n"
        f"\n"
        f"{full_text}\n"
    )

    TEXTOS_DIR.mkdir(exist_ok=True)
    out_path.write_text(frontmatter)
    print(f"  Created: {out_path}")


def main():
    print("Extracting texts from images")
    print("=" * 40)
    print(f"Source: {IMAGES_DIR}")
    print(f"Target: {TEXTOS_DIR}")
    print(f"Model: {MODEL}")

    if not IMAGES_DIR.exists():
        print(f"\nERROR: {IMAGES_DIR} does not exist")
        sys.exit(1)

    dirs = sorted([d for d in IMAGES_DIR.iterdir() if d.is_dir()])
    if not dirs:
        print(f"\nNo subdirectories in {IMAGES_DIR}")
        sys.exit(0)

    print(f"\n{len(dirs)} directories to process:")
    for d in dirs:
        print(f"  - {d.name}")

    for dir_path in dirs:
        process_directory(dir_path)

    print(f"\n{'=' * 40}")
    print("Done.")


if __name__ == "__main__":
    main()