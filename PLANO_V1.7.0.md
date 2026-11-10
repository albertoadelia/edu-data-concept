# EducStat Tete 1.7.0 — plano incremental de evolução

## Objectivo
Evoluir a versão 1.6.2 sem reconstrução integral, preservando os dados históricos, os fluxos de lançamento, a importação Access, a sincronização, os mapas, as publicações e as exportações.

## Princípios obrigatórios
- Não apagar nem reescrever dados históricos durante actualizações.
- Alterações ao esquema de dados devem ser aditivas e acompanhadas por migração reversível.
- Fazer cópia de segurança verificável antes de qualquer migração.
- Manter funcionamento offline e sincronização posterior.
- Não apresentar estimativas como estatísticas oficiais.
- Toda a operação sensível deve validar autorização no processo principal e, quando remota, no servidor.
- Cada funcionalidade nova deve ter testes unitários e de integração.

## Etapas

### Etapa 0 — linha de base e segurança
- Congelar uma cópia de referência da 1.6.2.
- Executar testes existentes e criar testes de regressão para autenticação, mensagens, sincronização, gravação e recuperação.
- Auditar RLS, identidade remota, privilégios e IPC.
- Resolver a autorização individual das mensagens antes de declarar confidencialidade entre colegas da mesma unidade.
- Testar cópias, restauração e migração em cópia de dados, nunca na única base operacional.

### Etapa 1 — painel executivo
- Reutilizar `agg.js` e as fórmulas oficiais já existentes.
- Criar indicadores provinciais, distritais e por escola, com filtros por ano, nível, tipo e sexo.
- Mostrar cobertura dos dados e avisos de comparabilidade.
- Permitir abrir o detalhe que sustenta cada KPI.

### Etapa 2 — qualidade estatística
- Reutilizar `problemasDetalhe()` como fonte de regras existentes.
- Catalogar regras com código, gravidade, dimensão, mensagem e função de validação.
- Separar erro bloqueante, aviso e anomalia estatística.
- Permitir justificação auditável sem alterar silenciosamente o valor original.

### Etapa 3 — prazos e tarefas
- Modelar levantamentos, prazos, responsáveis, estados e histórico.
- Distinguir tarefas pessoais, tarefas da unidade e tarefas provinciais.
- Notificar atrasos sem expor informação a utilizadores não autorizados.
- Sincronizar com controlo de versão e resolução de conflitos.

### Etapa 4 — relatórios
- Criar modelos versionados para relatórios provinciais e distritais.
- Incluir período, filtros, data de extracção, cobertura e notas metodológicas.
- Reutilizar os exportadores actuais e validar os totais com `agg.js`.

### Etapa 5 — mapas
- Reutilizar os GeoJSON/shapefiles e a normalização geográfica existentes.
- Associar cada camada a um nível administrativo e a um código estável.
- Apresentar indicadores, cobertura e fonte/ano dos dados.

### Etapa 6 — assistente estatístico
- Começar com perguntas determinísticas sobre indicadores e filtros.
- Mostrar sempre cálculo, período, universo, limitações e fonte.
- Não permitir escrita ou alteração de dados por linguagem natural.
- Só considerar IA generativa depois de aprovada a política de dados e privacidade.

### Etapa 7 — biblioteca documental
- Registar título, categoria, data, versão, unidade proprietária e classificação de acesso.
- Guardar ficheiros com nomes seguros, limites de tamanho e verificação de tipo.
- Aplicar permissões no servidor e localmente; manter histórico e auditoria.

## Critérios de aceitação da versão
- Testes de regressão aprovados.
- Nenhum acesso cruzado entre utilizadores/unidades não autorizados.
- Migração testada numa cópia e restauração comprovada.
- Indicadores reconciliados com as fórmulas e dados oficiais.
- Exportações verificadas por amostragem.
- Instalação e execução offline testadas em Windows limpo.
- Sincronização testada com falhas de rede e alterações simultâneas.

## Estado desta primeira intervenção
- Criado módulo isolado e testável para a política local de visibilidade das mensagens.
- A política passou a ser usada pela aplicação e os contadores/notificações aplicam filtro defensivo.
- Acrescentados testes de acesso por remetente, destinatário, unidade, avisos gerais e pedidos de palavra-passe.
- A versão do pacote foi actualizada para 1.7.0.

### Limitação de segurança ainda aberta
A sincronização actual utiliza uma identidade Supabase por unidade (DPE/SDEJT), não uma identidade por utilizador local. Por isso, a política local impede a apresentação de mensagens de terceiros na interface, mas não garante que o servidor deixe de entregar dados de colegas da mesma unidade. Para garantir confidencialidade real entre utilizadores, é necessária uma identidade remota individual ou um serviço de mensagens que valide a participação na conversa no servidor. Não declarar este requisito concluído até existir essa alteração e testes RLS correspondentes.
