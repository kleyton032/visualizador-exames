import React, { useState, useEffect } from 'react';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ResetPassword: React.FC = () => {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            setToken(urlToken);
        } else {
            message.error('Token de recuperação não encontrado na URL.');
        }
    }, [message]);

    const onFinish = async (values: any) => {
        if (!token) {
            message.error('Token inválido');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, novaSenha: values.novaSenha }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao redefinir senha');
            }
            
            setSucesso(true);
            message.success('Senha redefinida com sucesso!');
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const irParaLogin = () => {
        window.location.href = '/';
    };

    if (!token && !sucesso) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#111eff' }}>
                <Card style={{ width: 380, textAlign: 'center' }}>
                    <Text type="danger">Token de recuperação inválido ou ausente.</Text>
                    <Button block style={{ marginTop: 20 }} onClick={irParaLogin}>Voltar para o Login</Button>
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#111eff',
            padding: 16,
        }}>
            <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                    Criar Nova Senha
                </Title>
                
                {!sucesso ? (
                    <Form layout="vertical" onFinish={onFinish}>
                        <Form.Item
                            name="novaSenha"
                            rules={[
                                { required: true, message: 'Informe a nova senha' },
                                { min: 8, message: 'A senha deve ter pelo menos 8 caracteres' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Nova Senha"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmarSenha"
                            dependencies={['novaSenha']}
                            rules={[
                                { required: true, message: 'Confirme a nova senha' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('novaSenha') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('As senhas não coincidem'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Confirmar Nova Senha"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Redefinir Senha
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Text type="success" style={{ fontSize: 16, display: 'block', marginBottom: 20 }}>
                            Sua senha foi redefinida com sucesso! Você já pode acessar o sistema.
                        </Text>
                        <Button type="primary" block size="large" onClick={irParaLogin}>
                            Fazer Login
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ResetPassword;
