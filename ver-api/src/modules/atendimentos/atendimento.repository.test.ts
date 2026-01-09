import { AtendimentoRepository } from './atendimento.repository';
import { OracleConnection } from '../../shared/database/OracleConnection';

// Mock OracleConnection structure
jest.mock('../../shared/database/OracleConnection', () => ({
    OracleConnection: {
        getInstance: jest.fn()
    }
}));

describe('AtendimentoRepository', () => {
    let repository: AtendimentoRepository;
    let mockExecute: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup the mock execute function
        mockExecute = jest.fn().mockResolvedValue({ rows: [] });

        // Configure getInstance to return an object with our mockExecute
        (OracleConnection.getInstance as jest.Mock).mockReturnValue({
            execute: mockExecute
        });

        repository = new AtendimentoRepository();
    });

    it('should find appointments by patient code for today', async () => {
        const cdPaciente = 123;
        await repository.findByPatientToday({ cd_paciente: cdPaciente });

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [query, binds] = mockExecute.mock.calls[0];

        expect(query).toContain('FROM atendime');
        expect(query).toContain('WHERE TRUNC(dt_atendimento) = TRUNC(SYSDATE)');
        expect(query).toContain('AND cd_paciente = :cd_paciente');
        expect(binds).toEqual({ cd_paciente: cdPaciente });
    });

    it('should find appointments by patient name for today', async () => {
        const nmPaciente = 'João';
        await repository.findByPatientToday({ nm_paciente: nmPaciente });

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [query, binds] = mockExecute.mock.calls[0];

        expect(query).toContain('FROM atendime');
        expect(query).toContain('WHERE TRUNC(dt_atendimento) = TRUNC(SYSDATE)');
        expect(query).toContain('AND nm_paciente LIKE :nm_paciente');
        expect(binds).toEqual({ nm_paciente: `%${nmPaciente}%` });
    });

    it('should not apply filters if none are provided', async () => {
        await repository.findByPatientToday({});

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [query, binds] = mockExecute.mock.calls[0];

        expect(query).toContain('WHERE TRUNC(dt_atendimento) = TRUNC(SYSDATE)');
        expect(query).not.toContain('AND cd_paciente =');
        expect(query).not.toContain('AND nm_paciente LIKE');
        expect(binds).toEqual({});
    });
});
