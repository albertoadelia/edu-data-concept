# EducStat Tete — manual técnico

Autor: Alberto Adélia Manhice — DPE Tete

Sistema de lançamento e painel de indicadores das estatísticas da educação da Província de Tete.
Substitui as bases Access EducStat e AdultStat. Funciona no Windows sem internet.

## Onde está cada coisa

| Ficheiro | O que faz | Quando mexer |
|---|---|---|
| `app/app.js` | Toda a interface: menus, fichas, painel, Excel, alfabetização, administração | Mudar formulários, ecrãs, indicadores |
| `app/app.js` → `buildForms()` | Blocos da ficha de escola e colunas de cada grelha | Acrescentar ou alterar um quadro do formulário |
| `app/app.js` → `AFORM()` | Blocos da ficha de alfabetização e EPJA | Idem para alfabetização |
| `app/app.js` → `IND`, `indicators()` | Lista e fórmulas dos indicadores do painel | Acrescentar ou corrigir um indicador |
| `app/app.js` → `DEFS` | Ficha técnica (definição, fórmula, origem, interpretação) | Corrigir textos explicativos |
| `app/agg.js` | Soma das fichas por distrito, tipo, nível e classe (base do painel) | Indicador que precise de uma soma nova |
| `conversor.js` | Leitura das bases Access (.mdb) nos dois formatos de quadros e AdultStat | Novo formato de quadros do Ministério |
| `app/data/` | Dados de 2004–2025 convertidos das bases Access (só leitura) | Não precisa de mexer |
| `app/data/codigos.json` | Tabelas de códigos de origem | Também se editam no programa (Administração > Tabelas de códigos) |
| `app/local.js` | Base de dados local (ficheiros JSON na pasta de dados) | Raramente |
| `main.js`, `preload.js` | Janela, menus, acesso ao disco, palavras-passe, importação Access | Raramente |

## Dados do utilizador

Ficam em `Documentos\EducStat Tete\Dados` (pode mudar-se em Administração > Dados e cópias), um ficheiro JSON por tabela:
`fichas`, `resumo`, `escolas`, `alfa`, `centros`, `utilizadores`, `config`, `registo`. Cada gravação guarda também a versão anterior (`*.json.anterior`).

## Formato de uma ficha de escola

```
{ ano, esc, dist, sis: "antigo" | "SNE", em, por,
  marco: { alunos: [{ens, tur, cl, id: {"6": [H, M], ...}, rep: [H, M], tp, tm, int: [H, M]}], prof: [{ens, tur, q, v: [H, M]}], salas: {cod: n}, ... },
  fim:   { aprov: [{ens, tur, cl, fim: [H, M], exame: [H, M], aprov: [H, M], tp, tm, notas: {disciplina: [0-9, 10-13, 14-20]}}], desist: [...], ... } }
```

## Para alterar e gerar um novo instalador

1. Instalar Node.js 20 ou mais recente.
2. Nesta pasta: `npm install`
3. Experimentar: `npm start`
4. Gerar o instalador e a versão portátil: `npm run dist` (resultado na pasta `dist`).
5. Aumente o número da versão em `package.json` antes de distribuir.

## Versão 1.12.0 — segurança e privacidade

- A credencial universal `admin/admin` foi removida do processo principal. A administração só pode ser feita por contas reais cadastradas e autenticadas.
- Visitantes não têm acesso a mensagens, notificações, sino do topo ou ao cartão de mensagens, incluindo avisos gerais da DPE.
- A política de visibilidade de mensagens mantém-se limitada ao remetente, destinatário, unidade e perfil autorizados.
- Foram acrescentados testes automatizados para impedir regressões no acesso de visitantes e confirmar a ausência da credencial universal.

## Regras principais

- Perfis: 1 Consulta, 2 Lançamento, 3 Administrador (como a tabela UserAccessRights do Access). Um utilizador com distrito só grava dados desse distrito.
- Levantamentos abertos ou fechados por ano (como a tabela Setup do Access).
- Sincronização entre computadores: Administração > Sincronização (pacote `.educsync`); em cada ficha fica a versão gravada mais recentemente.
- Importação directa das bases Access: Administração > Importar Access.

## Versão 1.1.0 — o que mudou

- `lib/mdb-reader.cjs`: o leitor de bases Access convertido para CommonJS (esbuild). O pacote `mdb-reader` é um módulo ES e o `require()` falhava dentro do Electron 33 (Node 20): na 1.0.0 a importação de bases Access dentro do .exe dava erro. Para regenerar: `npx esbuild node_modules/mdb-reader/lib/node/index.js --bundle --platform=node --format=cjs --target=node18 --outfile=lib/mdb-reader.cjs`.
- Novo bloco `marco.manuais` (professores com manuais por disciplina e classe): Access antigo `MarchManual`, refeito `_TblEP1ProfsLivrosDisciplina2023`; códigos em `codigos.json > manuais`.
- `app/app.js`:
  - `QDEF` + `quadroRef()`: número do quadro do mapa em papel por bloco e nível (base: mapas de 2025 e aproveitamento 2024). Correcções por ano em `config/mapas` (Administração > Mapas e quadros).
  - Cores dos mapas: atributo `data-mapa="EP|ESG1|ESG2|ALFA"`; variáveis `--m-*` em `index.html` (claro = cor do mapa; escuro = só fio de cor).
  - Tema: botão no topo (automático/claro/escuro), guardado em `localStorage.tema`, aplicado como `data-theme` na raiz.
  - Explorar: `explorarAccess` (IPC `mdb:*`), `explorarFichas` (análise por dimensões), `explorarVerif` (regras das notas dos mapas; `problemasFicha()` é a mesma função usada ao lançar).
  - População (`populacao/{ano}_{dist}`) → `popSoma`, `indicadoresPop` (TBA, TLA, TBE, TLE, TBC, retenção).
  - Livro de Indicadores (`livroIndicadores`) e quadro por nível no Painel.
  - Exportar para Access (`exportador.js` + PowerShell 32 bits/OLEDB) e CSV.
  - Sincronização (`adminSync`, `docsParaEnviar`, `aplicarDocs`, `syncOnline`): pacotes cifrados AES-256-GCM (`pac:selar`/`pac:abrir`), servidor Supabase (`net:sync`) com registos cifrados; papel da instalação em `config/instalacao` (central/distrito). Regras: só a DPE envia utilizadores e `config`; dos distritos só seguem as mudanças de palavra-passe (`senhaEm`). `local.js` carimba `em` em `config`, `escolas` e `centros`.
  - Mensagens (`mensagens/*`), no Início.
