import React, { useState, useEffect, useMemo } from 'react';
import { User, Sale, SaleStatus } from '../types.ts';
import { useApp } from '../App.tsx';

interface SalesUnderReviewProps {
    user: User;
}

const SalesUnderReview: React.FC<SalesUnderReviewProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const { notify } = useApp();

    useEffect(() => {
        const loadSales = () => {
            const savedSales = localStorage.getItem(`nexus_sales_${user.id}`);
            if (savedSales) {
                const allSales: Sale[] = JSON.parse(savedSales);
                // Filtra apenas as que estão EM PROGRESSO e SEM motivo de devolução
                const underReview = allSales.filter(s =>
                    s.status === SaleStatus.IN_PROGRESS && !s.returnReason
                );
                setSales(underReview);
            }
        };

        loadSales();
        const interval = setInterval(loadSales, 5000); // Atualiza a cada 5s
        return () => clearInterval(interval);
    }, [user.id]);

    const salesCount = sales.length;

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendas em Análise</h1>
                    <p className="text-slate-500 text-sm">Acompanhe as fichas enviadas para validação do gerente.</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i className="fas fa-hourglass-half"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase">Aguardando</p>
                        <p className="text-lg font-bold text-amber-900 leading-none">{salesCount} {salesCount === 1 ? 'Ficha' : 'Fichas'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sales.length > 0 ? sales.map(sale => (
                    <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                        <div className="p-1 bg-amber-500"></div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocolo</p>
                                    <p className="font-bold text-slate-900 text-lg">#{sale.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviado em</p>
                                    <p className="text-xs font-medium text-slate-600 italic">
                                        {new Date(sale.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente</p>
                                <p className="font-bold text-slate-900">{sale.customerData.nome}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono italic">
                                        {sale.customerData.cpf}
                                    </span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                                        {sale.customerData.plano}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center space-x-2 text-amber-600">
                                    <i className="fas fa-circle-notch fa-spin text-sm"></i>
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Em Análise Técnica</span>
                                </div>
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 overflow-hidden" title="Gerente Analisando">
                                        <i className="fas fa-user-tie"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                            <i className="fas fa-clipboard-check text-2xl"></i>
                        </div>
                        <p className="text-slate-400 font-medium italic">Nenhuma ficha aguardando análise no momento.</p>
                        <p className="text-[10px] text-slate-300 uppercase font-bold mt-1">Tudo em dia!</p>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                    <i className="fas fa-info-circle"></i>
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">Sobre este painel</h4>
                    <p className="text-blue-700 text-xs leading-relaxed mt-1">
                        As fichas exibidas aqui foram enviadas para o gerente. Se houver alguma inconsistência, ela retornará para a sua tela principal de "Minhas Vendas" com um ícone de alerta vermelho indicando o que precisa ser corrigido.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SalesUnderReview;
