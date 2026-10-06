import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { config } from './shared/config';

import atendimentoRoutes from './modules/atendimentos/atendimento.routes';
import anexoRoutes from './modules/anexos/anexo.routes';
import pacienteRoutes from './modules/pacientes/paciente.routes';
import authRoutes from './modules/auth/auth.routes';

import { authMiddleware } from './shared/middlewares/auth.middleware';
import { errorHandler } from './shared/middlewares/errorHandler';

const app = express();

// CSP com permissão para blob: (prévia de upload no frontend usa URL.createObjectURL).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ["'self'", 'blob:'],
    },
  },
}));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Rotas públicas de autenticação
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/atendimentos', authMiddleware, atendimentoRoutes);
app.use('/api/pacientes', authMiddleware, pacienteRoutes);
app.use('/api/anexos', anexoRoutes); // proteção individual em cada rota

app.use(errorHandler);

export default app;