- Testes: `/tmp` → ver `e2e.js` (Playwright `_electron`) usado no desenvolvimento: entra, lança, abre a base, exporta/importa pacote, cenário DPE→distrito e pacote adulterado (recusado).

## Versão 1.2.0 — o que mudou

- **Correcção:** a importação Access dava "opts is not defined" (`abrir(buffer, opts)` em `conversor.js`). Bases desde 2004 importam (14 anos em ~6 s).
- **Armazenamento por ano:** `fichas`, `alfa` e `resumo` gravam-se em `Dados/<colecção>/<ano>.json` (`db:savePart`); o ficheiro antigo único é migrado sozinho (fica `*.json.migrado`). `local.js` agrupa os avisos de alteração (120 ms) e filtra as consultas sem copiar todos os documentos.
- **Parâmetros de visualização** (ícone no topo): anos desde 2004, distritos visíveis, tipo de escola; guardados por utilizador (`localStorage.parametros`). `S.cod.distritosTodos` tem sempre os 15 distritos.
- **População do INE embutida:** `app/data/populacao.json` (idades 0-30, H/M, 2007-2050; 2007-2020 do ficheiro antigo — Dôa e Marara separados de Mutarara e Changara pela proporção de 2021 —, 2021-2050 do modelo Power Pivot 2017-2050, lido com `pbixray`). O que se lançar em Administração > População substitui.
- **Lançar:** cada nível da escola é um mapa separado (`S.sel.mapa`, `mapasDaFicha`); blocos sem quadro nesse nível escondem-se; quadros comuns à escola (salas, infra-estruturas, mobiliário) aparecem em todos os mapas. Sinal "i" com as notas e NB de cada quadro (`NOTAS`).
- **Prazos e harmonização** (`config/trancas`): prazo por ano×levantamento; trancar/reabrir/confirmar harmonização por distrito; a confirmação re-carimba as fichas da DPE para seguirem para o distrito; `aplicarDocs` recusa alterações do distrito em partes trancadas.
- **Privilégios** (`config/privilegios`): a DPE concede a um distrito a gestão dos seus utilizadores; separadores da DPE escondidos nos distritos; escolas novas só na DPE.
- **Presença online** (`net:sync` ops `ping`/`quem`, linhas `colecao=presenca`, excluídas do pull normal); local de trabalho escolhido à entrada.
- **Mensagens** no topo (sino com contador, som e notificação do Windows).
- **Excel:** `app/lib/xlsx-estilo.js` (xlsx-js-style 1.2.0) e `XLSX.write` envolvido para dar a todas as folhas o aspecto do programa e autor Alberto Adélia Manhice.
- **Publicações** (`VIEWS.publicacoes`, `construirPublicacao`): brochura e carta escolar (distrito ou província), HTML → PDF (`rel:pdf`, printToPDF) e Word (`rel:docx`, `lib/docx.cjs` = docx 9.0.2 em CommonJS). Mapas com limites oficiais se a DPE carregar um GeoJSON (`config/limites`); sem eles, mapa esquemático em mosaico.
- Ficha técnica dos indicadores e notas dos mapas passaram para Ajuda; todos os indicadores têm gráfico (painel e ficha técnica).

## Versão 1.3.0 — o que mudou

- **Arranque:** sem menu nativo (`Menu.setApplicationMenu(null)`); Ficheiro, Ver, Conta e Ajuda estão no menu interno (`abrirMenuApp`, IPC `janela:accao`), só depois de entrar. Antes de entrar, `body.sem-sessao` esconde todo o cabeçalho. Na versão instalada, F5, F12 e Ctrl+Shift+I estão bloqueados.
- **Primeira utilização:** já não há `admin/admin`; `primeiraUtilizacao()` pede o papel do computador (DPE/SDEJT) e cria o administrador com palavra-passe própria (mínimo 8).
- **Contas SDEJT_(Distrito):** `garantirContasSDEJT()` (só na DPE, uma vez, registado em `config/contasSDEJT`): `sdejt_<distrito>`, perfil 3 com distrito, palavra-passe inicial `admin`, troca obrigatória (não aceita voltar a `admin`). O administrador distrital cria utilizadores de consulta/lançamento do seu distrito; contas da DPE só com privilégio.
- **Esqueci a palavra-passe:** no ecrã de entrada cria um pedido (`mensagens`, `tipo: 'senha'`); a DPE ou o SDEJT vê-o em Administração > Utilizadores e repõe com palavra-passe temporária (troca obrigatória).
- **Servidor:** `SERVIDOR` em `main.js` (URL e chave publicável fixos; outro servidor só HTTPS `*.supabase.co`, só pela DPE). Sessão com Supabase Auth (`net:sync` op `entrar`; refresh token guardado com `safeStorage`). O SQL (`SQL_SUPABASE` em `app.js`) cria `educstat_contas` e regras RLS: provincial vê tudo; distrital só `dist = o seu`, configurações globais e mensagens dirigidas; ninguém apaga pela API. A DPE confirma a origem de cada registo pela coluna `autor` (conta do servidor), não pelo que o registo diz.
- **Chave de cifra da organização:** escolhida pela DPE (`seg:chave`), guardada com `safeStorage`; pacotes `EDUCSYNC3`. Com chave definida, pacotes antigos (chave embutida) deixam de ser aceites.
- **Sincronização por nível:** o SDEJT só envia registos do seu distrito e só importa pacotes da DPE ou do seu distrito.
- **Mensagens:** conversas (`threadId`, `replyTo`) e botão Responder.
- **Lançar:** Quadro 1 sem coluna de turno repetida (faixas Diurno/Nocturno); EP com "Nº de turnos" (`nt`, lido de `_TblEP1.NTurno` e escrito de volta); nas outras grelhas a coluna Turno só aparece quando há nocturno. `problemasDetalhe()` devolve erros e avisos com o quadro onde corrigir (botão "Ir ao quadro").
- **Publicações:** emblema da República (`app/img/emblema.png`) na capa e no cabeçalho; gráficos nativos do Word com folha Excel embutida (`docxgraficos.js`); botão "Guardar dados em Excel"; nota técnica com proveniência; nova publicação "Retroalimentação às escolas".
- **Limites:** `geo:shp` lê `.shp/.dbf/.prj` ou `.zip` (`lib/geo.cjs` = shapefile + proj4 + JSZip), converte a projecção para WGS84 e simplifica; distritos ligados pelo melhor campo de código/nome; postos e localidades filtrados pelos distritos de Tete.
- **Qualidade:** cobertura (escolas esperadas, recebidas, sem ficha, novas, com novo nível) com lista nominal em Excel.

