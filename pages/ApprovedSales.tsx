import React, { useState, useEffect } from 'react';
import { User, Sale, SaleStatus } from '../types.ts';
import { useApp } from '../App.tsx';

interface ApprovedSalesProps {
    user: User;
}

const ApprovedSales: React.FC<ApprovedSalesProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const { notify } = useApp();

    useEffect(() => {
        const loadSales = () => {
            const savedSales = localStorage.getItem(`nexus_sales_${user.id}`);
            if (savedSales) {
                const allSales: Sale[] = JSON.parse(savedSales);
                // Filtra apenas as vendas FINALIZADAS (Aprovadas)
                const approved = allSales.filter(s => s.status === SaleStatus.FINISHED);
                setSales(approved);
            }
        };

        loadSales();
        const interval = setInterval(loadSales, 10000); // Atualiza a cada 10s
        return () => clearInterval(interval);
    }, [user.id]);

    const totalApproved = sales.length;

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendas Aprovadas</h1>
                    <p className="text-slate-500 text-sm">Histórico de contratos validados e finalizados.</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i className="fas fa-check-double"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Concluído</p>
                        <p className="text-lg font-bold text-emerald-900 leading-none">{totalApproved} {totalApproved === 1 ? 'Venda' : 'Vendas'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Data / Ref</th>
                            <th className="px-6 py-4">Cliente / Documento</th>
                            <th className="px-6 py-4">Plano</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {sales.length > 0 ? sales.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900">#{sale.id}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-slate-900">{sale.customerData.nome}</p>
                                    <p className="text-[10px] text-slate-400 font-mono italic">{sale.customerData.cpf}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold uppercase border border-indigo-100">
                                        {sale.customerData.plano}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1 text-emerald-600">
                                        <i className="fas fa-check-circle text-xs"></i>
                                        <span className="text-[10px] font-bold uppercase">Finalizada</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-indigo-600 p-2 transition-colors" title="Ver Detalhes">
                                        <i className="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                    Nenhuma venda finalizada encontrada no seu histórico.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <i className="fas fa-award text-xl text-indigo-100"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Parabéns pelo trabalho!</h4>
                            <p className="text-indigo-100 text-xs opacity-80">Mantenha o foco para bater sua meta mensal.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200">
                    <div className="flex items-center space-x-4 text-slate-600">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                            <i className="fas fa-shield-halved text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Contrato Seguro</h4>
                            <p className="text-slate-500 text-xs leading-relaxed">Fichas finalizadas estão arquivadas e protegidas seguindo as normas da LGPD.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovedSales;
