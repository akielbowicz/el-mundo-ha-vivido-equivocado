"""Combine raw OCR output with manually identified book titles → books_index.json.

Uso: python build_final_json.py [input.json] [output.json]
Defaults: books_ocr_raw.json → books_index.json (junto a este script).
"""
import json
import os
import re
import sys

DIR = os.path.dirname(os.path.abspath(__file__))

# Read raw OCR data
input_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DIR, "books_ocr_raw.json")
with open(input_path, "r") as f:
    raw_books = json.load(f)

def clean_index_text(text):
    """Clean up OCR text - remove obvious garbage lines, keep meaningful content"""
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        line = line.strip()
        # Skip lines that are just OCR noise
        if not line:
            continue
        # Skip lines that are mostly special characters
        noise_ratio = sum(1 for c in line if c in "|!¡¿?=*><[]{}()#@$%^&~`") / max(len(line), 1)
        if noise_ratio > 0.4 and len(line) > 5:
            continue
        # Skip lines that are just dots and special chars
        if re.match(r'^[\s\.\,\;\:\!\?\-\_\=\+\*\/\\\|\(\)\[\]\{\}]+$', line):
            continue
        cleaned.append(line)
    return "\n".join(cleaned)

def parse_index_entries(text):
    """Try to parse index entries as title + page number"""
    entries = []
    for line in text.split("\n"):
        line = line.strip()
        # Try to match "Title ... page" or "Title page"
        m = re.match(r'^(.+?)\s*\.{2,}\s*(\d+)\s*$', line)
        if m:
            entries.append({"title": m.group(1).strip(), "page": int(m.group(2))})
            continue
        m = re.match(r'^(.+?)\s+(\d+)\s*$', line)
        if m and len(m.group(1)) > 3 and int(m.group(2)) < 1000:
            entries.append({"title": m.group(1).strip(), "page": int(m.group(2))})
            continue
    return entries

# Manual identification of books based on cover OCR + known literature
book_titles = [
    {"title": "La casa inundada", "author": "Felisberto Hernández"},
    {"title": "El lugar donde mueren los pájaros", "author": "Tomás Downey"},
    {"title": "La caída / La carne", "author": "Virgilio Piñera"},
    {"title": "Escalas melografiadas", "author": "César Vallejo"},
    {"title": "El Aleph", "author": "Jorge Luis Borges"},
    {"title": "Antología del cuento cubano (1990-2015)", "author": "Varios (ed. Eduardo Heras León)"},
    {"title": "Candaya", "author": "Solange Rodríguez Pappe"},
    {"title": "Antología de cuentos de ciencia ficción", "author": "Varios (ed. Pablo Capanna)"},
    {"title": "El informe de Brodie", "author": "Jorge Luis Borges"},
    {"title": "Cuentos reunidos", "author": "Sergio Bizzio"},
    {"title": "El monte volador", "author": "Sergio Bizzio"},
    {"title": "Nada de todo esto", "author": "Suso de Ribera"},
    {"title": "La máquina de pensar en Gladys", "author": "Mario Levrero"},
    {"title": "Nudista", "author": "Luciano Lamberti"},
    {"title": "Los mejores días", "author": "Magalí Etchebarne"},
    {"title": "Las Hortensias y otros relatos", "author": "Felisberto Hernández"},
    {"title": "La fiesta ajena / La muerte de Dios", "author": "Santiago Gamboa (o Liliana Colanzi?)"},
    {"title": "Los pasajeros del tren de la noche", "author": "Fogwill"},
    {"title": "Cuentos reunidos", "author": "Hebe Uhart"},
    {"title": "Todos los cuentos", "author": "Andrés Caicedo"},
    {"title": "Textos selectos", "author": "Macedonio Fernández"},
    {"title": "Nuestros años pasan de la misma manera", "author": "Dana Madera"},
    {"title": "Ven, mi ama Zobeida quiere hablarte", "author": "Varios / Seix Barral"},
    {"title": "Biblioteca Gombrowicz", "author": "Witold Gombrowicz"},
    {"title": "Sola", "author": "???"},
    {"title": "Los árboles también", "author": "Alejandra Kamiya"},
    {"title": "El sol mueve la sombra de las cosas quietas", "author": "???"},
    {"title": "Páginas escogidas", "author": "Guillermo Enrique Hudson (selec. Fernando Pozzo)"},
    {"title": "El matrimonio de los peces rojos", "author": "Guadalupe Nettel"},
    {"title": "Los veinticinco cuentos despiadados", "author": "Agota Kristof"},
    {"title": "La vida por delante", "author": "Magalí Etchebarne"},
    {"title": "Una lección de vida y otros cuentos", "author": "Roberto Fontanarrosa"},
    {"title": "Cuentos inéditos", "author": "Roberto Fontanarrosa"},
    {"title": "El cerco / La literatura", "author": "Fernanda García Lao"},
    {"title": "Cuatro fantásticos / Bosque Pulenta", "author": "???"},
    {"title": "Cuentos completos", "author": "Ricardo Piglia"},
    {"title": "El karma de ciertas chicas", "author": "???"},
    {"title": "Yendo del baño al living", "author": "Elvio E. Gandolfo"},
    {"title": "Las otras puertas", "author": "???"},
    {"title": "La isla a mediodía / El otro cielo", "author": "Julio Cortázar / Georges Perec"},
    {"title": "Cuentos completos 1", "author": "Julio Cortázar"},
    {"title": "Historias de cronopios y de famas / Todos los fuegos el fuego", "author": "Julio Cortázar"},
    {"title": "Cuentos completos 2", "author": "Julio Cortázar"},
]

# Build final JSON
final_books = []
for i, raw in enumerate(raw_books):
    # Combine all index text
    all_index_text = "\n".join(p["text"] for p in raw["index_pages"])
    cleaned = clean_index_text(all_index_text)
    
    # Parse index entries
    parsed_entries = parse_index_entries(cleaned)
    
    book_info = {
        "book": i + 1,
        "title": book_titles[i]["title"],
        "author": book_titles[i]["author"],
        "cover_photo": raw["photos"][0],
        "index_photos": raw["photos"][1:],
        "index_raw": cleaned,
        "index_entries": parsed_entries if parsed_entries else []
    }
    final_books.append(book_info)

# Save final JSON
output_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DIR, "books_index.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(final_books, f, ensure_ascii=False, indent=2)

print(f"Saved {len(final_books)} books to {output_path}")

# Print summary
for b in final_books:
    print(f"\n{'='*60}")
    print(f"Book {b['book']}: {b['title']} — {b['author']}")
    print(f"Cover: {b['cover_photo']}")
    print(f"Index pages: {len(b['index_photos'])}")
    if b['index_entries']:
        print(f"Parsed entries: {len(b['index_entries'])}")
        for e in b['index_entries'][:5]:
            print(f"  · {e['title']} → p.{e['page']}")
        if len(b['index_entries']) > 5:
            print(f"  ... and {len(b['index_entries'])-5} more")
    else:
        print("Raw index text:")
        for line in b['index_raw'].split("\n")[:10]:
            print(f"  {line}")