## Versão 1.3.1

- Contas distritais pelo código do distrito: `sdejt_0901` … `sdejt_0915` (nome visível `SDEJT_0901 (Angónia)`); emails sugeridos no SQL: `sdejt.0901@educstat-tete.mz`.
- **Publicação depois da harmonização:** em Prazos e harmonização, quando todos os distritos estão harmonizados, a DPE publica o ano (`config/publicacao` + tabela `educstat_publicados` no servidor). Os SDEJT passam a receber e consultar (só leitura) as fichas dos outros distritos desse ano; o servidor só as entrega depois da publicação (regra `docs_ler`). Num computador de SDEJT, os dados de outros distritos de anos posteriores a 2024 não publicados ficam escondidos (`visivel()`), e os publicados são só de consulta (`motivoTranca`).

## Versão 1.4.0 (Outubro de 2026)

- Interface: barra lateral com ícones (recolhível com ☰), faixa com as cores da bandeira, paleta verde/dourado, painel da conta (senha, tema, parâmetros, visita guiada, sair, fechar), «Administrador Distrital/Provincial», datas em dia/mês/ano (`--lang=pt-PT`), anos sempre do maior para o menor, visita guiada no primeiro acesso.
- Mensagens: área própria (`#mensagens`) com conversas por unidade (DPE, cada SDEJT, avisos para todos), mensagens entre distritos, pessoa de destino opcional, procura, exportação para Excel, estado «por enviar». Quem está online: todos vêem todos; clicar numa pessoa abre a conversa; a DPE vê IP público (tabela `educstat_ips`, preenchida por trigger no servidor), IP da rede local, máquina e versão.
- Sincronização: envio 1,5 s (mensagens) ou 12 s (restante) depois de cada alteração, verificação de 2 em 2 minutos, novas tentativas com espera crescente (30 s até 10 min) e ao voltar a rede; só se percorrem os registos alterados (`db.__desde`). A marca do envio é tirada antes de recolher os registos.
- Gravação segura: ficheiro temporário + `fsync` + cópia `.anterior` + troca; ao ler, recupera de `.anterior`/`.tmp` se o ficheiro estiver estragado. Cópia automática diária em `Dados\Copias` (14 dias), restaurável em Administração › Dados e cópias, com guia de recuperação.
- Lançar: gravação automática 2,5 s depois de cada alteração (se não criar erros novos), «Desfazer» com várias versões; outros distritos aparecem em cinzento «(só consulta)».
- Visibilidade: num SDEJT (ou com sessão distrital) os outros distritos de anos ainda não publicados não aparecem e o total provincial desses anos fica vazio. Painel: lista de indicadores com rolagem e indicação «Há mais indicadores», cartão «Comparar distritos ao longo dos anos».
- Importar Access: política «Actualizar» por omissão (acrescenta as partes vazias, ex.: o aproveitamento, e mantém o resto); «Substituir» e «Não mexer» continuam disponíveis. Importação de vários pacotes ou de uma pasta inteira na DPE.
- Publicações: capa numa secção própria (sem cabeçalho, rodapé nem número; local e data no fundo), entidades em maiúsculas (Província de Tete › Governo do Distrito › SDEJT), página 2 com ficha técnica e nota técnica, índice, rodapé com fio, emblema e «Página X de Y». PDF: capa impressa à parte e trocada com `pdf-lib`. Tabelas e gráficos à largura da página; gráficos SVG redesenhados. Brochura nova (modelo do MINEDH) com escolha «levantamento / aproveitamento / ambos». Mapas: distritos pequenos com o nome fora e uma linha.
- Limites: reconhecimento tolerante de nomes (ex.: «Zumbu»), correcção da orientação dos polígonos para o d3, quadro de correspondência para associar à mão os distritos sem área. É preciso voltar a carregar o shapefile.
- Excel: `xlsxgraficos.js` acrescenta gráficos nativos ligados às células. O Livro de Indicadores tem dados de base editáveis, indicadores em fórmulas, gráficos por nível, folha Distritos e Painel. Os dados das publicações em Excel levam os gráficos.
- SQL do servidor: acrescentar `colecao = 'presenca'` à regra `docs_ler` e criar `educstat_ips` com o trigger `educstat_ip` (ver o SQL de configuração no programa).

## Versão 1.5.0 (Outubro de 2026)

