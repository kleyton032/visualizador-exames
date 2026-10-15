import React, { useState } from 'react';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../shared/auth/AuthContext';
import ForgotPassword from '../ForgotPassword/ForgotPassword';
import MedicoCadastro from '../MedicoCadastro/MedicoCadastro';

const { Text } = Typography;

const Login: React.FC = () => {
    const { login } = useAuth();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [showCadastro, setShowCadastro] = useState(false);

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
                background: 'linear-gradient(135deg, #4096ff 0%, #69b1ff 100%)',
                padding: 16,
            }}>
                <ForgotPassword onBack={() => setShowForgot(false)} />
            </div>
        );
    }

    if (showCadastro) {
        return <MedicoCadastro onBack={() => setShowCadastro(false)} />;
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #4096ff 0%, #69b1ff 100%)',
            padding: 16,
        }}>
            <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                <img src="/logo.png" alt="VISUALE" style={{ display: 'block', margin: '0 auto 16px', height: 72 }} />
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                        <Button type="link" onClick={() => setShowCadastro(true)} style={{ padding: 0 }}>
                            Primeiro acesso? Cadastre-se
                        </Button>
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
