import { ConfigProvider, theme } from 'antd';
import PacienteList from './modules/pacientes/pages/PacienteList/PacienteList';
import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <PacienteList />
    </ConfigProvider>
  );
}

export default App;
