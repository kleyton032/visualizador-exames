import React, { useCallback, useEffect, useState } from 'react';
import {
    App,
    Button,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { HistoryOutlined, KeyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { UsuariosService } from '../../services/usuarios.service';
import type { AuditoriaRedefinicao, Usuario } from '../../types/usuarios.types';

const { Title, Text } = Typography;

const PERFIL_COR: Record<string, string> = {
    ADMIN: 'red',
    OPERADOR: 'blue',
    VISUALIZADOR: 'green',
};

function perfilLabel(perfil: string) {
    return { ADMIN: 'Admin', OPERADOR: 'Operador', VISUALIZADOR: 'Visualizador' }[perfil] || perfil;
}

const UsuariosList: React.FC = () => {
    const { message } = App.useApp();
    const [data, setData] = useState<Usuario[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);

    const [busca, setBusca] = useState('');
    const [perfil, setPerfil] = useState<string | undefined>();
    const [situacao, setSituacao] = useState<string | undefined>();

    const [editando, setEditando] = useState<Usuario | null>(null);
    const [form] = Form.useForm();

    const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

    const [auditando, setAuditando] = useState<Usuario | null>(null);
    const [auditoria, setAuditoria] = useState<AuditoriaRedefinicao[]>([]);
    const [auditoriaLoading, setAuditoriaLoading] = useState(false);

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await UsuariosService.listar({ busca, perfil, situacao, page, pageSize });
            setData(res.data);
            setTotal(res.total);
        } catch (error: any) {
            message.error(error.message || 'Erro ao listar usuários');
        } finally {
            setLoading(false);
        }
    }, [busca, perfil, situacao, page, pageSize, message]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const abrirEdicao = (usuario: Usuario) => {
        setEditando(usuario);
        form.setFieldsValue({
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
            situacao: usuario.situacao,
        });
    };

    const salvarEdicao = async () => {
        const valores = await form.validateFields();
        try {
            await UsuariosService.atualizar(editando!.id, valores);
            message.success('Usuário atualizado');
            setEditando(null);
            carregar();
        } catch (error: any) {
            message.error(error.message || 'Erro ao atualizar usuário');
        }
    };

    const confirmarRedefinicao = (usuario: Usuario) => {
        Modal.confirm({
            title: `Redefinir senha de ${usuario.login}?`,
            content: 'Será gerada uma senha temporária (válida por 24h) e o usuário deverá trocá-la no próximo acesso. Todas as sessões ativas serão encerradas.',
            okText: 'Gerar senha',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    const resultado = await UsuariosService.redefinirSenha(usuario.id);
                    setSenhaGerada(resultado.senhaTemporaria);
                } catch (error: any) {
                    message.error(error.message || 'Erro ao redefinir senha');
                }
            },
        });
    };

    const abrirAuditoria = async (usuario: Usuario) => {
        setAuditando(usuario);
        setAuditoriaLoading(true);
        try {
            const registros = await UsuariosService.auditoria(usuario.id);
            setAuditoria(registros);
        } catch (error: any) {
            message.error(error.message || 'Erro ao consultar auditoria');
        } finally {
            setAuditoriaLoading(false);
        }
    };

    const colunas = [
        { title: 'Login', dataIndex: 'login', key: 'login' },
        { title: 'Nome', dataIndex: 'nome', key: 'nome', render: (v: string | null) => v || '—' },
        { title: 'E-mail', dataIndex: 'email', key: 'email', render: (v: string | null) => v || '—' },
        {
            title: 'Perfil',
            dataIndex: 'perfil',
            key: 'perfil',
            render: (v: string) => <Tag color={PERFIL_COR[v] || 'default'}>{perfilLabel(v)}</Tag>,
        },
        {
            title: 'Situação',
            dataIndex: 'situacao',
            key: 'situacao',
            render: (v: string) => (v === 'A' ? <Tag color="green">Ativo</Tag> : <Tag color="red">Bloqueado</Tag>),
        },
        {
            title: 'Troca pendente',
            dataIndex: 'precisa_trocar_senha',
            key: 'precisa_trocar_senha',
            render: (v: boolean) => (v ? <Tag color="orange">Sim</Tag> : '—'),
        },
        {
            title: 'Ações',
            key: 'acoes',
            render: (_: unknown, registro: Usuario) => (
                <Space size={4}>
                    <Button size="small" onClick={() => abrirEdicao(registro)}>Editar</Button>
                    <Button size="small" icon={<KeyOutlined />} onClick={() => confirmarRedefinicao(registro)}>
                        Redefinir senha
                    </Button>
                    <Button size="small" icon={<HistoryOutlined />} onClick={() => abrirAuditoria(registro)}>
                        Auditoria
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={4}>Gerenciamento de Usuários</Title>

            <Space style={{ marginBottom: 16 }} wrap>
                <Input
                    placeholder="Buscar por login, nome ou e-mail"
                    prefix={<SearchOutlined />}
                    allowClear
                    style={{ width: 280 }}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onPressEnter={() => { setPage(1); carregar(); }}
                />
                <Select
                    placeholder="Perfil"
                    allowClear
                    style={{ width: 160 }}
                    value={perfil}
                    onChange={(v) => { setPerfil(v); setPage(1); }}
                    options={[
                        { value: 'ADMIN', label: 'Admin' },
                        { value: 'OPERADOR', label: 'Operador' },
                        { value: 'VISUALIZADOR', label: 'Visualizador' },
                    ]}
                />
                <Select
                    placeholder="Situação"
                    allowClear
                    style={{ width: 140 }}
                    value={situacao}
                    onChange={(v) => { setSituacao(v); setPage(1); }}
                    options={[
                        { value: 'A', label: 'Ativo' },
                        { value: 'B', label: 'Bloqueado' },
                    ]}
                />
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => { setPage(1); carregar(); }}>
                    Buscar
                </Button>
            </Space>

            <Table
                rowKey="id"
                loading={loading}
                columns={colunas}
                dataSource={data}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    showSizeChanger: true,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
                scroll={{ x: 900 }}
            />

            {/* Modal de edição */}
            <Modal
                title={`Editar ${editando?.login ?? ''}`}
                open={editando !== null}
                onOk={salvarEdicao}
                onCancel={() => setEditando(null)}
                okText="Salvar"
                cancelText="Cancelar"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="nome" label="Nome">
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="E-mail">
                        <Input />
                    </Form.Item>
                    <Form.Item name="perfil" label="Perfil" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { value: 'ADMIN', label: 'Admin' },
                                { value: 'OPERADOR', label: 'Operador' },
                                { value: 'VISUALIZADOR', label: 'Visualizador' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="situacao" label="Situação" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { value: 'A', label: 'Ativo' },
                                { value: 'B', label: 'Bloqueado' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal da senha temporária (exibida uma única vez) */}
            <Modal
                title="Senha temporária gerada"
                open={senhaGerada !== null}
                onCancel={() => setSenhaGerada(null)}
                footer={[
                    <Button key="copiar" type="primary" onClick={() => {
                        if (senhaGerada) navigator.clipboard?.writeText(senhaGerada);
                        message.success('Senha copiada');
                    }}>
                        Copiar
                    </Button>,
                    <Button key="fechar" onClick={() => setSenhaGerada(null)}>Fechar</Button>,
                ]}
            >
                <Text>Informe a senha abaixo ao usuário. Ela expira em 24 horas e será exibida apenas agora.</Text>
                <div style={{
                    margin: '16px 0',
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: 6,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: 18,
                }}>
                    {senhaGerada}
                </div>
            </Modal>

            {/* Modal de auditoria */}
            <Modal
                title={`Redefinições de ${auditando?.login ?? ''}`}
                open={auditando !== null}
                onCancel={() => setAuditando(null)}
                footer={[<Button key="fechar" onClick={() => setAuditando(null)}>Fechar</Button>]}
            >
                <Table
                    rowKey="id"
                    loading={auditoriaLoading}
                    dataSource={auditoria}
                    pagination={false}
                    size="small"
                    columns={[
                        { title: 'Administrador', dataIndex: 'admin_login', key: 'admin_login' },
                        { title: 'Data/hora', dataIndex: 'criado_em', key: 'criado_em', render: (v: string) => new Date(v).toLocaleString('pt-BR') },
                        { title: 'IP', dataIndex: 'ip', key: 'ip', render: (v: string | null) => v || '—' },
                    ]}
                />
            </Modal>
        </div>
    );
};

export default UsuariosList;
