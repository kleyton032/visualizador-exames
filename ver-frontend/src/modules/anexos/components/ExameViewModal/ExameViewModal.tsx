import React from 'react';
import { Modal, Button, App } from 'antd';
import { DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { AnexoService } from '../../services/anexo.service';

interface ExameViewModalProps {
    visible: boolean;
    onClose: () => void;
    examId: number | null;
    examName: string | null;
    examStatus: string;
    onStatusChange?: () => void;
}

const ExameViewModal: React.FC<ExameViewModalProps> = ({ visible, onClose, examId, examName, examStatus, onStatusChange }) => {
    const { message, modal } = App.useApp();
    const apiBaseUrl = 'http://localhost:3000/api';
    const fileUrl = examId ? `${apiBaseUrl}/anexos/view/${examId}` : '';

    const handleDownload = () => {
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        }
    };

    const handleUpdateStatus = () => {
        if (!examId) return;

        const isActivating = examStatus === 'B';
        const newStatus = isActivating ? 'A' : 'B';
        const actionLabel = isActivating ? 'Ativar' : 'Bloquear';

        modal.confirm({
            title: `${actionLabel} Exame`,
            icon: isActivating ? <ReloadOutlined /> : <ExclamationCircleOutlined />,
            content: `Tem certeza que deseja ${actionLabel.toLowerCase()} este exame?`,
            okText: `Sim, ${actionLabel}`,
            okType: isActivating ? 'primary' : 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await AnexoService.updateStatus(examId, newStatus);
                    message.success(`Exame ${isActivating ? 'ativado' : 'bloqueado'} com sucesso`);
                    if (onStatusChange) onStatusChange();
                    onClose();
                } catch (error) {
                    console.error(error);
                    message.error(`Erro ao ${actionLabel.toLowerCase()} exame`);
                }
            },
        });
    };

    return (
        <Modal
            title={`Visualizando Exame: ${examName || ''}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button
                    key="status"
                    danger={examStatus === 'A'}
                    type={examStatus === 'B' ? 'primary' : 'default'}
                    icon={examStatus === 'B' ? <ReloadOutlined /> : <DeleteOutlined />}
                    onClick={handleUpdateStatus}
                    style={examStatus === 'B' ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
                >
                    {examStatus === 'B' ? 'Ativar Novamente' : 'Bloquear Exame'}
                </Button>,
                <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
                    Download
                </Button>,
                <Button key="close" type="default" onClick={onClose}>
                    Fechar
                </Button>,
            ]}
            width="80%"
            style={{ top: 20 }}
            styles={{ body: { height: 'calc(100vh - 200px)', padding: 0 } }}

            destroyOnHidden
        >
            {visible && examId && (
                <iframe
                    src={fileUrl}
                    title={examName || 'Exame'}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                />
            )}
        </Modal>
    );
};

export default ExameViewModal;
