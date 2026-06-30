
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  hidden?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, hidden = false }: PaginationProps) {
  const { t } = useTranslation();

  if (hidden || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-12 pb-8">
      <button 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 rounded-xl border border-brand-sage/20 text-brand-forest disabled:opacity-30 hover:bg-brand-sage/5 transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-bold text-brand-forest">
        {t('home.page')} <span className="px-2 py-1 rounded-lg bg-brand-sage/10">{currentPage}</span> {t('home.of')} {totalPages}
      </span>
      <button 
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 rounded-xl border border-brand-sage/20 text-brand-forest disabled:opacity-30 hover:bg-brand-sage/5 transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
