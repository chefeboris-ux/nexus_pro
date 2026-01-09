import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, AuthState, User, Notification, AppPermission, RolePermissionsMap } from './types.ts';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ManagerDashboard from './pages/ManagerDashboard.tsx';
import CompletedSalesManager from './pages/CompletedSalesManager.tsx';
import SellerDashboard from './pages/SellerDashboard.tsx';
import SalesUnderReview from './pages/SalesUnderReview.tsx';
import ApprovedSales from './pages/ApprovedSales.tsx';
import RejectedSales from './pages/RejectedSales.tsx';
import BusinessIntelligence from './pages/BusinessIntelligence.tsx';
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';
import NotificationToast from './components/NotificationToast.tsx';
import SupabaseSyncIndicator from './components/SupabaseSyncIndicator.tsx';
import { checkSupabaseConnection, ConnectionStatus } from './utils/supabase/connector.ts';
import { sincronizadorDeDados } from './utils/supabase/synchronizer.ts';
import { supabase } from './utils/supabase/client.ts';
import { MapeadorDeDados } from './utils/supabase/mapper.ts';

const DEFAULT_PERMISSIONS: RolePermissionsMap = {
  [UserRole.ADMIN]: [...Object.values(AppPermission)],
  [UserRole.MANAGER]: [AppPermission.VIEW_ALL_SALES, AppPermission.APPROVE_SALES, AppPermission.VIEW_DASHBOARD],
  [UserRole.SELLER]: [AppPermission.VIEW_OWN_SALES, AppPermission.CREATE_SALES, AppPermission.VIEW_DASHBOARD],
};

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin Principal', email: 'admin@nexus.com', role: UserRole.ADMIN, confirmed: true, createdAt: '2023-01-01' },
  { id: '2', name: 'Carlos Gerente', email: 'gerente@nexus.com', role: UserRole.MANAGER, confirmed: true, createdAt: '2023-02-15' },
  { id: '3', name: 'Ana Vendedora', email: 'vendedor@nexus.com', role: UserRole.SELLER, confirmed: true, createdAt: '2023-03-10' },
];

