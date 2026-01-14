import React from 'react';
import { Modal, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

interface ExameViewModalProps {
    visible: boolean;
    onClose: () => void;
    examId: number | null;
    examName: string | null;
}

const ExameViewModal: React.FC<ExameViewModalProps> = ({ visible, onClose, examId, examName }) => {
    const apiBaseUrl = 'http://localhost:3000/api';
    const fileUrl = examId ? `${apiBaseUrl}/anexos/view/${examId}` : '';

    const handleDownload = () => {
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        }
    };

    return (
        <Modal
            title={`Visualizando Exame: ${examName || ''}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
                    Abrir em nova aba / Download
                </Button>,
                <Button key="close" type="primary" onClick={onClose}>
                    Fechar
                </Button>,
            ]}
            width="80%"
            style={{ top: 20 }}
            styles={{ body: { height: 'calc(100vh - 200px)', padding: 0 } }}

            destroyOnClose
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
