import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Recipe, RecipeFormData } from '../types';
import { INITIAL_FORM_STATE } from '../constants';

export const useRecipeState = (recipes: Recipe[] | undefined) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState<RecipeFormData>(INITIAL_FORM_STATE);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('recipeViewMode') as 'table' | 'grid') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('recipeViewMode', viewMode);
  }, [viewMode]);

  const [activeLang, setActiveLang] = useState<'es' | 'en'>('es');


  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFeedback, setImageFeedback] = useState('');

  const filteredRecipes = useMemo(() => {
    return recipes?.filter(recipe => {
      const matchesSearch = 
        (recipe.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.titleEn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
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

  const toggleFilterTag = (tagKey: string) => {
    setSelectedTags(prev => 
      prev.includes(tagKey) 
        ? prev.filter(t => t !== tagKey)
        : [...prev, tagKey]
    );
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title,
      titleEn: recipe.titleEn,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      safetyLevel: recipe.safetyLevel,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      tags: recipe.tags || [],
      imageUrl: recipe.imageUrl
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

  return {
    isModalOpen, setIsModalOpen,
    editingRecipe, setEditingRecipe,
    formData, setFormData,
    viewMode, setViewMode,
    activeLang, setActiveLang,

    selectedIds, setSelectedIds,
    searchTerm, setSearchTerm,
    selectedTags, setSelectedTags,
    imageFeedback, setImageFeedback,
    filteredRecipes,
    toggleSelection,
    toggleAll,
    toggleFilterTag,
    handleEdit,
    handleCloseModal,
    handleNew
  };
};
