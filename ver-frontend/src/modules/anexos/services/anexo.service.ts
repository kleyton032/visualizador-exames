import { apiRequest } from '../../../shared/services/api';
import type { Exame } from '../types/anexo.types';

export class AnexoService {

    static async listExames() {
        return apiRequest<Exame[]>('/anexos/exames');
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

    static async inativar(id: number) {
        return apiRequest<void>(`/anexos/inativar/${id}`, {
            method: 'PATCH',
        });
    }
}
