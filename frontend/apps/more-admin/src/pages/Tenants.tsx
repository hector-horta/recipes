import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge } from '@wati/ui-kit';
import { Building2, Plus, Search, MoreVertical } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  userCount: number;
}

export const Tenants: React.FC = () => {
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<Organization[]>('/admin/organizations'),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-forest">Tenants</h2>
          <p className="text-brand-text-muted mt-1">Gestiona las organizaciones registradas en la plataforma.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-forest text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-forest/90 transition-all shadow-lg shadow-brand-forest/20">
          <Plus size={20} />
          Nuevo Tenant
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-brand-forest/5 border border-brand-sage/10 overflow-hidden">
        <div className="p-6 border-b border-brand-sage/5 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o slug..."
              className="w-full pl-11 pr-4 py-3 bg-brand-cream/50 border-none rounded-xl focus:ring-2 focus:ring-brand-sage/30 placeholder:text-brand-text-muted/50 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream/30">
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">Organización</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">Slug</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">Usuarios</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sage/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-10 bg-brand-cream rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : organizations?.map((org) => (
                <tr key={org.id} className="hover:bg-brand-cream/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-sage/10 text-brand-sage flex items-center justify-center">
                        <Building2 size={20} />
                      </div>
                      <span className="font-semibold text-brand-text">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs font-mono text-brand-teal bg-brand-sage/5 px-2 py-1 rounded">
                      {org.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={org.status === 'active' ? 'success' : 'warning'}>
                      {org.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-brand-text-muted font-medium">
                    {org.userCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-brand-cream rounded-lg transition-colors text-brand-text-muted">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && organizations?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-text-muted">
                    No se encontraron organizaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
