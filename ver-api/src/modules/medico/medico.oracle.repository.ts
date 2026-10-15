import { OracleConnection } from '../../shared/database/OracleConnection';

export interface PrestadorMV {
  cd_usuario: number;
  nm_usuario: string | null;
  dt_nascimento: Date | null;
  sn_ativo: string | null;
  cd_prestador: number | null;
  nm_prestador: string | null;
  cpf: string | null;
  cd_tip_presta: number | null;
  tip_prestador: string | null;
}

/**
 * Consulta os prestadores vinculados ao MV (Oracle legado) para validar a
 * elegibilidade do autocadastro de médicos.
 */
export class MedicoOracleRepository {
  private db = OracleConnection.getInstance();

  async buscarPorCpf(cpfNormalizado: string): Promise<PrestadorMV[]> {
    // Obs.: a coluna u.sn_integra_onepass não existe na base atual do MV, por
    // isso o campo OnePass é apenas informativo e foi removido desta consulta.
    const sql = `
      SELECT u.cd_usuario,
             u.nm_usuario,
             p.dt_nascimento,
             u.sn_ativo,
             p.cd_prestador,
             p.nm_prestador,
             p.nr_cpf_cgc                              AS cpf,
             p.cd_tip_presta,
             p.cd_tip_presta || '-' || pa.nm_tip_presta AS tip_prestador
        FROM dbasgu.usuarios u
        LEFT JOIN dbamv.prestador p
               ON p.cd_prestador = u.cd_prestador
        LEFT JOIN dbamv.tip_presta pa
               ON p.cd_tip_presta = pa.cd_tip_presta
       WHERE REGEXP_REPLACE(p.nr_cpf_cgc, '[^0-9]', '') = :cpf
    `;

    const result = await this.db.execute<PrestadorMV>(sql, { cpf: cpfNormalizado });
    return result.rows ?? [];
  }
}
