export interface Exame {
    id: number;
    tipo: string;
}

export interface UploadAnexoData {
    cd_paciente: number;
    cd_atendimento: number;
    id_exame: number;
    data: string;
    olho: string;
    observacoes: string;
    status: string;
}
