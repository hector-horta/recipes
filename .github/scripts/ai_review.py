import os
import subprocess
import json
import requests
from anthropic import Anthropic

# --- CONFIGURACIÓN DE CONSULTORÍA (AJUSTABLE) ---
WHITELIST_EXTENSIONS = ['.py', '.ts', '.js', '.tsx', '.jsx', '.go', '.rs', '.php']
IGNORE_DIRS = ['node_modules', 'dist', 'build', 'tests', 'migrations', 'vendor', '.github']
MAX_CHARS_ALLOWED = 12000  # Límite para mantenerse en el Tier Gratuito (aprox 4k tokens)
# ------------------------------------------------

# Variables de Entorno de GitHub Actions
REPO_FULL_NAME = os.getenv('GITHUB_REPOSITORY')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

client = Anthropic(api_key=ANTHROPIC_API_KEY)

def get_filtered_weekly_diff():
    """Obtiene cambios de la última semana filtrando por ruido y extensiones."""
    try:
        # 1. Obtener lista de archivos modificados en los últimos 7 días
        files_cmd = ["git", "diff", "--name-only", "HEAD@{7.days.ago}", "HEAD"]
        result = subprocess.run(files_cmd, capture_output=True, text=True)
        files_changed = result.stdout.splitlines()
        
        full_diff = ""
        for file_path in files_changed:
            # Filtro de Extensiones
            if any(file_path.endswith(ext) for ext in WHITELIST_EXTENSIONS):
                # Filtro de Directorios a ignorar
                if not any(dir_name in file_path for dir_name in IGNORE_DIRS):
                    diff_cmd = ["git", "diff", "HEAD@{7.days.ago}", "HEAD", "--", file_path]
                    file_diff = subprocess.run(diff_cmd, capture_output=True, text=True).stdout
                    full_diff += f"\n--- FILE: {file_path} ---\n{file_diff}\n"

        # Control de presupuesto de Tokens (Tier Gratis)
        if len(full_diff) > MAX_CHARS_ALLOWED:
            return full_diff[:MAX_CHARS_ALLOWED] + "\n\n[AVISO: Diff truncado por límites de capacidad del Tier Gratuito]"
        
        return full_diff
    except Exception as e:
        print(f"Error obteniendo el diff: {e}")
        return None

def create_github_issue(title, body):
    """Publica el hallazgo de Claude como un Issue en el repositorio."""
    url = f"https://api.github.com/repos/{REPO_FULL_NAME}/issues"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    payload = {
        "title": title, 
        "body": body, 
        "labels": ["clean-code-audit", "ai-review"]
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.status_code == 201

def main():
    print("🚀 Iniciando Auditoría Semanal de Clean Code...")
    
    diff_content = get_filtered_weekly_diff()
    
    if not diff_content or len(diff_content.strip()) < 100:
        print("✅ No hay cambios significativos en el código de lógica esta semana. Saltando revisión.")
        return

    # Prompt de Arquitecto Senior enfocado en Clean Code
    system_prompt = """Actúa como un Senior Staff Engineer experto en Clean Code y Arquitectura. 
    Tu misión es revisar el código generado (posiblemente con ayuda de IA) y detectar deuda técnica.
    
    ENFOQUE:
    1. Nombres: ¿Son claros? (Evita 'data', 'info', 'temp').
    2. Funciones: ¿Son cortas y cumplen el SRP (Single Responsibility Principle)?
    3. Complejidad: ¿Hay demasiados anidamientos (if/else)?
    4. Seguridad: ¿Ves secretos expuestos o lógica vulnerable?

    RESPONDE EXCLUSIVAMENTE EN JSON:
    {
      "has_issues": true,
      "issue_title": "Clean Code Audit: [Resumen corto]",
      "issue_body": "### 🚩 Hallazgos Principales\n[Descripción clara]\n\n### 💡 Sugerencia de Refactor\n```[lenguaje]\n[código sugerido]\n```"
    }
    Si todo está perfecto, responde: {"has_issues": false}"""

    try:
        print("🧠 Consultando a Claude 3.5 Sonnet...")
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Revisa este código modificado esta semana:\n\n{diff_content}"}]
        )

        # Parsear respuesta
        response_data = json.loads(message.content[0].text)

        if response_data.get("has_issues"):
            title = response_data.get("issue_title", "Revisión técnica semanal")
            body = response_data.get("issue_body", "Se encontraron oportunidades de mejora en el código.")
            
            if create_github_issue(title, body):
                print(f"📌 Issue creado: {title}")
            else:
                print("❌ Error al intentar crear el Issue en GitHub.")
        else:
            print("✨ Claude no encontró problemas de Clean Code. ¡Buen trabajo!")

    except Exception as e:
        print(f"⚠️ Error en la comunicación con la IA o GitHub: {e}")

if __name__ == "__main__":
    main()