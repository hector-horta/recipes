/**
 * SessionManager handles temporary state for users in the bot.
 * Currently uses in-memory Maps, but could be extended to Redis.
 */
class SessionManager {
  constructor() {
    this.voiceEdits = new Map();
    this.images = new Map();
    this.overwrites = new Map();
    this.imageFeedbacks = new Map();
    this.pendingRecipes = new Map();
  }

  // Pending recipes (for confirmation)
  setPendingRecipe(chatId, data) {
    this.pendingRecipes.set(chatId, data);
  }
  getPendingRecipe(chatId) {
    return this.pendingRecipes.get(chatId);
  }
  deletePendingRecipe(chatId) {
    this.pendingRecipes.delete(chatId);
  }

  // Voice sessions
  setVoiceEdit(chatId, data) {
    this.voiceEdits.set(chatId, data);
  }
  getVoiceEdit(chatId) {
    return this.voiceEdits.get(chatId);
  }
  deleteVoiceEdit(chatId) {
    this.voiceEdits.delete(chatId);
  }

  // Image groups
  setImageGroup(chatId, group) {
    this.images.set(chatId, group);
  }
  getImageGroup(chatId) {
    return this.images.get(chatId);
  }
  deleteImageGroup(chatId) {
    this.images.delete(chatId);
  }

  // Overwrite confirm
  setOverwrite(chatId, data) {
    this.overwrites.set(chatId, data);
  }
  getOverwrite(chatId) {
    return this.overwrites.get(chatId);
  }
  deleteOverwrite(chatId) {
    this.overwrites.delete(chatId);
  }

  // Image feedback sessions
  setImageFeedback(chatId, data) {
    this.imageFeedbacks.set(chatId, data);
  }
  getImageFeedback(chatId) {
    return this.imageFeedbacks.get(chatId);
  }
  deleteImageFeedback(chatId) {
    this.imageFeedbacks.delete(chatId);
  }
}

export const sessionManager = new SessionManager();
