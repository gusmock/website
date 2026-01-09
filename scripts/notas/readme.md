# Portal de Notas Acadêmicas (Google Apps Script)

Este sistema é uma aplicação web segura ("Serverless") hospedada no Google Apps Script. Ele permite que alunos consultem suas notas, frequências e estatísticas de desempenho individual comparadas à turma e ao histórico da disciplina, tudo alimentado diretamente por uma Planilha Google.

O sistema inclui autenticação automática via e-mail institucional (Unicamp), sistema de logs robusto contra conflitos de acesso simultâneo e gráficos estatísticos avançados.

## 🚀 Funcionalidades

* **Autenticação Institucional:** Identifica o aluno automaticamente pelo e-mail logado (`@dac.unicamp.br` ou `@unicamp.br`) e extrai o RA (Registro Acadêmico).
* **Privacidade:** O aluno vê **apenas** os seus próprios dados.
* **Comparativo Estatístico (Histogramas):**
    * **Visualização Combo:** Sobrepõe a nota do aluno, a distribuição da turma atual (Barras Azuis), o histórico geral da disciplina (Barras Laranjas) e a Curva Normal ideal (Cinza).
* **Logs de Acesso Seguros:** Sistema com `LockService` que garante o registro correto mesmo se 50 alunos acessarem no mesmo milissegundo.
* **Formatação Visual:** O sistema respeita as cores de fundo e fonte da planilha (ex: notas vermelhas na planilha aparecem vermelhas no site).

---

## 🛠️ Configuração da Planilha (Entradas)

O script varre todas as abas da planilha. Para que uma aba seja reconhecida como uma disciplina/turma, ela deve seguir regras estritas de cabeçalho.

### 1. Estrutura das Abas de Disciplinas
Você pode ter várias abas (ex: "ES601-2024", "ES601-2023"). O script agrupa tudo.

**Colunas Obrigatórias (Identificadas pelo Cabeçalho na Linha 1):**

| Palavra-Chave no Cabeçalho | Função no Sistema | Exemplo de Uso |
| :--- | :--- | :--- |
| **RA** | **Fundamental.** Identifica o aluno. | `123456` |
| **MP** ou **MÉDIA PARCIAL** | Define a nota parcial para estatísticas. | `5.0` |
| **NF** ou **NOTA FINAL** | Define a nota final para estatísticas. | `8.5` |
| **OFERECIMENTO** ou **TURMA** | Separa estatísticas da turma atual vs. histórico. | `1s2024`, `2023` |
| **FALTA** ou **FREQ** | Colunas contendo estes termos são tratadas como inteiros (sem casas decimais). | `Faltas (h)`, `% Freq` |

> **Nota:** Qualquer outra coluna (ex: `P1`, `P2`, `Seminário`) será exibida na tabela, mas não gerará gráficos estatísticos.

### 2. Abas Ignoradas
O script **não** lê dados das seguintes abas (nomes reservados):
* `Logs` (Gerada automaticamente pelo sistema)
* `Gabarito`
* `Configurações`
* `Base`
* `Respostas`

### 3. Exemplo de Formatação de Tabela

| RA | Nome | P1 | P2 | MP | Exame | NF | Faltas | OFERECIMENTO |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 198200 | João Silva | 5.0 | 7.0 | 6.0 | - | 6.0 | 4 | 1s2025 |
| 201300 | Maria Souza | 3.0 | 4.0 | 3.5 | 6.0 | 5.0 | 0 | 1s2025 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

## 💻 Implementação no Google Apps Script

1.  Crie uma nova Planilha Google.
2.  Vá em **Extensões** > **Apps Script**.
3.  Você terá dois arquivos principais: `Código.gs` (Backend) e `index.html` (Frontend).

### Passo 1: Configurar o `Código.gs`
Copie o código Javascript fornecido para o arquivo `.gs`.

**Ajuste de Domínio (Opcional):**
O script atual está configurado para extrair RAs do domínio da Unicamp.
```javascript
// Linha 12
raUsuario = (partesEmail[1].indexOf("dac.unicamp.br") !== -1) ? ...
```

### Passo 2: Configurar o `index.html`
Crie um arquivo HTML chamado `index.html` no editor do Apps Script e cole o código HTML/CSS/JS fornecido.

### Passo 3: Deploy (Publicação Crítica)
Para que o `Session.getActiveUser()` funcione corretamente e capture o e-mail do aluno:

