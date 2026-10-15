export interface Usuario {
    id: number;
    login: string;
    nome: string | null;
    email: string | null;
    perfil: string;
    situacao: string;
    ultimo_login: string | null;
    precisa_trocar_senha: boolean;
    criado_em: string;
}

export interface PaginadoUsuarios {
    total: number;
    page: number;
    pageSize: number;
    data: Usuario[];
}

export interface FiltroUsuarios {
    busca?: string;
    perfil?: string;
    situacao?: string;
    page?: number;
    pageSize?: number;
}

export interface AtualizarUsuarioInput {
    nome?: string | null;
    email?: string | null;
    perfil?: string;
    situacao?: string;
}

export interface RedefinicaoResultado {
    message: string;
    senhaTemporaria: string;
    expiraEm: string;
}

export interface AuditoriaRedefinicao {
    id: number;
    admin_id: number;
    admin_login: string;
    usuario_id: number;
    ip: string | null;
    criado_em: string;
}
