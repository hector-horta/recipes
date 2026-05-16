import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Tenants } from './pages/Tenants';
import { GlobalRecipes } from './pages/GlobalRecipes';
import { Tags } from './pages/Tags';
import { Dashboard } from './pages/Dashboard';

import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const T = {
  surface: 'var(--surface-organic)',
  text:    'var(--brand-text)',
  primary: 'var(--brand-primary)',
  outline: 'var(--outline)',
  black10: 'rgba(0, 0, 0, 0.10)',
  white:   '#FFFFFF',
} as const;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="recipes" element={<GlobalRecipes />} />
              <Route path="tags" element={<Tags />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: T.surface,
              color: T.text,
              borderRadius: '1rem',
              border: `1px solid ${T.outline}`,
              boxShadow: `0 10px 15px -3px ${T.black10}`,
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: T.primary,
                secondary: T.surface,
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
