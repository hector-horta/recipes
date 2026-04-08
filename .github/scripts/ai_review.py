import os
import json
import sys
import requests
from groq import Groq

# --- CONFIGURACIÓN ACTUALIZADA 2026 ---
PRIMARY_MODEL = "llama-4-maverick-17b-128e-instruct"
MAX_CHARS_PER_BATCH = 80000  # Aprovechando el contexto extendido de Llama 4
WHITELIST_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]
IGNORE_DIRS = ["node_modules", "dist", "build", "tests", ".github", "venv"]
# --------------------------------------

REPO_FULL_NAME = os.getenv("GITHUB_REPOSITORY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_STEP_SUMMARY = os.getenv("GITHUB_STEP_SUMMARY")

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY no está configurada")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)

def log_to_summary(text):
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(f"{text}\n")

def get_all_files():
    """Busca TODOS los archivos del proyecto para una auditoría completa."""
    filtered_files = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in WHITELIST_EXTENSIONS):
                file_path = os.path.relpath(os.path.join(root, file), ".")
                filtered_files.append(file_path)
    return filtered_files

def get_file_content(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f"\n--- FILE: {file_path} ---\n{f.read()}"
    except Exception as e:
        print(f"Error leyendo {file_path}: {e}")
        return ""

def create_github_issue(title, body, model_used):
    url = f"https://api.github.com/repos/{REPO_FULL_NAME}/issues"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    payload = {
        "title": title,
        "body": body + f"\n\n---\n> 🤖 **AI Audit:** Generado por `{model_used}`.",
        "labels": ["clean-code-audit", "ai-review"],
    }
    return requests.post(url, headers=headers, json=payload).status_code == 201

def main():
    log_to_summary(f"### 🚀 Auditoría Semanal: {PRIMARY_MODEL}")
    
    files_to_review = get_all_files()
    if not files_to_review:
        log_to_summary("✅ No se encontraron archivos para revisar.")
        return

    print(f"✅ Archivos encontrados para auditoría total: {len(files_to_review)}")

    full_content = "".join([get_file_content(f) for f in files_to_review])
    
    if len(full_content.strip()) < 100:
        log_to_summary("✅ Contenido insuficiente para auditar.")
        return

    system_prompt = """Actúa como un Senior Tech Lead. Analiza el código buscando deuda técnica, 
    fallos de seguridad (OWASP) y modularidad. RESPONDE ÚNICAMENTE EN JSON:
    {"has_issues": true, "issue_title": "...", "issue_body": "..."} o {"has_issues": false}"""

    try:
        print(f"🚀 Enviando a {PRIMARY_MODEL}...")
        response = client.chat.completions.create(
            model=PRIMARY_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Audita este código:\n\n{full_content[:MAX_CHARS_PER_BATCH]}"},
            ],
            temperature=0.1,
        )

        response_data = json.loads(response.choices[0].message.content)

        if response_data.get("has_issues"):
            create_github_issue(response_data["issue_title"], response_data["issue_body"], PRIMARY_MODEL)
            log_to_summary("📌 **Issue creado con hallazgos de Llama 4.**")
        else:
            log_to_summary("✨ **Código aprobado por el Auditor AI.**")

    except Exception as e:
        log_to_summary(f"❌ **ERROR:** {str(e)}")
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()