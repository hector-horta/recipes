import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export interface Tag {
  key: string;
  es: string;
  en: string;
}

export function useTags() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0] as 'es' | 'en';

  const { data: tags = [], isLoading, error } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get<Tag[]>('/recipes/tags'),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  /**
   * Returns tags localized to current language.
   */
  const localizedTags = tags.map(tag => ({
    key: tag.key,
    label: currentLang === 'en' ? tag.en : tag.es
  }));

  return {
    tags,
    localizedTags,
    isLoading,
    error
  };
}
