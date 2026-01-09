
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types.ts';
import { useApp } from '../App.tsx';
import { supabase } from '../utils/supabase/client.ts';
import { MapeadorDeDados } from '../utils/supabase/mapper.ts';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { users, notify } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const attemptLogin = async () => {
      try {
        const { data: foundUser, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (error || !foundUser) {
          notify("Usuário não encontrado ou senha incorreta.", "warning");
          setLoading(false);
          return;
        }

        if (!foundUser.confirmed) {
          notify("Acesso negado: Sua conta aguarda aprovação de um administrador.", "warning");
          setLoading(false);
          return;
        }

        onLogin(MapeadorDeDados.dePerfilDB(foundUser) as User);
      } catch (error) {
        console.error("Erro no login:", error);
        notify("Erro ao processar login. Tente novamente.", "warning");
      } finally {
        setLoading(false);
      }
    };

    attemptLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <i className="fas fa-rocket text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Bem-vindo ao Nexus CRM</h1>
          <p className="text-slate-500 mt-2">Entre com suas credenciais para acessar o CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="vendedor@nexus.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">Senha</label>
              <a href="#" className="text-xs text-indigo-600 font-medium hover:underline">Esqueceu a senha?</a>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
            Acessar Sistema
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400 font-medium italic">Ou entre com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                  redirectTo: window.location.origin
                }
              });
              if (error) notify("Erro ao conectar com GitHub: " + error.message, "warning");
            }}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center space-x-3"
          >
            <i className="fab fa-github text-xl"></i>
            <span>Entrar com GitHub</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-sm">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline">Cadastre-se</Link>
          </p>
        </div>


      </div>
    </div>
  );
};

export default Login;
