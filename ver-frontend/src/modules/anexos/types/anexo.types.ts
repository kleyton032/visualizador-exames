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

export interface AnexoPaciente {
    id: number;
    cd_paciente: number;
    cd_atendimento: number;
    id_exame: number;
    tipo_exame: string | null;
    nome_exame: string | null;
    olho: string | null;
    observacoes: string | null;
    nome_arquivo: string | null;
    content_type: string | null;
    tamanho_bytes: number;
    statusdoc: string;
    criado_em: string;
}

export interface AnexoPacientePage {
    data: AnexoPaciente[];
    total: number;
    page: number;
    pageSize: number;
}
