import { apiRequest } from '../../../shared/services/api';
import type { Exame, AnexoPacientePage } from '../types/anexo.types';

export class AnexoService {

    static async listExames() {
        return apiRequest<Exame[]>('/anexos/exames');
    }

    static async listarPorPaciente(cdPaciente: number, filters?: { page?: number; pageSize?: number; status?: string }) {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));
        if (filters?.status) params.append('status', filters.status);

        const qs = params.toString();
        return apiRequest<AnexoPacientePage>(`/anexos/paciente/${cdPaciente}${qs ? `?${qs}` : ''}`);
    }

    static async upload(formData: FormData) {
        console.log('AnexoService.upload - Chamado');
        console.log('Dados do FormData:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`- ${key}: File (name: ${value.name}, size: ${value.size}, type: ${value.type})`);
            } else {
                console.log(`- ${key}: ${value}`);
            }
        }
        // Log para o corpo da requisição (FormData) antes de enviar
        console.log('AnexoService.upload: Enviando FormData como corpo da requisição.');

        return apiRequest<void>('/anexos/upload', {
            method: 'POST',
            body: formData,
            // Para FormData, o navegador geralmente define o Content-Type com o boundary.
            // Se você precisar de logs de cabeçalhos, eles seriam gerados dentro de apiRequest.
            headers: {}
        });
    }

    static async updateStatus(id: number, status: string) {
        return apiRequest<void>(`/anexos/status/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
