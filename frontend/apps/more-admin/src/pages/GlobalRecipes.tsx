import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Button, Input } from '@wati/ui-kit';
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

const INITIAL_FORM_STATE = {
  title_es: '',
  title_en: '',
  slug: '',
  prep_time_minutes: 0,
  cook_time_minutes: 0,
  servings: 1,
  difficulty: 'medium' as const,
  status: 'draft' as const,
  sibo_risk_level: 'safe' as const,
  ingredients: [] as any[],
  steps: [] as any[],
  tags: [] as string[],
  image_url: null as string | null
};

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
            <div className="p-2 bg-brand-forest/10 text-brand-forest rounded-lg">
              <ChefHat size={28} />
            </div>
            <h2 className="text-4xl font-extrabold text-brand-forest tracking-tight">{t('recipes.title')}</h2>
          </div>
          <p className="text-brand-text-muted font-medium">{t('recipes.subtitle')}</p>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <div className="bg-brand-cream/40 p-1 rounded-2xl border border-brand-sage/10 flex">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-brand-forest shadow-sm' : 'text-brand-text-muted hover:text-brand-forest'}`}
              title={t('recipes.view_table')}
            >
              <Filter size={20} className="rotate-90" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-brand-forest shadow-sm' : 'text-brand-text-muted hover:text-brand-forest'}`}
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
            className="flex items-center justify-center gap-2 bg-brand-forest text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-brand-forest/30 transition-all group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>{t('recipes.create')}</span>
          </motion.button>
        </div>
      </div>

      <motion.div 
        variants={itemVariants}
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-brand-forest/5 border border-brand-sage/20 overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted/60" size={20} />
              <input
                type="text"
                placeholder={t('recipes.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-brand-cream/40 border-2 border-transparent focus:border-brand-sage/30 rounded-2xl outline-none transition-all placeholder:text-brand-text-muted/40 text-brand-forest font-medium"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-text-muted font-semibold bg-brand-cream/40 px-4 py-2 rounded-xl border border-brand-sage/10">
              <Filter size={16} />
              <span>{t('recipes.ui.results_count', { count: filteredRecipes?.length || 0 })}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-brand-forest uppercase tracking-widest mr-2">
              <Sparkles size={14} className="text-brand-sage" /> {t('recipes.filter_allergens')}
            </div>
            {tags?.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleFilterTag(tag.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTags.includes(tag.key)
                    ? 'bg-brand-sage text-white shadow-lg shadow-brand-sage/20 scale-105'
                    : 'bg-brand-cream/40 text-brand-text-muted hover:bg-brand-cream/60 border border-brand-sage/10'
                }`}
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
                <tr className="bg-brand-cream/20">
                  <th className="px-8 py-5 w-10">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg accent-brand-forest transition-all"
                      checked={selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                   </th>
                  <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('dashboard.table.recipe')}</th>
                  <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('recipes.difficulty')}</th>
                  <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('recipes.sibo_risk')}</th>
                  <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sage/10">
                <AnimatePresence mode="popLayout">
                  {recipesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`loading-${i}`} className="animate-pulse">
                        <td colSpan={6} className="px-8 py-6">
                          <div className="h-16 bg-brand-cream/60 rounded-2xl w-full"></div>
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
                      className={`hover:bg-brand-cream/30 transition-all group ${selectedIds.includes(recipe.id) ? 'bg-brand-sage/5' : ''}`}
                    >
                      <td className="px-8 py-6">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded-lg accent-brand-forest transition-all"
                          checked={selectedIds.includes(recipe.id)}
                          onChange={() => toggleSelection(recipe.id)}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-brand-sage/10 overflow-hidden flex items-center justify-center text-brand-sage shrink-0 border-2 border-brand-sage/20 group-hover:scale-105 transition-transform duration-300 shadow-sm">
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
                            <span className="font-bold text-brand-forest text-lg leading-tight truncate">
                              {activeLang === 'es' ? recipe.title_es : recipe.title_en}
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(recipe.slug);
                                  toast.success(t('recipes.messages.copy_slug_success'));
                                }}
                                className="text-[10px] font-black font-mono text-brand-teal uppercase bg-brand-teal/10 px-2 py-0.5 rounded border border-brand-teal/10 hover:bg-brand-teal hover:text-white transition-colors"
                              >
                                {recipe.slug}
                              </button>
                              <div className="flex items-center gap-1 text-brand-text-muted/60 text-xs font-medium">
                                <Clock size={12} />
                                {recipe.prep_time_minutes + recipe.cook_time_minutes} {t('recipes.ui.minutes_suffix')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                          recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          recipe.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t(`recipes.difficulty.${recipe.difficulty}`)}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                            recipe.sibo_risk_level === 'safe' ? 'bg-green-500' :
                            recipe.sibo_risk_level === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-bold text-brand-forest capitalize">{t(`recipes.sibo_risk.${recipe.sibo_risk_level}`)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge 
                          className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                          variant={recipe.status === 'published' ? 'success' : recipe.status === 'draft' ? 'warning' : 'neutral'}
                        >
                          {recipe.status === 'published' ? `● ${t('recipes.status.published')}` : recipe.status === 'draft' ? `○ ${t('recipes.status.draft')}` : t('recipes.status.archived')}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(recipe)}
                            className="p-3 bg-brand-sage/10 text-brand-sage hover:bg-brand-sage hover:text-white rounded-xl transition-all shadow-sm"
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
                            className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
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
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-brand-cream/50 rounded-full flex items-center justify-center text-brand-text-muted/30">
                          <ChefHat size={40} strokeWidth={1} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-brand-forest font-black text-xl">{t('recipes.no_results')}</p>
                          <p className="text-brand-text-muted font-medium">{t('recipes.no_results_subtitle')}</p>
                        </div>
                        <Button variant="neutral" onClick={() => { setSearchTerm(''); setSelectedTags([]); }}>
                          {t('recipes.clear_filters')}
                        </Button>
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
                    <div key={`loading-grid-${i}`} className="aspect-[4/5] bg-brand-cream/60 animate-pulse rounded-[2.5rem]" />
                  ))
                ) : filteredRecipes?.map((recipe) => (
                  <motion.div
                    layout
                    key={recipe.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -10 }}
                    className={`group bg-white rounded-[2.5rem] p-4 shadow-xl hover:shadow-2xl hover:shadow-brand-forest/10 transition-all border relative flex flex-col ${selectedIds.includes(recipe.id) ? 'border-brand-sage bg-brand-sage/5' : 'border-brand-sage/5'}`}
                  >
                    <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 relative bg-brand-cream/40">
                      <div className="absolute top-4 left-4 z-10">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded-lg accent-brand-forest transition-all shadow-md cursor-pointer"
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
                        <div className="w-full h-full flex items-center justify-center text-brand-sage/20">
                          <ChefHat size={64} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <Badge variant={recipe.status === 'published' ? 'success' : 'warning'} className="backdrop-blur-md bg-white/80 shadow-lg px-3 py-1 rounded-full text-[9px] font-black">
                          {recipe.status === 'published' ? t('recipes.status.published') : recipe.status === 'draft' ? t('recipes.status.draft') : t('recipes.status.archived')}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-forest/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleEdit(recipe)}
                             className="flex-1 bg-white text-brand-forest py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                           >
                             <Pencil size={14} /> {t('common.edit')}
                           </button>
                           <button 
                             onClick={() => {
                               if (confirm(t('recipes.messages.confirm_delete'))) deleteMutation.mutate(recipe.id);
                             }}
                             className="p-2.5 bg-red-500 text-white rounded-xl"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      </div>
                    </div>
                    
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          recipe.sibo_risk_level === 'safe' ? 'bg-green-500' :
                          recipe.sibo_risk_level === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                          {t('recipes.risk_label')} {t(`recipes.sibo_risk.${recipe.sibo_risk_level}`)}
                        </span>
                      </div>
                      <h3 className="font-bold text-brand-forest text-lg leading-tight mb-2 line-clamp-1">
                        {activeLang === 'es' ? recipe.title_es : recipe.title_en}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] font-bold text-brand-text-muted/60">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock size={12} /> {recipe.prep_time_minutes + recipe.cook_time_minutes}{t('recipes.ui.minutes_short')}</span>
                          <span className="flex items-center gap-1"><Users size={12} /> {recipe.servings}</span>
                        </div>
                        <span className="uppercase tracking-widest text-[9px] px-2 py-0.5 bg-brand-cream rounded-md">{t(`recipes.difficulty.${recipe.difficulty}`)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {!recipesLoading && filteredRecipes?.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-brand-text-muted">{t('recipes.no_results_found')}</p>
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
            <div className="bg-brand-forest text-white rounded-[2rem] p-6 shadow-2xl flex items-center justify-between gap-6 backdrop-blur-xl bg-opacity-95 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                  {selectedIds.length}
                </div>
                <div>
                  <p className="font-bold text-sm">{t('recipes.selected_count', { count: selectedIds.length })}</p>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] uppercase tracking-widest font-black text-brand-sage hover:text-white transition-colors"
                  >
                    {t('recipes.ui.discard_selection')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  {t('recipes.ui.publish')}
                </button>
                <button 
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'draft' })}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  {t('recipes.ui.draft')}
                </button>
                <div className="w-[1px] h-8 bg-white/10 mx-1" />
                <button 
                  onClick={() => {
                    if (confirm(t('recipes.messages.confirm_bulk_delete', { count: selectedIds.length }))) {
                      bulkDeleteMutation.mutate(selectedIds);
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
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
        className="max-w-6xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8 overflow-y-auto max-h-[75vh] pr-6 custom-scrollbar pb-6">
            <form onSubmit={handleSubmit} id="recipe-form" className="space-y-10">
              
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-forest font-black uppercase tracking-[0.2em] text-xs">
                    <div className="w-8 h-[2px] bg-brand-sage/30" />
                    {t('recipes.form.essential_info')}
                  </div>
                  <div className="flex bg-brand-cream/40 p-1 rounded-xl border border-brand-sage/10">
                    <button 
                      type="button"
                      onClick={() => setActiveLang('es')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeLang === 'es' ? 'bg-white text-brand-forest shadow-sm' : 'text-brand-text-muted hover:text-brand-forest'}`}
                    >
                      {t('common.language_es')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveLang('en')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeLang === 'en' ? 'bg-white text-brand-forest shadow-sm' : 'text-brand-text-muted hover:text-brand-forest'}`}
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
                          <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-brand-sage rounded-full" />
                            {t('recipes.form.title_es')}
                          </label>
                          <Input
                            placeholder={t('recipes.form.placeholder_title')}
                            className="h-12 rounded-xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all font-bold"
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
                          <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-brand-sage rounded-full" />
                            {t('recipes.form.title_en')}
                          </label>
                          <Input
                            placeholder={t('recipes.form.placeholder_title')}
                            className="h-12 rounded-xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all font-bold"
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
                      <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-brand-sage rounded-full" />
                        {t('recipes.form.slug')}
                      </label>
                      <Input
                        placeholder={t('recipes.form.slug_placeholder')}
                        className="h-12 rounded-xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all font-mono text-sm"
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase tracking-tighter flex items-center gap-1">
                          <Clock size={12} /> {t('recipes.form.prep_time')}
                        </label>
                        <Input
                          type="number"
                          className="h-12 rounded-xl border-2 border-brand-sage/10 font-bold text-center"
                          value={formData.prep_time_minutes}
                          onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase tracking-tighter flex items-center gap-1">
                          <Clock size={12} /> {t('recipes.form.cook_time')}
                        </label>
                        <Input
                          type="number"
                          className="h-12 rounded-xl border-2 border-brand-sage/10 font-bold text-center"
                          value={formData.cook_time_minutes}
                          onChange={(e) => setFormData({ ...formData, cook_time_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase tracking-tighter flex items-center gap-1">
                          <Users size={12} /> {t('recipes.form.servings')}
                        </label>
                        <Input
                          type="number"
                          className="h-12 rounded-xl border-2 border-brand-sage/10 font-bold text-center"
                          value={formData.servings}
                          onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-brand-forest font-black uppercase tracking-[0.2em] text-xs">
                  <div className="w-8 h-[2px] bg-brand-sage/30" />
                  {t('recipes.form.ingredients')}
                </div>

                <div className="space-y-4">
                  {formData.ingredients.map((ing, idx) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="flex gap-4 items-end bg-brand-cream/20 p-4 rounded-2xl border border-brand-sage/10 group"
                    >
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => moveIngredient(idx, 'up')} className="text-brand-sage hover:text-brand-forest disabled:opacity-30" disabled={idx === 0}><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveIngredient(idx, 'down')} className="text-brand-sage hover:text-brand-forest disabled:opacity-30" disabled={idx === formData.ingredients.length - 1}><ChevronDown size={16} /></button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase opacity-40">{t('recipes.form.ingredient_label')}</label>
                        <Input
                          placeholder={t('recipes.form.name_placeholder')}
                          className="bg-white border-transparent focus:border-brand-sage/20"
                          value={ing.name}
                          onChange={(e) => {
                            const newIngs = [...formData.ingredients];
                            newIngs[idx].name = e.target.value;
                            setFormData({ ...formData, ingredients: newIngs });
                          }}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase opacity-40">{t('recipes.form.amount_label')}</label>
                        <Input
                          placeholder="0"
                          className="bg-white border-transparent focus:border-brand-sage/20"
                          value={ing.amount}
                          onChange={(e) => {
                            const newIngs = [...formData.ingredients];
                            newIngs[idx].amount = e.target.value;
                            setFormData({ ...formData, ingredients: newIngs });
                          }}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-[10px] font-black text-brand-forest uppercase opacity-40">{t('recipes.form.unit_label')}</label>
                        <Input
                          placeholder={t('recipes.form.unit_placeholder')}
                          className="bg-white border-transparent focus:border-brand-sage/20"
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
                        className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <X size={20} />
                      </button>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="w-full py-4 border-2 border-dashed border-brand-sage/20 rounded-2xl text-brand-sage font-bold hover:bg-brand-sage/5 hover:border-brand-sage/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} /> {t('recipes.form.add_ingredient')}
                  </button>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-brand-forest font-black uppercase tracking-[0.2em] text-xs">
                  <div className="w-8 h-[2px] bg-brand-sage/30" />
                  {t('recipes.form.steps')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest">{t('recipes.form.difficulty_label')}</label>
                    <select 
                      className="w-full h-12 px-4 bg-brand-cream/40 border-2 border-brand-sage/10 rounded-xl focus:border-brand-sage/40 outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    >
                      <option value="easy">○ {t('recipes.difficulty.easy')}</option>
                      <option value="medium">◒ {t('recipes.difficulty.medium')}</option>
                      <option value="hard">● {t('recipes.difficulty.hard')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest">{t('recipes.form.status_label')}</label>
                    <div className="flex bg-brand-cream/40 p-1 rounded-xl border border-brand-sage/10 h-12">
                      {(['draft', 'published', 'archived'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status })}
                          className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                            formData.status === status 
                              ? 'bg-white text-brand-forest shadow-sm' 
                              : 'text-brand-text-muted hover:text-brand-forest'
                          }`}
                        >
                          {t(`recipes.status.${status}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                      <AlertTriangle size={14} className="text-brand-sage" /> {t('recipes.form.sibo_risk_label')}
                    <div className="flex gap-2 h-12">
                      {(['safe', 'caution', 'avoid'] as const).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setFormData({ ...formData, sibo_risk_level: level })}
                          className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                            formData.sibo_risk_level === level 
                              ? level === 'safe' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' :
                                level === 'caution' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' :
                                'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                              : 'bg-brand-cream/40 border-brand-sage/10 text-brand-text-muted hover:border-brand-sage/30'
                          }`}
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
                  <div className="flex items-center gap-2 text-brand-forest font-black uppercase tracking-[0.2em] text-xs">
                    <div className="w-8 h-[2px] bg-brand-sage/30" />
                    {t('recipes.form.ingredients')} ({formData.ingredients.length})
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addIngredient}
                    className="text-[10px] font-black uppercase tracking-widest bg-brand-forest text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-forest/10"
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
                        className="flex gap-2 items-center bg-brand-cream/30 p-3 rounded-2xl border border-brand-sage/10 group relative"
                      >
                        <div className="flex flex-col gap-1 pr-2 border-r border-brand-sage/10">
                          <button 
                            type="button" 
                            onClick={() => moveIngredient(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-white rounded transition-colors disabled:opacity-0"
                          >
                            <GripVertical size={14} className="rotate-90 text-brand-sage/40" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => moveIngredient(idx, 'down')}
                            disabled={idx === formData.ingredients.length - 1}
                            className="p-1 hover:bg-white rounded transition-colors disabled:opacity-0"
                          >
                            <GripVertical size={14} className="rotate-90 text-brand-sage/40" />
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 flex-1">
                          <input
                            className="col-span-3 bg-white border-2 border-transparent focus:border-brand-sage/20 rounded-xl px-4 py-2 text-sm font-bold outline-none transition-all"
                            placeholder={t('recipes.form.name_placeholder')}
                            value={ing.name || ''}
                            onChange={(e) => {
                              const newIngs = [...formData.ingredients];
                              newIngs[idx] = { ...newIngs[idx], name: e.target.value };
                              setFormData({ ...formData, ingredients: newIngs });
                            }}
                          />
                          <input
                            className="col-span-1 bg-white border-2 border-transparent focus:border-brand-sage/20 rounded-xl px-2 py-2 text-sm font-bold text-center outline-none transition-all"
                            placeholder={t('recipes.form.amount_label')}
                            value={ing.amount || ''}
                            onChange={(e) => {
                              const newIngs = [...formData.ingredients];
                              newIngs[idx] = { ...newIngs[idx], amount: e.target.value };
                              setFormData({ ...formData, ingredients: newIngs });
                            }}
                          />
                          <input
                            className="col-span-1 bg-white border-2 border-transparent focus:border-brand-sage/20 rounded-xl px-2 py-2 text-sm font-bold text-center outline-none transition-all"
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
                          className="p-2 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {formData.ingredients.length === 0 && (
                    <div className="col-span-2 py-10 border-2 border-dashed border-brand-sage/20 rounded-3xl flex flex-col items-center justify-center text-brand-text-muted gap-2">
                      <Info size={24} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('recipes.form.no_ingredients')}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-forest font-black uppercase tracking-[0.2em] text-xs">
                    <div className="w-8 h-[2px] bg-brand-sage/30" />
                    {t('recipes.form.steps')} ({formData.steps.length})
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addStep}
                    className="text-[10px] font-black uppercase tracking-widest bg-brand-teal text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-teal/10"
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
                        className="flex gap-4 items-start bg-brand-cream/30 p-4 rounded-3xl border border-brand-sage/10 group"
                      >
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="w-10 h-10 rounded-full bg-brand-forest text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-brand-forest/20">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col gap-1 items-center">
                             <button 
                               type="button" 
                               onClick={() => moveStep(idx, 'up')}
                               disabled={idx === 0}
                               className="p-1 hover:bg-white rounded transition-colors disabled:opacity-0"
                             >
                               <ChevronUp size={14} className="text-brand-sage/40" />
                             </button>
                             <button 
                               type="button" 
                               onClick={() => moveStep(idx, 'down')}
                               disabled={idx === formData.steps.length - 1}
                               className="p-1 hover:bg-white rounded transition-colors disabled:opacity-0"
                             >
                               <ChevronDown size={14} className="text-brand-sage/40" />
                             </button>
                          </div>
                        </div>
                        <textarea
                          className="flex-1 bg-white border-2 border-transparent focus:border-brand-sage/20 rounded-2xl px-6 py-4 text-sm font-medium outline-none transition-all min-h-[100px] resize-none shadow-sm"
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
                          className="p-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all self-start"
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {formData.steps.length === 0 && (
                    <div className="py-10 border-2 border-dashed border-brand-sage/20 rounded-3xl flex flex-col items-center justify-center text-brand-text-muted gap-2">
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
              <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={16} className="text-brand-sage" /> {t('recipes.ai.title')}
              </label>
              <div className="aspect-[4/5] rounded-[2.5rem] bg-brand-cream/50 border-4 border-white shadow-2xl overflow-hidden relative group">
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
                      className="flex flex-col items-center justify-center h-full text-brand-text-muted/40 p-8 text-center"
                    >
                      <ImageIcon size={64} strokeWidth={1} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest leading-tight">{t('recipes.ai.no_image')}</p>
                      <p className="text-[10px] font-medium mt-2">{t('recipes.ai.no_image_hint')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {refreshImageMutation.isPending && (
                  <div className="absolute inset-0 bg-brand-forest/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center z-20">
                    <Loader2 size={48} className="animate-spin mb-4 text-brand-sage" />
                    <p className="text-lg font-black tracking-tight leading-tight">{t('recipes.ai.processing')}</p>
                    <p className="text-xs font-medium opacity-70 mt-2 italic">{t('recipes.ai.processing_hint')}</p>
                  </div>
                )}
              </div>

              {editingRecipe && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-brand-sage/10 relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-sage/10 rounded-full blur-3xl animate-pulse" />
                  
                  <div className="flex items-center gap-2">
                    <Wand2 size={16} className="text-brand-sage" />
                    <h4 className="text-xs font-black text-brand-forest uppercase tracking-widest">{t('recipes.ai.title')}</h4>
                  </div>
                  <textarea
                    placeholder={t('recipes.ai.feedback_placeholder')}
                    className="w-full bg-white/60 border-2 border-transparent focus:border-brand-sage/20 rounded-2xl px-4 py-4 text-xs font-medium outline-none min-h-[120px] resize-none transition-all placeholder:italic"
                    value={imageFeedback}
                    onChange={(e) => setImageFeedback(e.target.value)}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => refreshImageMutation.mutate({ slug: formData.slug, issue: imageFeedback })}
                    disabled={refreshImageMutation.isPending}
                    className="w-full h-12 rounded-xl bg-brand-forest text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-forest/20 disabled:opacity-50 relative group"
                  >
                    <Sparkles size={14} className="group-hover:animate-spin-slow" />
                    <span>{refreshImageMutation.isPending ? t('recipes.ai.processing_btn') : t('recipes.ai.regenerate_btn')}</span>
                    {refreshImageMutation.isPending && (
                      <motion.div 
                        layoutId="btn-shimmer"
                        className="absolute inset-0 bg-white/20"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      />
                    )}
                  </motion.button>
                </motion.div>
              )}
            </section>

            <section className="space-y-4">
              <label className="text-[11px] font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                <Filter size={16} className="text-brand-teal" /> {t('recipes.form.tags_allergens')}
              </label>
              <div className="flex flex-wrap gap-2 p-6 bg-brand-cream/30 rounded-[2rem] border border-brand-sage/10 max-h-[300px] overflow-y-auto custom-scrollbar">
                {tags?.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                      formData.tags.includes(tag.key)
                        ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20 scale-105'
                        : 'bg-white text-brand-text-muted border-2 border-transparent hover:border-brand-sage/20'
                    >
                      {t(`tags.items.${tag.key}`, { defaultValue: activeLang === 'es' ? tag.es : tag.en })}
                    </button>
                ))}
                {tags?.length === 0 && <p className="text-xs text-brand-text-muted italic text-center w-full py-4 opacity-40">{t('recipes.form.no_tags_hint')}</p>}
              </div>
            </section>

            <div className="p-6 bg-brand-sage/5 rounded-[2rem] border border-brand-sage/10">
              <h4 className="text-[10px] font-black text-brand-forest uppercase tracking-widest mb-3 flex items-center gap-2">
                <Info size={12} /> {t('recipes.form.style_guide')}
              </h4>
              <ul className="text-[10px] text-brand-text-muted space-y-2 font-medium">
                <li className="flex gap-2">
                  <span className="text-brand-sage">•</span>
                  <span>{t('recipes.form.style_guide_slug')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-sage">•</span>
                  <span>{t('recipes.form.style_guide_ingredients')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-sage">•</span>
                  <span>{t('recipes.form.style_guide_sibo')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-brand-sage/10 flex flex-col md:flex-row gap-4">
          <Button 
            variant="secondary" 
            type="button" 
            className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]" 
            onClick={handleCloseModal}
          >
            {t('common.discard_changes')}
          </Button>
          <Button 
            form="recipe-form"
            type="submit" 
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-forest/20 flex items-center justify-center gap-3"
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
          </Button>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.03);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3B4D3C;
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