- Electron 45.2.1 (versão com suporte) e electron-builder 26; nome da aplicação nas notificações do Windows (`setAppUserModelId`).
- Nomes: «Introdução de dados» em vez de «Lançar dados»; «Brochura Estatística», «Carta Escolar»; «1º Ciclo/2º Ciclo»; «Direcção Provincial da Educação»; aspas “ ”.
- Limites: só áreas da província de Tete (campo da província ou posição); nome parecido só com 1 letra de diferença; várias partes do mesmo distrito juntam-se; opção para retirar uma área mal associada. Mapas sem margens extra; mapa das escolas só com escolas dentro de Tete/distrito e nomes dos distritos.
- Word: local e data da capa numa moldura encostada à margem de baixo da própria capa. Gráficos de linha sem números por cima das linhas (Word e Excel).
- Excel: folha «Índice» com ligações para todas as folhas e «◄ Índice» em cada folha (ficheiros com 3 ou mais folhas). Abre .xlsx, .xls e .csv.
- Introdução de dados: coluna HM calculada depois de cada par H/M e no total; Total HM no quadro de alunos por idade; EP sem nocturno a partir de 2023.
- Alfabetização: com «Ambos», H, M e HM em todas as tabelas.
- Escolas e centros: só a DPE cria e altera; os SDEJT propõem (mensagem tipo «proposta»), a DPE revê, corrige e aprova ou recusa. Procura por código em qualquer formato (90568, 0568, 09-0568). Importação da carta escolar (.xls/.xlsx/.csv) por código: distrito, posto, localidade, ZIP, coordenadas e dados de infra-estrutura (`escola.ce`).
- Utilizadores: só a DPE apaga (apagamento lógico, sincronizado).
- Mensagens: editar e apagar nos primeiros 15 minutos; o administrador provincial apaga a qualquer momento; o texto apagado fica guardado e só a DPE o vê.
- Painel: percentagens acima de 100% aparecem no gráfico de evolução.

## Versão 1.5.1

- Exportar para Access: as colunas de cada tabela lêem-se com `GetOleDbSchemaTable` (com restrições nulas reais) ou, se falhar, com `SELECT * … WHERE 1=0`, antes de abrir a transacção. Corrige o erro do Jet 4.0 «GetSchema … The parameter is incorrect».
- A exportação em CSV deixa na pasta o ficheiro COMO_IMPORTAR_NO_ACCESS.txt com os passos para acrescentar os dados no Access.
- Tranca automática (3 meses SDEJT / 6 meses DPE depois de cada levantamento, configurável em Prazos e harmonização) e botões para marcar/desmarcar todos os anos em Levantamentos.

## 1.6.0
- Dados de base 2004–2025 (antes 2018–2025): `app/data/2004…2017` gerados de EducStat09.mdb com `fichas.py` (Y0=2004); `resumo.json` recalculado. `ANO_MIN = 2004`.
- Introdução de Dados: separador “Todos os quadros (ordem do mapa)”, por número de quadro (`quadroRef`); grupos ordenados pelo primeiro quadro.
- Escolas: ordenação por coluna (por defeito código decrescente), filtros posto/localidade/tipo/estado/falta, exportação Excel (`exportarEscolas`). Listas de escolas por código decrescente.
- Carta escolar: coordenadas em graus decimais ou GMS, coluna única “Coordenadas”, latitude positiva corrigida; grafias de posto/localidade uniformizadas pela carta.
- Administração > Ficheiros de base (`adminBase`): carta escolar, limites (shapefile/GeoJSON), coordenadas, uniformização de grafias (`variantesNomes`), histórico em `config/ficheirosBase` (sincroniza para os distritos).
- Painel: Desde/Até, posto administrativo, localidade (recalcula `EAgg.resumo` só com essas escolas: `prepararFiltroLocal`) e classe (`f.classe` em `sumUpRs`).
- Gráficos: valores em todos os pontos das linhas (Word/Excel/PDF; com mais de 3 séries só o último ponto); barras com valores (rodados quando estreitas); painel com valores no gráfico de evolução.
- Capa: silhueta do distrito/província (escolas na carta escolar) e faixa com as cores da bandeira (`arteCapa`; no Word como imagem e imagem flutuante no fundo).
- Brochura: % raparigas, % professores formados, repetência, desistência (evolução) e alunos por classe e sexo; Carta: condições segundo a carta escolar.
- Sincronização: `autor` explícito no envio (main.js) — antes a DPE não conseguia actualizar registos criados por um distrito (o lote inteiro era recusado). Botão “Actualizar” no topo; motivo do erro no rodapé do menu; distrito vê “Configurações recebidas da DPE” em Sincronização.
- Propostas: estado imediato na DPE, mensagem de resposta ao distrito, estado “ainda não enviada / enviada”.
- Prazos: estado “Fechado (automático)” visível com Reabrir; reabrir/trancar distritos marcados.
- Utilizadores: entrada com o código do distrito (0905 = sdejt_0905); versão no ecrã de entrada; perfis com maiúsculas; registo com computador, IP local e IP público.
- Importar Access: intervalo por defeito desde 2004, aviso dos anos que o ficheiro tem, nova política “Actualizar o que for diferente”.

## 1.6.1
- Administração > Configurações (antes “Ficheiros de base”): primeiro separador da DPE.
- Shapefiles: um ZIP com várias camadas (`geo:shp` devolve `camadas`); cada camada é pré-visualizada (`carregarShapefilesBase`) com o nível sugerido (distritos/postos/localidades) e o “agora → depois”, e só grava ao confirmar. `S.limitesLocalidades` passa a ser carregado.
- Publicações do distrito: “Divisão dentro do distrito” por posto administrativo ou por localidade (`S.pubDiv`, `divU()`); mapas coropléticos por unidade quando há limites dessa camada (`mapaUnid`, ligação por nome com `normGeo`/`lev`).

