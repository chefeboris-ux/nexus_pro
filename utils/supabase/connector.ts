import { supabase } from './client';

export interface ConnectionStatus {
    isConnected: boolean;
    error: string | null;
}

export const checkSupabaseConnection = async (): Promise<ConnectionStatus> => {
    try {
        const { data, error } = await supabase.from('clientes').select('id').limit(1);

        if (error) {
            console.error('Erro de conexão com Supabase:', error);
            return { isConnected: false, error: error.message };
        }

        return { isConnected: true, error: null };
    } catch (err: any) {
        console.error('Falha catastrófica ao conectar ao Supabase:', err);
        return { isConnected: false, error: err.message || 'Erro desconhecido' };
    }
};
