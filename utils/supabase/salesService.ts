import { supabase } from './client';
import { Sale, SaleStatus } from '../../types';

export const SalesService = {
    // Buscar todas as vendas (para managers/admins)
    async getAllSales(): Promise<Sale[]> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*');

        if (error) {
            console.error('Erro ao buscar vendas:', error);
            return [];
        }

        return data.map(mapToSale);
    },

    // Buscar vendas por vendedor
    async getSalesBySeller(sellerId: string): Promise<Sale[]> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*')
            .eq('seller_id', sellerId);

        if (error) {
            console.error('Erro ao buscar vendas do vendedor:', error);
            return [];
        }

        return data.map(mapToSale);
    },

    // Criar ou atualizar venda
    async saveSale(sale: Sale): Promise<Sale | null> {
        console.log('🔵 SalesService.saveSale - Iniciando salvamento:', sale.id);
        const dbSale = mapFromSale(sale);
        console.log('🔵 Dados mapeados para DB:', dbSale);

        const { data, error } = await supabase
            .from('vendas')
            .upsert(dbSale)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao salvar venda no Supabase:', error);
            console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log('✅ Venda salva com sucesso no Supabase:', data);
        return mapToSale(data);
    },

    // Atualizar status
    async updateStatus(saleId: string, status: SaleStatus, historyEntry: any, reason?: string): Promise<boolean> {
        const updateData: any = {
            status,
            status_history: historyEntry // This needs to be appended, not replaced. Will handle logic below.
        };
        if (reason !== undefined) updateData.return_reason = reason;

        // First fetch current history to append
        const { data: currentData } = await supabase.from('vendas').select('status_history').eq('id', saleId).single();
        const currentHistory = currentData?.status_history || [];
        const newHistory = [...currentHistory, historyEntry];

        const { error } = await supabase
            .from('vendas')
            .update({ ...updateData, status_history: newHistory })
            .eq('id', saleId);

        return !error;
    }
};

// Mappers
function mapToSale(dbData: any): Sale {
    return {
        id: dbData.id,
        sellerId: dbData.seller_id,
        sellerName: dbData.seller_name,
        customerData: dbData.customer_data,
        status: dbData.status as SaleStatus,
        statusHistory: dbData.status_history || [],
        createdAt: dbData.created_at,
        expiresAt: dbData.expires_at,
        returnReason: dbData.return_reason
    };
}

function mapFromSale(sale: Sale): any {
    return {
        id: sale.id,
        seller_id: sale.sellerId,
        seller_name: sale.sellerName,
        customer_data: sale.customerData,
        status: sale.status,
        status_history: sale.statusHistory,
        created_at: sale.createdAt,
        expires_at: sale.expiresAt,
        return_reason: sale.returnReason
    };
}
