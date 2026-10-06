import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExameViewModal from './ExameViewModal';
import { AuthService } from '../../../../shared/auth/auth.service';

// Mock do AuthService (usado para renovar o token antes de carregar o iframe)
vi.mock('../../../../shared/auth/auth.service', () => ({
    AuthService: {
        me: vi.fn(),
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

    vi.mocked(AuthService.me).mockResolvedValue({
        id: 1,
        login: 'operador',
        nome: 'Operador',
        email: null,
        perfil: 'ADMIN',
    });
});

describe('ExameViewModal', () => {
    const defaultProps = {
        visible: true,
        onClose: vi.fn(),
        examId: 1,
        examName: 'Teste de Exame',
        examStatus: 'A',
    };

    it('renders correctly when visible', () => {
        render(<ExameViewModal {...defaultProps} />);

        expect(screen.getByText('Visualizando Exame: Teste de Exame')).toBeInTheDocument();
    });

    it('renders the iframe when visible and has examId', async () => {
        render(<ExameViewModal {...defaultProps} />);

        const iframe = await waitFor(() => screen.getByTitle('Teste de Exame'));
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', '/api/anexos/view/1');
    });

    it('calls onClose when clicking Fechar button', () => {
        render(<ExameViewModal {...defaultProps} />);

        const closeButton = screen.getByText('Fechar');
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not render iframe when not visible', () => {
        render(<ExameViewModal {...defaultProps} visible={false} />);
        expect(screen.queryByTitle('Teste de Exame')).not.toBeInTheDocument();
    });
});

