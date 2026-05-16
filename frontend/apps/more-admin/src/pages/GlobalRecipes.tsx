import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Pencil, 
  Loader2, 
  ChefHat, 
  Clock, 
  Users, 
  AlertTriangle,
  Image as ImageIcon,
  Wand2,
  X,
  GripVertical,
  Filter,
  Sparkles,
  ArrowRight,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

interface Tag {
  id: string;
  key: string;
  es: string;
  en: string;
}

interface Recipe {
  id: string;
  title_es: string;
  title_en: string;
  slug: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'published' | 'archived';
  sibo_risk_level: 'safe' | 'caution' | 'avoid';
  ingredients: any[];
  steps: any[];
  tags: string[];
  image_url: string | null;
  image_filename: string | null;
  created_at: string;
}

interface RecipeFormData {
  title_es: string;
  title_en: string;
  slug: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'published' | 'archived';
  sibo_risk_level: 'safe' | 'caution' | 'avoid';
  ingredients: any[];
  steps: any[];
  tags: string[];
  image_url: string | null;
}

const INITIAL_FORM_STATE: RecipeFormData = {
  title_es: '',
  title_en: '',
  slug: '',
  prep_time_minutes: 0,
  cook_time_minutes: 0,
  servings: 1,
  difficulty: 'medium',
  status: 'draft',
  sibo_risk_level: 'safe',
  ingredients: [],
  steps: [],
  tags: [],
  image_url: null
};

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  dark:      'var(--surface-dark)',
  dark80:    'rgba(16, 20, 23, 0.8)',
  surface:   'var(--surface-organic)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary05: 'rgba(0, 255, 194, 0.05)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  primary12: 'rgba(0, 255, 194, 0.12)',
  primary15: 'rgba(0, 255, 194, 0.15)',
  primary85: 'rgba(0, 255, 194, 0.85)',
  danger:    'var(--danger)',
  danger08:  'rgba(248, 113, 113, 0.08)',
  danger12:  'rgba(248, 113, 113, 0.12)',
  danger15:  'rgba(248, 113, 113, 0.15)',
  danger20:  'rgba(248, 113, 113, 0.20)',
  warning:   'var(--warning)',
  warningBadge: 'var(--warning)',
  warning12: 'rgba(255, 183, 3, 0.12)',
  warning15: 'rgba(255, 183, 3, 0.15)',
  warning85: 'rgba(255, 183, 3, 0.85)',
  success:   'var(--success)',
  success15: 'rgba(0, 255, 194, 0.15)',
  muted12:   'rgba(185, 203, 193, 0.12)',
  grey:      'var(--brand-neutral)',
  white:     '#FFFFFF',
  black03:   'rgba(0, 0, 0, 0.03)',
} as const;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

