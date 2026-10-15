import React, { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../shared/auth/AuthContext';

const { Title, Text } = Typography;

const TrocaSenhaObrigatoria: React.FC = () => {
    const { changePassword, logout } = useAuth();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { novaSenha: string; confirmacao: string }) => {
        if (values.novaSenha !== values.confirmacao) {
            message.error('As senhas não coincidem');
            return;
        }
        setLoading(true);
        try {
            await changePassword(values.novaSenha);
            message.success('Senha alterada com sucesso');
        } catch (error: any) {
            message.error(error.message || 'Erro ao alterar a senha');
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
            <Card style={{ width: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                <Title level={4} style={{ textAlign: 'center', marginBottom: 4 }}>
                    Defina uma nova senha
                </Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                    Para continuar, você precisa alterar sua senha antes de acessar o sistema.
                </Text>

                <Alert
                    type="info"
                    showIcon
                    message="Regras da senha"
                    description="Mínimo de 10 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um símbolo."
                    style={{ marginBottom: 16 }}
                />

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="novaSenha"
                        label="Nova senha"
                        rules={[
                            { required: true, message: 'Informe a nova senha' },
                            { min: 10, message: 'A senha deve ter pelo menos 10 caracteres' },
                            {
                                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
                                message: 'Use maiúsculas, minúsculas, números e símbolos',
                            },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" />
                    </Form.Item>

                    <Form.Item
                        name="confirmacao"
                        label="Confirmar nova senha"
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
                        <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 8 }}>
                        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                            Salvar nova senha
                        </Button>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                        <Button type="link" onClick={logout}>Sair</Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default TrocaSenhaObrigatoria;
