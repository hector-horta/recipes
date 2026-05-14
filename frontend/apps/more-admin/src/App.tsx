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
              background: '#ffffff',
              color: '#2d3a3a',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(45, 58, 58, 0.1)',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: '#4a6741',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
