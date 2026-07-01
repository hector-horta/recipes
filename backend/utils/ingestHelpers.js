import { config } from '../config/env.js';

export function generateSlug(title) {
  return (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function buildTripleCheckMenu(recipe) {
  return {
    message: 'Receta procesada. Elige una acción:',
    options: [
      {
        key: 'A',
        label: '🚀 POST',
        description: 'Inserción directa en PostgreSQL',
        action: `/api/ingest/${recipe.slug}/post`
      },
      {
        key: 'B',
        label: '📄 CSV',
        description: 'Generar archivo CSV',
        action: `/api/ingest/${recipe.slug}/csv`
      },
      {
        key: 'C',
        label: '🛠️ Postman',
        description: 'Obtener JSON/cURL listo para editar',
        action: `/api/ingest/${recipe.slug}/curl`
      }
    ]
  };
}

export function buildCSVRow(recipe) {
  const headers = [
    'slug', 'title_es', 'title_en', 'prep_time_minutes', 'cook_time_minutes',
    'servings', 'difficulty', 'sibo_risk_level', 'sibo_alerts', 'ingredients_count', 'steps_count'
  ];

  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const row = [
    recipe.slug,
    recipe.title_es,
    recipe.title_en,
    recipe.prep_time_minutes,
    recipe.cook_time_minutes,
    recipe.servings,
    recipe.difficulty,
    recipe.sibo_risk_level,
    JSON.stringify(recipe.sibo_alerts || []),
    (recipe.ingredients || []).length,
    (recipe.steps || []).length
  ];

  return headers.join(',') + '\n' + row.map(escapeCsv).join(',') + '\n';
}

export function buildCurlCommand(recipe) {
  const apiUrl = config.FRONTEND_URL || 'http://localhost:5173';
  return `curl -X POST ${apiUrl}/api/ingest/save \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(recipe, null, 2)}'`;
}
