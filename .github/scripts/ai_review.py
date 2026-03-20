import os
import subprocess
import json
import requests
import time
from anthropic import Anthropic, APIStatusError, RateLimitError

# --- CONFIGURACIÓN DE ESTRATEGIA (MODIFICABLE) ---
PRIMARY_MODEL = "claude-3-5-sonnet-20240620"  # El auditor experto
BACKUP_MODEL = "claude-3-haiku-20240307"      # El auditor de emergencia (más barato/rápido)

WHITELIST_EXTENSIONS = ['.py', '.ts', '.js', '.tsx', '.jsx', '.go', '.rs', '.php', '.cs']
IGNORE_DIRS = ['node_modules', 'dist', 'build', 'tests', 'migrations', 'vendor', '.github', 'venv']
MAX_CHARS_ALLOWED = 15000  # Límite de seguridad para el Tier Gratuito (aprox 5k tokens)
# ------------------------------------------------

REPO_FULL_NAME = os.getenv('GITHUB_REPOSITORY')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
GITHUB_STEP_SUMMARY = os.getenv('GITHUB_STEP_SUMMARY')

client = Anthropic(api_key=ANTHROPIC_API_KEY)

def log_to_summary(text):
    """Escribe mensajes en el panel visual de GitHub Actions."""
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(f"{text}\n")

def get_filtered_weekly_diff():
    """Obtiene el diff de la última semana aplicando filtros de ruido."""
    try:
        # Intentamos obtener archivos modificados en los últimos 7 días
        files_cmd = ["git", "diff", "--name-only", "HEAD@{7.days.ago}", "HEAD"]
        result = subprocess.run(files_cmd, capture_output=True, text=True)
        
        # Si falla el comando de tiempo (repos nuevos), intentamos el último commit
        if result.returncode != 0:
            files_cmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]
            result = subprocess.run(files_cmd, capture_output=True, text=True)

        files_changed = result.stdout.splitlines()
        
        full_diff = ""
        for file_path in files_changed:
            if any(file_path.endswith(ext) for ext in WHITELIST_EXTENSIONS):
                if not any(dir_name in file_path for dir_name in IGNORE_DIRS):
                    diff_cmd = ["git", "diff", "HEAD@{7.days.ago}", "HEAD", "--", file_path]
                    file_diff = subprocess.run(diff_cmd, capture_output=True, text=True).stdout
                    if file_diff:
                        full_diff += f"\n--- FILE: {file_path} ---\n{file_diff}\n"

        if not full_diff:
            return None

        return full_diff[:MAX_CHARS_ALLOWED] if len(full_diff) > MAX_CHARS_ALLOWED else full_diff
    except Exception as e:
        print(f"Error en Git: {e}")
        return None

def create_github_issue(title, body, model_used):
    """Crea el issue con una firma del modelo utilizado."""
    url = f"https://api.github.com/repos/{REPO_FULL_NAME}/issues"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    footer = f"\n\n---\n> 🤖 **AI Audit Note:** Revisión generada automáticamente por `{model_used}`."
    payload = {
        "title": title, 
        "body": body + footer, 
        "labels": ["clean-code-audit", "ai-review"]
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.status_code == 201

def main():
    log_to_summary("### 🚀 Resultado de la Auditoría Semanal")
    diff_content = get_filtered_weekly_diff()
    
    if not diff_content or len(diff_content.strip()) < 100:
        log_to_summary("✅ **No se detectaron cambios significativos** en los archivos de lógica esta semana.")
        return

    system_prompt = """Actúa como un Senior Staff Engineer experto en Clean Code. 
    Busca: deuda técnica, nombres poco claros, funciones gigantes, funciones que no cumplen el SRP (Single Responsibility Principle), falta de modularidad, problemas de OWASP Top 10 y riesgos de seguridad.


    RESPONDE ÚNICAMENTE EN JSON:
    {
      "has_issues": true,
      "issue_title": "Clean Code Audit: [Breve descripción]",
      "issue_body": "### 🚩 Hallazgos\n[Descripción]\n\n### 💡 Sugerencia\n```[lenguaje]\n[código]\n```"
    }
    Si no hay problemas, responde: {"has_issues": false}"""

    models_to_try = [PRIMARY_MODEL, BACKUP_MODEL]
    success = False

    for model in models_to_try:
        try:
            print(f"Analizando con {model}...")
            message = client.messages.create(
                model=model,
                max_tokens=2500,
                system=system_prompt,
                messages=[{"role": "user", "content": f"Audita el siguiente diff:\n\n{diff_content}"}]
            )

            response_data = json.loads(message.content[0].text)
            
            if response_data.get("has_issues"):
                if create_github_issue(response_data['issue_title'], response_data['issue_body'], model):
                    log_to_summary(f"📌 **Issue creado correctamente** usando `{model}`.")
            else:
                log_to_summary(f"✨ **Código aprobado** por `{model}`. No se encontraron fallos de Clean Code.")
            
            success = True
            break 

        except (RateLimitError, APIStatusError) as e:
            log_to_summary(f"⚠️ El modelo `{model}` falló (Límite de cuota o API).")
            print(f"Fallo en {model}: {e}. Intentando failover...")
            time.sleep(1)
            continue
        except Exception as e:
            log_to_summary(f"⚠️ Error inesperado con `{model}`: {str(e)}")
            continue

    if not success:
        log_to_summary("❌ **ERROR CRÍTICO:** No se pudo completar la revisión con ningún modelo. Revisa tu cuenta de Anthropic.")
        exit(1)

if __name__ == "__main__":
    main()