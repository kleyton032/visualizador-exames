import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExameViewModal from './ExameViewModal';

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
});

describe('ExameViewModal', () => {
    const defaultProps = {
        visible: true,
        onClose: vi.fn(),
        examId: 1,
        examName: 'Teste de Exame',
    };

    it('renders correctly when visible', () => {
        render(<ExameViewModal {...defaultProps} />);

        expect(screen.getByText('Visualizando Exame: Teste de Exame')).toBeInTheDocument();
    });

    it('renders the iframe when visible and has examId', () => {
        render(<ExameViewModal {...defaultProps} />);

        const iframe = screen.getByTitle('Teste de Exame');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', 'http://localhost:3000/api/anexos/view/1');
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
