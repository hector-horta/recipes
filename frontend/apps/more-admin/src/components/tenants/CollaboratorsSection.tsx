import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Trash2, Plus, Loader2 } from 'lucide-react';
import type { TenantUser } from '../../hooks/useTenantQueries';
import { toast } from 'react-hot-toast';

const T = {
  dark:      'var(--surface-dark)',
  surface:   'var(--surface-organic)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  primary15: 'rgba(0, 255, 194, 0.15)',
} as const;

interface CollaboratorsSectionProps {
  orgDetail: any;
  isLoadingDetail: boolean;
  newUser: { displayName: string; email: string; role: 'admin' | 'user' };
  setNewUser: React.Dispatch<React.SetStateAction<{ displayName: string; email: string; role: 'admin' | 'user' }>>;
  addUserMutation: any;
  removeUserMutation: any;
}

export const CollaboratorsSection: React.FC<CollaboratorsSectionProps> = ({
  orgDetail,
  isLoadingDetail,
  newUser,
  setNewUser,
  addUserMutation,
  removeUserMutation
}) => {
  const { t } = useTranslation();

  if (isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin" style={{ color: T.primary }} size={32} />
        <p className="text-sm font-semibold" style={{ color: T.muted }}>Loading collaborator list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      <div className="space-y-4">
        <h4 className="text-lg font-extrabold tracking-tight" style={{ color: T.text }}>
          {t('tenants.modal.users_title')}
        </h4>
        
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: T.outline, backgroundColor: T.surface }}>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: T.surfaceHi }}>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                    {t('tenants.modal.user_name')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                    {t('tenants.modal.user_role')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                    {t('tenants.modal.user_joined')}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: T.muted }}></th>
                </tr>
              </thead>
              <tbody>
                {orgDetail?.users && orgDetail.users.length > 0 ? (
                  orgDetail.users.map((user: TenantUser) => (
                    <tr key={user.id} className="transition-all hover:bg-[rgba(255,255,255,0.02)]" style={{ borderTop: `1px solid ${T.outline}` }}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm" style={{ color: T.text }}>{user.displayName}</span>
                          <span className="text-xs" style={{ color: T.muted }}>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border"
                          style={
                            user.role === 'admin'
                              ? { borderColor: T.primary15, color: T.primary, backgroundColor: T.primary08 }
                              : { borderColor: T.outline, color: T.muted, backgroundColor: T.surfaceHi }
                          }
                        >
                          <Shield size={12} />
                          <span>{user.role === 'admin' ? t('tenants.modal.user_role_admin') : t('tenants.modal.user_role_user')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold" style={{ color: T.muted }}>
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(t('tenants.modal.remove_user_confirm'))) {
                              removeUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={removeUserMutation.isPending}
                          className="p-2 rounded-lg text-[var(--danger)] hover:bg-[rgba(248,113,113,0.08)] transition-all disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold" style={{ color: T.muted }}>
                      No associated collaborators.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-dashed space-y-4" style={{ borderColor: T.outline, backgroundColor: T.surfaceHi }}>
        <h5 className="text-md font-bold tracking-tight flex items-center gap-2" style={{ color: T.text }}>
          <Plus size={18} style={{ color: T.primary }} />
          <span>{t('tenants.modal.add_user_title')}</span>
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <input
              type="text"
              placeholder={t('tenants.modal.user_name')}
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              className="w-full h-11 px-4 rounded-xl outline-none font-medium text-sm transition-all"
              style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
            />
          </div>
          <div className="space-y-1">
            <input
              type="email"
              placeholder={t('tenants.modal.user_email')}
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full h-11 px-4 rounded-xl outline-none font-medium text-sm transition-all"
              style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
              className="flex-1 h-11 px-3 rounded-xl outline-none font-medium text-sm transition-all"
              style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
            >
              <option value="user">{t('tenants.modal.user_role_user')}</option>
              <option value="admin">{t('tenants.modal.user_role_admin')}</option>
            </select>
            
            <button
              type="button"
              onClick={() => {
                if (!newUser.displayName || !newUser.email) {
                  toast.error('All user fields are required.');
                  return;
                }
                addUserMutation.mutate(newUser);
              }}
              disabled={addUserMutation.isPending}
              className="px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center shrink-0"
              style={{ backgroundColor: T.primary, color: T.dark }}
            >
              {addUserMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                t('tenants.modal.add_user_btn')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