interface AppContextType {
  notify: (message: string, type?: Notification['type']) => void;
  permissions: RolePermissionsMap;
  updateRolePermissions: (role: UserRole, newPerms: AppPermission[]) => void;
  hasPermission: (permission: AppPermission) => boolean;
  users: User[];
  registerUser: (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: AppPermission;
  isAuthenticated: boolean;
  userHasPermission: (p: AppPermission) => boolean;
  onAccessDenied: () => void;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  requiredPermission,
  isAuthenticated,
  userHasPermission,
  onAccessDenied
}) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const hasPerm = userHasPermission(requiredPermission);

  useEffect(() => {
    if (isAuthenticated && !hasPerm) {
      onAccessDenied();
    }
  }, [isAuthenticated, hasPerm, onAccessDenied]);

  // Se não tem permissão, volta para a raiz para que o App decida o destino seguro
  // ou para o login se o erro persistir. Para evitar loop, usamos replace.
  if (!hasPerm) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_PERMISSIONS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>();

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const savedAuth = localStorage.getItem('nexus_auth');
        if (savedAuth) setAuth(JSON.parse(savedAuth));

        const savedPerms = localStorage.getItem('nexus_permissions');
        if (savedPerms) setPermissions(JSON.parse(savedPerms));

        // Carregar usuários do Supabase com timeout de 5s
        const loadUsers = async () => {
          const { data, error } = await supabase.from('perfis').select('*').order('nome');
          if (error) throw error;
          return data;
        };

        const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

        try {
          const dbUsers = await Promise.race([loadUsers(), timeout(5000)]) as any[];
          if (dbUsers) {
            const mappedUsers = dbUsers.map(u => MapeadorDeDados.dePerfilDB(u));
            setUsers(mappedUsers as User[]);
            localStorage.setItem('nexus_users', JSON.stringify(mappedUsers));
          }
        } catch (err) {
          console.warn("Falha ao carregar usuários do Supabase (timeout ou erro). Usando local.");
          const savedUsers = localStorage.getItem('nexus_users');
          if (savedUsers) setUsers(JSON.parse(savedUsers));
        }

        // Verificar conexão com Supabase (com timeout)
        try {
          const status = await Promise.race([checkSupabaseConnection(), timeout(3000)]) as ConnectionStatus;
          if (status && !status.isConnected) {
            notify("Erro ao conectar ao Supabase. Verifique sua conexão.", "warning");
          }
        } catch (err) {
          console.warn("Verificação de conexão com Supabase expirou.");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initData();
  }, [notify]);

  // Efeito para sincronização automática
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const runSync = async () => {
      setIsSyncing(true);
      try {
        const key = `nexus_sales_${auth.user!.id}`;
        const savedSales = JSON.parse(localStorage.getItem(key) || '[]');
        if (savedSales.length > 0) {
          await sincronizadorDeDados.sincronizarVendas(savedSales);
          setLastSync(new Date());
        }
      } catch (err) {
        console.error('Erro na sincronização periódica:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    // Sincroniza a cada 30 segundos
    const interval = setInterval(runSync, 30000);
    runSync(); // Primeira execução imediata

    return () => clearInterval(interval);
  }, [auth.isAuthenticated]);


  const updateRolePermissions = (role: UserRole, newPerms: AppPermission[]) => {
    const updated = { ...permissions, [role]: newPerms };
    setPermissions(updated);
    localStorage.setItem('nexus_permissions', JSON.stringify(updated));
    notify(`Permissões do perfil ${role} atualizadas com sucesso!`, 'success');
  };

  const hasPermission = useCallback((permission: AppPermission) => {
    if (!auth.user) return false;
    const userPerms = permissions[auth.user.role] || DEFAULT_PERMISSIONS[auth.user.role] || [];
    return userPerms.includes(permission);
  }, [auth.user, permissions]);

  const registerUser = async (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .insert([{
          nome: userData.name,
          email: userData.email,
          role: userData.role,
          confirmed: false
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newUser = MapeadorDeDados.dePerfilDB(data) as User;
        setUsers(prev => [...prev, newUser]);
        notify("Cadastro realizado! Aguarde aprovação.", "success");
      }
    } catch (err) {
      console.error("Erro ao registrar no Supabase:", err);
      notify("Erro ao realizar cadastro.", "warning");
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          nome: updates.name,
          role: updates.role,
          confirmed: updates.confirmed
        })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch (err) {
      console.error("Erro ao atualizar no Supabase:", err);
      notify("Erro ao atualizar usuário.", "warning");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('perfis')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== id));
      notify("Usuário removido com sucesso.");
    } catch (err) {
      console.error("Erro ao deletar no Supabase:", err);
      notify("Erro ao remover usuário.", "warning");
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const login = (user: User) => {
    if (!user.confirmed) {
      notify("Sua conta ainda não foi aprovada por um administrador.", "warning");
      return;
    }
    const newState = { user, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('nexus_auth', JSON.stringify(newState));
    notify(`Bem-vindo, ${user.name}!`, 'success');
  };

  const logout = () => {
    setAuth({ user: null, isAuthenticated: false });
    localStorage.removeItem('nexus_auth');
    notify("Sessão encerrada.");
  };

  const handleAccessDenied = useCallback(() => {
    notify("Acesso negado: você não tem permissão para esta área.", "warning");
  }, [notify]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Iniciando Nexus Core...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      notify,
      permissions,
      updateRolePermissions,
      hasPermission,
      users,
      registerUser,
      updateUser,
      deleteUser
    }}>
      <HashRouter>
        <div className="flex min-h-screen">
          {auth.isAuthenticated && <Sidebar user={auth.user} logout={logout} />}
          <div className="flex-1 flex flex-col min-w-0">
            {auth.isAuthenticated && <Navbar user={auth.user} />}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
              <Routes>
                <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={login} />} />
                <Route path="/register" element={<Register />} />

                <Route path="/dashboard" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_DASHBOARD}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <BusinessIntelligence user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/admin" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.ACCESS_ADMIN_PANEL}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <AdminDashboard />
                  </PermissionRoute>
                } />

                <Route path="/manager" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_ALL_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <ManagerDashboard />
                  </PermissionRoute>
                } />

                <Route path="/manager/completed" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_ALL_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <CompletedSalesManager />
                  </PermissionRoute>
                } />

                <Route path="/seller" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_OWN_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <SellerDashboard user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/under-review" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_OWN_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <SalesUnderReview user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/approved-sales" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_OWN_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <ApprovedSales user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/rejected-sales" element={
                  <PermissionRoute
                    requiredPermission={AppPermission.VIEW_OWN_SALES}
                    isAuthenticated={auth.isAuthenticated}
                    userHasPermission={hasPermission}
                    onAccessDenied={handleAccessDenied}
                  >
                    <RejectedSales user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/" element={
                  auth.isAuthenticated ? (
                    auth.user?.role === UserRole.ADMIN ? <Navigate to="/admin" replace /> :
                      auth.user?.role === UserRole.MANAGER ? <Navigate to="/manager" replace /> :
                        <Navigate to="/seller" replace />
                  ) : <Navigate to="/login" replace />
                } />
              </Routes>
            </main>
          </div>
        </div>
        <NotificationToast notifications={notifications} removeNotification={removeNotification} />
        <SupabaseSyncIndicator isSyncing={isSyncing} lastSync={lastSync} />
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;