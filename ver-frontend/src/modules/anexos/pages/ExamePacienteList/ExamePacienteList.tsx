import React, { useRef, useState, type ChangeEvent } from 'react';
import { Table, Input, Card, Space, Typography, Button, App, Tag, Empty, Checkbox, Modal, Tooltip } from 'antd';
import {
    SearchOutlined,
    UserOutlined,
    NumberOutlined,
    ReloadOutlined,
    EyeOutlined,
    FilePdfOutlined,
    ArrowLeftOutlined,
    SwapOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import type { Paciente } from '../../../pacientes/types/paciente.types';
import { AnexoService } from '../../services/anexo.service';
import type { AnexoPaciente } from '../../types/anexo.types';
import ExameViewModal from '../../components/ExameViewModal/ExameViewModal';
import { AuthService } from '../../../../shared/auth/auth.service';
import './ExamePacienteList.css';

const { Title, Text } = Typography;
const MAX_COMPARISON_EXAMS = 2;

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
    const [viewModal, setViewModal] = useState<{ id: number; name: string; status: string; motivoBloqueio?: string | null } | null>(null);
    const [selectedExamIds, setSelectedExamIds] = useState<React.Key[]>([]);
    const [comparisonExams, setComparisonExams] = useState<AnexoPaciente[]>([]);
    const [comparisonOpen, setComparisonOpen] = useState(false);
    const [comparisonReady, setComparisonReady] = useState(false);
    const [leftPanelPercent, setLeftPanelPercent] = useState(50);
    const comparisonContainerRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);

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
        setSelectedExamIds([]);
        setComparisonExams([]);
        setComparisonOpen(false);
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
        setSelectedExamIds([]);
        setComparisonExams([]);
        setComparisonOpen(false);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const abrirExame = (exame: AnexoPaciente) => {
        if (exame.statusdoc === 'B') {
            message.warning('Este exame está bloqueado e não pode ser visualizado.');
            return;
        }
        setViewModal({ id: exame.id, name: exame.nome_exame || exame.tipo_exame || 'Exame', status: exame.statusdoc, motivoBloqueio: exame.motivo_bloqueio ?? null });
    };

    const iniciarComparacao = () => {
        const selecionados = selectedExamIds
            .map((id) => exames.find((exame) => exame.id === id))
            .filter((exame): exame is AnexoPaciente => Boolean(exame));

        if (selecionados.length !== MAX_COMPARISON_EXAMS) return;
        setComparisonExams(selecionados);
        setComparisonReady(false);
        setComparisonOpen(true);
    };

    React.useEffect(() => {
        if (!comparisonOpen) return;
        let active = true;
        setComparisonReady(false);
        AuthService.me()
            .catch(() => undefined)
            .finally(() => {
                if (active) setComparisonReady(true);
            });
        return () => {
            active = false;
        };
    }, [comparisonOpen]);

    const iniciarRedimensionamento = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        isResizingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const redimensionarPaineis = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizingRef.current || !comparisonContainerRef.current) return;
        const bounds = comparisonContainerRef.current.getBoundingClientRect();
        const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
        setLeftPanelPercent(Math.min(75, Math.max(25, nextPercent)));
    };

    const finalizarRedimensionamento = () => {
        isResizingRef.current = false;
    };

    const rotuloExame = (exame: AnexoPaciente) => exame.nome_exame || exame.tipo_exame || 'Exame';

    const formatarDataCurta = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                    <Checkbox
                        aria-label={`Selecionar ${rotuloExame(record)}`}
                        checked={selectedExamIds.includes(record.id)}
                        disabled={record.statusdoc === 'B' || (!selectedExamIds.includes(record.id) && selectedExamIds.length >= MAX_COMPARISON_EXAMS)}
                        onChange={(event) => {
                            setSelectedExamIds((current) => event.target.checked
                                ? [...current, record.id]
                                : current.filter((id) => id !== record.id));
                        }}
                    />
                    <FilePdfOutlined style={{ color: '#4096ff' }} />
                    <Text strong>{rotuloExame(record)}</Text>
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
            render: (text: string, record: AnexoPaciente) =>
                text === 'B'
                    ? (
                        <Tooltip title={record.motivo_bloqueio || 'Exame bloqueado'}>
                            <Tag color="error">Bloqueado</Tag>
                        </Tooltip>
                    )
                    : <Tag color="success">Ativo</Tag>,
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 140,
            render: (_: any, record: AnexoPaciente) => (
                <Tooltip title={record.statusdoc === 'B' ? 'Exame bloqueado — não pode ser visualizado' : ''}>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        disabled={record.statusdoc === 'B'}
                        onClick={() => abrirExame(record)}
                    >
                        Visualizar
                    </Button>
                </Tooltip>
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
                            <Space size="middle" wrap>
                                <Button icon={<ArrowLeftOutlined />} onClick={voltarBusca}>
                                    Voltar para busca
                                </Button>
                                <Text type="secondary">
                                    {exames.length} exame(s) encontrado(s)
                                </Text>
                                <Button
                                    type="primary"
                                    icon={<SwapOutlined />}
                                    aria-label={`Comparar selecionados (${selectedExamIds.length}/${MAX_COMPARISON_EXAMS})`}
                                    disabled={selectedExamIds.length !== MAX_COMPARISON_EXAMS}
                                    onClick={iniciarComparacao}
                                >
                                    Comparar selecionados ({selectedExamIds.length}/{MAX_COMPARISON_EXAMS})
                                </Button>
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
                examMotivoBloqueio={viewModal?.motivoBloqueio ?? null}
                examCdPaciente={selectedPaciente?.CD_PACIENTE}
                onStatusChange={() => {
                    if (selectedPaciente) selecionarPaciente(selectedPaciente);
                }}
            />

            <Modal
                className="exame-comparison-modal"
                title={(
                    <Space>
                        <SwapOutlined />
                        <span>Comparação de exames</span>
                        {selectedPaciente && <Text type="secondary">· {selectedPaciente.NM_PACIENTE}</Text>}
                    </Space>
                )}
                open={comparisonOpen}
                onCancel={() => setComparisonOpen(false)}
                footer={null}
                width="96vw"
                centered
                destroyOnHidden
                styles={{
                    container: {
                        display: 'flex',
                        flexDirection: 'column',
                        height: '88vh',
                        maxHeight: 980,
                        padding: 16,
                    },
                    body: {
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        minHeight: 0,
                    },
                }}
            >
                <div className="exame-comparison-help">
                    Arraste o divisor para ajustar o espaço. Cada documento pode ser rolado independentemente.
                </div>
                <div className="exame-comparison-panels" ref={comparisonContainerRef}>
                    {comparisonExams.map((exame, index) => (
                        <section
                            className="exame-comparison-panel"
                            key={exame.id}
                            style={{ width: `calc(${index === 0 ? leftPanelPercent : 100 - leftPanelPercent}% - 6px)` }}
                        >
                            <header className="exame-comparison-panel-header">
                                <div className="exame-comparison-metadata">
                                    <Text strong ellipsis={{ tooltip: rotuloExame(exame) }}>{rotuloExame(exame)}</Text>
                                    <Text type="secondary">
                                        {formatarDataCurta(exame.criado_em)}
                                        {exame.olho ? ` · ${exame.olho}` : ''}
                                        {exame.cd_atendimento ? ` · Atend. ${exame.cd_atendimento}` : ''}
                                    </Text>
                                </div>
                                <Button
                                    type="text"
                                    aria-label={`Remover ${rotuloExame(exame)} da comparação`}
                                    icon={<CloseOutlined />}
                                    onClick={() => {
                                        const remaining = comparisonExams.filter((item) => item.id !== exame.id);
                                        setComparisonExams(remaining);
                                        setSelectedExamIds(remaining.map((item) => item.id));
                                        if (remaining.length < MAX_COMPARISON_EXAMS) setComparisonOpen(false);
                                    }}
                                />
                            </header>
                            {comparisonReady ? (
                                <iframe
                                    className="exame-comparison-frame"
                                    src={`/api/anexos/view/${exame.id}`}
                                    title={`${rotuloExame(exame)} - ${formatarDataCurta(exame.criado_em)}`}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="exame-comparison-loading">Preparando visualização segura…</div>
                            )}
                        </section>
                    ))}
                    <div
                        className="exame-comparison-divider"
                        role="separator"
                        aria-label="Redimensionar painéis de comparação"
                        aria-orientation="vertical"
                        style={{ left: `${leftPanelPercent}%` }}
                        onPointerDown={iniciarRedimensionamento}
                        onPointerMove={redimensionarPaineis}
                        onPointerUp={finalizarRedimensionamento}
                        onPointerCancel={finalizarRedimensionamento}
                    >
                        <span />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ExamePacienteList;