## 1.6.2
- Mensagens privadas (`podeVerMsg`): cada utilizador vê só o que enviou, o que lhe foi enviado (a si ou à sua unidade) e os avisos para todos. A DPE deixa de ver conversas entre distritos e conversas de colegas. Respostas vão, por omissão, só para quem escreveu (`paraUtil`). No servidor (SQL `docs_ler`), a DPE deixa de receber mensagens entre dois distritos.
- Sincronização: palavra-passe vinda de um distrito só é aceite para utilizadores desse distrito; recepção paginada com cursor (em, id) — registos com a mesma data já não ficam por receber.
- Gravação: fila por colecção que só retira a parte pendente depois de escrita; `db.__flush()`; o “Gravado” do mapa só aparece depois da escrita no disco; ao fechar, o processo principal espera a gravação (`app:fechar` / `app:prontoFechar`); erro de disco avisado; ficheiro ilegível copiado para Dados/Corrompidos e aviso no arranque (antes ficava uma colecção vazia).
- Segurança: IPC só aceite de `app://educstat/`; caminho do protocolo `app://` verificado com separador; chave/sessão sem DPAPI cifradas com AES-GCM (antes só Base64).
- Cópia manual e automática com as mesmas colecções (`COLS_COPIA`, inclui mensagens, população, registo e resumo).
- Filtro de classe: indicadores sem dimensão de classe (professores, escolas, salas…) aparecem sem valor, nunca zero.
- Auditoria: cada gravação de mapa regista quantos números mudaram, em que quadros, e um exemplo do valor anterior e actual.
- `npm test` (tests/agg.test.js, 5 testes do agregador) e `npm run verificar` (dados de base presentes); `npm run dist` corre os dois antes do instalador. `junta.py` e `remover.py` sem caminhos fixos.
- Pasta partilhada desaconselhada para trabalho simultâneo (texto em Dados e cópias).

## 1.7.0
Incorpora o que se adequava das auditorias externas (ficheiros PLANO_V1.7.0.md, RELATORIO_INTERVENCAO_1.7.0.md e auditoria técnica 1.6.2):
- Política de mensagens num módulo testado (`app/modules/message-access.js`, 6 testes em `tests/message-access.test.js`). `podeVerMsg` delega nele.
- Servidor (SQL): o `autor` de cada registo passa a ser definido por um gatilho (`educstat_priv.carimbar_autor`), não pelo programa.
- Dados de base incluídos no código-fonte e no Git (2004–2025) com `app/data/manifesto.json` (SHA-256 de cada ficheiro); `npm run verificar` compara com o manifesto; `npm run manifesto` regenera-o.
- `package-lock.json` alinhado com 1.7.0; versões exactas de Electron e electron-builder.
- Entrada: espera crescente depois de 5 tentativas erradas (registado); palavras-passe com 8+ caracteres e sem palavras comuns; bloqueio automático depois de 30 minutos sem actividade.
- Pasta de dados: marca `.em_uso.json` e aviso quando outro computador usa a mesma pasta.
- Utilizadores: a conta `sdejt_09NN` criada pela DPE é o Administrador Principal do Distrito (cria administradores, muda nomes, perfis e palavras-passe dos utilizadores do distrito); os outros administradores do distrito só gerem consulta e introdução. A DPE continua com controlo total.
- Publicações: dados do distrito “só o distrito”, por posto, por localidade ou por posto e localidade em simultâneo; apresentação “tabelas e gráficos”, “só tabelas”, “só gráficos” ou “aprofundado” (anexo com indicadores por escola); escolha das secções; anexos do utilizador (imagens PNG/JPG e tabelas Excel/CSV) no Word, PDF e Excel; numeração refeita.
- Trancas: data-limite própria por levantamento (prolongar ou encurtar), além dos meses gerais; resumo explicativo.
- Linguagem: “mapa” em vez de “ficha” e “introdução/introduzir” em vez de “lançamento/lançar” em todo o programa e na Ajuda; “Explicação dos indicadores”.

Não incorporado (e porquê): reescrita em Next.js/TypeScript e migração para SQLite (risco alto, fica para uma 2.0 planeada); identidade individual no servidor para as mensagens (exige uma conta Supabase por pessoa — o servidor continua a separar por unidade; a separação entre colegas da mesma unidade é feita pelo programa); assinatura de código do instalador (precisa de certificado da instituição).

## 1.8.0
Reúne numa só versão o que as avaliações da 1.7.0 propunham para 1.8 e 1.9:
- **Tema no topo** (ícone ao lado de Actualizar): claro, escuro, automático.
- **Painel executivo** no Início: alunos, escolas com mapa, cobertura, qualidade e professores; distritos que requerem atenção.
- **Qualidade dos dados** (novo menu, `VIEWS.qualidade`): cobertura (recebidas ÷ esperadas), cumprimento do prazo, mapas com erros, avisos, anomalias (variação > 40% face ao ano anterior; escola que deixou de enviar), pontuação (60% cobertura + 40% sem erros), pendências com “Abrir o mapa”, justificação auditável (`ficha.justif`, sem mudar números), exportação Excel.
- **Ciclo dos dados**: Por submeter → Submetido (SDEJT, mensagem `tipo: 'submissao'`) → Em revisão (DPE, `trancas[...].dist[d].revisao`) → Harmonizado → Publicado.
- **Publicação versionada**: versão, impressão SHA-256 do ano (`hashAno`) e histórico de publicações e retiradas.
- **Validação dos registos recebidos** (`docValido`): ano, distrito, escola, números não negativos; recusados ficam registados e no diagnóstico.
- **Diagnóstico da sincronização** (fila, último contacto, recusados) e relatório técnico em txt.
- **Configuração de computador SDEJT**: ficheiro `.educcfg` cifrado com PIN (scrypt + AES-GCM) com distrito, servidor e chave.
- **Perguntar aos dados**: assistente determinístico no Painel (indicador, lugar, ano, nível, sexo), com fórmula e fonte.
- **Mapas com cartucho**: norte, fonte dos dados (quantitativos/qualitativos), sistema de referência WGS 84 e quem elaborou (SDEJT ou DPE).
- **Divisão “posto e localidade”**: distrito > posto (total) > localidades; correspondência manual das áreas de postos/localidades com o cadastro (`__alias`).
- **Introdução de Dados**: filtros por posto administrativo e localidade. **Painel**: exportação de indicadores por posto e localidade (Excel).
- **Servidor (SQL)**: escolas legíveis pelo próprio distrito (e por todos só depois de haver anos publicados).
- **CSP** sem `unsafe-inline` nos scripts; `object-src`, `base-uri` e `form-action` fechados; foco visível.
- Menu “Publicações” passa a “Relatórios”.

