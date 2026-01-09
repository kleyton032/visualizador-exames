import express from 'express';
import cors from 'cors';
//import pacienteRoutes from './modules/pacientes/paciente.routes';
import atendimentoRoutes from './modules/atendimentos/atendimento.routes';
import documentoRoutes from './modules/documentos/documento.routes';
import anexoRoutes from './modules/anexos/anexo.routes';

const app = express();
app.use(cors());
app.use(express.json());

//app.use('/api/pacientes', pacienteRoutes);
app.use('/api/atendimentos', atendimentoRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/anexos', anexoRoutes);

export default app;
