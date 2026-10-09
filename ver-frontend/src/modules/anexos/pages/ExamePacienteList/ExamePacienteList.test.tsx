import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExamePacienteList from './ExamePacienteList';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { AnexoService } from '../../services/anexo.service';
import { AuthService } from '../../../../shared/auth/auth.service';

vi.mock('../../../pacientes/services/paciente.service', () => ({
    PacienteService: { list: vi.fn() },
}));

vi.mock('../../services/anexo.service', () => ({
    AnexoService: { listarPorPaciente: vi.fn() },
}));

vi.mock('../../../../shared/auth/auth.service', () => ({
    AuthService: { me: vi.fn().mockResolvedValue({ id: 1 }) },
}));

// Fornece um usuário operador para habilitar as ações de bloqueio.
vi.mock('../../../../shared/auth/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, login: 'operador', nome: 'Operador', email: null, perfil: 'OPERADOR' },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

// Mock do modal de visualização para não carregar iframe/AuthService no teste
vi.mock('../../components/ExameViewModal/ExameViewModal', () => ({
    default: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
        visible ? (
            <div data-testid="view-modal">
                <button onClick={onClose}>fechar-modal</button>
            </div>
        ) : null,
}));

beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    vi.mocked(PacienteService.list).mockResolvedValue([
        { CD_PACIENTE: 123, NM_PACIENTE: 'Maria Silva', DT_NASCIMENTO: '1990-01-01' },
    ]);

    vi.mocked(AnexoService.listarPorPaciente).mockResolvedValue({
        data: [
            {
                id: 10,
                cd_paciente: 123,
                cd_atendimento: 456,
                id_exame: 7,
                tipo_exame: 'Retinografia',
                nome_exame: 'Retinografia Colorida',
                olho: 'OE',
                observacoes: null,
                nome_arquivo: 'exame.pdf',
                content_type: 'application/pdf',
                tamanho_bytes: 152000,
                statusdoc: 'A',
                criado_em: '2026-10-09T10:30:00.000Z',
            },
            {
                id: 11,
                cd_paciente: 123,
                cd_atendimento: 450,
                id_exame: 8,
                tipo_exame: 'OCT',
                nome_exame: 'Tomografia de Coerência Óptica',
                olho: 'OD',
                observacoes: null,
                nome_arquivo: 'oct.pdf',
                content_type: 'application/pdf',
                tamanho_bytes: 182000,
                statusdoc: 'A',
                criado_em: '2026-09-09T10:30:00.000Z',
            },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
    });
});

describe('ExamePacienteList', () => {
    it('renderiza o título e os campos de busca', () => {
        render(<ExamePacienteList />);

        expect(screen.getByText('Exames Anexados por Paciente')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Prontuário')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Nome do Paciente')).toBeInTheDocument();
    });

    it('busca pacientes e lista os exames ao clicar em "Ver Exames"', async () => {
        render(<ExamePacienteList />);

        fireEvent.change(screen.getByPlaceholderText('Prontuário'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('Pesquisar'));

        await waitFor(() => expect(screen.getByText('Maria Silva')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ver Exames'));

        await waitFor(() => expect(screen.getByText('Retinografia Colorida')).toBeInTheDocument());
        expect(AnexoService.listarPorPaciente).toHaveBeenCalledWith(123);
    });

    it('compara dois exames selecionados em painéis lado a lado', async () => {
        render(<ExamePacienteList />);

        fireEvent.change(screen.getByPlaceholderText('Prontuário'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('Pesquisar'));
        await waitFor(() => expect(screen.getByText('Maria Silva')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Ver Exames'));

        const firstSelection = await screen.findByRole('checkbox', { name: 'Selecionar Retinografia Colorida' });
        const secondSelection = screen.getByRole('checkbox', { name: 'Selecionar Tomografia de Coerência Óptica' });
        fireEvent.click(firstSelection);
        fireEvent.click(secondSelection);
        fireEvent.click(screen.getByRole('button', { name: 'Comparar selecionados (2/2)' }));

        expect(await screen.findByTitle('Retinografia Colorida - 09/10/2026')).toHaveAttribute('src', '/api/anexos/view/10');
        expect(screen.getByTitle('Tomografia de Coerência Óptica - 09/09/2026')).toHaveAttribute('src', '/api/anexos/view/11');
        expect(screen.getByRole('separator', { name: 'Redimensionar painéis de comparação' })).toBeInTheDocument();
        expect(AuthService.me).toHaveBeenCalled();
    });

    it('limita a seleção a dois exames', async () => {
        vi.mocked(AnexoService.listarPorPaciente).mockResolvedValueOnce({
            data: [
                { id: 10, nome_exame: 'Exame A', tipo_exame: null, cd_paciente: 123, cd_atendimento: 1, id_exame: 1, olho: null, observacoes: null, nome_arquivo: null, content_type: 'application/pdf', tamanho_bytes: 10, statusdoc: 'A', criado_em: '2026-10-09' },
                { id: 11, nome_exame: 'Exame B', tipo_exame: null, cd_paciente: 123, cd_atendimento: 1, id_exame: 1, olho: null, observacoes: null, nome_arquivo: null, content_type: 'application/pdf', tamanho_bytes: 10, statusdoc: 'A', criado_em: '2026-10-08' },
                { id: 12, nome_exame: 'Exame C', tipo_exame: null, cd_paciente: 123, cd_atendimento: 1, id_exame: 1, olho: null, observacoes: null, nome_arquivo: null, content_type: 'application/pdf', tamanho_bytes: 10, statusdoc: 'A', criado_em: '2026-10-07' },
            ],
            total: 3,
            page: 1,
            pageSize: 20,
        });
        render(<ExamePacienteList />);

        fireEvent.change(screen.getByPlaceholderText('Prontuário'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('Pesquisar'));
        await waitFor(() => expect(screen.getByText('Maria Silva')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Ver Exames'));

        fireEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar Exame A' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Exame B' }));
        expect(screen.getByRole('checkbox', { name: 'Selecionar Exame C' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Comparar selecionados (2/2)' })).toBeEnabled();
    });

    it('não permite visualizar nem comparar um exame bloqueado', async () => {
        vi.mocked(AnexoService.listarPorPaciente).mockResolvedValueOnce({
            data: [
                { id: 20, nome_exame: 'Exame Bloqueado', tipo_exame: null, cd_paciente: 123, cd_atendimento: 1, id_exame: 1, olho: null, observacoes: null, nome_arquivo: 'x.pdf', content_type: 'application/pdf', tamanho_bytes: 10, statusdoc: 'B', criado_em: '2026-10-09' },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
        });
        render(<ExamePacienteList />);

        fireEvent.change(screen.getByPlaceholderText('Prontuário'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('Pesquisar'));
        await waitFor(() => expect(screen.getByText('Maria Silva')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Ver Exames'));

        await waitFor(() => expect(screen.getByText('Exame Bloqueado')).toBeInTheDocument());

        expect(screen.getByRole('button', { name: /Visualizar/ })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Selecionar Exame Bloqueado' })).toBeDisabled();
    });
});
