import React, { useState, useEffect } from 'react';
import { User, Sale, SaleStatus } from '../types.ts';
import { useApp } from '../App.tsx';

interface RejectedSalesProps {
    user: User;
}

const RejectedSales: React.FC<RejectedSalesProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const { notify } = useApp();

    useEffect(() => {
        const loadSales = () => {
            const savedSales = localStorage.getItem(`nexus_sales_${user.id}`);
            if (savedSales) {
                const allSales: Sale[] = JSON.parse(savedSales);
                // Filtra apenas as que foram RETORNADAS (Reprovadas para correção)
                const rejected = allSales.filter(s =>
                    s.status === SaleStatus.IN_PROGRESS && !!s.returnReason
                );
                setSales(rejected);
            }
        };

        loadSales();
        const interval = setInterval(loadSales, 5000);
        return () => clearInterval(interval);
    }, [user.id]);

    const rejectedCount = sales.length;

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendas Reprovadas</h1>
                    <p className="text-slate-500 text-sm">Fichas com pendências que precisam de sua correção imediata.</p>
                </div>
                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-red-600 uppercase">Pendentes</p>
                        <p className="text-lg font-bold text-red-900 leading-none">{rejectedCount} {rejectedCount === 1 ? 'Ficha' : 'Fichas'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sales.length > 0 ? sales.map(sale => (
                    <div key={sale.id} className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden hover:shadow-xl transition-all group relative">
                        <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Correção Necessária
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocolo</p>
                                <p className="font-bold text-slate-900 text-lg">#{sale.id}</p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 group-hover:bg-red-50 transition-colors">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente</p>
                                <p className="font-bold text-slate-900">{sale.customerData.nome}</p>
                                <p className="text-[10px] text-slate-500 mt-1 font-mono italic">{sale.customerData.cpf}</p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <i className="fas fa-comment-dots text-amber-500 text-xs"></i>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase">Motivo da Reprovação:</p>
                                </div>
                                <p className="text-xs text-amber-800 italic leading-relaxed">
                                    "{sale.returnReason}"
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => window.location.hash = '#/seller'} // Redireciona para editar na home do vendedor
                                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
                                >
                                    <i className="fas fa-edit"></i>
                                    <span>Corrigir Agora</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-300 mb-4">
                            <i className="fas fa-thumbs-up text-2xl"></i>
                        </div>
                        <p className="text-slate-400 font-medium italic">Nenhuma ficha reprovada. Excelente trabalho!</p>
                        <p className="text-[10px] text-slate-300 uppercase font-bold mt-1">Qualidade Garantida</p>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="font-bold text-xl">Dica de Produtividade</h3>
                        <p className="text-slate-400 text-sm max-w-md">
                            Fichas reprovadas geralmente possuem erros simples no CPF ou na foto do comprovante. Revise esses campos antes de enviar para evitar atrasos na sua comissão.
                        </p>
                    </div>
                    <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
                        <i className="fas fa-lightbulb text-3xl text-indigo-400 animate-pulse"></i>
                    </div>
                </div>
                {/* Decorativo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -mr-16 -mt-16"></div>
            </div>
        </div>
    );
};

export default RejectedSales;