## 1.9.0
Pedidos do Alberto (01/11/2026) e dois relatórios técnicos da 1.8.0 (01/11/2026).

**Entrada e contas**
- Ecrã de entrada com “Iniciar sessão” e “Criar conta”; botão “olho” para mostrar/esconder a palavra-passe (entrada, criação, mudança).
- Computador novo de um SDEJT: carrega o ficheiro `.educcfg` da DPE (com PIN) no próprio ecrã de entrada; o ficheiro (v2) leva as contas do distrito (palavras-passe só em hash) e o técnico entra com as credenciais originais.
- Contas SDEJT novas com palavra-passe temporária aleatória que expira em 30 dias (deixou de haver “admin” igual para todas); cartão para substituir as “admin” que ainda existam e guardar a lista.
- “Criar conta” com utilizadores existentes = pedido; o administrador do SDEJT ou da DPE aprova ou recusa (Administração > Utilizadores).
- Pedidos (palavra-passe, conta, abertura, proposta): quem pediu cancela; o administrador elimina. Caixa “Tarefas” no Início.
- Visitante: só ver; o processo principal recusa guardar/exportar ficheiros (file:save, rel:pdf, rel:docx, access:*, cfg).
- Conta de supervisão oculta (`raiz`): não aparece nas listas nem na presença; separador “Supervisão” com a actividade de todos (o registo de actividade passa a sincronizar dos SDEJT para a DPE, só acrescenta) e “Repor o sistema”.
- Mudar a pasta de dados leva utilizadores, configurações, mensagens e população para a pasta nova (não pede conta nova).

**Introdução de dados**
- A DPE e os administradores abrem os mapas em modo de leitura (“Editar este mapa” para alterar). Fora do prazo: “Pedir abertura à DPE”.
- Erros e avisos mostrados só do levantamento escolhido; “Ir ao quadro” muda também o levantamento no topo.
- Regras: Quadro 4 = Quadro 1 (alunos e turmas, erro); salas e carteiras contam-se uma vez por escola (EB), lotação por sala e por turno, 25 carteiras duplas / 50 simples por sala convencional, salas precárias sem carteiras convencionais.

**Relatórios**
- Ficha técnica no modelo da DPE (título, editor, autor, colaboradores, apoio, estado dos dados) e nota técnica; editáveis no ecrã dos relatórios.
- Recorte territorial: postos, localidades ou ZIP escolhidas; relatório de Alfabetização e Educação de Adultos; “Incluir a AEA”.
- Carta escolar: nota introdutória, localização geográfica (vizinhos e coordenadas calculados dos limites), superfície e divisão administrativa (km² calculados), relevo e clima, população (Censo 2017), índice de mapas e de gráficos, glossário; mapas com rosa-dos-ventos, escala em km, legenda, emblema, fonte espacial, dados (MEC/DPE), WGS 1984 e “Elaborado por”. Capa sem sombra, com rosa-dos-ventos e escala.
- Dados geográficos editáveis em Configurações (6).
- Glossário com os termos a negrito; anexos: várias imagens (PNG, JPG, GIF, WEBP, BMP, SVG), Excel, CSV e texto; arrastar ficheiros para os cartões.

**Mapas e painel**
- Shapefiles: escolha do campo com o nome (sugestão pelo cadastro das escolas), UTM 36S assumido sem .prj, nomes com codificação errada corrigidos, localidades sem limites dos distritos.
- Painel: mapa interactivo (distritos, postos, localidades ou escolas; passar o rato, clicar, aproximar); copiar/guardar PNG/SVG de qualquer gráfico; a pergunta e a resposta não se apagam com a sincronização.

**Robustez (relatórios técnicos)**
- RLS: escolas de outro distrito só com ano publicado na própria linha (correcção crítica); presença pública sem dados técnicos (`presenca_tec` só DPE e o próprio distrito); registo só acrescenta.
- Sincronização: recebe antes de enviar; não devolve ao servidor o que acabou de receber; conflitos guardados (Qualidade > Conflitos); falhas de decifra contadas e o cursor não avança.
- Qualidade: mapa recebido só com o Quadro 1 preenchido (parciais à parte); prazo pela primeira gravação; cache recalculada ao gravar ou receber.
- Impressão digital SHA-256 canónica do conteúdo integral (fichas e alfabetização).
- Limites de tamanho (100 MB ficheiros, 20 MB imagens, 300 MB ZIP, 1,5 GB Access), assinatura das imagens, SVG sem código, texto de anexos neutralizado contra fórmulas.
- Dicionário dos indicadores exportável (Ajuda > Explicação dos indicadores).
- Testes: 21 (agregação, mensagens, segurança estática, hash canónico).

**Por fazer (2.0)**: identidade individual no servidor (mensagens privadas entre colegas da mesma unidade continuam a depender do computador); SQLite; TypeScript/modularização; assinatura do instalador; testes RLS contra um projecto Supabase de teste.

