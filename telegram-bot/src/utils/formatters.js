export function formatRecipeSummary(recipe, phase = 'confirmation') {
  const alerts = recipe.sibo_alerts?.length > 0
    ? `\n\n⚠️ *Alertas SIBO:*\n${recipe.sibo_alerts.map(a => `• ${a}`).join('\n')}`
    : '';

  const tags = Array.isArray(recipe.tags) 
    ? recipe.tags.map(t => typeof t === 'object' ? (t.es || t.en) : t).join(', ')
    : 'Ninguno';

  const title = phase === 'confirmation' ? '🧐 *Confirmar Datos de Receta*' : '✅ *Receta Procesada*';

  return `${title}\n\n` +
    `📝 *${recipe.title_es}*\n` +
    `🇬🇧 ${recipe.title_en}\n\n` +
    `⏱️ Prep: ${recipe.prep_time_minutes}min | Cocción: ${recipe.cook_time_minutes}min\n` +
    `👥 Porciones: ${recipe.servings} | Dificultad: ${recipe.difficulty}\n` +
    `🦠 Riesgo SIBO: *${(recipe.sibo_risk_level || 'unknown').toUpperCase()}*${alerts}\n` +
    `🏷️ Tags: ${tags}\n\n` +
    (phase === 'confirmation' ? '¿Son correctos los datos? Se guardará como borrador y se generará la imagen.' : 'Elige una acción:');
}

export function buildDataConfirmationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirmar Datos', callback_data: 'action:confirm-data' },
        { text: '❌ Cancelar', callback_data: 'action:cancel' }
      ]
    ]
  };
}

export function buildImageFeedbackKeyboard(recipeSlug) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Aceptar Foto', callback_data: `action:accept-image:${recipeSlug}` },
        { text: '📸 Regenerar Foto', callback_data: `action:refresh-image:${recipeSlug}` }
      ],
      [
        { text: '❌ Cancelar', callback_data: 'action:cancel' }
      ]
    ]
  };
}

export function buildInlineKeyboard(recipeSlug) {
  return {
    inline_keyboard: [
      [
        { text: '🚀 Publicar', callback_data: `action:post:${recipeSlug}` },
        { text: '📄 CSV', callback_data: `action:csv:${recipeSlug}` }
      ],
      [
        { text: '🛠️ Postman/cURL', callback_data: `action:curl:${recipeSlug}` },
        { text: '📸 Regenerar Foto', callback_data: `action:refresh-image:${recipeSlug}` }
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
