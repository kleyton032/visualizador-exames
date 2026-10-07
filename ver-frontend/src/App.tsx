import { useState } from 'react';
import { Avatar, Button, ConfigProvider, Layout, Space, theme, Typography, App } from 'antd';
import { FileSearchOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import AtendimentoList from './modules/atendimentos/pages/AtendimentoList/AtendimentoList';
import PacienteList from './modules/pacientes/pages/PacienteList/PacienteList';
import Login from './modules/auth/pages/Login/Login';
import ResetPassword from './modules/auth/pages/ResetPassword/ResetPassword';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import type { Paciente } from './modules/pacientes/types/paciente.types';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const PRIMARY = '#4096ff';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'pacientes' | 'atendimentos'>('pacientes');
  const [selectedCdPaciente, setSelectedCdPaciente] = useState<string>('');

  // Estados persistentes da busca de pacientes
  const [pacienteData, setPacienteData] = useState<Paciente[]>([]);
  const [pacienteFilters, setPacienteFilters] = useState({ cd_paciente: '', nm_paciente: '' });
  const [pacienteHasSearched, setPacienteHasSearched] = useState(false);

  // Tratamento da rota de "Redefinir senha" (como não há react-router, verificamos direto)
  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f5ff' }}>
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
        background: 'linear-gradient(90deg, #4096ff 0%, #69b1ff 100%)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        boxShadow: '0 2px 10px rgba(64, 150, 255, 0.25)',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Space size={10}>
            <FileSearchOutlined style={{ color: '#fff', fontSize: 24 }} />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>Anexo Exames</Text>
          </Space>
          <Space size="middle">
            <Space size={8}>
              <Avatar size="small" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} icon={<UserOutlined />} />
              <Text style={{ color: '#fff' }}>
                {user.nome || user.login} <Text style={{ color: 'rgba(255,255,255,0.75)' }}>· {user.perfil}</Text>
              </Text>
            </Space>
            <Button ghost icon={<LogoutOutlined />} onClick={logout} size="small">
              Sair
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '0', background: '#f0f5ff' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
          minHeight: 'calc(100vh - 64px - 56px)'
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
        background: PRIMARY,
        color: '#fff',
        padding: '16px 0',
        fontSize: '13px'
      }}>
        Anexo Exames · FAV — Fundação Altino Ventura © {new Date().getFullYear()}
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
          colorPrimary: PRIMARY,
          colorInfo: PRIMARY,
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
