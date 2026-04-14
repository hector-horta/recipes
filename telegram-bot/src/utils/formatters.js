export function formatRecipeSummary(recipe) {
  const alerts = recipe.sibo_alerts?.length > 0
    ? `\n\n⚠️ *Alertas SIBO:*\n${recipe.sibo_alerts.map(a => `• ${a}`).join('\n')}`
    : '';

  return `✅ *Receta procesada*\n\n` +
    `📝 *${recipe.title_es}*\n` +
    `🇬🇧 ${recipe.title_en}\n\n` +
    `⏱️ Prep: ${recipe.prep_time_minutes}min | Cocción: ${recipe.cook_time_minutes}min\n` +
    `👥 Porciones: ${recipe.servings} | Dificultad: ${recipe.difficulty}\n` +
    `🦠 Riesgo SIBO: *${recipe.sibo_risk_level?.toUpperCase()}*${alerts}\n` +
    `🏷️ Tags: ${(recipe.tags || []).join(', ') || 'Ninguno'}\n\n` +
    `Elige una acción:`;
}

export function buildInlineKeyboard(recipeSlug) {
  return {
    inline_keyboard: [
      [
        { text: '💾 Guardar en BD', callback_data: `action:post:${recipeSlug}` },
        { text: '📄 CSV', callback_data: `action:csv:${recipeSlug}` }
      ],
      [
        { text: '🛠️ Postman/cURL', callback_data: `action:curl:${recipeSlug}` }
      ]
    ]
  };
}

export function buildWelcomeMessage() {
  return '🍳 *Wati Recipe Ingest Bot*\n\n' +
    'Envíame:\n' +
    '📸 *1 foto* de receta completa\n' +
    '📸 *2 fotos seguidas* (ingredientes + preparación)\n' +
    '📝 *Texto* de recetas\n' +
    '🎤 *Notas de voz* (dictado)\n\n' +
    'Procesado con NVIDIA NIM (Llama 4 Maverick)\n\n' +
    'Procesaré todo y te daré opciones para guardar.';
}
