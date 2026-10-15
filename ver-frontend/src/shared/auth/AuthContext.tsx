import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthService, type AuthUser } from './auth.service';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    mustChangePassword: boolean;
    login: (login: string, senha: string) => Promise<void>;
    changePassword: (novaSenha: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [mustChangePassword, setMustChangePassword] = useState(false);

    // Verifica se já existe sessão válida ao carregar o app.
    useEffect(() => {
        AuthService.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    // Logout forçado (ex.: refresh token expirado) disparado pelo apiRequest.
    useEffect(() => {
        const onLogout = () => {
            setUser(null);
            setMustChangePassword(false);
        };
        window.addEventListener('auth:logout', onLogout);
        return () => window.removeEventListener('auth:logout', onLogout);
    }, []);

    const login = async (login: string, senha: string) => {
        const result = await AuthService.login(login, senha);
        if (result.mustChangePassword) {
            setUser(null);
            setMustChangePassword(true);
        } else {
            setMustChangePassword(false);
            setUser(result.user);
        }
    };

    const changePassword = async (novaSenha: string) => {
        const u = await AuthService.trocarSenhaObrigatoria(novaSenha);
        setMustChangePassword(false);
        setUser(u);
    };

    const logout = async () => {
        try {
            await AuthService.logout();
        } catch {
            // ignora erro; limpa o estado local de qualquer forma
        }
        setUser(null);
        setMustChangePassword(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, mustChangePassword, login, changePassword, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return ctx;
}
