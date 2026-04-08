import os
import subprocess
import json
import sys
import requests
from groq import Groq

# --- CONFIGURACIÓN DE ESTRATEGIA (MODIFICABLE) ---
PRIMARY_MODEL = "llama-3.1-70b-versatile"
MAX_CHARS_PER_BATCH = 80000
WHITELIST_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]
IGNORE_DIRS = [
    "node_modules",
    "dist",
    "build",
    "tests",
    "migrations",
    "vendor",
    ".github",
    "venv",
]
# ------------------------------------------------

REPO_FULL_NAME = os.getenv("GITHUB_REPOSITORY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_STEP_SUMMARY = os.getenv("GITHUB_STEP_SUMMARY")

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY no está configurada")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)


def log_to_summary(text):
    """Escribe mensajes en el panel visual de GitHub Actions."""
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(f"{text}\n")


def get_filtered_files():
    """Busca todos los archivos reales en el repo, ignorando lo que no sirve."""
    filtered_files = []
    for root, dirs, files in os.walk("."):
        # Modifica dirs in-place para que os.walk no entre en carpetas ignoradas
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            if any(file.endswith(ext) for ext in WHITELIST_EXTENSIONS):
                file_path = os.path.relpath(os.path.join(root, file), ".")
                filtered_files.append(file_path)
    return filtered_files


def get_file_content(file_path):
    """Obtiene el contenido de un archivo específico."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            return f"\n--- FILE: {file_path} ---\n{content}"
    except Exception as e:
        print(f"Error leyendo {file_path}: {e}")
        return ""


def split_content_into_batches(content, max_chars):
    """Divide el contenido en batches para evitar límites de contexto."""
    batches = []
    current_batch = ""

    # Dividir por archivos
    file_chunks = content.split("\n--- FILE:")

    for chunk in file_chunks:
        if not chunk.strip():
            continue

        chunk_text = f"\n--- FILE:{chunk}"

        if len(current_batch) + len(chunk_text) > max_chars and current_batch:
            batches.append(current_batch)
            current_batch = chunk_text
        else:
            current_batch += chunk_text

    if current_batch:
        batches.append(current_batch)

    return batches


def create_github_issue(title, body, model_used):
    """Crea el issue con una firma del modelo utilizado."""
    url = f"https://api.github.com/repos/{REPO_FULL_NAME}/issues"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    footer = f"\n\n---\n> 🤖 **AI Audit Note:** Revisión generada automáticamente por `{model_used}`."
    payload = {
        "title": title,
        "body": body + footer,
        "labels": ["clean-code-audit", "ai-review"],
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.status_code == 201


def main():
    log_to_summary("### 🚀 Resultado de la Auditoría Semanal (Groq Llama 3.1 70B)")

    # Obtener archivos filtrados
    files_to_review = get_filtered_files()

    if not files_to_review:
        log_to_summary("✅ **No se encontraron archivos para revisar** esta semana.")
        return

    print(f"✅ Archivos encontrados: {len(files_to_review)}")

    # Construir contenido completo
    full_content = ""
    for file_path in files_to_review:
        content = get_file_content(file_path)
        if content:
            full_content += content

    if len(full_content.strip()) < 100:
        log_to_summary("✅ **No se detectaron archivos con contenido revisable**.")
        return

    # Dividir en batches si es necesario
    batches = split_content_into_batches(full_content, MAX_CHARS_PER_BATCH)
    print(f"🚀 Dividido en {len(batches)} batch(es) para revisión")

    system_prompt = """Actúa como un Senior Tech Lead agnóstico a Gemini. Busca: deuda técnica, nombres poco claros, funciones gigantes, funciones que no cumplen el SRP (Single Responsibility Principle), falta de modularidad, problemas de OWASP Top 10 y riesgos de seguridad.


RESPONDE ÚNICAMENTE EN JSON:
{
  "has_issues": true,
  "issue_title": "Clean Code Audit: [Breve descripción]",
  "issue_body": "### 🚩 Hallazgos\n[Descripción]\n\n### 💡 Sugerencia\n```[lenguaje]\n[código]\n```"
}
Si no hay problemas, responde: {"has_issues": false}"""

    success = False

    try:
        for idx, batch in enumerate(batches):
            print(f"Analizando batch {idx + 1}/{len(batches)}...")

            response = client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": f"Audita el siguiente código:\n\n{batch}",
                    },
                ],
                max_tokens=2500,
                temperature=0.2,
            )

            response_data = json.loads(response.choices[0].message.content)

            if response_data.get("has_issues"):
                if create_github_issue(
                    response_data["issue_title"],
                    response_data["issue_body"],
                    PRIMARY_MODEL,
                ):
                    log_to_summary(
                        f"📌 **Issue creado correctamente** en batch {idx + 1}."
                    )
                break
            else:
                log_to_summary(
                    f"✨ **Batch {idx + 1} aprobado**. No se encontraron fallos de Clean Code."
                )

        success = True

    except Exception as e:
        log_to_summary(f"❌ **ERROR CRÍTICO:** {str(e)}")
        print(e)
        sys.exit(1)

    if not success:
        log_to_summary("❌ **ERROR CRÍTICO:** No se pudo completar la revisión.")
        sys.exit(1)


if __name__ == "__main__":
    main() 