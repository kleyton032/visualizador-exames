const BASE_URL = 'http://localhost:3000/api';

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);

    // Detecta se o corpo é um FormData de forma robusta
    const isFormData = options?.body &&
        (options.body instanceof FormData ||
            (typeof options.body === 'object' && 'append' in options.body));

    if (isFormData) {
        headers.delete('Content-Type');
        console.log('apiRequest: FormData detectado, Content-Type removido para deixar o navegador definir o boundary');
    } else if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    console.log(`apiRequest: [${options?.method || 'GET'}] ${BASE_URL}${endpoint}`);
    console.log('apiRequest: Headers:', Object.fromEntries(headers.entries()));

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log(`apiRequest: Erro na resposta (${response.status}):`, errorText);
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
