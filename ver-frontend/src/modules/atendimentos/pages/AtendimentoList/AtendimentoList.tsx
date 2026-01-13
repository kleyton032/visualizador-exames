import React, { useEffect, useState, type ChangeEvent } from 'react';
import { Table, Input, Card, Space, Typography, Layout, theme, Button, message } from 'antd';
import { SearchOutlined, UserOutlined, NumberOutlined, ReloadOutlined, UploadOutlined, ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { AtendimentoService } from '../../services/atendimento.service';
import type { Atendimento } from '../../types/atendimento.types';
import AnexoUploadModal from '../../../anexos/components/AnexoUploadModal/AnexoUploadModal';
import ExameViewModal from '../../../anexos/components/ExameViewModal/ExameViewModal';

const { Title } = Typography;
const { Content } = Layout;

interface AtendimentoListProps {
    initialCdPaciente?: string;
    onBack?: () => void;
}

const AtendimentoList: React.FC<AtendimentoListProps> = ({ initialCdPaciente, onBack }) => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Atendimento[]>([]);
    const [filters, setFilters] = useState({
        cd_paciente: '',
        nm_paciente: ''
    });
    const [hasSearched, setHasSearched] = useState(false);

    // Modal State - Upload
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);

    // Modal State - View
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [selectedExam, setSelectedExam] = useState<{ id: number, name: string } | null>(null);

    const loadData = async (cdPacienteOverride?: string) => {
        const cd_paciente = cdPacienteOverride || filters.cd_paciente;
        if (!cd_paciente && !filters.nm_paciente) {
            message.warning('Informe o prontuário ou nome do paciente para pesquisar');
            return;
        }
        setLoading(true);
        try {
            const result = await AtendimentoService.getToday({
                ...filters,
                cd_paciente: cd_paciente
            });
            setData(result);
            setHasSearched(true);
        } catch (error: any) {
            console.error(error);
            message.error('Erro ao carregar atendimentos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialCdPaciente) {
            setFilters(prev => ({ ...prev, cd_paciente: initialCdPaciente }));
            loadData(initialCdPaciente);
        }
    }, [initialCdPaciente]);

    const openUploadModal = (atendimento: Atendimento) => {
        setSelectedAtendimento(atendimento);
        setIsModalVisible(true);
    };

    const handleViewExam = (id: number, name: string) => {
        setSelectedExam({ id, name });
        setIsViewModalVisible(true);
    };

    const columns = [
        {
            title: 'Atendimento',
            dataIndex: 'CD_ATENDIMENTO',
            key: 'atendimento',
            width: 120,
        },
        {
            title: 'Data',
            dataIndex: 'DT_ATENDIMENTO',
            key: 'data',
            width: 120,
            render: (text: string) => text ? new Date(text).toLocaleDateString('pt-BR') : '-',
        },
        {
            title: 'Paciente',
            dataIndex: 'NM_PACIENTE',
            key: 'nome',
        },
        {
            title: 'Procedimento',
            dataIndex: 'DS_PROCEDIMENTO',
            key: 'procedimento',
            render: (text: string) => text || 'NÃO INFORMADO',
        },
        {
            title: 'Exames',
            key: 'exames',
            render: (_: any, record: Atendimento) => {
                if (!record.LISTA_EXAMES) return '-';

                const exames = record.LISTA_EXAMES.split('; ');
                return (
                    <Space size="small" wrap>
                        {exames.map((exameStr, index) => {
                            const [id, nome] = exameStr.split('|');
                            return (
                                <Button
                                    key={index}
                                    size="small"
                                    icon={<FilePdfOutlined />}
                                    onClick={() => handleViewExam(Number(id), nome)}
                                >
                                    {nome}
                                </Button>
                            );
                        })}
                    </Space>
                );
            }
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 150,
            render: (_: any, record: Atendimento) => (
                <Button
                    type="link"
                    icon={<UploadOutlined />}
                    onClick={() => openUploadModal(record)}
                >
                    Anexo
                </Button>
            )
        }
    ];

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
            <Content style={{ padding: '24px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
                            <Title level={2} style={{ margin: 0 }}>Histórico de Atendimentos</Title>
                        </Space>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={() => loadData()}
                            loading={loading}
                        >
                            Atualizar
                        </Button>
                    </header>

                    {!initialCdPaciente && (
                        <Card bordered={true}>
                            <Space wrap size="middle">
                                <Input
                                    placeholder="Prontuário"
                                    prefix={<NumberOutlined />}
                                    value={filters.cd_paciente}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('cd_paciente', e.target.value)}
                                    onPressEnter={() => loadData()}
                                    style={{ width: 180 }}
                                />
                                <Input
                                    placeholder="Nome do Paciente"
                                    prefix={<UserOutlined />}
                                    value={filters.nm_paciente}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('nm_paciente', e.target.value)}
                                    onPressEnter={() => loadData()}
                                    style={{ width: 300 }}
                                />
                                <Button
                                    type="primary"
                                    icon={<SearchOutlined />}
                                    onClick={() => loadData()}
                                    loading={loading}
                                >
                                    Pesquisar
                                </Button>
                            </Space>
                        </Card>
                    )}

                    {hasSearched && (
                        <Table
                            columns={columns}
                            dataSource={data}
                            rowKey="CD_ATENDIMENTO"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            bordered
                            style={{
                                background: token.colorBgContainer,
                                borderRadius: token.borderRadiusLG,
                                overflow: 'hidden'
                            }}
                        />
                    )}
                </Space>
            </Content>

            <AnexoUploadModal
                visible={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                    loadData(); // Refresh list after upload
                }}
                atendimento={selectedAtendimento}
            />

            <ExameViewModal
                visible={isViewModalVisible}
                onClose={() => setIsViewModalVisible(false)}
                examId={selectedExam?.id || null}
                examName={selectedExam?.name || null}
            />
        </Layout>
    );
};

export default AtendimentoList;
