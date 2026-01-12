import { Request, Response } from 'express';
import { PacienteService } from './paciente.service';

export class PacienteController {
    private service = new PacienteService();

    list = async (req: Request, res: Response) => {
        try {
            const { nm_paciente, cd_paciente } = req.query;

            const patients = await this.service.listPatients(
                nm_paciente as string,
                cd_paciente ? Number(cd_paciente) : undefined
            );

            res.json(patients);
        } catch (error: any) {
            console.error('Error listing patients:', error);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    };
}
