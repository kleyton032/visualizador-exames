# Roteiro de Testes de Usabilidade — V.E.R (VISUALE)

> **Objetivo:** validar, passo a passo, as funcionalidades e a experiência de uso
> do sistema, com foco em autenticação, perfis de acesso, gerenciamento de
> usuários, autocadastro de médicos e consulta de exames.
> **Status:** documento de apoio para homologação manual.

---

## 0. Preparação do ambiente

| Item | Descrição |
|---|---|
| URL | `http://localhost:8080` (ou `http://192.168.5.75:8080`) |
| Banco | PostgreSQL (ver-api) + Oracle MV (legado) acessível |
| Perfis | `ADMIN`, `OPERADOR`, `VISUALIZADOR`, `MEDICO` |

**Contas necessárias para o teste:**

- [ ] Um usuário **ADMIN** (ex.: `admin`).
- [ ] Um usuário **OPERADOR**.
- [ ] Um usuário **VISUALIZADOR** (opcional, para comparação de acesso).
- [ ] Um **CPF de médico elegível** no Oracle MV (ativo, com prestador vinculado e data de nascimento conhecida).

**Dados de teste:**

- [ ] CPF do médico: `____________________`
- [ ] Data de nascimento do médico: `____/____/________`
- [ ] E-mail válido para receber o código de confirmação: `____________________`

> **Registro de resultado:** ao final de cada cenário, marque **PASSOU** ou
> **FALHOU** e anote observações na tabela da seção 10.

---

## 1. Identidade visual e navegação

**Objetivo:** confirmar a identidade visual (VISUALE) e a navegação por perfil.

**Passos:**
1. Abrir a aplicação e observar a tela de login.
2. Verificar a logo **VISUALE** no topo do card de login.
3. Fazer login como **ADMIN**.
4. No cabeçalho, verificar a logo no **canto superior esquerdo**.
5. Verificar os itens de navegação visíveis.
6. Fazer login como **MEDICO** e repetir o passo 4/5.

**Resultado esperado:**
- Logo visível na tela de login, no cabeçalho e no favicon da aba.
- ADMIN vê: `Pacientes`, `Exames`, `Usuários`.
- MEDICO vê **somente** `Exames`.
- Rodapé exibe "VISUALE © ano".

**Critério de aprovação:** logo e itens de navegação corretos por perfil.

---

## 2. Login e Logout

**Objetivo:** validar autenticação por login/e-mail/CPF e encerramento de sessão.

**Passos:**
1. Tentar login com credenciais inválidas.
2. Tentar login com usuário **bloqueado** (se houver conta de teste).
3. Fazer login com usuário **ADMIN** (login interno).
4. Fazer login de um **MEDICO** usando o **CPF** (com e sem máscara).
5. Fazer login do mesmo médico usando o **e-mail**.
6. Clicar em **Sair** e tentar acessar a tela anterior (deve voltar ao login).

**Resultado esperado:**
- Credenciais inválidas → mensagem "Credenciais inválidas".
- Usuário bloqueado → mensagem de conta bloqueada.
- Login por CPF (com/sem máscara) e por e-mail funcionam.
- Após sair, as áreas protegidas não ficam acessíveis.

**Critério de aprovação:** todos os casos de login/logout conforme esperado.

---

## 3. Recuperação de senha ("Esqueci minha senha")

**Objetivo:** validar o fluxo de recuperação por e-mail.

**Passos:**
1. Na tela de login, clicar em **"Esqueci minha senha"**.
2. Informar o e-mail de um usuário **existente e ativo**.
3. Verificar no log da API o **e-mail mock** com o link/token de recuperação.
4. Acessar o link de reset (com o token) e definir uma nova senha.
5. Fazer login com a nova senha.

**Resultado esperado:**
- Mensagem neutra: "Se o e-mail existir em nossa base, as instruções foram enviadas."
- Nova senha passa a valer; senha antiga deixa de funcionar.

**Critério de aprovação:** recuperação completa com sucesso.

---

## 4. Gerenciamento de usuários (ADMIN)

**Objetivo:** validar a tela administrativa de usuários.

**Passos:**
1. Como **ADMIN**, clicar em **Usuários**.
2. Verificar a listagem (login, nome, e-mail, perfil, situação, troca pendente).
3. Testar os filtros: **busca por texto**, **perfil**, **situação**.
4. Testar a **paginação**.
5. Clicar em **Editar** e alterar nome/e-mail/perfil/situação; salvar.
6. Tentar alterar o **próprio** perfil/situação (deve ser impedido).

**Resultado esperado:**
- Lista e filtros funcionam.
- Edição salva e a lista atualiza.
- Autoproteção impede bloquear a própria conta.

