import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Users, AlertTriangle, Loader2, Languages } from 'lucide-react';
import { T } from '../../constants';
import type { RecipeFormData } from '../../types';

interface BasicDetailsSectionProps {
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  translatingFields: Record<string, boolean>;
  handleTranslateField: (text: string, from: 'es' | 'en', to: 'es' | 'en', fieldKey: string, onTranslation: (translated: string) => void) => Promise<void>;
}

export const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({
  formData,
  setFormData,
  translatingFields,
  handleTranslateField
}) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
          <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
          {t('recipes.form.essential_info')}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.primary }}>
          <span>Edición Simultánea ES / EN</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title ES */}
        <div className="space-y-2 relative">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center justify-between" style={{ color: T.text }}>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
              Título (ES)
            </span>
            <button
              type="button"
              disabled={translatingFields['title_es']}
              onClick={() => handleTranslateField(formData.title, 'es', 'en', 'title_es', (val) => setFormData(p => ({ ...p, titleEn: val })))}
              className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: T.primary }}
            >
              {translatingFields['title_es'] ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
              Traducir a EN
            </button>
          </label>
          <input
            placeholder="Ej. Sopa de calabaza"
            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.title}
            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            required
          />
        </div>

        {/* Title EN */}
        <div className="space-y-2 relative">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center justify-between" style={{ color: T.text }}>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
              Título (EN)
            </span>
            <button
              type="button"
              disabled={translatingFields['title_en']}
              onClick={() => handleTranslateField(formData.titleEn, 'en', 'es', 'title_en', (val) => setFormData(p => ({ ...p, title: val })))}
              className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: T.primary }}
            >
              {translatingFields['title_en'] ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
              Traducir a ES
            </button>
          </label>
          <input
            placeholder="e.g. Pumpkin soup"
            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.titleEn}
            onChange={(e) => setFormData(p => ({ ...p, titleEn: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prep Time */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
            <Clock size={12} style={{ color: T.primary }} /> Tiempo de preparación (min)
          </label>
          <input
            type="number"
            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.prepTimeMinutes}
            onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Cook Time */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
            <Clock size={12} style={{ color: T.primary }} /> Tiempo de cocción (min)
          </label>
          <input
            type="number"
            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.cookTimeMinutes}
            onChange={(e) => setFormData({ ...formData, cookTimeMinutes: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Servings */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
            <Users size={12} style={{ color: T.primary }} /> Raciones
          </label>
          <input
            type="number"
            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.servings || 1}
            onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.form.difficulty_label')}</label>
          <select
            className="w-full h-12 px-4 rounded-xl outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            value={formData.difficulty || 'medium'}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
          >
            <option value="easy">○ {t('recipes.difficulty.easy')}</option>
            <option value="medium">◒ {t('recipes.difficulty.medium')}</option>
            <option value="hard">● {t('recipes.difficulty.hard')}</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.form.status_label')}</label>
          <div className="flex p-1 rounded-xl h-12" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
            {(['draft', 'published', 'archived'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className="flex-1 rounded-lg text-[9px] font-black uppercase transition-all"
                style={formData.status === status ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
              >
                {t(`recipes.status.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* SIBO Risk */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
            <AlertTriangle size={14} style={{ color: T.primary }} /> {t('recipes.form.sibo_risk_label')}
          </label>
          <div className="flex gap-2 h-12">
            {(['safe', 'caution', 'avoid'] as const).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData({ ...formData, safetyLevel: level as any })}
                className="flex-1 rounded-xl text-[10px] font-black uppercase transition-all border-2"
                style={formData.safetyLevel === level
                  ? level === 'safe' ? { backgroundColor: T.success, borderColor: T.success, color: T.dark }
                    : level === 'caution' ? { backgroundColor: T.warning, borderColor: T.warning, color: T.dark }
                    : { backgroundColor: T.danger, borderColor: T.danger, color: T.white }
                  : { backgroundColor: T.surfaceHi, borderColor: T.outline, color: T.muted }}
              >
                {t(`recipes.sibo_risk.${level}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