## 1.10.0
- **Sessão no processo principal**: `auth:entrar` verifica a palavra-passe (scrypt, `timingSafeEqual`) e guarda a sessão em `SESSAO_LOCAL`; `auth:visitante`, `auth:sair`; tentativas limitadas no principal. O visitante só grava `registo`; `file:save`, `rel:pdf`, `rel:docx`, `access:*` e `cfg` recusam-no. No ecrã, os botões de guardar/exportar ficam escondidos para o visitante e o perfil mostra o âmbito (“Visitante · SDEJT X” ou “Visitante · DPE Tete”).
- **Validação IPC**: `db:save` e `db:savePart` só aceitam objectos simples, sem chaves com caminhos (`objSimples`).
- **Relatórios**: temas de cores (DPE, preto, azul, MEC, terracota, roxo) e cores personalizadas (títulos, subtítulos, destaque, texto), aplicados ao ecrã, ao PDF e ao Word; títulos numerados 1 / 1.1 / 1.1.1; índice geral, de tabelas, de gráficos e de mapas com números de página (PDF: duas passagens com pdf.js e marcas `QQPG…QQ`, retiradas no ficheiro final; Word: campos TOC actualizáveis e legendas SEQ já numeradas por `numerarSeq`); página de siglas e abreviaturas; glossário oficial do MEC (“**Termo**: definição”); contracapa a toda a página na cor do tema, com emblema e localização da instituição (configurável na ficha técnica: endereço, telefone, e-mail).
- **Capa** só com o território e o nome dentro (sem moldura, rosa-dos-ventos, escala nem pontos). **Cartucho** (escala, fontes, WGS 1984, elaborado por) dentro do mapa, no canto mais vazio; a legenda não se sobrepõe. Escolas como **bandeirinhas**.
- **Folheto da Educação** (provincial e distrital): território e população, rede escolar, alunos, professores, eficácia interna e condições de ensino.
- **INE**: superfícies oficiais por distrito (Folheto Estatístico Distrital) e população projectada para 2023 (total 3 171 917); a carta escolar usa a projecção do INE e mostra o Censo 2017 como referência.
- **Esvaziar o sistema** (DPE e supervisão): retira base do instalador, escolas, centros e dados introduzidos (com cópia prévia), marca `config/vazio`; pode desfazer-se.
- **Ajuda**: quadros da alfabetização (HPV = Habilidades para a Vida) e os caminhos para trabalhar em vários computadores / pôr o sistema em linha.
- Exemplos de nomes genéricos (John Doe, Jane Doe).
- Testes: `tests/v110.test.js` (sessão no principal, PODE_GRAVAR, `objSimples`, numeração SEQ, marcas de página, glossário).

## 1.11.0
- **Super-administrador oculto (admin/admin)**: entra com utilizador `admin` e palavra-passe `admin`, mas só quando nenhuma conta real “admin” corresponde (fallback no processo principal). É `raiz`, não existe no cadastro, não é listado, não é registado na actividade (`ehOculto`) nem sincronizado. Pode ver os recusados primeiro e apagar técnicos a qualquer nível (Administração > Supervisão). AVISO: a credencial está no código distribuído e é descoberta por quem abra o `.asar`; deve ser mudada ou protegida antes de uma distribuição ampla.
- **Registos recusados na sincronização**: `aplicarDocs` passou a guardar cada registo recusado com o motivo (escola nova, levantamento trancado, conta de outro distrito, origem desconhecida, não se conseguiu decifrar, etc.) em `config/rejeitados` (local, não sincroniza, limite 3000). Visor em Qualidade (DPE) e em Supervisão (super-administrador), com filtro por motivo, procura, explicação de como corrigir e exportação para Excel.
- **Sincronização**: `aplicarDocs` cede a interface a cada 150 registos (reduz o bloqueio em lotes grandes). As falhas de decifra entram também na lista de recusados.
- **Esvaziar o sistema**: além da base, escolas, centros e dados introduzidos, apaga também os shapefiles (`config/limites`, `limitesPostos`, `limitesLocalidades`), a geografia, as fichas técnicas e a lista de recusados — fica mesmo vazio.
- **Relatórios**: números das legendas (Mapa 1, Tabela 1…) com a mesma cor do título também no Word (`numerarSeq` a negrito e na cor do tema); títulos dos índices com maiúsculas (Índice de Tabelas, Índice das Ilustrações, Índice de Gráficos, Siglas e Abreviaturas, Ficha Técnica, Cores do Relatório); índices sem negrito; ano retirado de baixo do mapa da capa; moldura dos mapas com cantos redondos (como o cartucho); bordas dos distritos no choropleth na cor do tema; total de unidades na legenda.
- **Folheto da Educação**: agora é um tríptico em A4 horizontal, dobrável em três, com duas páginas (6 painéis) — capa, apresentação, território, números, eficácia, condições e glossário resumido; sem a repartição por distrito/posto (fica para a brochura e a carta).
- **Temas de relatório**: acrescentados Azul ONU, Esmeralda e grafite, e Bordô institucional.
- **PESD**: espaço reservado em Administração (DPE) para a futura base do Programa de Ensino Secundário à Distância.
- Descrição do instalador corrigida (“Sistema de Introdução e Painel de Indicadores…”).
- Testes: `tests/v111.test.js` (super-administrador oculto, não-registo, recusados, esvaziar, folheto em paisagem).

### Em preparação para a 1.12.0 (pedido na mensagem de voz de 3/11, ainda por fazer)
- Painel da Carta Escolar (localização, sanitários, carteiras, energia, água, DUAT) e comparação carta↔ecrã.
- Legenda dos mapas com símbolos por tema (DUAT, água, energia, latrinas, casa de banho, biblioteca, laboratório, casa de professor) e contagens por nível; gráficos circulares (público/privado).
- Vizinhos no mapa (países/províncias/distritos limítrofes) com cores à escolha; legenda e fonte nunca sobrepostas; linha-guia para todos os rótulos (posto, localidade, distrito).
- Correspondência cadastro↔shapefile (postos/localidades que existem num e não no outro, ex.: Chiputo em Marávia).
- Pré-visualização e validação da base Access antes de importar.
- Mensagens: emoji/sticker/GIF com botão, anexos (imagem, documento, zip, áudio), envio à direita; cabeçalho nas exportações.
- Alfabetização: ao escolher a escola, mostrar logo os seus centros (uma linha por centro); mapa interactivo no painel.
- “Explorar”: tabela “por tipo de problema” com a mesma dimensão e exportação.
- Ficha técnica e contracapa no modelo INE/Ministério (linha em T), com campos de endereço/contactos configuráveis.
- Shapefiles de linhas, pontos e capitais administrativas para definir melhor os limites.


## Versão 1.13.0 — segurança, recuperação e modernização

