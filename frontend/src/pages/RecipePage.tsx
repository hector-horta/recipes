import { useState, useEffect } from 'react';
import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';
import { useAuth } from '../AuthContext';
import { WatiLogo } from '../components/WatiLogo';
import { UserCircle, Settings, LogOut, RefreshCw, Search, FlaskConical, Radio } from 'lucide-react';
import { SecureAPI } from '../api/PrivacyProxy';

interface RecipePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
}

// ... fetchDummySafeRecipes stays same (internal logic) ...
// ── Components ──

export function RecipePage({ onSelectRecipe, onOpenLogin, onOpenOnboarding }: RecipePageProps) {
  const { user, logout } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const API_MODE = import.meta.env.VITE_API_MODE || 'MOCK';

  const loadData = async (force = false, query = 'healthy') => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const results = await SecureAPI.fetchSafeRecipes(query, undefined, force);
      
      const mapped: Recipe[] = results.map((r: any) => ({
        id: r.id.toString(),
        title: r.title,
        imageUrl: r.imageUrl,
        prepTimeMinutes: r.prepTimeMinutes,
        estimatedCost: r.estimatedCost,
        ingredients: (r.ingredients || []).map((i: any) => ({
          ...i,
          isBorderlineSafe: false
        })),
        instructions: r.instructions,
        summary: r.summary,
        safetyLevel: r.securityDisclosure?.riskLevel === 'SAFE' ? 'safe' : (r.securityDisclosure?.riskLevel === 'WARNING' ? 'review' : 'unsafe'),
        siboAllergiesTags: r.siboAllergiesTags
      }));

      setRecipes(mapped);
    } catch (error) {
      console.error("Error loading recipes", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-sage/20">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <WatiLogo size={32} />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-brand-forest tracking-tight">Wati</span>
              <div className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-current uppercase tracking-widest ${API_MODE === 'MOCK' ? 'text-brand-sage border-brand-sage/30 bg-brand-sage/5' : 'text-brand-celeste border-brand-celeste/30 bg-brand-celeste/5'}`}>
                {API_MODE === 'MOCK' ? <FlaskConical size={8} /> : <Radio size={8} />}
                {API_MODE === 'MOCK' ? 'Desarrollo' : 'En Vivo'}
              </div>
            </div>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-teal/20 hover:shadow-brand-teal/40 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, var(--brand-sage), var(--brand-teal))' }}
              >
                Entrar / Registrarse
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenOnboarding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-forest bg-brand-sage/10 hover:bg-brand-sage/20 transition-all border border-brand-sage/20"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Alergias
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-brand-sage/20">
                  <div className="w-9 h-9 rounded-full bg-brand-mint/20 flex items-center justify-center border border-brand-mint/30">
                    <UserCircle className="w-6 h-6 text-brand-forest" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-extrabold text-brand-forest leading-tight">{user.displayName}</p>
                    <button onClick={logout} className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted hover:text-danger transition-colors">
                      <LogOut size={10} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-forest tracking-tight mb-4">
                {user ? 'Recetas para tu bienestar' : 'Nutrición consciente'}
              </h1>
              {/* Search Bar */}
              <div className="relative max-w-md w-full mt-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted group-focus-within:text-brand-teal transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar ingredientes o platos..."
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sage/20 rounded-2xl text-sm text-brand-forest placeholder:text-brand-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData(false, searchQuery)}
                />
              </div>
            </div>
            <button 
                onClick={() => loadData(true, searchQuery || 'healthy')}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-brand-sage/20 text-brand-forest font-bold text-sm hover:bg-brand-sage/5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
            </button>
          </div>

          {/* RecipeGrid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <RecipeCardSkeleton key={`skeleton-${idx}`} />
              ))
            ) : (
              recipes
                .filter(recipe => recipe.safetyLevel !== 'unsafe')
                .map((recipe) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onCookNow={() => onSelectRecipe(recipe)} 
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
