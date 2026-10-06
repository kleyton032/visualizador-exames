declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        login: string;
        perfil: string;
        nome?: string;
      };
    }
  }
}

export {};
