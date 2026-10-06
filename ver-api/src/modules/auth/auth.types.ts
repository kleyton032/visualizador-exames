export type Perfil = 'ADMIN' | 'OPERADOR' | 'VISUALIZADOR';

export interface Usuario {
  ID: number;
  LOGIN: string;
  SENHA_HASH: string;
  NOME: string | null;
  EMAIL: string | null;
  PERFIL: Perfil;
  SITUACAO: string;
  ULTIMO_LOGIN?: Date;
}

export interface SafeUser {
  id: number;
  login: string;
  nome: string | null;
  email: string | null;
  perfil: Perfil;
}

export interface Sessao {
  ID: number;
  USUARIO_ID: number;
  REVOGADA: string;
  EXPIRA_EM?: Date;
}
