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
}
