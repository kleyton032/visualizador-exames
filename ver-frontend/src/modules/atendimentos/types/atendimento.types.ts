export interface Atendimento {
    CD_ATENDIMENTO: number;
    CD_PACIENTE: number;
    NM_PACIENTE: string;
    DT_ATENDIMENTO: string;
    DS_PROCEDIMENTO: string;
    LISTA_EXAMES?: string;
}
