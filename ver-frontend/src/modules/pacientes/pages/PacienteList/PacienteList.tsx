import React, { useEffect, useState, type ChangeEvent } from 'react';
import { Table, Input, Card, Space, Typography, Layout, theme, Button, message } from 'antd';
import { SearchOutlined, UserOutlined, NumberOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { PacienteService } from '../../services/paciente.service';
import type { Paciente } from '../../types/paciente.types';
import type { Atendimento } from '../../../atendimentos/types/atendimento.types';
import AnexoUploadModal from '../../../anexos/components/AnexoUploadModal/AnexoUploadModal';

const { Title } = Typography;
const { Content } = Layout;

const PacienteList: React.FC = () => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Paciente[]>([]);
    const [filters, setFilters] = useState({
        cd_paciente: '',
        nm_paciente: ''
    });
    const [hasSearched, setHasSearched] = useState(false);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);

    const loadData = async () => {
        if (!filters.cd_paciente && !filters.nm_paciente) {
            message.warning('Informe o prontuário ou nome do paciente para pesquisar');
            return;
        }
        setLoading(true);
        try {
            const result = await PacienteService.list(filters);
            setData(result);
            setHasSearched(true);
        } catch (error: any) {
            console.error(error);
            message.error('Erro ao pesquisar pacientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // No auto-load
    }, []);

    const openUploadModal = (paciente: Paciente) => {
        setSelectedPaciente(paciente);
        setIsModalVisible(true);
    };

    const columns = [
        {
            title: 'Prontuário',
            dataIndex: 'CD_PACIENTE',
            key: 'paciente',
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
            render: (text: string) => text ? new Date(text).toLocaleDateString('pt-BR') : '-',
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 150,
            render: (_: any, record: Paciente) => (
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
                        <Title level={2} style={{ margin: 0 }}>Consulta de Pacientes</Title>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={loadData}
                            loading={loading}
                        >
                            Atualizar
                        </Button>
                    </header>

                    <Card bordered={true}>
                        <Space wrap size="middle">
                            <Input
                                placeholder="Prontuário"
                                prefix={<NumberOutlined />}
                                value={filters.cd_paciente}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('cd_paciente', e.target.value)}
                                onPressEnter={loadData}
                                style={{ width: 180 }}
                            />
                            <Input
                                placeholder="Nome do Paciente"
                                prefix={<UserOutlined />}
                                value={filters.nm_paciente}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('nm_paciente', e.target.value)}
                                onPressEnter={loadData}
                                style={{ width: 300 }}
                            />
                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={loadData}
                                loading={loading}
                            >
                                Pesquisar
                            </Button>
                        </Space>
                    </Card>

                    {hasSearched && (
                        <Table
                            columns={columns}
                            dataSource={data}
                            rowKey="CD_PACIENTE"
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
                onClose={() => setIsModalVisible(false)}
                atendimento={selectedPaciente ? { CD_PACIENTE: selectedPaciente.CD_PACIENTE, CD_ATENDIMENTO: 0 } as Atendimento : null}
            />
        </Layout>
    );
};

export default PacienteList;
