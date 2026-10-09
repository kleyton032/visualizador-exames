import React, { useState, type ChangeEvent } from 'react';
import { Table, Input, Card, Space, Typography, Button, App, Tag, Empty } from 'antd';
import {
    SearchOutlined,
    UserOutlined,
    NumberOutlined,
    ReloadOutlined,
    EyeOutlined,
    DownloadOutlined,
    FilePdfOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import type { Paciente } from '../../../pacientes/types/paciente.types';
import { AnexoService } from '../../services/anexo.service';
import type { AnexoPaciente } from '../../types/anexo.types';
import ExameViewModal from '../../components/ExameViewModal/ExameViewModal';

const { Title, Text } = Typography;

interface ExamePacienteListProps {
    onBack?: () => void;
}

const ExamePacienteList: React.FC<ExamePacienteListProps> = ({ onBack }) => {
    const { message } = App.useApp();

    // Busca de pacientes
    const [loadingPacientes, setLoadingPacientes] = useState(false);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [filters, setFilters] = useState({ cd_paciente: '', nm_paciente: '' });
    const [hasSearched, setHasSearched] = useState(false);

    // Exames do paciente selecionado
    const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
    const [exames, setExames] = useState<AnexoPaciente[]>([]);
    const [loadingExames, setLoadingExames] = useState(false);

    // Visualização
    const [viewModal, setViewModal] = useState<{ id: number; name: string; status: string } | null>(null);

    const loadPacientes = async () => {
        if (filters.cd_paciente && filters.nm_paciente) {
            message.warning('Preencha Prontuário ou Nome do Paciente');
            return;
        }
        if (!filters.cd_paciente && !filters.nm_paciente) {
            message.warning('Informe o prontuário ou nome do paciente para pesquisar');
            return;
        }

        setLoadingPacientes(true);
        try {
            const result = await PacienteService.list(filters);
            setPacientes(result);
            setHasSearched(true);
        } catch (error) {
            console.error(error);
            message.error('Erro ao pesquisar pacientes');
        } finally {
            setLoadingPacientes(false);
        }
    };

    const selecionarPaciente = async (paciente: Paciente) => {
        setSelectedPaciente(paciente);
        setLoadingExames(true);
        try {
            const result = await AnexoService.listarPorPaciente(paciente.CD_PACIENTE);
            setExames(result.data);
        } catch (error) {
            console.error(error);
            message.error('Erro ao carregar exames do paciente');
            setExames([]);
        } finally {
            setLoadingExames(false);
        }
    };

    const voltarBusca = () => {
        setSelectedPaciente(null);
        setExames([]);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const abrirExame = (exame: AnexoPaciente) => {
        setViewModal({ id: exame.id, name: exame.nome_exame || exame.tipo_exame || 'Exame', status: exame.statusdoc });
    };

    const baixarExame = (exame: AnexoPaciente) => {
        window.open(`/api/anexos/download/${exame.id}`, '_blank');
    };

    const formatarData = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const pacienteColumns = [
        {
            title: 'Prontuário',
            dataIndex: 'CD_PACIENTE',
            key: 'prontuario',
            width: 120,
        },
        {
            title: 'Nome do Paciente',
            dataIndex: 'NM_PACIENTE',
            key: 'nome',
        },
        {
            title: 'Data de Nascimento',
            dataIndex: 'DT_NASCIMENTO',
            key: 'nascimento',
            width: 160,
            render: (text: string) => (text ? new Date(text).toLocaleDateString('pt-BR') : '-'),
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 140,
            render: (_: any, record: Paciente) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => selecionarPaciente(record)}
                >
                    Ver Exames
                </Button>
            ),
        },
    ];

    const exameColumns = [
        {
            title: 'Exame',
            key: 'exame',
            render: (_: any, record: AnexoPaciente) => (
                <Space size="small">
                    <FilePdfOutlined style={{ color: '#4096ff' }} />
                    <Text strong>{record.nome_exame || record.tipo_exame || 'Exame'}</Text>
                </Space>
            ),
        },
        {
            title: 'Olho',
            dataIndex: 'olho',
            key: 'olho',
            width: 80,
            render: (text: string | null) => text || '-',
        },
        {
            title: 'Atendimento',
            dataIndex: 'cd_atendimento',
            key: 'atendimento',
            width: 120,
        },
        {
            title: 'Data de Anexação',
            dataIndex: 'criado_em',
            key: 'data',
            width: 170,
            render: (text: string) => formatarData(text),
        },
        {
            title: 'Status',
            dataIndex: 'statusdoc',
            key: 'status',
            width: 110,
            render: (text: string) =>
                text === 'B'
                    ? <Tag color="error">Bloqueado</Tag>
                    : <Tag color="success">Ativo</Tag>,
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 180,
            render: (_: any, record: AnexoPaciente) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => abrirExame(record)}
                    >
                        Visualizar
                    </Button>
                    <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => baixarExame(record)}
                    >
                        Download
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ background: 'transparent' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size="middle">
                        {onBack && (
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={onBack}
                                type="text"
                                style={{ fontSize: '1.2rem' }}
                            />
                        )}
                        <Title level={4} style={{ margin: 0 }}>Exames Anexados por Paciente</Title>
                        {selectedPaciente && (
                            <Tag color="blue" style={{ marginLeft: 4 }}>
                                {selectedPaciente.NM_PACIENTE} · Pront. {selectedPaciente.CD_PACIENTE}
                            </Tag>
                        )}
                    </Space>
                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={() => (selectedPaciente ? selecionarPaciente(selectedPaciente) : loadPacientes())}
                        loading={selectedPaciente ? loadingExames : loadingPacientes}
                    >
                        Atualizar
                    </Button>
                </header>

                {!selectedPaciente && (
                    <Card variant="outlined">
                        <Space wrap size="middle">
                            <Input
                                placeholder="Prontuário"
                                prefix={<NumberOutlined />}
                                value={filters.cd_paciente}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('cd_paciente', e.target.value)}
                                onPressEnter={loadPacientes}
                                style={{ width: 180 }}
                            />
                            <Input
                                placeholder="Nome do Paciente"
                                prefix={<UserOutlined />}
                                value={filters.nm_paciente}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('nm_paciente', e.target.value)}
                                onPressEnter={loadPacientes}
                                style={{ width: 300 }}
                            />
                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={loadPacientes}
                                loading={loadingPacientes}
                            >
                                Pesquisar
                            </Button>
                        </Space>
                    </Card>
                )}

                {!selectedPaciente && hasSearched && (
                    <Card variant="outlined" styles={{ body: { padding: 0 } }}>
                        <Table
                            columns={pacienteColumns}
                            dataSource={pacientes}
                            rowKey="CD_PACIENTE"
                            loading={loadingPacientes}
                            pagination={{ pageSize: 10 }}
                            size="middle"
                        />
                    </Card>
                )}

                {selectedPaciente && (
                    <Card variant="outlined" styles={{ body: { padding: 0 } }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                            <Space size="middle">
                                <Button icon={<ArrowLeftOutlined />} onClick={voltarBusca}>
                                    Voltar para busca
                                </Button>
                                <Text type="secondary">
                                    {exames.length} exame(s) encontrado(s)
                                </Text>
                            </Space>
                        </div>
                        <Table
                            columns={exameColumns}
                            dataSource={exames}
                            rowKey="id"
                            loading={loadingExames}
                            pagination={{ pageSize: 10 }}
                            size="middle"
                            locale={{
                                emptyText: <Empty description="Nenhum exame encontrado para este paciente" />,
                            }}
                        />
                    </Card>
                )}
            </Space>

            <ExameViewModal
                visible={!!viewModal}
                onClose={() => setViewModal(null)}
                examId={viewModal?.id || null}
                examName={viewModal?.name || null}
                examStatus={viewModal?.status || 'A'}
                onStatusChange={() => {
                    if (selectedPaciente) selecionarPaciente(selectedPaciente);
                }}
            />
        </div>
    );
};

export default ExamePacienteList;
