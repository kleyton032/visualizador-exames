import { apiRequest } from '../../../shared/services/api';
import type { Paciente } from '../types/paciente.types';

export class PacienteService {
    static async list(filters: { nm_paciente?: string; cd_paciente?: string }) {
        const params = new URLSearchParams();
        if (filters.nm_paciente) params.append('nm_paciente', filters.nm_paciente);
        if (filters.cd_paciente) params.append('cd_paciente', filters.cd_paciente);

        return apiRequest<Paciente[]>(`/pacientes?${params.toString()}`);
    }
}
