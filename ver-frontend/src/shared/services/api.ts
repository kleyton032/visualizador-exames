const BASE_URL = '/api';

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);

    // Detecta se o corpo é um FormData de forma robusta
    const isFormData = options?.body &&
        (options.body instanceof FormData ||
            (typeof options.body === 'object' && 'append' in options.body));

    if (isFormData) {
        headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const doFetch = () => fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    let response = await doFetch();

    // Access token expirado: tenta renovar via refresh token e repete a requisição.
    if (response.status === 401 && !endpoint.startsWith('/auth')) {
        if (!refreshPromise) {
            refreshPromise = refreshTokens().finally(() => {
                refreshPromise = null;
            });
        }
        const refreshed = await refreshPromise;
        if (refreshed) {
            response = await doFetch();
        } else {
            window.dispatchEvent(new Event('auth:logout'));
            throw new Error('Sessão expirada. Faça login novamente.');
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Request failed');
    }

    // Retorna vazio para 201 Created ou 204 No Content para evitar erro de parse JSON
    if (response.status === 201 || response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
    }

    return response.json();
}
