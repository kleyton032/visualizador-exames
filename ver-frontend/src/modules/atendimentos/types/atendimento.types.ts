export interface Atendimento {
    CD_ATENDIMENTO: number;
    CD_PACIENTE: number;
    NM_PACIENTE: string;
    DT_PACIENTE?: string; // This might be used elsewhere
    DT_NASCIMENTO?: string;
    DT_ATENDIMENTO: string;
    DS_PROCEDIMENTO: string;
    LISTA_EXAMES?: string;
}
