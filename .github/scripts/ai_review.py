import os
import json
import sys
import requests
import time # Importante para la pausa
from groq import Groq

# --- CONFIGURACIÓN PARA FREE TIER (MAX OPTIMIZED) ---
PRIMARY_MODEL = "llama-3.3-70b-versatile"
MAX_CHARS_PER_BATCH = 8500  # Ajustado para no exceder los 12k TPM
WHITELIST_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]
IGNORE_DIRS = ["node_modules", "dist", "build", "tests", ".github", "venv"]
# ----------------------------------------------------

REPO_FULL_NAME = os.getenv("GITHUB_REPOSITORY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_STEP_SUMMARY = os.getenv("GITHUB_STEP_SUMMARY")

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY no configurada")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)

def log_to_summary(text):
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(f"{text}\n")

def get_all_files():
    """Obtiene solo los archivos modificados en los últimos 7 días."""
    try:
        # Forzamos a Git a buscar el hash del commit de hace 7 días
        cmd_hash = ["git", "rev-list", "-n", "1", "--before='7 days ago'", "HEAD"]
        since_commit = subprocess.run(cmd_hash, capture_output=True, text=True).stdout.strip()
        
        # Si no hay un commit tan viejo (repo nuevo), comparamos contra el primer commit
        if not since_commit:
            cmd_hash = ["git", "rev-list", "--max-parents=0", "HEAD"]
            since_commit = subprocess.run(cmd_hash, capture_output=True, text=True).stdout.strip()

        # Obtenemos la lista de archivos cambiados desde ese commit
        files_cmd = ["git", "diff", "--name-only", since_commit, "HEAD"]
        result = subprocess.run(files_cmd, capture_output=True, text=True)
        
        files_changed = result.stdout.splitlines()
        filtered_files = []
        for file_path in files_changed:
            if any(file_path.endswith(ext) for ext in WHITELIST_EXTENSIONS):
                if not any(dir_name in file_path for dir_name in IGNORE_DIRS):
                    if os.path.exists(file_path): # Aseguramos que el archivo no fue borrado
                        filtered_files.append(file_path)
        return filtered_files
    except Exception as e:
        print(f"⚠️ Error obteniendo delta: {e}")
        return []

def split_into_batches(content, limit):
    """Divide el contenido en pedazos que Groq Free Tier pueda digerir."""
    return [content[i:i + limit] for i in range(0, len(content), limit)]

def main():
    log_to_summary(f"### 🚀 Auditoría Semanal (Free Tier Optimized)")
    
    files_to_review = get_all_files()
    if not files_to_review:
        log_to_summary("✅ No hay archivos para revisar.")
        return

    full_content = ""
    for f in files_to_review:
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_read:
                full_content += f"\n--- FILE: {f} ---\n{file_read.read()}"
        except: continue

    batches = split_into_batches(full_content, MAX_CHARS_PER_BATCH)
    print(f"📦 Total de archivos: {len(files_to_review)}. Dividido en {len(batches)} batches.")

    system_prompt = "Actúa como Senior Tech Lead. Hallazgos críticos de seguridad y deuda técnica. Responde ÚNICAMENTE JSON: {\"has_issues\": true, \"issue_title\": \"...\", \"issue_body\": \"...\"} o {\"has_issues\": false}"

    for idx, batch in enumerate(batches):
        try:
            print(f"🔍 Analizando batch {idx+1}/{len(batches)}...")
            
            # Si no es el primer batch, esperamos 10 segundos para no saturar el TPM
            if idx > 0:
                print("⏳ Esperando 10s para limpiar cuota de tokens...")
                time.sleep(10)

            response = client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Audita este bloque de código:\n\n{batch}"}
                ],
                temperature=0.1
            )

            res = json.loads(response.choices[0].message.content)
            if res.get("has_issues"):
                url = f"https://api.github.com/repos/{REPO_FULL_NAME}/issues"
                headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
                payload = {"title": f"{res['issue_title']} (Batch {idx+1})", "body": res['issue_body'], "labels": ["ai-review"]}
                requests.post(url, headers=headers, json=payload)
                log_to_summary(f"🚩 Batch {idx+1}: Hallazgos reportados.")
            else:
                log_to_summary(f"✅ Batch {idx+1}: Limpio.")

        except Exception as e:
            print(f"⚠️ Error en batch {idx+1}: {e}")
            continue # Seguimos con el siguiente si uno falla

if __name__ == "__main__":
    main()