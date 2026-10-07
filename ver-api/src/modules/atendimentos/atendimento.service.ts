import { AtendimentoRepository } from './atendimento.repository';
import { AnexoRepository } from '../anexos/anexo.repository';

export class AtendimentoService {
  private repo = new AtendimentoRepository();
  private anexoRepo = new AnexoRepository();

  async getTodayAppointments(nmPaciente?: string, cdPaciente?: number) {
    const atendimentos =
      (await this.repo.findByPatientToday({
        nm_paciente: nmPaciente,
        cd_paciente: cdPaciente,
      })) ?? [];

    const cds = atendimentos
      .map((a: any) => Number(a.CD_ATENDIMENTO))
      .filter((n: number) => !Number.isNaN(n) && n > 0);

    let anexos: any[] = [];
    if (cds.length > 0) {
      anexos = await this.anexoRepo.listarPorAtendimentos(cds);
    }

    const porAtendimento = new Map<number, string[]>();
    for (const anexo of anexos) {
      const lista = porAtendimento.get(anexo.atendimento) || [];
      lista.push(`${anexo.id}|${anexo.nomeExame}|${anexo.statusdoc}`);
      porAtendimento.set(anexo.atendimento, lista);
    }

    return atendimentos.map((a: any) => ({
      ...a,
      LISTA_EXAMES: (porAtendimento.get(Number(a.CD_ATENDIMENTO)) || []).join('; ') || null,
    }));
  }
}
