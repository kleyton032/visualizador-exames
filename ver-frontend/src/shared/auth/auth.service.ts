import { apiRequest } from '../services/api';

export interface AuthUser {
    id: number;
    login: string;
    nome: string | null;
    email: string | null;
    perfil: string;
}

export interface LoginResult {
    user: AuthUser;
    mustChangePassword: boolean;
}

export interface IniciarCadastroResultado {
    token: string;
    nome: string;
    onepassIntegrado: boolean;
}

export class AuthService {
    static async login(login: string, senha: string): Promise<LoginResult> {
        const res = await apiRequest<{ user: AuthUser; mustChangePassword?: boolean }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login, senha }),
            headers: { 'Content-Type': 'application/json' },
        });
        return { user: res.user, mustChangePassword: res.mustChangePassword === true };
    }

    static async me(): Promise<AuthUser> {
        const res = await apiRequest<{ user: AuthUser }>('/auth/me');
        return res.user;
    }

    static async logout(): Promise<void> {
        await apiRequest<void>('/auth/logout', { method: 'POST' });
    }

    static async logoutAll(): Promise<void> {
        await apiRequest<void>('/auth/logout-all', { method: 'POST' });
    }

    static async trocarSenhaObrigatoria(novaSenha: string): Promise<AuthUser> {
        const res = await apiRequest<{ user: AuthUser }>('/auth/trocar-senha-obrigatoria', {
            method: 'POST',
            body: JSON.stringify({ novaSenha }),
            headers: { 'Content-Type': 'application/json' },
        });
        return res.user;
    }

    static async iniciarCadastroMedico(cpf: string, dataNascimento: string): Promise<IniciarCadastroResultado> {
        return apiRequest<IniciarCadastroResultado>('/auth/medico/iniciar-cadastro', {
            method: 'POST',
            body: JSON.stringify({ cpf, dataNascimento }),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    static async enviarCodigoEmailMedico(token: string, email: string, senha: string, confirmacao: string): Promise<void> {
        await apiRequest<{ message: string }>('/auth/medico/enviar-codigo-email', {
            method: 'POST',
            body: JSON.stringify({ token, email, senha, confirmacao }),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    static async concluirCadastroMedico(token: string, codigo: string): Promise<AuthUser> {
        const res = await apiRequest<{ user: AuthUser }>('/auth/medico/concluir-cadastro', {
            method: 'POST',
            body: JSON.stringify({ token, codigo }),
            headers: { 'Content-Type': 'application/json' },
        });
        return res.user;
    }
}
