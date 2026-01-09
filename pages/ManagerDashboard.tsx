import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { Sale, SaleStatus, AppPermission, StatusHistoryEntry, UserRole } from '../types.ts';
import { useApp } from '../App.tsx';

const ManagerDashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterSellerId, setFilterSellerId] = useState<string>('all');
  const [returnReason, setReturnReason] = useState('');
  const [regressions, setRegressions] = useState<string[]>([]);
  const notifiedRegressions = useRef<Set<string>>(new Set());
  const { notify, hasPermission, users } = useApp();

  const savedAuth = localStorage.getItem('nexus_auth');
  const currentUser = savedAuth ? JSON.parse(savedAuth).user : null;

  // Filtro atualizado para incluir todos os usuários cadastrados (Admin, Gerente, Vendedor)
  const allAvailableSellers = useMemo(() => {
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const loadAllSales = () => {
    const allSales: Sale[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_sales_')) {
        try {
          const userSales = JSON.parse(localStorage.getItem(key) || '[]');
          allSales.push(...userSales);
        } catch (e) {
          console.error("Erro ao ler vendas do localStorage", e);
        }
      }
    }

    const submittedSales = allSales.filter(s => s.status !== SaleStatus.DRAFT && !s.returnReason && s.status !== SaleStatus.FINISHED);
    const sortedSales = submittedSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const currentRegressions: string[] = [];
    sortedSales.forEach(sale => {
      const history = sale.statusHistory || [];
      const hasBeenApproved = history.some(h => h.status === SaleStatus.ANALYZED || h.status === SaleStatus.FINISHED);
      const isCurrentlyEarlyStage = sale.status === SaleStatus.IN_PROGRESS;

      if (hasBeenApproved && isCurrentlyEarlyStage) {
        currentRegressions.push(sale.id);
        if (!notifiedRegressions.current.has(sale.id)) {
          notify(`ALERTA: A venda #${sale.id} retornou para análise após aprovação prévia!`, 'warning');
          notifiedRegressions.current.add(sale.id);
        }
      }
    });

    setRegressions(currentRegressions);
    setSales(sortedSales);
  };

  useEffect(() => {
    loadAllSales();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('nexus_sales_')) loadAllSales();
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(loadAllSales, 5000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const filteredSales = useMemo(() => {
    if (filterSellerId === 'all') return sales;
    return sales.filter(s => s.sellerId === filterSellerId);
  }, [sales, filterSellerId]);

  const handleUpdateStatus = (id: string, newStatus: SaleStatus, reason?: string) => {
    if (!hasPermission(AppPermission.APPROVE_SALES)) {
      notify("Permissão insuficiente.", "warning");
      return;
    }

    const saleToUpdate = sales.find(s => s.id === id);
    if (!saleToUpdate) return;

    const isReturn = newStatus === SaleStatus.IN_PROGRESS && reason && reason.trim().length > 0;
    const isRegression = (saleToUpdate.status === SaleStatus.ANALYZED || saleToUpdate.status === SaleStatus.FINISHED) && newStatus === SaleStatus.IN_PROGRESS;

    if ((isReturn || isRegression) && (!reason || reason.trim().length < 5)) {
      notify("É obrigatório informar uma justificativa detalhada para o retorno da venda.", "warning");
      return;
    }

    const newHistoryEntry: StatusHistoryEntry = {
      status: newStatus,
      updatedBy: currentUser?.name || 'Sistema',
      updatedAt: new Date().toISOString(),
      reason: isRegression ? reason : undefined
    };

    const updatedSale = {
      ...saleToUpdate,
      status: newStatus,
      returnReason: (isReturn || isRegression) ? reason : saleToUpdate.returnReason,
      statusHistory: [...(saleToUpdate.statusHistory || []), newHistoryEntry]
    };

    const storageKey = `nexus_sales_${saleToUpdate.sellerId}`;
    const ownerSales = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedOwnerSales = ownerSales.map((os: Sale) => os.id === id ? updatedSale : os);
    localStorage.setItem(storageKey, JSON.stringify(updatedOwnerSales));

    loadAllSales();
    if (selectedSale?.id === id) setSelectedSale(null);
    setReturnReason('');
    notify(`Status da venda #${id} atualizado para ${newStatus}.`, 'success');
  };

  const handleDownloadFicha = async (sale: Sale) => {
    const c = sale.customerData;
    const zip = new JSZip();

    notify("Preparando pacote de download...", "info");

    const text = `
CADASTRO – CLIENTE - ${c.nome.toUpperCase()}

👤 Nome: ${c.nome}
🆔 CPF: ${c.cpf}
🎂 Data de Nascimento: ${c.data_nascimento || '---'}
👩‍👦 Nome da Mãe: ${c.nome_mae || '---'}

📞 Contato: ${c.contato || '---'}
✉ E-mail: ${c.email || '---'}

🏡 Endereço: ${c.rua}, ${c.numero}${c.complemento ? ' - ' + c.complemento : ''}
🌆 Bairro: ${c.bairro || '---'}
📍 Cidade: ${c.cidade || '---'}
🏷 CEP: ${c.cep || '---'}

🚀 Plano: ${c.plano}
📆 Vencimento: Dia ${c.vencimento_dia}
💼 Vendedor: ${sale.sellerName}

--------------------------------------------------
Protocolo: #${sale.id}
Gerado em: ${new Date().toLocaleString()}
`.trim();

    // 1. Adicionar o arquivo de texto
    zip.file("dados_cliente.txt", text);

    // 2. Função auxiliar para baixar arquivos binários
    const downloadAndAddToZip = async (url: string | undefined, folderName: string) => {
      if (!url) return;
      try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Extrair extensão do arquivo da URL ou usar padrão
        const extension = url.split('.').pop()?.split('?')[0] || 'file';
        zip.file(`${folderName}.${extension}`, blob);
      } catch (err) {
        console.error(`Erro ao baixar anexo (${folderName}):`, err);
      }
    };

    // 3. Baixar e adicionar todos os anexos disponíveis
    await Promise.all([
      downloadAndAddToZip(c.foto_frente_url, "rg_frente"),
      downloadAndAddToZip(c.foto_verso_url, "rg_verso"),
      downloadAndAddToZip(c.foto_comprovante_residencia_url, "comprovante_residencia"),
      downloadAndAddToZip(c.foto_ctps_url, "ctps"),
      downloadAndAddToZip(c.audio_url, "audio_cliente")
    ]);

    // 4. Gerar e baixar o ZIP
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FICHA_COMPLETA_${c.nome.replace(/\s+/g, '_').toUpperCase()}_${sale.id}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      notify("Ficha e anexos baixados (ZIP) com sucesso!", "success");
    } catch (err) {
      notify("Erro ao gerar arquivo compactado.", "error");
    }
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      notify("Não há dados para exportar.", "warning");
      return;
    }

    const headers = [
      "ID", "Vendedor", "Cliente", "CPF/CNPJ", "Email",
      "Telefone", "Cidade", "UF", "Plano", "Status", "Data Cadastro"
    ];

    const rows = filteredSales.map(s => [
      s.id,
      s.sellerName,
      s.customerData.nome,
      s.customerData.cpf,
      s.customerData.email,
      s.customerData.contato,
      s.customerData.cidade,
      s.customerData.estado,
      s.customerData.plano,
      s.status,
      new Date(s.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexus_export_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Exportação CSV concluída com sucesso!", "success");
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerência de Vendas</h1>
          <p className="text-slate-500 text-sm">Filtre por vendedor e analise as fichas detalhadamente.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all"
          >
            <i className="fas fa-file-export text-indigo-500"></i>
            <span>Exportar CSV</span>
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">Filtrar Vendedor:</label>
            <select
              value={filterSellerId}
              onChange={(e) => setFilterSellerId(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">Todos os Vendedores</option>
              {allAvailableSellers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
            Total: {filteredSales.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-xs font-bold text-slate-500 uppercase">
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Cliente / CPF</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => {
                  const isFinished = sale.status === SaleStatus.FINISHED;
                  const isRegression = regressions.includes(sale.id);
                  return (
                    <tr key={sale.id} className={`hover:bg-slate-50/50 transition-colors ${isRegression ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{sale.sellerName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">ID: #{sale.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{sale.customerData.nome}</p>
                        <p className="text-[11px] font-mono text-slate-500">{sale.customerData.cpf}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600">{sale.customerData.cidade || '---'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.customerData.estado || '--'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          sale.status === SaleStatus.IN_PROGRESS ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => { setSelectedSale(sale); setReturnReason(''); }}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center ml-auto"
                        >
                          <i className="fas fa-eye mr-2"></i>
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    Nenhuma venda encontrada para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className={`px-8 py-5 text-white flex justify-between items-center ${selectedSale.status === SaleStatus.FINISHED ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              <div>
                <h3 className="text-xl font-bold">Detalhamento da Ficha</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                  Ref: #{selectedSale.id} | Vendedor: {selectedSale.sellerName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadFicha(selectedSale)}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold border border-white/20 flex items-center transition-all"
                  title="Baixar Ficha Completa"
                >
                  <i className="fas fa-download mr-2"></i>
                  Baixar Ficha
                </button>
                <button onClick={() => setSelectedSale(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors hover:bg-white/20">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-user-circle mr-2 text-indigo-500"></i> Dados Pessoais do Cliente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Nome Completo</p><p className="text-sm font-bold text-slate-800">{selectedSale.customerData.nome}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">CPF / CNPJ</p><p className="text-sm font-semibold font-mono text-slate-800">{selectedSale.customerData.cpf}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Data de Nascimento</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.data_nascimento || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Nome da Mãe</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.nome_mae || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">E-mail de Contato</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.email || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Telefone/WhatsApp</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.contato || '---'}</p></div>
                </div>
              </div>

              {/* Seção 2: Localização */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-map-marker-alt mr-2 text-indigo-500"></i> Endereço de Instalação/Cobrança
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">CEP</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.cep || '---'}</p></div>
                  <div className="md:col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">Logradouro / Número</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.rua || '---'}, {selectedSale.customerData.numero}</p></div>
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">Complemento</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.complemento || '---'}</p></div>
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">Bairro</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.bairro || '---'}</p></div>
                  <div className="md:col-span-3"><p className="text-[10px] text-slate-400 font-bold uppercase">Cidade / UF</p><p className="text-sm font-semibold text-slate-800">{selectedSale.customerData.cidade || '---'} - {selectedSale.customerData.estado || '--'}</p></div>
                </div>
              </div>

              {/* Seção 3: Informações Comerciais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-tag mr-2 text-indigo-500"></i> Plano e Vencimento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">Plano Escolhido</p>
                    <p className="text-base font-bold text-indigo-700">{selectedSale.customerData.plano}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Dia de Vencimento</p>
                    <p className="text-base font-bold text-slate-700">Dia {selectedSale.customerData.vencimento_dia}</p>
                  </div>
                </div>
                {selectedSale.customerData.anotacoes && (
                  <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Observações Adicionais</h4>
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      "{selectedSale.customerData.anotacoes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Seção 4: Comprovações Digitais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-file-shield mr-2 text-indigo-500"></i> Documentação e Auditoria
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'RG/CNH (Frente)', url: selectedSale.customerData.foto_frente_url, icon: 'fa-id-card' },
                    { label: 'RG/CNH (Verso)', url: selectedSale.customerData.foto_verso_url, icon: 'fa-id-card' },
                    { label: 'Residência', url: selectedSale.customerData.foto_comprovante_residencia_url, icon: 'fa-house-chimney' },
                    { label: 'Trabalho/CTPS', url: selectedSale.customerData.foto_ctps_url, icon: 'fa-briefcase' },
                  ].map((file, idx) => (
                    <div key={idx} className={`aspect-video rounded-xl border flex flex-col items-center justify-center p-3 text-center transition-all ${file.url ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 grayscale opacity-50'}`}>
                      <i className={`fas ${file.icon} mb-2 text-indigo-400 text-lg`}></i>
                      <p className="text-[9px] font-bold uppercase text-slate-500">{file.label}</p>
                      {file.url ? (
                        <button onClick={() => notify("Abrindo visualizador de documento...")} className="mt-2 text-[10px] text-indigo-600 font-bold hover:underline">
                          Ver Anexo
                        </button>
                      ) : (
                        <span className="mt-2 text-[10px] text-slate-400 italic">Não enviado</span>
                      )}
                    </div>
                  ))}
                </div>

                {selectedSale.customerData.audio_url && (
                  <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-volume-high text-xl"></i>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">Gravação de Segurança</p>
                        <p className="text-[10px] opacity-80 font-medium italic">Confirmação de venda em áudio anexada</p>
                      </div>
                    </div>
                    <button onClick={() => notify("Iniciando reprodução de áudio...")} className="bg-white text-indigo-600 px-6 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center shadow-md">
                      <i className="fas fa-play mr-2"></i> Reproduzir
                    </button>
                  </div>
                )}
              </div>

              {/* Fluxo de Status - Apenas se tiver permissão */}
              {hasPermission(AppPermission.APPROVE_SALES) && (
                <div className="bg-slate-900 p-8 rounded-3xl space-y-6 shadow-xl">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <i className="fas fa-tasks"></i>
                    <h4 className="text-xs font-bold uppercase tracking-widest">Painel de Decisão Comercial</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações Rápidas</label>
                      <div className="flex flex-col space-y-3">
                        <button
                          onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.ANALYZED)}
                          disabled={selectedSale.status === SaleStatus.ANALYZED || selectedSale.status === SaleStatus.FINISHED}
                          className={`w-full py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center ${selectedSale.status === SaleStatus.ANALYZED || selectedSale.status === SaleStatus.FINISHED
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                          <i className="fas fa-check-circle mr-2"></i>
                          Marcar como Analisada
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.FINISHED)}
                          disabled={selectedSale.status === SaleStatus.FINISHED}
                          className={`w-full py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center ${selectedSale.status === SaleStatus.FINISHED
                            ? 'bg-emerald-900/20 text-emerald-500 border-emerald-900/50 cursor-not-allowed'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20'
                            }`}
                        >
                          <i className="fas fa-flag-checkered mr-2"></i>
                          Finalizar Venda
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Ações Corretivas</label>
                      <button
                        onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.IN_PROGRESS, returnReason)}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all flex items-center justify-center shadow-lg shadow-amber-500/20"
                      >
                        <i className="fas fa-rotate-left mr-2"></i>
                        Retornar para Vendedor
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Justificativa / Feedback</label>
                      <span className="text-[9px] text-amber-400 font-bold italic">* Obrigatório para devolução</span>
                    </div>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Descreva erros, pendências ou parabenize o vendedor..."
                      className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-all min-h-[120px]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between items-center">
                <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <i className="fas fa-history"></i>
                  <span>Última atualização: {new Date(selectedSale.statusHistory[selectedSale.statusHistory.length - 1]?.updatedAt || '').toLocaleString()}</span>
                </div>
                <button onClick={() => setSelectedSale(null)} className="text-slate-500 font-bold py-3 px-10 rounded-2xl hover:bg-slate-100 transition-all border border-slate-200">
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;