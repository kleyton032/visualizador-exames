import app from './app';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });
app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 PEP API rodando');
});