**Critério de aprovação:** todas as ações da tela funcionam.

---

## 5. Redefinição administrativa de senha + troca obrigatória

**Objetivo:** validar a redefinição por administrador e a troca forçada no próximo login.

**Passos:**
1. Como **ADMIN**, em **Usuários**, escolher um usuário e clicar em **Redefinir senha**.
2. Confirmar a operação.
3. Copiar a **senha temporária** exibida (única exibição).
4. Clicar em **Auditoria** do usuário e conferir o registro (admin, data/hora, IP).
5. Sair e entrar com o usuário usando a **senha temporária**.
6. Confirmar que a tela **"Defina uma nova senha"** aparece e bloqueia o restante.
7. Definir uma nova senha (respeitando a política) e confirmar o acesso normal.
8. Tentar logar novamente com a **senha temporária** (deve falhar).

**Resultado esperado:**
- Senha temporária gerada e exibida uma única vez.
- Auditoria registra a operação.
- Troca obrigatória bloqueia o acesso até a nova senha.
- Senha temporária deixa de funcionar após a troca.

**Critério de aprovação:** fluxo completo sem acesso indevido.

---

## 6. Autocadastro de médico (primeiro acesso)

**Objetivo:** validar o cadastro autônomo de médico validado no Oracle MV.

**Passos:**
1. Na tela de login, clicar em **"Primeiro acesso? Cadastre-se"**.
2. **Etapa 1:** informar **CPF** e **data de nascimento** do médico elegível.
3. Verificar a mensagem de vínculo confirmado (nome mascarado).
4. **Etapa 2:** informar **e-mail**, **senha** e **confirmação** (respeitando a política).
5. Verificar o **código de confirmação** recebido no e-mail (log mock).
6. **Etapa 3:** informar o código e concluir.
7. Confirmar que o login é automático e cai na tela de **Exames**.

**Resultado esperado:**
- CPF/nascimento válidos → prossegue.
- Dados inválidos → mensagem genérica de recusa.
- Código correto conclui; código errado/expirado é recusado.

**Critério de aprovação:** cadastro concluído e conta criada com perfil `MEDICO`.

---

## 7. Acesso restrito do médico

**Objetivo:** garantir que o `MEDICO` acessa somente a consulta de exames.

**Passos:**
1. Como **MEDICO**, verificar que só existe a aba **Exames**.
2. Tentar acessar diretamente `GET /api/atendimentos` (deve retornar `403`).
3. Tentar `GET /api/usuarios` (deve retornar `403`).
4. Tentar `POST /api/anexos/upload` (deve retornar `403`).

**Resultado esperado:**
- Nenhuma tela administrativa visível.
- Backend nega as rotas não autorizadas (`403`), mesmo manipulando URLs/API.

**Critério de aprovação:** bloqueio efetivo no backend.

---

## 8. Consulta e visualização de exames

**Objetivo:** validar a busca de pacientes e a visualização de exames.

**Passos:**
1. Como **ADMIN/OPERADOR/MEDICO**, acessar **Exames**.
2. Buscar um paciente (código ou nome).
3. Listar os exames do paciente.
4. Abrir um exame (visualização) e baixar (download), se permitido.

**Resultado esperado:**
- Busca de pacientes funciona para todos os perfis.
- Visualização/download de exames funcionam.

**Critério de aprovação:** consulta de exames funciona para o perfil testado.

---

## 9. Anexos — upload e status (ADMIN/OPERADOR)

**Objetivo:** validar operações de anexo restritas a ADMIN/OPERADOR.

**Passos:**
1. Como **OPERADOR**, fazer **upload** de um anexo.
2. Alterar o **status** de um exame.
3. Como **MEDICO**, tentar as mesmas ações (deve ser impedido).

**Resultado esperado:**
- ADMIN/OPERADOR conseguem upload e mudança de status.
- MEDICO recebe `403`.

**Critério de aprovação:** permissões por perfil corretas.

---

## 10. Registro de resultados

| # | Cenário | PASSOU / FALHOU | Observações |
|---|---|---|---|
| 1 | Identidade visual e navegação | | |
| 2 | Login e Logout | | |
| 3 | Recuperação de senha | | |
| 4 | Gerenciamento de usuários | | |
| 5 | Redefinição + troca obrigatória | | |
| 6 | Autocadastro de médico | | |
| 7 | Acesso restrito do médico | | |
| 8 | Consulta de exames | | |
| 9 | Anexos — upload/status | | |

---

## Observações gerais

- [ ] Registrar prints de tela para os cenários que falharem.
- [ ] Registrar o CPF/usuário de teste utilizado em cada cenário.
- [ ] Para o cenário 6, garantir que o médico de teste **não** tenha conta prévia (anti-duplicidade).
