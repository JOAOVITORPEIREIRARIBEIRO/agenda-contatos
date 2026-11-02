# Auditoria técnica — Agenda de Contatos

## Resumo executivo

Foi feita uma revisão estática dos arquivos `index.html`, `style.css` e `script.js`, com foco em segurança no navegador, integridade dos dados, confiabilidade e acessibilidade. Após a auditoria, foram implementadas correções selecionadas e adicionados testes de integração.

Nas revisões foram mapeados **5 riscos**: 4 médios e 1 baixo. A refatoração corrigiu a injeção ao renderizar IDs e removeu o script executável de CDN; o campo de busca também recebeu nome acessível. Permanecem pendentes o tratamento de dados inválidos/falhas de `localStorage` e a associação acessível dos erros dos campos.

O pedido menciona “Prompt 4”, mas não foi encontrado nenhum arquivo ou conteúdo com esse prompt no material disponível. A análise, portanto, seguiu o escopo explicitamente solicitado: os três arquivos indicados.

## Escopo e método

- Arquivos analisados: `index.html`, `style.css` e `script.js`.
- Tipo de análise inicial: leitura estática, sem execução do app.
- A implementação posterior foi validada com testes de integração automatizados em jsdom.
- Severidade considera impacto e condições necessárias para explorar/reproduzir o risco.

## Achados

### 1. ID persistido é interpolado em manipuladores JavaScript inline

- **Severidade:** Média
- **Confiança:** Alta (9/10)
- **Local:** `script.js`, função `renderContacts` (implementação anterior à correção)
- **Descrição:** `contact.id` é interpolado diretamente dentro de atributos `onclick` produzidos por `tr.innerHTML`. Os demais campos do contato passam por `escapeHtml`, mas o ID não. Se o valor persistido for adulterado para conter aspas e código JavaScript, o HTML do botão pode ser alterado e executar esse código quando acionado.
- **Condição/impacto:** Exige que um valor malicioso chegue ao `localStorage` da origem (por adulteração local ou por outro meio de escrita na mesma origem). Se ocorrer, o código executa no contexto do app e pode acessar os contatos armazenados.
- **Recomendação:** Evitar manipuladores inline e a construção de HTML com dados não confiáveis. Criar os botões com APIs do DOM, associar eventos com `addEventListener` e manter o ID em uma propriedade/dataset tratada como dado, não como código.
- **Status:** Resolvido. A renderização agora cria nós do DOM e escreve valores com `textContent`; os eventos são associados com `addEventListener`.

### 2. Dados do `localStorage` são carregados sem tratamento de erro ou validação de estrutura

- **Severidade:** Média
- **Confiança:** Alta (9/10)
- **Local:** `script.js`, linhas 2–3 e 47
- **Descrição:** A leitura e o `JSON.parse` ocorrem durante a inicialização, sem proteção contra JSON inválido e sem validar se o valor é uma lista de contatos válidos. JSON corrompido interrompe a execução do script; valores de outro tipo ou registros com `name` ausente/não textual podem causar erro durante `filter`/`renderContacts`.
- **Impacto:** O app pode deixar de iniciar ou de mostrar a agenda até que o dado inválido seja removido manualmente do armazenamento do navegador.
- **Recomendação:** Tratar erros de leitura/parse com uma mensagem explícita ao usuário e validar o formato dos dados antes de usá-los. Não substituir silenciosamente dados inválidos por uma lista vazia, pois isso pode mascarar perda ou corrupção de dados.

### 3. Falhas de escrita no armazenamento não são tratadas

- **Severidade:** Média
- **Confiança:** Alta (9/10)
- **Local:** `script.js`, linhas 21–23 e fluxos de cadastro/exclusão
- **Descrição:** `localStorage.setItem` pode falhar, por exemplo, por quota excedida ou indisponibilidade do armazenamento. A falha não é capturada. Além disso, no cadastro/edição o alerta de sucesso é exibido antes da gravação, e no cadastro/exclusão o estado em memória é alterado antes de persistir.
- **Impacto:** O usuário pode receber confirmação de sucesso sem que os dados tenham sido gravados. Em caso de erro, a tela pode ficar inconsistente com os dados mantidos após recarregar.
- **Recomendação:** Tratar falhas de persistência e informar claramente que a alteração não foi salva. Só confirmar sucesso depois da gravação; preservar ou restaurar o estado em memória caso a persistência falhe.

### 4. Tailwind é carregado de um CDN como script executável externo

- **Severidade:** Média (revisão de segurança do Prompt 1)
- **Confiança:** Alta (9/10)
- **Local:** `index.html`, linha 8 (implementação anterior à correção)
- **Descrição:** O app executa Tailwind a partir de `https://cdn.tailwindcss.com`, sem fixação de versão nem Subresource Integrity. Isso cria dependência de disponibilidade e confiança em um serviço externo, além de dar ao script carregado a capacidade de executar no contexto da página.
- **Impacto:** Indisponibilidade ou alteração/comprometimento do recurso externo pode afetar a interface ou a segurança da página.
- **Recomendação:** Para produção, gerar o CSS durante o build e servi-lo junto com o app. Se a dependência externa for mantida, avaliar uma estratégia de versão e integridade compatível com o recurso.
- **Status:** Resolvido. O script do CDN foi removido e a interface passou a usar estilos locais em `style.css`.

