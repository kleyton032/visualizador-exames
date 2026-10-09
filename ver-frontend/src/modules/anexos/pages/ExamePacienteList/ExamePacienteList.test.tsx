import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExamePacienteList from './ExamePacienteList';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { AnexoService } from '../../services/anexo.service';

vi.mock('../../../pacientes/services/paciente.service', () => ({
    PacienteService: { list: vi.fn() },
}));

vi.mock('../../services/anexo.service', () => ({
    AnexoService: { listarPorPaciente: vi.fn() },
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
});
