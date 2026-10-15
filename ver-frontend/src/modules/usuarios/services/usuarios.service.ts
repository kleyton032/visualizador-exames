import { apiRequest } from '../../../shared/services/api';
import type {
    AtualizarUsuarioInput,
    AuditoriaRedefinicao,
    FiltroUsuarios,
    PaginadoUsuarios,
    RedefinicaoResultado,
    Usuario,
} from '../types/usuarios.types';

export class UsuariosService {
    static async listar(filtros: FiltroUsuarios): Promise<PaginadoUsuarios> {
        const params = new URLSearchParams();
        if (filtros.busca) params.set('busca', filtros.busca);
        if (filtros.perfil) params.set('perfil', filtros.perfil);
        if (filtros.situacao) params.set('situacao', filtros.situacao);
        if (filtros.page) params.set('page', String(filtros.page));
        if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize));

        const qs = params.toString();
        return apiRequest<PaginadoUsuarios>(`/usuarios${qs ? `?${qs}` : ''}`);
    }

    static async detalhar(id: number): Promise<Usuario> {
        const res = await apiRequest<{ usuario: Usuario }>(`/usuarios/${id}`);
        return res.usuario;
    }

    static async atualizar(id: number, input: AtualizarUsuarioInput): Promise<void> {
        await apiRequest<{ message: string }>(`/usuarios/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    static async redefinirSenha(id: number): Promise<RedefinicaoResultado> {
        return apiRequest<RedefinicaoResultado>(`/usuarios/${id}/redefinir-senha`, { method: 'POST' });
    }

    static async auditoria(id: number): Promise<AuditoriaRedefinicao[]> {
        const res = await apiRequest<{ registros: AuditoriaRedefinicao[] }>(`/usuarios/${id}/auditoria`);
        return res.registros;
    }
}
