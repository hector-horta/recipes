import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge, Button, Input } from '@wati/ui-kit';
import { Building2, Plus, Search, Loader2, Pencil, Power, ArrowRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  userCount: number;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export const Tenants: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<Organization[]>('/admin/organizations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => 
      api.post('/admin/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '' });
      toast.success('Organización creada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la organización');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; slug: string } }) => 
      api.put(`/admin/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setEditingOrg(null);
      toast.success('Organización actualizada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar la organización');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/organizations/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al cambiar el estado');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: { name: editingOrg.name, slug: editingOrg.slug } });
    } else {
      if (!newTenant.name || !newTenant.slug) return;
      createMutation.mutate(newTenant);
    }
  };

  const filteredOrgs = organizations?.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-forest/10 text-brand-forest rounded-lg">
              <Building2 size={24} />
            </div>
            <h2 className="text-4xl font-extrabold text-brand-forest tracking-tight">Tenants</h2>
          </div>
          <p className="text-brand-text-muted font-medium">Control centralizado de organizaciones y accesos.</p>
        </motion.div>
        
        <motion.button 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingOrg(null);
            setNewTenant({ name: '', slug: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-brand-forest text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-brand-forest/30 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Nuevo Tenant</span>
        </motion.button>
      </div>

      {/* Main Content Table */}
      <motion.div 
        variants={itemVariants}
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-brand-forest/5 border border-brand-sage/20 overflow-hidden"
      >
        <div className="p-8 border-b border-brand-sage/10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted/60" size={20} />
            <input
              type="text"
              placeholder="Filtrar por nombre, slug o identificador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-brand-cream/40 border-2 border-transparent focus:border-brand-sage/30 rounded-2xl outline-none transition-all placeholder:text-brand-text-muted/40 text-brand-forest font-medium"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-text-muted font-semibold bg-brand-cream/40 px-4 py-2 rounded-xl border border-brand-sage/10">
            <span>Total:</span>
            <span className="text-brand-forest font-bold">{filteredOrgs?.length || 0}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream/20">
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">Organización</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">Identificador</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">Usuarios</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sage/10">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6">
                        <div className="h-12 bg-brand-cream/60 rounded-2xl w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredOrgs?.map((org) => (
                  <motion.tr 
                    layout
                    key={org.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-brand-cream/30 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
                          org.status === 'active' ? 'bg-brand-sage/15 text-brand-sage shadow-inner' : 'bg-red-50 text-red-400'
                        }`}>
                          <Building2 size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-brand-forest text-lg">{org.name}</span>
                          <span className="text-xs text-brand-text-muted font-medium">ID: {org.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <code className="text-[11px] font-bold font-mono text-brand-teal bg-brand-teal/10 px-3 py-1.5 rounded-lg border border-brand-teal/20">
                        {org.slug}
                      </code>
                    </td>
                    <td className="px-8 py-6">
                      <Badge 
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter"
                        variant={org.status === 'active' ? 'success' : 'warning'}
                      >
                        {org.status === 'active' ? '● En Línea' : '○ Suspendido'}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-cream border-2 border-white flex items-center justify-center text-xs font-bold text-brand-forest shadow-sm">
                          {org.userCount}
                        </div>
                        <span className="text-sm text-brand-text-muted font-bold">Colaboradores</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setEditingOrg(org);
                            setIsModalOpen(true);
                          }}
                          className="p-3 bg-brand-sage/10 text-brand-sage hover:bg-brand-sage hover:text-white rounded-xl transition-all shadow-sm"
                          title="Editar Perfil"
                        >
                          <Pencil size={18} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if (confirm(`¿Estás seguro de que deseas ${org.status === 'active' ? 'suspender' : 'activar'} esta organización?`)) {
                              toggleStatusMutation.mutate(org.id);
                            }
                          }}
                          className={`p-3 rounded-xl transition-all shadow-sm ${
                            org.status === 'active' 
                              ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white' 
                              : 'bg-brand-forest/10 text-brand-forest hover:bg-brand-forest hover:text-white'
                          }`}
                          title={org.status === 'active' ? 'Revocar Acceso' : 'Restaurar Acceso'}
                        >
                          <Power size={18} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!isLoading && filteredOrgs?.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-brand-cream/50 rounded-full flex items-center justify-center text-brand-text-muted/30">
                        <Building2 size={32} />
                      </div>
                      <p className="text-brand-text-muted font-bold">No se encontraron organizaciones bajo estos criterios.</p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrg(null);
        }}
        title={editingOrg ? 'Actualizar Tenant' : 'Inscribir Nuevo Tenant'}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-sage rounded-full" />
              Nombre Legal
            </label>
            <Input
              placeholder="Nombre comercial de la organización"
              className="h-14 rounded-2xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all text-lg font-bold"
              value={editingOrg ? editingOrg.name : newTenant.name}
              onChange={(e) => {
                if (editingOrg) setEditingOrg({ ...editingOrg, name: e.target.value });
                else setNewTenant({ ...newTenant, name: e.target.value });
              }}
              required
            />
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-teal rounded-full" />
              Identificador (Slug)
            </label>
            <div className="relative group">
              <Input
                placeholder="slug-unico-de-acceso"
                className="h-14 rounded-2xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all text-lg font-mono lowercase"
                value={editingOrg ? editingOrg.slug : newTenant.slug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                  if (editingOrg) setEditingOrg({ ...editingOrg, slug: val });
                  else setNewTenant({ ...newTenant, slug: val });
                }}
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-teal bg-brand-teal/10 px-2 py-1 rounded">
                wati.app/{"{"}slug{"}"}
              </div>
            </div>
            <p className="text-[11px] text-brand-text-muted font-medium italic pl-1">
              * Este identificador definirá la URL de acceso del cliente.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <Button 
              type="submit" 
              className="w-full h-16 rounded-[1.25rem] text-lg font-black tracking-tight shadow-xl shadow-brand-forest/20 flex items-center justify-center gap-3"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span>{editingOrg ? 'Actualizar Registro' : 'Confirmar Inscripción'}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Modal>
    </motion.div>
  );
};
