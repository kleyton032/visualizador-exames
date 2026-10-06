import { apiRequest } from '../services/api';

export interface AuthUser {
    id: number;
    login: string;
    nome: string | null;
    email: string | null;
    perfil: string;
}

export class AuthService {
    static async login(login: string, senha: string): Promise<AuthUser> {
        const res = await apiRequest<{ user: AuthUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login, senha }),
            headers: { 'Content-Type': 'application/json' },
        });
        return res.user;
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
}
