export const MapeadorDeDados = {
    // Converte dados do formulário para o formato da tabela 'clientes'
    paraClienteDB: (formData: any) => ({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.contato || formData.telefone,
        cpf: formData.cpf,
        data_nascimento: formData.data_nascimento,
        nome_mae: formData.nome_mae,
        rua: formData.rua,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        plano: formData.plano,
        vencimento_dia: formData.vencimento_dia,
        anotacoes: formData.anotacoes,
        foto_frente_url: formData.foto_frente_url,
        foto_verso_url: formData.foto_verso_url,
        foto_comprovante_residencia_url: formData.foto_comprovante_residencia_url,
        foto_ctps_url: formData.foto_ctps_url,
        audio_url: formData.audio_url,
        data_cadastro: formData.createdAt || new Date().toISOString()
    }),

    // Converte dados da tabela 'clientes' para o formulário do sistema
    deClienteDB: (dbData: any) => ({
        id: dbData.id,
        nome: dbData.nome,
        email: dbData.email,
        telefone: dbData.telefone,
        cpf: dbData.cpf,
        data_nascimento: dbData.data_nascimento,
        nome_mae: dbData.nome_mae,
        rua: dbData.rua,
        numero: dbData.numero,
        complemento: dbData.complemento,
        bairro: dbData.bairro,
        cidade: dbData.cidade,
        estado: dbData.estado,
        cep: dbData.cep,
        plano: dbData.plano,
        vencimento_dia: dbData.vencimento_dia,
        anotacoes: dbData.anotacoes,
        foto_frente_url: dbData.foto_frente_url,
        foto_verso_url: dbData.foto_verso_url,
        foto_comprovante_residencia_url: dbData.foto_comprovante_residencia_url,
        foto_ctps_url: dbData.foto_ctps_url,
        audio_url: dbData.audio_url,
        data_cadastro: dbData.data_cadastro
    }),

    // Converte dados para a tabela 'vendas'
    paraVendaDB: (venda: any, clienteId: string) => ({
        cliente_id: clienteId,
        valor: parseFloat(venda.valor || 0),
        status: venda.status || 'Pendente',
        data_venda: venda.createdAt || new Date().toISOString()
    }),

    // Converte dados do sistema para a tabela 'perfis'
    paraPerfilDB: (user: any) => ({
        nome: user.name,
        email: user.email,
        role: user.role,
        confirmed: user.confirmed
    }),

    // Converte dados da tabela 'perfis' para o sistema
    dePerfilDB: (dbData: any) => ({
        id: dbData.id,
        name: dbData.nome,
        email: dbData.email,
        role: dbData.role,
        confirmed: dbData.confirmed,
        createdAt: dbData.created_at
    })
};
