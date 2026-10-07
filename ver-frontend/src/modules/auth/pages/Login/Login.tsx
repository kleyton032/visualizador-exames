import React, { useState } from 'react';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../shared/auth/AuthContext';
import ForgotPassword from '../ForgotPassword/ForgotPassword';

const { Title, Text } = Typography;

const Login: React.FC = () => {
    const { login } = useAuth();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);

    const onFinish = async (values: { login: string; senha: string }) => {
        setLoading(true);
        try {
            await login(values.login, values.senha);
        } catch (error: any) {
            message.error(error.message || 'Erro ao entrar');
        } finally {
            setLoading(false);
        }
    };

    if (showForgot) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#111eff',
                padding: 16,
            }}>
                <ForgotPassword onBack={() => setShowForgot(false)} />
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
                <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
                    Anexo Exames
                </Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
                    Acesse com suas credenciais
                </Text>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="login"
                        rules={[{ required: true, message: 'Informe o usuário' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Usuário"
                            size="large"
                            autoComplete="username"
                        />
                    </Form.Item>

                    <Form.Item
                        name="senha"
                        rules={[{ required: true, message: 'Informe a senha' }]}
                        style={{ marginBottom: 12 }}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Senha"
                            size="large"
                            autoComplete="current-password"
                        />
                    </Form.Item>
                    
                    <div style={{ textAlign: 'right', marginBottom: 24 }}>
                        <Button type="link" onClick={() => setShowForgot(true)} style={{ padding: 0 }}>
                            Esqueci minha senha
                        </Button>
                    </div>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                            Entrar
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
