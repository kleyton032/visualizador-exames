import { useEffect, useState } from 'react';
import { Avatar, Button, ConfigProvider, Layout, Space, theme, Typography, App } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import AtendimentoList from './modules/atendimentos/pages/AtendimentoList/AtendimentoList';
import PacienteList from './modules/pacientes/pages/PacienteList/PacienteList';
import ExamePacienteList from './modules/anexos/pages/ExamePacienteList/ExamePacienteList';
import Login from './modules/auth/pages/Login/Login';
import ResetPassword from './modules/auth/pages/ResetPassword/ResetPassword';
import TrocaSenhaObrigatoria from './modules/auth/pages/TrocaSenhaObrigatoria/TrocaSenhaObrigatoria';
import UsuariosList from './modules/usuarios/pages/UsuariosList/UsuariosList';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import type { Paciente } from './modules/pacientes/types/paciente.types';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const PRIMARY = '#4096ff';

function AppContent() {
  const { user, loading, mustChangePassword, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'pacientes' | 'atendimentos' | 'exames' | 'usuarios'>('pacientes');
  const [selectedCdPaciente, setSelectedCdPaciente] = useState<string>('');

  // Estados persistentes da busca de pacientes
  const [pacienteData, setPacienteData] = useState<Paciente[]>([]);
  const [pacienteFilters, setPacienteFilters] = useState({ cd_paciente: '', nm_paciente: '' });
  const [pacienteHasSearched, setPacienteHasSearched] = useState(false);

  // Médicos (autocadastro) acessam somente a tela de exames.
  useEffect(() => {
    if (user?.perfil === 'MEDICO' && currentView === 'pacientes') {
      setCurrentView('exames');
    }
  }, [user, currentView]);

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

  if (mustChangePassword) {
    return <TrocaSenhaObrigatoria />;
  }

  const ehMedico = user.perfil === 'MEDICO';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#ffffff',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <img src="/logo.png" alt="VISUALE" style={{ height: 40, display: 'block' }} />
          <Space size={4} style={{ flex: 1, justifyContent: 'flex-start', marginLeft: 24 }}>
            {!ehMedico && (
              <Button
                type="text"
                onClick={() => { setCurrentView('pacientes'); setSelectedCdPaciente(''); }}
                style={{
                  color: currentView === 'pacientes' ? PRIMARY : '#595959',
                  fontWeight: currentView === 'pacientes' ? 700 : 400,
                  textDecoration: currentView === 'pacientes' ? 'underline' : 'none',
                }}
              >
                Pacientes
              </Button>
            )}
            <Button
              type="text"
              onClick={() => setCurrentView('exames')}
              style={{
                color: currentView === 'exames' ? PRIMARY : '#595959',
                fontWeight: currentView === 'exames' ? 700 : 400,
                textDecoration: currentView === 'exames' ? 'underline' : 'none',
              }}
            >
              Exames
            </Button>
            {user.perfil === 'ADMIN' && (
              <Button
                type="text"
                onClick={() => setCurrentView('usuarios')}
                style={{
                  color: currentView === 'usuarios' ? PRIMARY : '#595959',
                  fontWeight: currentView === 'usuarios' ? 700 : 400,
                  textDecoration: currentView === 'usuarios' ? 'underline' : 'none',
                }}
              >
                Usuários
              </Button>
            )}
          </Space>
          <Space size="middle">
            <Space size={8}>
              <Avatar size="small" style={{ backgroundColor: 'rgba(64, 150, 255, 0.15)', color: PRIMARY }} icon={<UserOutlined />} />
              <Text style={{ color: '#1f1f1f' }}>
                {user.nome || user.login} <Text style={{ color: '#8c8c8c' }}>· {user.perfil}</Text>
              </Text>
            </Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={logout} size="small" style={{ color: PRIMARY }}>
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
          ) : currentView === 'exames' ? (
            <ExamePacienteList onBack={ehMedico ? undefined : handleBack} />
          ) : currentView === 'usuarios' ? (
            <UsuariosList />
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
        VISUALE © {new Date().getFullYear()}
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
