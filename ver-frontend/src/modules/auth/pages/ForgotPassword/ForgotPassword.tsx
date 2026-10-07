import React, { useState } from 'react';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ForgotPasswordProps {
    onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    const onFinish = async (values: { email: string }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: values.email }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao processar solicitação');
            }
            
            setSucesso(true);
            message.success(data.message || 'Instruções enviadas com sucesso!');
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={onBack}
                style={{ marginBottom: 16, padding: 0 }}
            >
                Voltar
            </Button>
            
            <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
                Recuperar Senha
            </Title>
            
            {!sucesso ? (
                <>
                    <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
                        Informe seu e-mail cadastrado para receber as instruções de recuperação.
                    </Text>

                    <Form layout="vertical" onFinish={onFinish}>
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Informe o e-mail' },
                                { type: 'email', message: 'E-mail inválido' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="E-mail"
                                size="large"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Enviar Link de Recuperação
                            </Button>
                        </Form.Item>
                    </Form>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text type="success" style={{ fontSize: 16, display: 'block', marginBottom: 20 }}>
                        Se o e-mail existir em nossa base, você receberá um link com as instruções para redefinir sua senha em instantes.
                    </Text>
                    <Button block onClick={onBack}>
                        Voltar para o Login
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default ForgotPassword;
