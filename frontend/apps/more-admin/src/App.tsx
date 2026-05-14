import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Tenants } from './pages/Tenants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/tenants" replace />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="recipes" element={<div className="p-8 text-brand-text-muted">Vista de Recetas Globales (Próximamente)</div>} />
              <Route path="tags" element={<div className="p-8 text-brand-text-muted">Vista de Tags (Próximamente)</div>} />
            </Route>
            <Route path="*" element={<Navigate to="/tenants" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
