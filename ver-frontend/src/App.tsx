import { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import AtendimentoList from './modules/atendimentos/pages/AtendimentoList/AtendimentoList';
import PacienteList from './modules/pacientes/pages/PacienteList/PacienteList';
import type { Paciente } from './modules/pacientes/types/paciente.types';
import './App.css';

function App() {
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
    </ConfigProvider>
  );
}

export default App;
