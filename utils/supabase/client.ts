import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Supabase: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.");
}

// Fallback para evitar crash da aplicação se as envs não estiverem definidas (comum em pre-builds)
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);