- **Recuperação do criador:** o primeiro administrador provincial recebe um código único de emergência, mostrado uma só vez; o sistema guarda apenas o hash, invalida o código após utilização e regista o evento. Não existe `admin/admin` nem conta oculta permanente.
- **Matriz IPC:** gravações, cópias, importação Access, exportação Access/CSV, chave da organização, configuração do computador, servidor, sincronização, relatórios e shapefiles passam a exigir sessão e perfil adequado no processo principal.
- **Pasta partilhada:** gravações são bloqueadas quando o marcador indica que outra máquina está a usar a mesma pasta de dados.
- **Allowlist:** HTML/SVG usado na impressão é sanitizado, retirando scripts, iframes, objectos, eventos e recursos externos.
- **Mensagens:** suporte a emojis e anexos até 5 MB, com o anexo identificado na conversa e sem expor conteúdo a visitantes.
- **Word e folheto:** o folheto é produzido em A4 horizontal com três colunas; os itens do índice recebem estilo sem negrito e os gráficos/tabelas permanecem editáveis quando aplicável.
- **Interface:** ícones da barra lateral têm largura fixa e listas longas usam rolagem própria com cabeçalho fixo.
- **Testes:** `tests/v113-security.test.js` cobre a matriz de autorização, recuperação única, bloqueio de pasta concorrente, allowlist, folheto Word, mensagens e layout.

### Trabalho funcional incorporado nesta etapa

A implementação mantém e integra as funcionalidades que já estavam no manual: painel da carta escolar, símbolos e contagens nos mapas, limites e correspondência geográfica, exploração Access, importação/exportação, alfabetização e centros, cabeçalhos nas exportações, relatórios PDF/Word e sincronização por pacotes. Os pontos que dependem de validação visual de uma publicação específica devem ser confirmados com um PDF/Word de exemplo gerado no computador.


## Identificação da entrega

A compilação seguinte e os instaladores desta etapa usam a versão **1.15.0**. A numeração salta de 1.13.0 para 1.15.0 conforme solicitado pelo criador; não é criada uma versão 1.14.0 intermédia.


## Versão 1.16.0 — qualidade, governação e continuidade

A versão 1.16.0 acrescenta o Centro de Qualidade e Governação, com indicadores de escolas e centros carregados, conflitos por resolver e registos recusados. O fluxo recomendado para levantamentos é Rascunho → Validado → Revisto → Enviado → Aceite → Fechado. Retificações depois de Aceite ou Fechado devem conservar motivo, autor, data, valor anterior e novo valor no histórico operacional.

A sincronização passa a expor as fases Preparar, Receber, Validar, Enviar, Aplicar e Concluir. O diagnóstico técnico deve ser guardado quando houver falhas, conflitos ou problemas de descifra. A interface recebeu foco de teclado visível, maior contraste, suporte a redução de movimento, grelha adaptável e indicadores acessíveis.

A continuidade operacional mantém cópias locais automáticas, cópia manual antes de importações e restauração protegida. Antes de uma distribuição institucional, recomenda-se testar a leitura de uma cópia restaurada, a migração numa cópia isolada, a correspondência cadastro–shapefile, o folheto frente/verso e a numeração de páginas num Word/PDF real.

Esta versão não deve ser usada para eliminar dados sem cópia verificada. Dados pessoais e indicadores potencialmente identificáveis devem ser agregados ou restringidos conforme o perfil e a finalidade estatística.

## 1.17.0 (continuação da linha 1.16.0)
- **Correcção crítica:** o `app.js` da 1.16.0 tinha dois erros de sintaxe (um parêntese a mais na vista de mensagens, um a menos no centro de qualidade). Com eles, a janela abria mas o programa rebentava no arranque e ficava em branco ("abro e nada acontece"). Corrigidos; a aplicação arranca e as 48 provas automáticas passam. Nota: os ficheiros `app/v14.js`, `v19.js`, `v20.js` estão desfasados do `app.js` montado — nesta linha edita-se o `app.js` directamente e **não** se corre o `junta.py`.
- **Biblioteca de Indicadores (POEMA/EMIS):** nova aba em Ajuda > "Indicadores (POEMA)", pesquisável e por grupo (Acesso e participação, Eficácia interna, Professores e recursos humanos, Infra-estruturas e materiais). Cada indicador mostra definição, fórmula, numerador, denominador, unidade, fonte e a correspondência no EducStat, com etiqueta de origem (POEMA 2020 / adaptado / SNE). Distingue as mudanças do SNE (idades e classes oficiais do EP: POEMA 6–12 / 7 classes → SNE 6–11 / 6 classes). Fonte: Livro de Indicadores 09 Tete (POEMA, 2020/2022).

## 1.18.0 — mais temas, design e validação metodológica
- **Mais temas e cores:** 6 novas paletas modernas da interface (Índigo, Turquesa, Ardósia, Âmbar, Esmeralda, Carmim), com modo claro e escuro, em Aspecto > Cores. 4 novos temas de relatório (Índigo e âmbar, Turquesa e grafite, Azul ONU, Ardósia e céu).
- **Validação metodológica automática** (Qualidade): corre as regras dos mapas sobre todas as fichas do ano escolhido e acrescenta verificações agregadas — escolas com código duplicado e cobertura do levantamento abaixo de 95% —, separando erros bloqueantes de avisos a confirmar, com exemplos, exportação para Excel e atalho para o Explorar.
- **"Como é calculado?"**: botão no painel de indicadores que abre a Biblioteca de Indicadores (POEMA), com a definição e a fórmula de cada indicador.
- Testes: 51 provas passam.

## 1.19.0 — Painel EMIS (6 grupos)
- **Painel EMIS** no Painel de Indicadores: os indicadores organizados nos seis grupos do modelo EMIS — Acesso e participação, Eficácia interna, Qualidade e resultados, Professores e recursos humanos, Infra-estruturas e materiais, Equidade e inclusão — em cartões de KPI com o valor de cada indicador para o âmbito escolhido (ano, distrito, nível, tipo). Reaproveita `IX()`/`indicators()`; ligação directa a "Como é calculado?" (Biblioteca POEMA). Comparação entre distritos pelo Mapa Interactivo.
