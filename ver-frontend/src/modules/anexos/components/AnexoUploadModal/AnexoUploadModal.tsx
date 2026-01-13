import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Upload, Button, message, Space } from 'antd';
import { UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AnexoService } from '../../services/anexo.service';
import type { Exame } from '../../types/anexo.types';

interface AnexoUploadModalProps {
    visible: boolean;
    onClose: () => void;
    atendimento: {
        CD_ATENDIMENTO: number;
        CD_PACIENTE: number;
    } | null;
}

const AnexoUploadModal: React.FC<AnexoUploadModalProps> = ({ visible, onClose, atendimento }) => {
    const [form] = Form.useForm();
    const [exames, setExames] = useState<Exame[]>([]);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            loadExames();
        } else {
            cleanup();
            form.resetFields();
        }
    }, [visible]);

    const cleanup = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setFileList([]);
    };

    const loadExames = async () => {
        try {
            const result = await AnexoService.listExames();
            setExames(result);
        } catch (error) {
            console.error(error);
            message.error('Erro ao carregar lista de exames');
        }
    };

    const handleUpload = async () => {
        if (!atendimento) return;

        try {
            const values = await form.validateFields();

            if (fileList.length === 0) {
                message.warning('Por favor, selecione um arquivo');
                return;
            }

            setSubmitting(true);

            const formData = new FormData();
            formData.append('file', fileList[0].originFileObj as File);
            formData.append('cd_paciente', atendimento.CD_PACIENTE.toString());
            formData.append('cd_atendimento', atendimento.CD_ATENDIMENTO.toString());
            formData.append('id_exame', values.id_exame);
            formData.append('olho', values.olho);
            formData.append('observacoes', values.observacoes || '');
            formData.append('status', 'A'); // Default status

            // data field (YYYMMDD for filename)
            const now = new Date();
            const dateStr = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0');
            formData.append('data', dateStr);

            await AnexoService.upload(formData);

            message.success('Upload realizado com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            message.error('Erro ao realizar upload do arquivo');
        } finally {
            setSubmitting(false);
        }
    };

    const isPdf = fileList[0]?.type === 'application/pdf' || fileList[0]?.name?.toLowerCase().endsWith('.pdf');

    return (
        <Modal
            title={`Upload de Anexo - Paciente ${atendimento?.CD_PACIENTE}`}
            open={visible}
            onCancel={onClose}
            onOk={handleUpload}
            confirmLoading={submitting}
            okText="Enviar"
            cancelText="Cancelar"
            width="80%"
            style={{ top: 20 }}
            bodyStyle={{ height: 'calc(100vh - 200px)', padding: 0 }}
            destroyOnClose
        >
            <div style={{ display: 'flex', height: '100%' }}>
                {/* Lado Esquerdo: Formulário */}
                <div style={{
                    width: '350px',
                    padding: '24px',
                    borderRight: '1px solid #f0f0f0',
                    overflowY: 'auto'
                }}>
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ olho: 'AO' }}
                    >
                        <Form.Item
                            name="id_exame"
                            label="Tipo de Exame"
                            rules={[{ required: true, message: 'Selecione o tipo de exame' }]}
                        >
                            <Select
                                placeholder="Selecione o exame"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={exames.map(ex => ({ label: ex.nome_exame, value: ex.id }))}
                            />
                        </Form.Item>

                        <Form.Item
                            name="olho"
                            label="Lado (Olho)"
                            rules={[{ required: true, message: 'Selecione o olho' }]}
                        >
                            <Select options={[
                                { label: 'Direito (OD)', value: 'OD' },
                                { label: 'Esquerdo (OE)', value: 'OE' },
                                { label: 'Ambos (AO)', value: 'AO' }
                            ]} />
                        </Form.Item>

                        <Form.Item
                            name="observacoes"
                            label="Observações"
                        >
                            <Input.TextArea rows={3} placeholder="Dê detalhes sobre o exame, se necessário" />
                        </Form.Item>

                        <Form.Item label="Arquivo" required>
                            <Upload
                                onRemove={() => cleanup()}
                                beforeUpload={(file) => {
                                    cleanup();
                                    const url = URL.createObjectURL(file);
                                    setPreviewUrl(url);
                                    setFileList([file]);
                                    return false; // Prevent auto-upload
                                }}
                                fileList={fileList}
                                maxCount={1}
                                accept=".pdf,.jpg,.jpeg,.png"
                            >
                                <Button icon={<UploadOutlined />} block>Selecionar Arquivo</Button>
                            </Upload>
                            <Space style={{ marginTop: 8, color: '#888', fontSize: '12px' }}>
                                <InfoCircleOutlined />
                                <span>PDF, JPG, PNG e JPEG</span>
                            </Space>
                        </Form.Item>
                    </Form>
                </div>

                {/* Lado Direito: Preview */}
                <div style={{ flex: 1, background: '#f5f5f5', position: 'relative' }}>
                    {previewUrl ? (
                        isPdf ? (
                            <iframe
                                src={previewUrl}
                                title="Preview Upload"
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            />
                        ) : (
                            <div style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px'
                            }}>
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                            </div>
                        )
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#bfbfbf'
                        }}>
                            <UploadOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                            <p>Selecione um arquivo para ver a prévia aqui</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AnexoUploadModal;
