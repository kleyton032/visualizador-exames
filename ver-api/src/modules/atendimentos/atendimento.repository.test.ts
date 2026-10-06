import { AtendimentoRepository } from './atendimento.repository';
import { OracleConnection } from '../../shared/database/OracleConnection';

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

        
        mockExecute = jest.fn().mockResolvedValue({ rows: [] });

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

        expect(query).toContain('SELECT');
        expect(query).toContain('a.cd_atendimento');
        expect(query).toContain('ap.nm_paciente');
        expect(query).toContain('FROM atendime a');
        expect(query).toContain('JOIN paciente ap ON a.cd_paciente = ap.cd_paciente');
        expect(query).toContain('LEFT JOIN procedimento_sus p ON a.cd_procedimento = p.cd_procedimento');
        expect(query).toContain('ORDER BY a.dt_atendimento DESC, a.cd_atendimento DESC');
        expect(query).toContain('a.cd_paciente = :cd_paciente');
        expect(binds).toEqual({ cd_paciente: cdPaciente });
    });

    it('should find appointments by patient name for today', async () => {
        const nmPaciente = 'João';
        await repository.findByPatientToday({ nm_paciente: nmPaciente });

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [query, binds] = mockExecute.mock.calls[0];

        expect(query).toContain('JOIN paciente ap');
        expect(query).toContain('UPPER(ap.nm_paciente) LIKE UPPER(:nm_paciente)');
        expect(binds).toEqual({ nm_paciente: `%${nmPaciente}%` });
    });

    it('should not apply filters if none are provided only base query', async () => {
        await repository.findByPatientToday({});

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [query, binds] = mockExecute.mock.calls[0];

        expect(query).toContain('ORDER BY a.dt_atendimento DESC, a.cd_atendimento DESC');
        expect(query).not.toContain('a.cd_paciente = :');
        expect(query).not.toContain('UPPER(ap.nm_paciente) LIKE');
        expect(binds).toEqual({});
    });
});
