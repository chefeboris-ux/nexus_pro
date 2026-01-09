import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { Sale, SaleStatus, AppPermission } from '../types.ts';
import { useApp } from '../App.tsx';

const CompletedSalesManager: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const { notify, hasPermission } = useApp();

    const loadCompletedSales = () => {
        const allSales: Sale[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('nexus_sales_')) {
                try {
                    const userSales = JSON.parse(localStorage.getItem(key) || '[]');
                    allSales.push(...userSales);
                } catch (e) {
                    console.error("Erro ao ler vendas", e);
                }
            }
        }

        // Filtra apenas as FINALIZADAS
        const finished = allSales.filter(s => s.status === SaleStatus.FINISHED);
        const sorted = finished.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSales(sorted);
    };

    useEffect(() => {
        loadCompletedSales();
        const interval = setInterval(loadCompletedSales, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleDownloadFichaZip = async (sale: Sale) => {
        const c = sale.customerData;
        const zip = new JSZip();
        notify("Preparando pacote...", "info");

        const text = `
DETALHAMENTO DE VENDA FINALIZADA - #${sale.id}
CLIENTE: ${c.nome.toUpperCase()}
VENDEDOR: ${sale.sellerName}
DATA DE FECHAMENTO: ${new Date(sale.statusHistory[sale.statusHistory.length - 1]?.updatedAt || '').toLocaleString()}

👤 Nome: ${c.nome}
🆔 CPF: ${c.cpf}
🎂 Nascimento: ${c.data_nascimento || '---'}
📞 Contato: ${c.contato || '---'}
✉ E-mail: ${c.email || '---'}

🏡 Endereço: ${c.rua}, ${c.numero}
🌆 Bairro: ${c.bairro}
📍 Cidade: ${c.cidade} - ${c.estado}
🏷 CEP: ${c.cep}

🚀 Plano: ${c.plano}
📆 Vencimento: Dia ${c.vencimento_dia}
`.trim();

        zip.file("relatorio_venda.txt", text);

        const downloadAndAddToZip = async (url: string | undefined, name: string) => {
            if (!url) return;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const extension = url.split('.').pop()?.split('?')[0] || 'file';
                zip.file(`${name}.${extension}`, blob);
            } catch (err) { console.error(err); }
        };

        await Promise.all([
            downloadAndAddToZip(c.foto_frente_url, "rg_frente"),
            downloadAndAddToZip(c.foto_verso_url, "rg_verso"),
            downloadAndAddToZip(c.foto_comprovante_residencia_url, "comprovante"),
            downloadAndAddToZip(c.audio_url, "audio_venda")
        ]);

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `CONTRATO_FINALIZADO_${c.nome.replace(/\s+/g, '_').toUpperCase()}.zip`;
        link.click();
        notify("Arquivo ZIP gerado!", "success");
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendas Finalizadas</h1>
                    <p className="text-slate-500 text-sm">Histórico completo de contratos aprovados e liquidados.</p>
                </div>
                <div className="bg-emerald-600 text-white px-6 py-2 rounded-2xl shadow-lg flex items-center space-x-3">
                    <i className="fas fa-archive"></i>
                    <span className="font-bold">{sales.length} Contratos no Arquivo</span>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Data Fechamento</th>
                            <th className="px-6 py-4">Vendedor</th>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic text-sm">
                        {sales.length > 0 ? sales.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                    {new Date(sale.statusHistory[sale.statusHistory.length - 1]?.updatedAt || '').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-800">{sale.sellerName}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-indigo-900">{sale.customerData.nome}</p>
                                    <p className="text-[10px] font-mono opacity-60 text-slate-900">{sale.customerData.cpf}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Finalizada</span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => setSelectedSale(sale)} className="text-slate-400 hover:text-indigo-600 p-2"><i className="fas fa-eye"></i></button>
                                    <button onClick={() => handleDownloadFichaZip(sale)} className="text-slate-400 hover:text-emerald-600 p-2"><i className="fas fa-file-zipper"></i></button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300">Nenhum contrato arquivado no momento.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                            <h2 className="font-bold">Ficha de Contrato - #{selectedSale.id}</h2>
                            <button onClick={() => setSelectedSale(null)} className="opacity-70 hover:opacity-100"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-8 grid grid-cols-2 gap-4 text-xs font-medium">
                            <div><p className="text-slate-400 uppercase font-bold">Cliente</p><p className="text-sm font-bold">{selectedSale.customerData.nome}</p></div>
                            <div><p className="text-slate-400 uppercase font-bold">Vendedor</p><p className="text-sm font-bold">{selectedSale.sellerName}</p></div>
                            <div><p className="text-slate-400 uppercase font-bold">Plano Contratado</p><p className="text-sm font-bold">{selectedSale.customerData.plano}</p></div>
                            <div><p className="text-slate-400 uppercase font-bold">Documento</p><p className="font-mono text-sm">{selectedSale.customerData.cpf}</p></div>
                            <div className="col-span-2 pt-4 border-t"><p className="text-slate-400 uppercase font-bold">Endereço Completo</p><p className="text-sm">{selectedSale.customerData.rua}, {selectedSale.customerData.numero} - {selectedSale.customerData.cidade}/{selectedSale.customerData.estado}</p></div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
                            <button onClick={() => setSelectedSale(null)} className="px-6 py-2 text-slate-500 font-bold">Fechar</button>
                            <button onClick={() => handleDownloadFichaZip(selectedSale)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Download ZIP</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompletedSalesManager;
