import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Alert, App, Typography } from 'antd';
import { AnexoService } from '../../services/anexo.service';
import type { AnexoPaciente } from '../../types/anexo.types';

const { Text } = Typography;
const { TextArea } = Input;

interface BloqueioExameModalProps {
    visible: boolean;
    onClose: () => void;
    exame: { id: number; nome: string } | null;
    /** Paciente do exame; usado para carregar os exames candidatos à substituição. */
    cdPaciente?: number;
    onSuccess?: () => void;
}

const formatarData = (valor: string) => {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR');
};

/**
 * Modal de bloqueio de exame. Exige o motivo (auditoria) e permite vincular,
 * opcionalmente, o exame correto (substituição) quando houver um anexo incorreto.
 * Os candidatos a substituto são carregados a partir dos exames ativos do paciente.
 */
const BloqueioExameModal: React.FC<BloqueioExameModalProps> = ({
    visible,
    onClose,
    exame,
    cdPaciente,
    onSuccess,
}) => {
    const { message } = App.useApp();
    const [motivo, setMotivo] = useState('');
    const [substitutoId, setSubstitutoId] = useState<number | undefined>(undefined);
    const [salvando, setSalvando] = useState(false);
    const [candidatos, setCandidatos] = useState<AnexoPaciente[]>([]);
    const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);

    useEffect(() => {
        if (visible) {
            setMotivo('');
            setSubstitutoId(undefined);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || !cdPaciente || !exame) {
            setCandidatos([]);
            return;
        }

        let ativo = true;
        setCarregandoCandidatos(true);
        AnexoService.listarPorPaciente(cdPaciente, { pageSize: 100 })
            .then((resposta) => {
                if (!ativo) return;
                setCandidatos(resposta.data.filter((item) => item.id !== exame.id && item.statusdoc === 'A'));
            })
            .catch(() => {
                if (ativo) setCandidatos([]);
            })
            .finally(() => {
                if (ativo) setCarregandoCandidatos(false);
            });

        return () => {
            ativo = false;
        };
    }, [visible, cdPaciente, exame]);

    const handleConfirmar = async () => {
        if (!exame) return;
        if (motivo.trim().length < 5) {
            message.warning('Informe o motivo do bloqueio (mínimo 5 caracteres).');
            return;
        }

        setSalvando(true);
        try {
            await AnexoService.bloquear(exame.id, motivo.trim(), substitutoId ?? null);
            message.success('Exame bloqueado com sucesso.');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            message.error(error?.message || 'Erro ao bloquear o exame.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            title={`Bloquear / Substituir exame: ${exame?.nome ?? ''}`}
            open={visible}
            onCancel={onClose}
            onOk={handleConfirmar}
            okText="Bloquear"
            okButtonProps={{ danger: true, loading: salvando }}
            cancelText="Cancelar"
            destroyOnHidden
        >
            <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="O exame bloqueado não poderá ser visualizado pelos médicos."
            />
            <Form layout="vertical">
                <Form.Item label="Motivo do bloqueio (obrigatório)" required>
                    <TextArea
                        rows={3}
                        maxLength={500}
                        showCount
                        value={motivo}
                        onChange={(event) => setMotivo(event.target.value)}
                        placeholder="Ex.: exame anexado ao paciente incorreto"
                    />
                </Form.Item>
                {cdPaciente !== undefined && (
                    <Form.Item label="Substituído por (opcional)">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            loading={carregandoCandidatos}
                            placeholder={
                                carregandoCandidatos
                                    ? 'Carregando exames do paciente…'
                                    : candidatos.length === 0
                                        ? 'Nenhum exame disponível do paciente'
                                        : 'Selecione o exame correto'
                            }
                            value={substitutoId}
                            onChange={(value) => setSubstitutoId(value)}
                            options={candidatos.map((item) => ({
                                value: item.id,
                                label: `${item.nome_exame || item.tipo_exame || 'Exame'} · ${formatarData(item.criado_em)}`,
                            }))}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Vincule outro exame ativo do mesmo paciente para registrar a substituição.
                        </Text>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

export default BloqueioExameModal;