1. Clique no botão azul **Implantar** (Deploy) > **Nova implantação**.
2. **Tipo:** App da Web.
3. **Configurações:**
    * **Descrição:** V1 Portal Notas
    * **Executar como:** *Eu* (Sua conta de professor).
        > **Motivo:** O script precisa de permissão para ler SUA planilha e escrever na aba Logs.
    * **Quem pode acessar:** *Qualquer pessoa com Conta Google* (ou *Qualquer pessoa no domínio Unicamp*).
4. Copie a URL gerada e envie aos alunos.

---

## 📈 Motor Estatístico e Cálculos

O sistema não apenas exibe notas brutas, mas processa os dados para gerar insights comparativos. Abaixo está a lógica matemática implementada na função `calcularEstatisticas` e `calcularNormal`.

### 1. Métricas Fundamentais
Para cada conjunto de dados (Turma Atual vs. Histórico Geral), o sistema calcula:

* **Média ($\mu$):** Média aritmética simples de todas as notas válidas.
* **Desvio Padrão ($\sigma$):** Medida de dispersão que indica o quanto as notas variam em relação à média.

### 2. Construção do Histograma (Discretização)
As notas são contínuas (ex: 5.3, 8.7), mas para o gráfico de barras, elas são agrupadas em "gavetas" (bins) com precisão de **0.5**.

* **Intervalo:** 0.0 a 10.0.
* **Total de Bins:** 21 intervalos.
* **Lógica de Arredondamento:** O script multiplica a nota por 2 e arredonda para o inteiro mais próximo para encontrar o índice do vetor.
    > Exemplo: Uma nota `5.2` é tratada como `5.0`. Uma nota `5.3` é tratada como `5.5`.

### 3. Curva de Distribuição Normal (Gaussiana)
A linha cinza ao fundo do gráfico representa a distribuição teórica ideal baseada na média e desvio padrão do histórico geral. Ela ajuda o aluno a visualizar se a turma teve um desempenho "típico" ou atípico.

* **Ajuste de Escala:** Como a função de densidade retorna valores baixos (a área sob a curva é 1), o script aplica um **Fator de Escala (x50)** para que a linha fique visível e proporcional às barras de frequência do gráfico.

### 4. Comparativo de Contexto
O script separa os dados em dois contextos para cada gráfico:

1.  **Contexto Local (Turma):** Filtra apenas as linhas onde a coluna `OFERECIMENTO` é igual à do aluno logado (ex: apenas alunos de "1s2024").
2.  **Contexto Global (Geral):** Utiliza todas as linhas da planilha com notas válidas. Isso permite que o aluno veja se, historicamente, a disciplina é "difícil" ou se a nota dele está dentro do esperado a longo prazo.

---

## 🔒 Sistema de Logs e Segurança

### Como funciona o Registro de Acesso
O script possui uma função chamada `registrarAcesso` que cria (se não existir) uma aba chamada `Logs`.

* **LockService:** O código utiliza `lock.waitLock(10000)`. Isso cria uma "fila de espera" de até 10 segundos. Se dois alunos abrirem o site exatamente ao mesmo tempo, o script processa um registro de cada vez, garantindo que nenhuma linha seja sobrescrita ou perdida na aba Logs.

### Tratamento de Erros de Login
Se o aluno estiver logado com um Gmail pessoal (`@gmail.com`) e não o institucional, o Google Apps Script muitas vezes retorna o e-mail em branco por questões de privacidade.

* **Solução Implementada:** O script detecta e-mail vazio e exibe um **Overlay (Pop-up)** instruindo o aluno a abrir o link em uma **Janela Anônima** e logar apenas com o e-mail institucional.

---

## 📊 Entendendo os Gráficos
O script gera dois gráficos de combinação (ComboChart) para cada disciplina: **Média Parcial (MP)** e **Nota Final (NF)**.

* **Eixo X:** Notas de 0 a 10 (agrupadas a cada 0.5 pontos).
* **Séries:**
    * 🟦 **Barras Azuis Escuras:** Distribuição da turma atual (filtro pela coluna `OFERECIMENTO` mais recente do aluno).
    * 🟧 **Barras Laranjas:** Histórico de todos os alunos que já passaram pela disciplina (todas as linhas da planilha).
    * 🌫️ **Área Cinza:** Curva de Distribuição Normal teórica baseada na média e desvio padrão histórico.
* **Anotação:** O gráfico coloca um texto "Você" exatamente acima da barra correspondente à nota do aluno.

## 🎨 Personalização Visual (CSS)
Toda a estilização está no `index.html`.

* **Responsividade:** O layout se adapta a celulares (`table-wrapper` permite rolagem horizontal da tabela de notas sem quebrar o layout).
