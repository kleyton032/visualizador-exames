import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthService, type AuthUser } from './auth.service';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (login: string, senha: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Verifica se já existe sessão válida ao carregar o app.
    useEffect(() => {
        AuthService.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    // Logout forçado (ex.: refresh token expirado) disparado pelo apiRequest.
    useEffect(() => {
        const onLogout = () => setUser(null);
        window.addEventListener('auth:logout', onLogout);
        return () => window.removeEventListener('auth:logout', onLogout);
    }, []);

    const login = async (login: string, senha: string) => {
        const u = await AuthService.login(login, senha);
        setUser(u);
    };

    const logout = async () => {
        try {
            await AuthService.logout();
        } catch {
            // ignora erro; limpa o estado local de qualquer forma
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
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
