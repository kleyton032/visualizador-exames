import React, { useEffect, useState } from 'react';
import { Modal, Button, App, Alert } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { AnexoService } from '../../services/anexo.service';
import { AuthService } from '../../../../shared/auth/auth.service';
import BloqueioExameModal from '../BloqueioExameModal/BloqueioExameModal';

interface ExameViewModalProps {
    visible: boolean;
    onClose: () => void;
    examId: number | null;
    examName: string | null;
    examStatus: string;
    examMotivoBloqueio?: string | null;
    examCdPaciente?: number;
    onStatusChange?: () => void;
}

const ExameViewModal: React.FC<ExameViewModalProps> = ({ visible, onClose, examId, examName, examStatus, examMotivoBloqueio, examCdPaciente, onStatusChange }) => {
    const { message, modal } = App.useApp();
    const [ready, setReady] = useState(false);
    const [bloqueioVisible, setBloqueioVisible] = useState(false);
    const fileUrl = examId ? `/api/anexos/view/${examId}` : '';

    // Garante access token válido antes de carregar o iframe (evita abrir o PDF com sessão expirada).
    useEffect(() => {
        if (visible && examId) {
            setReady(false);
            AuthService.me()
                .catch(() => {})
                .finally(() => setReady(true));
        }
    }, [visible, examId]);

    const handleDownload = () => {
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        }
    };

    const handleReativar = () => {
        if (!examId) return;

        modal.confirm({
            title: 'Ativar Exame',
            icon: <ReloadOutlined />,
            content: 'Tem certeza que deseja ativar novamente este exame?',
            okText: 'Sim, Ativar',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await AnexoService.reativar(examId);
                    message.success('Exame ativado com sucesso');
                    if (onStatusChange) onStatusChange();
                    onClose();
                } catch (error: any) {
                    console.error(error);
                    message.error(error?.message || 'Erro ao ativar exame');
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
                    onClick={examStatus === 'B' ? handleReativar : () => setBloqueioVisible(true)}
                    style={examStatus === 'B' ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
                >
                    {examStatus === 'B' ? 'Ativar Novamente' : 'Bloquear / Substituir'}
                </Button>,
                <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload} disabled={examStatus === 'B'}>
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
            {visible && examId && ready && (
                examStatus === 'B' ? (
                    <div style={{ padding: 24 }}>
                        <Alert
                            type="warning"
                            showIcon
                            message="Exame bloqueado"
                            description={(
                                <>
                                    <div>Este exame está bloqueado e não pode ser visualizado. Isso pode ocorrer quando o documento foi anexado incorretamente ao paciente.</div>
                                    {examMotivoBloqueio ? (
                                        <div style={{ marginTop: 8 }}>
                                            <strong>Motivo:</strong> {examMotivoBloqueio}
                                        </div>
                                    ) : null}
                                </>
                            )}
                        />
                    </div>
                ) : (
                    <iframe
                        src={fileUrl}
                        title={examName || 'Exame'}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                )
            )}

            <BloqueioExameModal
                visible={bloqueioVisible}
                onClose={() => setBloqueioVisible(false)}
                exame={{ id: examId ?? 0, nome: examName || 'Exame' }}
                cdPaciente={examCdPaciente}
                onSuccess={onStatusChange}
            />
        </Modal>
    );
};

export default ExameViewModal;
