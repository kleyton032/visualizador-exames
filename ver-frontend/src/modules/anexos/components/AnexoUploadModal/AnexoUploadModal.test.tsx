import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnexoUploadModal from './AnexoUploadModal';
import { AnexoService } from '../../services/anexo.service';

// Mock AnexoService
vi.mock('../../services/anexo.service', () => ({
    AnexoService: {
        listExames: vi.fn(),
        upload: vi.fn(),
    },
}));

// Mock by Ant Design
beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
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

    vi.clearAllMocks();
});

describe('AnexoUploadModal', () => {
    const defaultProps = {
        visible: true,
        onClose: vi.fn(),
        atendimento: {
            CD_ATENDIMENTO: 123,
            CD_PACIENTE: 456,
        },
    };

    it('renders correctly when open', async () => {
        vi.mocked(AnexoService.listExames).mockResolvedValue([]);

        render(<AnexoUploadModal {...defaultProps} />);

        expect(screen.getByText('Upload de Anexo - Paciente 456')).toBeInTheDocument();
        expect(screen.getByText('Tipo de Exame')).toBeInTheDocument();
        expect(screen.getByText('Lado (Olho)')).toBeInTheDocument();
        expect(screen.getByText('Observações')).toBeInTheDocument();
    });

    it('loads exams on open', async () => {
        const mockExames = [{ id: 1, tipo: 'RAIO-X' }];
        vi.mocked(AnexoService.listExames).mockResolvedValue(mockExames);

        render(<AnexoUploadModal {...defaultProps} />);

        await waitFor(() => {
            expect(AnexoService.listExames).toHaveBeenCalled();
        });
    });

    it('calls onClose when clicking cancel', async () => {
        vi.mocked(AnexoService.listExames).mockResolvedValue([]);
        render(<AnexoUploadModal {...defaultProps} />);

        const cancelButton = screen.getByText('Cancelar');
        cancelButton.click();

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows preview when a file is selected', async () => {
        vi.mocked(AnexoService.listExames).mockResolvedValue([]);
        const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

        render(<AnexoUploadModal {...defaultProps} />);

        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByTitle('Preview Upload')).toBeInTheDocument();
            expect(screen.getByTitle('Preview Upload')).toHaveAttribute('src', 'blob:test');
        });

        createSpy.mockRestore();
    });
});
