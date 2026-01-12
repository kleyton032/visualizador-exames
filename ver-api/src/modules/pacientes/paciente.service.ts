import { PacienteRepository } from './paciente.repository';

export class PacienteService {
    private repo = new PacienteRepository();

    async listPatients(nmPaciente?: string, cdPaciente?: number) {
        return this.repo.findAll({ nm_paciente: nmPaciente, cd_paciente: cdPaciente });
    }
}
