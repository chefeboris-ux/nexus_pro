import { supabase } from './client';
import { MapeadorDeDados } from './mapper';

export const sincronizadorDeDados = {
    async sincronizarVendas(vendasLocais: any[]) {
        console.log('Iniciando sincronização de dados...');

        for (const venda of vendasLocais) {
            try {
                // 1. Sincronizar Cliente primeiro
                const clienteBase = MapeadorDeDados.paraClienteDB(venda.customerData);
                const { data: clienteDB, error: cError } = await supabase
                    .from('clientes')
                    .upsert(clienteBase, { onConflict: 'email' })
                    .select()
                    .single();

                if (cError) throw cError;

                // 2. Sincronizar Venda vinculada ao cliente
                const vendaBase = MapeadorDeDados.paraVendaDB(venda, clienteDB.id);
                const { error: vError } = await supabase
                    .from('vendas')
                    .upsert(vendaBase);

                if (vError) throw vError;
            } catch (err) {
                console.error('Erro ao sincronizar item:', err);
            }
        }

        console.log('Sincronização concluída.');
    }
};
