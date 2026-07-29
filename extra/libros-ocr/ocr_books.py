import re
import json
import subprocess
import os
import sys

DIR = "/var/home/sasha/Downloads/WhatsApp Chat with EMHVE"
CHAT_FILE = os.path.join(DIR, "WhatsApp Chat with EMHVE.txt")

# Parse chat log to extract photo groups
with open(CHAT_FILE, "r", encoding="utf-8") as f:
    text = f.read()

groups = []
current = []

for line in text.split("\n"):
    line = line.strip()
    # Empty message = separator between groups
    if re.match(r"\d+/\d+/\d+, \d+:\d+ - Sasha K:\s*$", line):
        if current:
            groups.append(current)
            current = []
        continue
    m = re.search(r"IMG-\d+-WA\d+\.jpg", line)
    if m:
        current.append(m.group(0))

if current:
    groups.append(current)

print(f"Found {len(groups)} groups", file=sys.stderr)

def ocr_image(filename):
    path = os.path.join(DIR, filename)
    if not os.path.exists(path):
        return f"[FILE NOT FOUND: {filename}]"
    try:
        result = subprocess.run(
            ["tesseract", path, "-", "-l", "spa", "--psm", "6"],
            capture_output=True, text=True, timeout=30
        )
        text = result.stdout.strip()
        if not text:
            result = subprocess.run(
                ["tesseract", path, "-", "-l", "spa", "--psm", "3"],
                capture_output=True, text=True, timeout=30
            )
            text = result.stdout.strip()
        return text
    except Exception as e:
        return f"[OCR ERROR: {e}]"

# Process each group
books = []
for i, group in enumerate(groups):
    print(f"Processing book {i+1}/{len(groups)}...", file=sys.stderr)
    
    book_data = {
        "book": i + 1,
        "photos": group,
        "cover_text": "",
        "index_pages": []
    }
    
    for j, photo in enumerate(group):
        text = ocr_image(photo)
        if j == 0:
            book_data["cover_text"] = text
        else:
            book_data["index_pages"].append({"photo": photo, "text": text})
    
    books.append(book_data)

# Save raw OCR output
output_path = os.path.join(DIR, "books_ocr_raw.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(books, f, ensure_ascii=False, indent=2)

print(f"\nRaw OCR saved to {output_path}", file=sys.stderr)
print(f"Total books: {len(books)}", file=sys.stderr)

# Also print to stdout for easy viewing
print(json.dumps(books, ensure_ascii=False, indent=2))