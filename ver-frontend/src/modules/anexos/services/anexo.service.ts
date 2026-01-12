import { apiRequest } from '../../../shared/services/api';
import type { Exame } from '../types/anexo.types';

export class AnexoService {
    static async listExames() {
        return apiRequest<Exame[]>('/anexos/exames');
    }

    static async upload(formData: FormData) {
        return apiRequest<void>('/anexos/upload', {
            method: 'POST',
            body: formData,
            // Note: Do NOT set Content-Type header when sending FormData, 
            // the browser will set it automatically with the boundary.
            headers: {}
        });
    }
}