### 5. Controles e erros do formulário têm suporte incompleto para tecnologias assistivas

- **Severidade:** Baixa
- **Confiança:** Alta (8/10)
- **Local:** `index.html`, campos do formulário, mensagens de erro e busca
- **Descrição:** As mensagens de erro não estão associadas aos respectivos campos por `aria-describedby` e os campos não recebem estado `aria-invalid`. O formulário usa `novalidate`, portanto a validação nativa do navegador não substitui essas lacunas.
- **Impacto:** Usuários de leitores de tela podem não perceber corretamente os erros de validação.
- **Recomendação:** Relacionar cada erro ao campo correspondente e atualizar também o estado de validade acessível.
- **Status:** Parcialmente resolvido. O campo de busca agora tem `aria-label`; a associação e o estado acessível dos erros do formulário permanecem pendentes.

## Pontos positivos observados

- Valores de contatos são inseridos na tabela como texto via `textContent`, sem interpretação como HTML.
- A mensagem de alerta recebe conteúdo via `textContent`, evitando interpretar a mensagem como HTML.
- Os campos obrigatórios de nome e e-mail têm validação explícita no envio do formulário.

## Ordem recomendada de tratamento

1. Validar e tratar os dados carregados do armazenamento.
2. Tratar falhas de gravação e evitar mensagens de sucesso quando a persistência falhar.
3. Completar associações acessíveis e estados dos erros do formulário.

## Execução dos Prompts 1, 3 e 2

### Prompt 1 — Auditoria de segurança

- Não foram encontrados segredos ou credenciais nos três arquivos revisados.
- A validação de nome/e-mail é feita no cliente e pode ser contornada; como os arquivos revisados não implementam backend nem operações remotas, ela não protege recursos de servidor.
- Autenticação e políticas de acesso no servidor não se aplicam ao app estático revisado. A hospedagem/servidor não foi inspecionada.
- O risco do script Tailwind remoto foi corrigido removendo a dependência executável e mantendo o CSS local.

### Prompt 3 — Testes de integração

- Adicionado `npm test` com quatro testes automatizados em `tests/agenda.test.js`.
- Cobertura: cadastro, busca, edição, exclusão, validação, renderização segura de conteúdo/IDs e ausência do script remoto.
- Cada teste cria uma instância jsdom com origem e `localStorage` próprios em memória; nenhum banco ou armazenamento de produção é acessado.
- Resultado da execução: **4 testes aprovados, 0 falhas**.

### Prompt 2 — Refatoração segura

- A renderização de contatos foi organizada para criar elementos DOM explicitamente e inserir conteúdo como texto, sem interpolar dados persistidos em HTML.
- Os botões de edição/exclusão usam listeners em vez de atributos `onclick`.
- A folha de estilos local substituiu as classes utilitárias dependentes do script CDN; o campo de busca recebeu um nome acessível.
- Os fluxos existentes de CRUD, busca e validação foram preservados e exercitados pelos testes.

## Limitações

Os fluxos foram validados em jsdom, mas não houve teste em navegador real, análise completa de dependências, verificação de cabeçalhos de segurança ou revisão da infraestrutura de hospedagem. Esses itens devem ser avaliados antes de uma implantação em produção.

# Agenda de Contatos — Sistema Simples (CRUD)

Sistema web simples para gerenciamento de contatos, desenvolvido com HTML5, CSS3 e JavaScript (Vanilla) com persistência de dados em `localStorage`.

## Link do Sistema Publicado (Deploy)

👉 **[Acessar Agenda de Contatos Online](https://SEU-USUARIO.github.io/agenda-contatos/)**

---

## Tecnologias Utilizadas

- **HTML5** (Estruturação semântica e acessibilidade)
- **CSS3** (Estilização local responsiva)
- **JavaScript Pure / Vanilla** (Manipulação do DOM, regras de CRUD e validações)
- **localStorage** (Persistência no navegador)
- **Node.js & JSDOM / Vitest** (Ambiente de testes de integração)
- **GitHub Pages** (Hospedagem pública gratuita)

---

## Funcionalidades

- **Cadastrar:** Registro de nome, e-mail, telefone e observações.
- **Listar:** Exibição dinâmica dos contatos em tabela.
- **Buscar:** Filtro em tempo real pelo campo Nome.
- **Editar:** Edição dos dados de registros existentes.
- **Excluir:** Remoção de contatos com diálogo de confirmação.
- **Validação:** Verificação obrigatória de nome e formato de e-mail no cliente com alertas visuais.

---

## Suíte de Testes Automatizados (Prompt 3)

Os testes de integração cobrem a criação de nós no DOM, fluxos CRUD, validações e renderização segura sem scripts externos.

Para rodar os testes localmente:

```bash
# 1. Instalar as dependências de desenvolvimento
npm install

# 2. Executar os testes
npm test
```
