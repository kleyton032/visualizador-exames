import { useState } from 'react';
import { Button, ConfigProvider, Layout, Space, theme, Typography, App } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import AtendimentoList from './modules/atendimentos/pages/AtendimentoList/AtendimentoList';
import PacienteList from './modules/pacientes/pages/PacienteList/PacienteList';
import Login from './modules/auth/pages/Login/Login';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import type { Paciente } from './modules/pacientes/types/paciente.types';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'pacientes' | 'atendimentos'>('pacientes');
  const [selectedCdPaciente, setSelectedCdPaciente] = useState<string>('');

  // Estados persistentes da busca de pacientes
  const [pacienteData, setPacienteData] = useState<Paciente[]>([]);
  const [pacienteFilters, setPacienteFilters] = useState({ cd_paciente: '', nm_paciente: '' });
  const [pacienteHasSearched, setPacienteHasSearched] = useState(false);

  const handleVerAtendimentos = (cdPaciente: number) => {
    setSelectedCdPaciente(cdPaciente.toString());
    setCurrentView('atendimentos');
  };

  const handleBack = () => {
    setCurrentView('pacientes');
    setSelectedCdPaciente('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Text>Carregando...</Text>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#111eff',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>FAV - Anexo Exames</Text>
          <Space size="middle">
            <Text style={{ color: 'white' }}>
              {user.nome || user.login} ({user.perfil})
            </Text>
            <Button icon={<LogoutOutlined />} onClick={logout} size="small">
              Sair
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '0', background: '#f0f2f5' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
          minHeight: 'calc(100vh - 80px - 70px)'
        }}>
          {currentView === 'pacientes' ? (
            <PacienteList
              onVerAtendimentos={handleVerAtendimentos}
              data={pacienteData}
              setData={setPacienteData}
              filters={pacienteFilters}
              setFilters={setPacienteFilters}
              hasSearched={pacienteHasSearched}
              setHasSearched={setPacienteHasSearched}
            />
          ) : (
            <AtendimentoList initialCdPaciente={selectedCdPaciente} onBack={handleBack} />
          )}
        </div>
      </Content>

      <Footer style={{
        textAlign: 'center',
        background: '#111eff',
        color: 'white',
        padding: '20px 0',
        fontSize: '14px'
      }}>
        FAV - Fundação Altino Ventura © {new Date().getFullYear()} | Sistema de Visualização e Anexo de Exames
      </Footer>
    </Layout>
  );
}

function MainApp() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#111eff',
          borderRadius: 8,
        },
      }}
    >
      <App>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </App>
    </ConfigProvider>
  );
}

export default MainApp;
