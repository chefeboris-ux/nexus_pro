// Script de teste de conexão com Supabase
import { supabase } from './utils/supabase/client.ts';

async function testConnection() {
    console.log('🧪 Testando conexão com Supabase...');

    // Teste 1: Verificar se o cliente foi criado
    console.log('1️⃣ Cliente Supabase:', supabase ? '✅ Criado' : '❌ Não criado');

    // Teste 2: Tentar listar tabelas
    try {
        const { data, error } = await supabase.from('vendas').select('count');
        if (error) {
            console.error('2️⃣ Erro ao acessar tabela vendas:', error);
        } else {
            console.log('2️⃣ Tabela vendas acessível:', '✅', data);
        }
    } catch (e) {
        console.error('2️⃣ Exceção ao acessar vendas:', e);
    }

    // Teste 3: Tentar inserir um registro de teste
    try {
        const testSale = {
            id: 'TEST_' + Date.now(),
            seller_id: 'test_user',
            seller_name: 'Teste',
            customer_data: { nome: 'Cliente Teste', cpf: '000.000.000-00' },
            status: 'EM_ANDAMENTO',
            status_history: [{ status: 'EM_ANDAMENTO', updatedBy: 'Sistema', updatedAt: new Date().toISOString() }]
        };

        console.log('3️⃣ Tentando inserir:', testSale);

        const { data, error } = await supabase
            .from('vendas')
            .insert(testSale)
            .select()
            .single();

        if (error) {
            console.error('3️⃣ ❌ Erro ao inserir:', error);
            console.error('Detalhes:', JSON.stringify(error, null, 2));
        } else {
            console.log('3️⃣ ✅ Inserção bem-sucedida:', data);

            // Limpar o teste
            await supabase.from('vendas').delete().eq('id', testSale.id);
            console.log('🧹 Registro de teste removido');
        }
    } catch (e) {
        console.error('3️⃣ Exceção ao inserir:', e);
    }
}

// Executar teste quando a página carregar
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(testConnection, 1000);
    });
}

export { testConnection };
