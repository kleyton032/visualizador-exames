import React from 'react';
import { Modal, Button, App } from 'antd';
import { DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { AnexoService } from '../../services/anexo.service';

interface ExameViewModalProps {
    visible: boolean;
    onClose: () => void;
    examId: number | null;
    examName: string | null;
    onInactivate?: () => void;
}

const ExameViewModal: React.FC<ExameViewModalProps> = ({ visible, onClose, examId, examName, onInactivate }) => {
    const { message, modal } = App.useApp();
    const apiBaseUrl = 'http://localhost:3000/api';
    const fileUrl = examId ? `${apiBaseUrl}/anexos/view/${examId}` : '';

    const handleDownload = () => {
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        }
    };

    const handleInactivate = () => {
        if (!examId) return;

        modal.confirm({
            title: 'Inativar Exame',
            icon: <ExclamationCircleOutlined />,
            content: 'Tem certeza que deseja inativar este exame? Ele ficará marcado como inativo na lista.',
            okText: 'Sim, Inativar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await AnexoService.inativar(examId);
                    message.success('Exame inativado com sucesso');
                    if (onInactivate) onInactivate();
                    onClose();
                } catch (error) {
                    console.error(error);
                    message.error('Erro ao inativar exame');
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
                <Button key="inactivate" danger icon={<DeleteOutlined />} onClick={handleInactivate}>
                    Inativar Exame
                </Button>,
                <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
                    Download
                </Button>,
                <Button key="close" type="primary" onClick={onClose}>
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