export const GlobalRecipes: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('recipeViewMode') as 'table' | 'grid') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('recipeViewMode', viewMode);
  }, [viewMode]);

  const [activeLang, setActiveLang] = useState<'es' | 'en'>('es');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    logger.info('ADMIN_GLOBAL_RECIPES_VIEW');
  }, []);

  // Queries
  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['global-recipes'],
    queryFn: () => api.get<Recipe[]>('/admin/recipes'),
  });

  const { data: tags } = useQuery({
    queryKey: ['global-tags'],
    queryFn: () => api.get<Tag[]>('/admin/tags'),
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFeedback, setImageFeedback] = useState('');

  const filteredRecipes = useMemo(() => {
    return recipes?.filter(recipe => {
      const matchesSearch = 
        recipe.title_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.title_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.slug.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => recipe.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    }) || [];
  }, [recipes, searchTerm, selectedTags]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecipes.map(r => r.id));
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/admin/recipes', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setIsModalOpen(false);
      logger.info('ADMIN_RECIPE_CREATE', { id: data.id, slug: data.slug });
      toast.success(t('recipes.create_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_CREATE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      api.put(`/admin/recipes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setIsModalOpen(false);
      logger.info('ADMIN_RECIPE_UPDATE', { id: variables.id, slug: variables.data.slug });
      toast.success(t('recipes.update_success'));
    },
    onError: (error: any, variables) => {
      logger.error('ADMIN_RECIPE_UPDATE_FAILED', { id: variables.id, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/recipes/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      logger.info('ADMIN_RECIPE_DELETE', { id });
      toast.success(t('recipes.delete_success'));
    },
    onError: (error: any, id) => {
      logger.error('ADMIN_RECIPE_DELETE_FAILED', { id, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: Recipe['status'] }) => 
      Promise.all(ids.map(id => api.put(`/admin/recipes/${id}`, { status }))),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setSelectedIds([]);
      logger.info('ADMIN_RECIPE_BULK_UPDATE', { count: variables.ids.length, status: variables.status });
      toast.success(t('recipes.bulk_update_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_BULK_UPDATE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => 
      Promise.all(ids.map(id => api.delete(`/admin/recipes/${id}`))),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setSelectedIds([]);
      logger.info('ADMIN_RECIPE_BULK_DELETE', { count: ids.length });
      toast.success(t('recipes.bulk_delete_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_BULK_DELETE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const refreshImageMutation = useMutation({
    mutationFn: ({ slug, issue }: { slug: string; issue: string }) => 
      api.post(`/api/ingest/${slug}/refresh-image`, { issue }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setFormData(prev => ({ ...prev, image_url: data.recipe.image_url }));
      setImageFeedback('');
      logger.info('ADMIN_RECIPE_IMAGE_REFRESH', { slug: variables.slug });
      toast.success(t('recipes.regenerate_success'));
    },
    onError: (error: any, variables) => {
      logger.error('ADMIN_RECIPE_IMAGE_REFRESH_FAILED', { slug: variables.slug, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title_es: recipe.title_es,
      title_en: recipe.title_en,
      slug: recipe.slug,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      status: recipe.status,
      sibo_risk_level: recipe.sibo_risk_level,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      tags: recipe.tags || [],
      image_url: recipe.image_url
    });
    setImageFeedback('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && recipes) {
      const recipeToEdit = recipes.find(r => r.id === editId);
      if (recipeToEdit) {
        handleEdit(recipeToEdit);
      }
    }
  }, [searchParams, recipes]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (searchParams.has('edit')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('edit');
      setSearchParams(newParams);
    }
  };

  const handleNew = () => {
    setEditingRecipe(null);
    setFormData(INITIAL_FORM_STATE);
    setImageFeedback('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleTag = (tagKey: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey)
        ? prev.tags.filter(k => k !== tagKey)
        : [...prev.tags, tagKey]
    }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: '' }]
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, '']
    }));
  };

  const toggleFilterTag = (tagKey: string) => {
    setSelectedTags(prev => 
      prev.includes(tagKey) 
        ? prev.filter(t => t !== tagKey)
        : [...prev, tagKey]
    );
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const newIngredients = [...formData.ingredients];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newIngredients.length) return;
    [newIngredients[index], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[index]];
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...formData.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSteps.length) return;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setFormData({ ...formData, steps: newSteps });
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.primary08, color: T.primary }}>
              <ChefHat size={28} />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>{t('recipes.title')}</h2>
          </div>
          <p className="font-medium" style={{ color: T.muted }}>{t('recipes.subtitle')}</p>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-2xl flex" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
            <button
              onClick={() => setViewMode('table')}
              className="p-2 rounded-xl transition-all"
              style={viewMode === 'table' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
              title={t('recipes.view_table')}
            >
              <Filter size={20} className="rotate-90" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-xl transition-all"
              style={viewMode === 'grid' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
              title={t('recipes.view_grid')}
            >
              <BookOpen size={20} />
            </button>
          </div>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNew}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all group"
            style={{ backgroundColor: T.primary, color: T.dark }}
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>{t('recipes.create')}</span>
          </motion.button>
        </div>
      </div>

      <motion.div
        variants={itemVariants}
        className="rounded-[2rem] overflow-hidden"
        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}` }}
      >
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2" size={20} style={{ color: T.muted }} />
              <input
                type="text"
                placeholder={t('recipes.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-2xl outline-none transition-all font-medium"
                style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.muted }}>
              <Filter size={16} />
              <span>{t('recipes.ui.results_count', { count: filteredRecipes?.length || 0 })}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mr-2" style={{ color: T.muted }}>
              <Sparkles size={14} style={{ color: T.primary }} /> {t('recipes.filter_allergens')}
            </div>
            {tags?.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleFilterTag(tag.key)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={selectedTags.includes(tag.key)
                  ? { backgroundColor: T.primary, color: T.dark, transform: 'scale(1.05)' }
                  : { backgroundColor: T.surfaceHi, color: T.muted, border: `1px solid ${T.outline}` }}
              >
                {t(`tags.items.${tag.key}`, { defaultValue: activeLang === 'es' ? tag.es : tag.en })}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: T.surfaceHi }}>
                  <th className="px-8 py-5 w-10">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-lg transition-all cursor-pointer"
                      style={{ accentColor: T.primary }}
                      checked={selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                    {t('dashboard.table.recipe')}
                  </th>
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                    {t('recipes.difficulty')}
                  </th>
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                    {t('recipes.sibo_risk')}
                  </th>
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                    {t('common.status')}
                  </th>
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-right" style={{ color: T.muted }}>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${T.outline}` }}>
                <AnimatePresence mode="popLayout">
                  {recipesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`loading-${i}`} className="animate-pulse">
                        <td colSpan={6} className="px-8 py-6">
                          <div className="h-16 rounded-2xl w-full" style={{ backgroundColor: T.surfaceHi }} />
                        </td>
                      </tr>
                    ))
                  ) : filteredRecipes.map((recipe) => (
                    <motion.tr
                      layout
                      key={recipe.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="transition-all group"
                      style={{ borderTop: `1px solid ${T.outline}`, backgroundColor: selectedIds.includes(recipe.id) ? T.primary05 : 'transparent' }}
                      onMouseEnter={(e) => { if (!selectedIds.includes(recipe.id)) (e.currentTarget as HTMLElement).style.backgroundColor = T.surfaceHi; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = selectedIds.includes(recipe.id) ? T.primary05 : 'transparent'; }}
                    >
                      <td className="px-8 py-6">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg transition-all cursor-pointer"
                          style={{ accentColor: T.primary }}
                          checked={selectedIds.includes(recipe.id)}
                          onChange={() => toggleSelection(recipe.id)}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}>
                            {recipe.image_url ? (
                              <img 
                                src={recipe.image_url} 
                                alt={t('recipes.image_alt', { title: activeLang === 'es' ? recipe.title_es : recipe.title_en })} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <ChefHat size={28} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-lg leading-tight truncate" style={{ color: T.text }}>
                              {activeLang === 'es' ? recipe.title_es : recipe.title_en}
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(recipe.slug);
                                  toast.success(t('recipes.messages.copy_slug_success'));
                                }}
                                className="text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded transition-colors"
                                style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}
                              >
                                {recipe.slug}
                              </button>
                              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: T.muted }}>
                                <Clock size={12} />
                                {recipe.prep_time_minutes + recipe.cook_time_minutes} {t('recipes.ui.minutes_suffix')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                          style={recipe.difficulty === 'easy'
                            ? { backgroundColor: T.success15, color: T.success }
                            : recipe.difficulty === 'medium'
                            ? { backgroundColor: T.warning15, color: T.warningBadge }
                            : { backgroundColor: T.danger15, color: T.danger }}
                        >
                          {t(`recipes.difficulty.${recipe.difficulty}`)}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shadow-sm" 
                            style={{ 
                              backgroundColor: recipe.sibo_risk_level === 'safe' ? T.success :
                                               recipe.sibo_risk_level === 'caution' ? T.warning : T.danger 
                            }} 
                          />
                          <span className="text-sm font-bold capitalize" style={{ color: T.text }}>{t(`recipes.sibo_risk.${recipe.sibo_risk_level}`)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                          style={recipe.status === 'published'
                            ? { backgroundColor: T.primary12, color: T.primary }
                            : recipe.status === 'draft'
                            ? { backgroundColor: T.warning12, color: T.warning }
                            : { backgroundColor: T.muted12, color: T.grey }}
                        >
                          {recipe.status === 'published' ? `● ${t('recipes.status.published')}` : recipe.status === 'draft' ? `○ ${t('recipes.status.draft')}` : t('recipes.status.archived')}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(recipe)}
                            className="p-3 rounded-xl transition-all"
                            style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                            title={t('recipes.edit_recipe')}
                          >
                            <Pencil size={18} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (confirm(t('recipes.messages.confirm_delete'))) {
                                deleteMutation.mutate(recipe.id);
                              }
                            }}
                            className="p-3 rounded-xl transition-all"
                            style={{ backgroundColor: T.danger08, color: T.danger, border: `1px solid ${T.danger15}` }}
                            title={t('recipes.delete_recipe')}
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {!recipesLoading && filteredRecipes?.length === 0 && (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>
                          <ChefHat size={40} strokeWidth={1} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-xl" style={{ color: T.text }}>{t('recipes.no_results')}</p>
                          <p className="font-medium" style={{ color: T.muted }}>{t('recipes.no_results_subtitle')}</p>
                        </div>
                        <button
                          onClick={() => { setSearchTerm(''); setSelectedTags([]); }}
                          className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                          style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
                        >
                          {t('recipes.clear_filters')}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {recipesLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={`loading-grid-${i}`} className="aspect-[4/5] animate-pulse rounded-[2.5rem]" style={{ backgroundColor: T.surfaceHi }} />
                  ))
                ) : filteredRecipes?.map((recipe) => (
                  <motion.div
                    layout
                    key={recipe.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -10 }}
                    className="group rounded-[2.5rem] p-4 transition-all relative flex flex-col"
                    style={selectedIds.includes(recipe.id)
                      ? { backgroundColor: T.primary05, border: `1px solid ${T.primary}` }
                      : { backgroundColor: T.surface, border: `1px solid ${T.outline}` }}
                  >
                    <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 relative" style={{ backgroundColor: T.surfaceHi }}>
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg transition-all shadow-md cursor-pointer"
                          style={{ accentColor: T.primary }}
                          checked={selectedIds.includes(recipe.id)}
                          onChange={() => toggleSelection(recipe.id)}
                        />
                      </div>
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={t('recipes.image_alt', { title: activeLang === 'es' ? recipe.title_es : recipe.title_en })}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: T.outline }}>
                          <ChefHat size={64} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <span
                          className="backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black"
                          style={recipe.status === 'published'
                            ? { backgroundColor: T.primary85, color: T.dark }
                            : { backgroundColor: T.warning85, color: T.dark }}
                        >
                          {recipe.status === 'published' ? t('recipes.status.published') : recipe.status === 'draft' ? t('recipes.status.draft') : t('recipes.status.archived')}
                        </span>
                      </div>
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 rounded-[2rem]"
                        style={{ backgroundImage: `linear-gradient(to top, ${T.dark80}, transparent, transparent)` }}
                      >
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleEdit(recipe)}
                             className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                             style={{ backgroundColor: T.text, color: T.dark }}
                           >
                             <Pencil size={14} /> {t('common.edit')}
                           </button>
                           <button 
                             onClick={() => {
                               if (confirm(t('recipes.messages.confirm_delete'))) deleteMutation.mutate(recipe.id);
                             }}
                              className="p-2.5 rounded-xl"
                             style={{ backgroundColor: T.danger, color: T.white }}
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      </div>
                    </div>
                    
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ 
                            backgroundColor: recipe.sibo_risk_level === 'safe' ? T.success :
                                             recipe.sibo_risk_level === 'caution' ? T.warning : T.danger 
                          }} 
                        />
                        <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: T.muted }}>
                          {t('recipes.risk_label')} {t(`recipes.sibo_risk.${recipe.sibo_risk_level}`)}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1" style={{ color: T.text }}>
                        {activeLang === 'es' ? recipe.title_es : recipe.title_en}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: T.muted }}>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock size={12} /> {recipe.prep_time_minutes + recipe.cook_time_minutes}{t('recipes.ui.minutes_short')}</span>
                          <span className="flex items-center gap-1"><Users size={12} /> {recipe.servings}</span>
                        </div>
                        <span className="uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>{t(`recipes.difficulty.${recipe.difficulty}`)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {!recipesLoading && filteredRecipes?.length === 0 && (
              <div className="py-20 text-center">
                <p style={{ color: T.muted }}>{t('recipes.no_results_found')}</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
      
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6"
          >
            <div className="rounded-[2rem] p-6 shadow-2xl flex items-center justify-between gap-6" style={{ backgroundColor: T.surface, border: `1px solid ${T.primary}` }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: T.primary12, color: T.primary }}>
                  {selectedIds.length}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: T.text }}>{t('recipes.selected_count', { count: selectedIds.length })}</p>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] uppercase tracking-widest font-black transition-colors"
                    style={{ color: T.muted }}
                  >
                    {t('recipes.ui.discard_selection')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                >
                  {t('recipes.ui.publish')}
                </button>
                <button
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'draft' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
                >
                  {t('recipes.ui.draft')}
                </button>
                <div className="w-[1px] h-8 mx-1" style={{ backgroundColor: T.outline }} />
                <button
                  onClick={() => {
                    if (confirm(t('recipes.messages.confirm_bulk_delete', { count: selectedIds.length }))) {
                      bulkDeleteMutation.mutate(selectedIds);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.danger12, color: T.danger, border: `1px solid ${T.danger20}` }}
                >
                  <Trash2 size={14} /> {t('common.delete')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRecipe ? t('recipes.ui.edit_recipe') : t('recipes.create')}
        maxWidth="max-w-[80vw]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8 pr-6 pb-6">
            <form onSubmit={handleSubmit} id="recipe-form" className="space-y-10">
              
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                    <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                    {t('recipes.form.essential_info')}
                  </div>
                  <div className="flex p-1 rounded-xl" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
                    <button
                      type="button"
                      onClick={() => setActiveLang('es')}
                      className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      style={activeLang === 'es' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
                    >
                      {t('common.language_es')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLang('en')}
                      className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      style={activeLang === 'en' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
                    >
                      {t('common.language_en')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {activeLang === 'es' ? (
                        <motion.div 
                          key="title-es"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-2"
                        >
                          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                            {t('recipes.form.title_es')}
                          </label>
                          <input
                            placeholder={t('recipes.form.placeholder_title')}
                            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                            value={formData.title_es}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                title_es: val,
                                slug: editingRecipe ? prev.slug : val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                              }));
                            }}
                            required
                          />
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="title-en"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-2"
                        >
                          <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                            {t('recipes.form.title_en')}
                          </label>
                          <input
                            placeholder={t('recipes.form.placeholder_title')}
                            className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                            value={formData.title_en}
                            onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                            required
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                        {t('recipes.form.slug')}
                      </label>
                      <input
                        placeholder={t('recipes.form.placeholder_slug')}
                        className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold font-mono text-[10px]"
                        style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.primary }}
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                          <Clock size={12} style={{ color: T.primary }} /> {t('recipes.form.prep_time')}
                        </label>
                        <input
                          type="number"
                          className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                          style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                          value={formData.prep_time_minutes}
                          onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                          <Clock size={12} style={{ color: T.primary }} /> {t('recipes.form.cook_time')}
                        </label>
                        <input
                          type="number"
                          className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                          style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                          value={formData.cook_time_minutes}
                          onChange={(e) => setFormData({ ...formData, cook_time_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-1" style={{ color: T.muted }}>
                          <Users size={12} /> {t('recipes.form.servings')}
                        </label>
                        <input
                          type="number"
                          className="w-full h-12 rounded-xl px-4 outline-none font-bold text-center transition-all"
                          style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                          value={formData.servings}
                          onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                  {t('recipes.form.ingredients')}
                </div>

                <div className="space-y-4">
                  {formData.ingredients.map((ing, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx}
                      className="flex gap-4 items-end p-4 rounded-2xl group"
                      style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                    >
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => moveIngredient(idx, 'up')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === 0}><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveIngredient(idx, 'down')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === formData.ingredients.length - 1}><ChevronDown size={16} /></button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.ingredient_label')}</label>
                        <input
                          placeholder={t('recipes.form.name_placeholder')}
                          className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                          style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                          value={ing.name}
                          onChange={(e) => {
                            const newIngs = [...formData.ingredients];
                            newIngs[idx].name = e.target.value;
                            setFormData({ ...formData, ingredients: newIngs });
                          }}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.amount_label')}</label>
                        <input
                          placeholder="0"
                          className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                          style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                          value={ing.amount}
                          onChange={(e) => {
                            const newIngs = [...formData.ingredients];
                            newIngs[idx].amount = e.target.value;
                            setFormData({ ...formData, ingredients: newIngs });
                          }}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.unit_label')}</label>
                        <input
                          placeholder={t('recipes.form.unit_placeholder')}
                          className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                          style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                          value={ing.unit}
                          onChange={(e) => {
                            const newIngs = [...formData.ingredients];
                            newIngs[idx].unit = e.target.value;
                            setFormData({ ...formData, ingredients: newIngs });
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }))}
                        className="p-3 rounded-xl transition-all"
                        style={{ color: T.danger }}
                      >
                        <X size={20} />
                      </button>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="w-full py-4 border-2 border-dashed rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    style={{ borderColor: T.primary15, color: T.primary }}
                  >
                    <Plus size={20} /> {t('recipes.form.add_ingredient')}
                  </button>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                  {t('recipes.form.steps')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.form.difficulty_label')}</label>
                    <select
                      className="w-full h-12 px-4 rounded-xl outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                      style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    >
                      <option value="easy">○ {t('recipes.difficulty.easy')}</option>
                      <option value="medium">◒ {t('recipes.difficulty.medium')}</option>
                      <option value="hard">● {t('recipes.difficulty.hard')}</option>
                    </select>
                  </div>
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
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                      <AlertTriangle size={14} style={{ color: T.primary }} /> {t('recipes.form.sibo_risk_label')}
                    </label>
                    <div className="flex gap-2 h-12">
                      {(['safe', 'caution', 'avoid'] as const).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setFormData({ ...formData, sibo_risk_level: level })}
                          className="flex-1 rounded-xl text-[10px] font-black uppercase transition-all border-2"
                          style={formData.sibo_risk_level === level
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

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                    <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                    {t('recipes.form.ingredients')} ({formData.ingredients.length})
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addIngredient}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2"
                    style={{ backgroundColor: T.surface, color: T.primary, border: `1px solid ${T.primary}` }}
                  >
                    <Plus size={14} /> {t('recipes.form.add_ingredient')}
                  </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {formData.ingredients.map((ing, idx) => (
                      <motion.div
                        key={`ing-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex gap-2 items-center p-3 rounded-2xl group relative"
                        style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                      >
                        <div className="flex flex-col gap-1 pr-2 border-r" style={{ borderColor: T.outline }}>
                          <button 
                            type="button" 
                            onClick={() => moveIngredient(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded transition-colors disabled:opacity-0"
                            style={{ color: T.muted }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <GripVertical size={14} className="rotate-90 opacity-40" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => moveIngredient(idx, 'down')}
                            disabled={idx === formData.ingredients.length - 1}
                            className="p-1 rounded transition-colors disabled:opacity-0"
                            style={{ color: T.muted }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <GripVertical size={14} className="rotate-90 opacity-40" />
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 flex-1">
                          <input
                            className="col-span-3 rounded-xl px-4 py-2 text-sm font-bold outline-none transition-all"
                            style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                            placeholder={t('recipes.form.name_placeholder')}
                            value={ing.name || ''}
                            onChange={(e) => {
                              const newIngs = [...formData.ingredients];
                              newIngs[idx] = { ...newIngs[idx], name: e.target.value };
                              setFormData({ ...formData, ingredients: newIngs });
                            }}
                          />
                          <input
                            className="col-span-1 rounded-xl px-2 py-2 text-sm font-bold text-center outline-none transition-all"
                            style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                            placeholder={t('recipes.form.amount_label')}
                            value={ing.amount || ''}
                            onChange={(e) => {
                              const newIngs = [...formData.ingredients];
                              newIngs[idx] = { ...newIngs[idx], amount: e.target.value };
                              setFormData({ ...formData, ingredients: newIngs });
                            }}
                          />
                          <input
                            className="col-span-1 rounded-xl px-2 py-2 text-sm font-bold text-center outline-none transition-all"
                            style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                            placeholder={t('recipes.form.unit_label')}
                            value={ing.unit || ''}
                            onChange={(e) => {
                              const newIngs = [...formData.ingredients];
                              newIngs[idx] = { ...newIngs[idx], unit: e.target.value };
                              setFormData({ ...formData, ingredients: newIngs });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              ingredients: prev.ingredients.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-2 rounded-lg transition-all" style={{ color: T.danger }}
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {formData.ingredients.length === 0 && (
                    <div className="col-span-2 py-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2" style={{ borderColor: T.primary15, color: T.muted }}>
                      <Info size={24} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('recipes.form.no_ingredients')}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                    <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                    {t('recipes.form.steps')} ({formData.steps.length})
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addStep}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2"
                    style={{ backgroundColor: T.surface, color: T.primary, border: `1px solid ${T.primary}` }}
                  >
                    <Plus size={14} /> {t('recipes.form.add_step')}
                  </motion.button>
                </div>
                <div className="space-y-4">
                  <AnimatePresence>
                    {formData.steps.map((step, idx) => (
                      <motion.div 
                        key={`step-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex gap-4 items-start p-4 rounded-3xl group"
                        style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                      >
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ backgroundColor: T.primary, color: T.dark }}>
                            {idx + 1}
                          </div>
                          <div className="flex flex-col gap-1 items-center">
                             <button 
                               type="button" 
                               onClick={() => moveStep(idx, 'up')}
                               disabled={idx === 0}
                               className="p-1 rounded transition-colors disabled:opacity-0"
                               style={{ color: T.muted }}
                               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                             >
                               <ChevronUp size={14} className="opacity-40" />
                             </button>
                             <button 
                               type="button" 
                               onClick={() => moveStep(idx, 'down')}
                               disabled={idx === formData.steps.length - 1}
                               className="p-1 rounded transition-colors disabled:opacity-0"
                               style={{ color: T.muted }}
                               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                             >
                               <ChevronDown size={14} className="opacity-40" />
                             </button>
                          </div>
                        </div>
                        <textarea
                          className="flex-1 rounded-2xl px-6 py-4 text-sm font-medium outline-none transition-all min-h-[100px] resize-none"
                          style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                          placeholder={t('recipes.form.step_placeholder', { index: idx + 1 })}
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...formData.steps];
                            newSteps[idx] = e.target.value;
                            setFormData({ ...formData, steps: newSteps });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              steps: prev.steps.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-3 rounded-xl transition-all self-start" style={{ color: T.danger }}
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {formData.steps.length === 0 && (
                    <div className="py-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2" style={{ borderColor: T.primary15, color: T.muted }}>
                      <Info size={24} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('recipes.form.no_steps')}</p>
                    </div>
                  )}
                </div>
              </section>

            </form>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <section className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                <ImageIcon size={16} style={{ color: T.primary }} /> {t('recipes.ai.title')}
              </label>
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative group" style={{ backgroundColor: T.surfaceHi, border: `2px solid ${T.outline}` }}>
                <AnimatePresence mode="wait">
                  {formData.image_url ? (
                    <motion.img 
                      key={formData.image_url}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={formData.image_url} 
                      alt={t('recipes.ai.image_alt')} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full p-8 text-center"
                      style={{ color: T.muted }}
                    >
                      <ImageIcon size={64} strokeWidth={1} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest leading-tight">{t('recipes.ai.no_image')}</p>
                      <p className="text-[10px] font-medium mt-2">{t('recipes.ai.no_image_hint')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {refreshImageMutation.isPending && (
                  <div className="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-20" style={{ backgroundColor: T.dark80, color: T.text }}>
                    <Loader2 size={48} className="animate-spin mb-4 text-brand-primary" />
                    <p className="text-lg font-black tracking-tight leading-tight">{t('recipes.ai.processing')}</p>
                    <p className="text-xs font-medium opacity-70 mt-2 italic">{t('recipes.ai.processing_hint')}</p>
                  </div>
                )}
              </div>

              {editingRecipe && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 backdrop-blur-md p-6 rounded-[2rem] relative overflow-hidden"
                  style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: T.primary05 }} />
                  
                  <div className="flex items-center gap-2">
                    <Wand2 size={16} style={{ color: T.primary }} />
                    <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.ai.title')}</h4>
                  </div>
                  <textarea
                    placeholder={t('recipes.ai.feedback_placeholder')}
                    className="w-full rounded-2xl px-4 py-4 text-xs font-medium outline-none min-h-[120px] resize-none transition-all placeholder:italic"
                    style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                    value={imageFeedback}
                    onChange={(e) => setImageFeedback(e.target.value)}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => refreshImageMutation.mutate({ slug: formData.slug, issue: imageFeedback })}
                    disabled={refreshImageMutation.isPending}
                    className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 relative group transition-all"
                    style={{ backgroundColor: T.surface, color: T.primary, border: `1px solid ${T.primary}` }}
                  >
                    <Sparkles size={14} className="group-hover:animate-spin-slow" />
                    <span>{refreshImageMutation.isPending ? t('recipes.ai.processing_btn') : t('recipes.ai.regenerate_btn')}</span>
                    {refreshImageMutation.isPending && (
                      <motion.div 
                        layoutId="btn-shimmer"
                        className="absolute inset-0 bg-white/10"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      />
                    )}
                  </motion.button>
                </motion.div>
              )}
            </section>

            <section className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                <Filter size={16} style={{ color: T.primary }} /> {t('recipes.form.tags_allergens')}
              </label>
              <div className="flex flex-wrap gap-2 p-6 rounded-[2rem] max-h-[300px] overflow-y-auto custom-scrollbar" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
                {tags?.map(tag => {
                  const label = activeLang === 'es' ? tag.es : tag.en;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.key)}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all"
                      style={formData.tags.includes(tag.key)
                        ? { backgroundColor: T.primary, color: T.dark }
                        : { backgroundColor: T.surface, color: T.muted, border: `1px solid ${T.outline}` }}
                    >
                      {t(`tags.items.${tag.key}`, { defaultValue: label })}
                    </button>
                  );
                })}
                {tags?.length === 0 && <p className="text-xs italic text-center w-full py-4 opacity-40" style={{ color: T.muted }}>{t('recipes.form.no_tags_hint')}</p>}
              </div>
            </section>

            <div className="p-6 rounded-[2rem]" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.text }}>
                <Info size={12} style={{ color: T.primary }} /> {t('recipes.form.style_guide')}
              </h4>
              <ul className="text-[10px] space-y-2 font-medium" style={{ color: T.muted }}>
                <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_slug')}</span></li>
                <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_ingredients')}</span></li>
                <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_sibo')}</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 flex flex-col md:flex-row gap-4" style={{ borderTop: `1px solid ${T.outline}` }}>
          <button
            type="button"
            className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
            style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
            onClick={handleCloseModal}
          >
            {t('common.discard_changes')}
          </button>
          <button
            form="recipe-form"
            type="submit"
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            style={{ backgroundColor: T.primary, color: T.dark }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <span>{editingRecipe ? t('recipes.form.save_edit') : t('recipes.form.save_create')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${T.black03};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${T.outline};
          border-radius: 10px;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};
