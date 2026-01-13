import React, { useEffect, useState, type ChangeEvent } from 'react';
import { Table, Input, Card, Space, Typography, theme, Button, message } from 'antd';
import { SearchOutlined, UserOutlined, NumberOutlined, ReloadOutlined } from '@ant-design/icons';
import { PacienteService } from '../../services/paciente.service';
import type { Paciente } from '../../types/paciente.types';

const { Title } = Typography;

interface PacienteListProps {
    onVerAtendimentos: (cdPaciente: number) => void;
    data: Paciente[];
    setData: (data: Paciente[]) => void;
    filters: { cd_paciente: string; nm_paciente: string };
    setFilters: (filters: { cd_paciente: string; nm_paciente: string } | ((prev: any) => any)) => void;
    hasSearched: boolean;
    setHasSearched: (hasSearched: boolean) => void;
}

const PacienteList: React.FC<PacienteListProps> = ({
    onVerAtendimentos,
    data,
    setData,
    filters,
    setFilters,
    hasSearched,
    setHasSearched
}) => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false); // Mantemos o loading local

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
                    icon={<SearchOutlined />}
                    onClick={() => onVerAtendimentos(record.CD_PACIENTE)}
                >
                    Atendimentos
                </Button>
            )
        }
    ];

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div style={{ background: 'transparent' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Consulta de Pacientes</Title>
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
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(17, 30, 255, 0.08)',
                            border: '1px solid #d9d9d9'
                        }}
                    />
                )}
            </Space>
        </div>
    );
};

export default PacienteList;
