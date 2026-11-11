# Registo de alterações — EduData Concept

Sistema de estatísticas da educação da Província de Tete (DPE Tete). Antes da versão 1.30.0 chamava-se «EducStat Tete».
Cada versão tem as secções **Novidades**, **Correcções**, **Segurança** e **Dados de base** (só as que se aplicam).
Este ficheiro alimenta a área «O que há de novo» quando não há internet, e as notas das Releases no GitHub.

## 1.30.0 — 2026-11-10

### Novidades
- O programa passa a chamar-se **EduData Concept**. Os dados, as contas, a sincronização e os ficheiros já existentes continuam a funcionar sem mudanças.
- **Relatório Estatístico** no modelo do Módulo POEMA, com 16 secções: capa, nota introdutória, perfil, rede escolar, alunos, professores, aproveitamento, repetência e desistência, alfabetização, infra-estruturas, equidade, mapas, principais problemas, recomendações, ficha técnica e glossário.
- Problemas e recomendações calculados a partir dos indicadores, com espaço para as notas do SDEJT.
- Numeração das páginas: romana antes da nota introdutória e árabe a partir dela, no PDF e no Word (em todas as publicações).
- Ajuda: **Correspondência POEMA ↔ indicadores actuais** (fórmulas, quadros do Access antigos e de 2023, situação face ao SNE), exportável para Excel.
- Ajuda: **Formação (POEMA)**, com as 10 sessões do módulo, conceitos, exercícios com resposta e perguntas frequentes.
- Verificação de versões pelas **Releases do GitHub**, no máximo uma vez por dia, com «Actualizar agora», «Ver novidades», «Lembrar mais tarde» e «Ignorar esta versão».
- Transferência do .exe da Release, conferido com o SHA-256 publicado pelo GitHub.
- Área **«O que há de novo»**, com as notas das Releases (ou este ficheiro, sem internet) e filtros por tipo.
- Botão **«Enviar sugestão»**: abre uma Issue (ou uma discussão, se o Discussions estiver activo) já preenchida, ou envia a sugestão à DPE pelas Mensagens.
- Temas: modo de alto contraste, seis paletas novas (Zambeze, Savana, Capulana, Cahora Bassa, Machamba e Papel), tamanho da letra, densidade das tabelas e opção «menos animações».
- Canal de versões «Estável» ou «Testes» e histórico das actualizações em Administração > Dados e Cópias.

### Correcções
- O GitHub indisponível nunca bloqueia o programa: a verificação é adiada para o dia seguinte.

### Segurança
- Só se abrem e transferem endereços do repositório da DPE no GitHub; o instalador só é aberto depois de o SHA-256 conferir.
- As sugestões não levam dados das escolas, nomes de pessoas nem palavras-passe.

## 1.29.0 — 2026-11-10

### Novidades
- O instalador deixa de trazer os dados de base: na primeira utilização transferem-se do repositório da DPE ou importam-se de um ficheiro `.educdados`.
- Activação de contas novas neste computador com internet uma única vez; depois a entrada é sempre sem internet.
- Avisos de versão nova do programa e dos dados, com bloqueio só quando a DPE os marca como obrigatórios.

### Segurança
- Pacote de dados e cada ficheiro dentro dele conferidos por SHA-256 antes de entrarem em uso.

### Dados de base
- Pacote 2026.11.10: bases EducStat/AdultStat de 2004 a 2025, cadastro, resumos e população (338 ficheiros, 11,6 MB).

## 1.28.0 — 2026-11-10

### Novidades
- Estado de cada registo enviado: pendente, enviado, aceite ou recusado pela DPE, com recibos por distrito e relatório de sincronização em Excel.
- Importação do Access com pré-visualização, cópia de segurança automática e «Desfazer».

### Correcções
- Registos editados sem internet e enviados mais tarde já não ficam por receber na DPE (cursor pela hora de recepção no servidor).
- Importar duas vezes o mesmo pacote não duplica nada e fica assinalado.

## 1.27.0 — 2026-11-10

### Novidades
- Catálogo versionado de regras de validação (v2026.1), com códigos e justificação dos avisos.
- Reconciliação escola → distrito → província.
- Ficha técnica em cada gráfico e mapa; ajuda contextual com F1.

### Correcções
- Classes de exame por ano, segundo a transição do SNE.

## 1.26.0

### Novidades
- Mapas por posto administrativo e por localidade; mapa do Painel em duas secções.
- Correspondência cadastro ↔ mapa feita pelo técnico do distrito.

### Segurança
- Um utilizador não pode subir o próprio perfil, mudar o próprio distrito nem apagar a própria conta.

## 1.24.0

### Novidades
- Centro de Notificações e «Validar cópia» (teste de restauro sem alterar dados).

## 1.23.0

### Segurança
- Removida a palavra-passe previsível das contas SDEJT; guardas reforçadas no processo principal; diagnóstico local de erros.

## 1.22.0

### Novidades
- Exportação de mapas: copiar imagem, guardar em PNG e em SVG.

### Correcções
- Classes de ingresso e de conclusão por ano, segundo a transição gradual do SNE (Lei n.º 18/2018).

## 1.21.0

### Novidades
- Novos modelos de mapa: bivariado, comparação entre anos e cobertura.

### Correcções
- Código de recuperação mostrado ao criar a conta de administrador.
