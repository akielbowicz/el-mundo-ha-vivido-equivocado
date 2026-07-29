#!/usr/bin/env python3
"""Send images to Gemini via OpenRouter (requires API_KEY env var)."""
import json, base64, sys, os, urllib.request

DIR = os.path.dirname(os.path.abspath(__file__))
API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

def ask_gemini(images, prompt):
    if not API_KEY:
        return "ERROR: Set OPENROUTER_API_KEY env var"
    content = [{"type": "text", "text": prompt}]
    for img_path in images:
        with open(os.path.join(DIR, img_path), "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
    payload = {"model": "google/gemini-2.5-flash", "messages": [{"role": "user", "content": content}]}
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read())
            return data.get("choices", [{}])[0].get("message", {}).get("content", "NO RESPONSE")
    except Exception as e:
        return f"ERROR: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: OPENROUTER_API_KEY=sk-or-... python3 identify.py <image.jpg> [image2.jpg ...]")
        sys.exit(1)
    r = ask_gemini(sys.argv[1:], "Identify this book cover or index page.")
    print(r)
