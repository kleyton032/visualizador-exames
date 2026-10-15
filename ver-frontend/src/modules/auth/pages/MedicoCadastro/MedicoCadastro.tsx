import React, { useState } from 'react';
import { App, Button, Card, Form, Input, Steps, Typography } from 'antd';
import { IdcardOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../shared/auth/AuthContext';
import { AuthService } from '../../../../shared/auth/auth.service';

const { Title, Text } = Typography;

function formatarData(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

const MedicoCadastro: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { message } = App.useApp();
    const { finishSignup } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);

    const [cpf, setCpf] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [nome, setNome] = useState('');
    const [onepassIntegrado, setOnepassIntegrado] = useState(false);
    const [token, setToken] = useState('');

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [codigo, setCodigo] = useState('');

    const etapa1 = async () => {
        setLoading(true);
        try {
            const resultado = await AuthService.iniciarCadastroMedico(cpf, dataNascimento);
            setToken(resultado.token);
            setNome(resultado.nome);
            setOnepassIntegrado(resultado.onepassIntegrado);
            setStep(1);
        } catch (error: any) {
            message.error(error.message || 'Erro ao validar o cadastro');
        } finally {
            setLoading(false);
        }
    };

    const etapa2 = async () => {
        if (senha !== confirmacao) {
            message.error('As senhas não coincidem');
            return;
        }
        setLoading(true);
        try {
            await AuthService.enviarCodigoEmailMedico(token, email, senha, confirmacao);
            message.success('Código de confirmação enviado para o seu e-mail');
            setStep(2);
        } catch (error: any) {
            message.error(error.message || 'Erro ao enviar o código');
        } finally {
            setLoading(false);
        }
    };

    const etapa3 = async () => {
        setLoading(true);
        try {
            const user = await AuthService.concluirCadastroMedico(token, codigo);
            finishSignup(user);
            message.success('Cadastro concluído com sucesso');
        } catch (error: any) {
            message.error(error.message || 'Erro ao concluir o cadastro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #4096ff 0%, #69b1ff 100%)',
            padding: 16,
        }}>
            <Card style={{ width: 480, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                <Title level={4} style={{ textAlign: 'center', marginBottom: 4 }}>
                    Cadastro de médico
                </Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
                    Primeiro acesso: valide seu vínculo com o hospital.
                </Text>

                <Steps
                    current={step}
                    size="small"
                    style={{ marginBottom: 24 }}
                    items={[
                        { title: 'Identificação' },
                        { title: 'Dados de acesso' },
                        { title: 'Confirmação' },
                    ]}
                />

                {step === 0 && (
                    <Form layout="vertical" onFinish={etapa1}>
                        <Form.Item
                            label="CPF"
                            name="cpf"
                            rules={[
                                { required: true, message: 'Informe o CPF' },
                                { pattern: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, message: 'CPF inválido' },
                            ]}
                        >
                            <Input
                                prefix={<IdcardOutlined />}
                                placeholder="000.000.000-00"
                                size="large"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Data de nascimento"
                            name="dataNascimento"
                            rules={[{ required: true, message: 'Informe a data de nascimento' }]}
                        >
                            <Input
                                placeholder="DD/MM/AAAA"
                                size="large"
                                value={dataNascimento}
                                onChange={(e) => setDataNascimento(formatarData(e.target.value))}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 8 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Validar vínculo
                            </Button>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                            <Button type="link" onClick={onBack}>Voltar para o login</Button>
                        </Form.Item>
                    </Form>
                )}

                {step === 1 && (
                    <Form layout="vertical" onFinish={etapa2}>
                        <Text type="success" style={{ display: 'block', marginBottom: 12 }}>
                            Vínculo confirmado: {nome}
                            {onepassIntegrado ? ' (OnePass integrado)' : ''}
                        </Text>
                        <Form.Item
                            label="E-mail"
                            name="email"
                            rules={[
                                { required: true, message: 'Informe o e-mail' },
                                { type: 'email', message: 'E-mail inválido' },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="seu@email.com"
                                size="large"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Senha"
                            name="senha"
                            rules={[
                                { required: true, message: 'Informe a senha' },
                                { min: 10, message: 'A senha deve ter pelo menos 10 caracteres' },
                                {
                                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
                                    message: 'Use maiúsculas, minúsculas, números e símbolos',
                                },
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
                        </Form.Item>
                        <Form.Item
                            label="Confirmar senha"
                            name="confirmacao"
                            dependencies={['senha']}
                            rules={[
                                { required: true, message: 'Confirme a senha' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('senha') === value) return Promise.resolve();
                                        return Promise.reject(new Error('As senhas não coincidem'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 8 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Enviar código de confirmação
                            </Button>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                            <Button type="link" onClick={() => setStep(0)}>Voltar</Button>
                        </Form.Item>
                    </Form>
                )}

                {step === 2 && (
                    <Form layout="vertical" onFinish={etapa3}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            Enviamos um código de 6 dígitos para <b>{email}</b>. Informe-o abaixo.
                        </Text>
                        <Form.Item
                            label="Código de confirmação"
                            name="codigo"
                            rules={[{ required: true, message: 'Informe o código' }]}
                        >
                            <Input
                                prefix={<SafetyCertificateOutlined />}
                                placeholder="000000"
                                size="large"
                                maxLength={6}
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 8 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Concluir cadastro
                            </Button>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                            <Button type="link" onClick={() => setStep(1)}>Voltar</Button>
                        </Form.Item>
                    </Form>
                )}
            </Card>
        </div>
    );
};

export default MedicoCadastro;
