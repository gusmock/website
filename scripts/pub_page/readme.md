# Portfolio Acadêmico Dinâmico (Google Apps Script)

Este projeto é uma aplicação web completa ("Serverless") hospedada no Google Apps Script. Ele gera um site de portfólio acadêmico dinâmico, responsivo e multilíngue (PT/EN/FR) alimentado diretamente por uma planilha do Google Sheets.

O sistema inclui automação para buscar metadados de publicações (via OpenAlex), visualização de nuvem de palavras, mapas de colaboração e métricas de impacto (Altmetric, Dimensions, PlumX).

## 🚀 Funcionalidades

* **Front-end Moderno:** Design responsivo, limpo e com suporte a filtragem instantânea.
* **Multilíngue:** Tradução automática de categorias e interface em Português, Inglês e Francês.
* **Automação de Metadados:** Um robô preenche automaticamente citações formatadas, palavras-chave e datas usando apenas o DOI (via API OpenAlex).
* **Visualização de Dados:**
    * **Nuvem de Palavras Híbrida:** Gera tags baseadas em palavras-chave manuais e análise dos títulos das publicações.
    * **Mapa de Colaboração:** Mapa mundi interativo (Google GeoCharts).
    * **Indicadores ODS:** Exibição visual dos Objetivos de Desenvolvimento Sustentável vinculados.
    * **Métricas Alternativas:** Badges automáticos de impacto (Altmetric, Dimensions, PlumX).
* **Cache Inteligente:** Sistema de cache para evitar limites de cota da API do Google Tradutor e acelerar o carregamento.

---

## 🛠️ Configuração da Planilha (Entradas)

O script lê os dados de uma Planilha Google. A estrutura das abas (sheets) é rígida e deve seguir o padrão abaixo.

### 1. Abas de Conteúdo (Publicações)
Você pode criar quantas abas quiser para categorizar suas publicações (ex: "Artigos", "Livros", "Congressos"). O nome da aba será o título da seção no site.

**Colunas Obrigatórias (Cabeçalho na Linha 1):**
O script identifica as colunas pelo nome (não importa a ordem, desde que contenham as palavras-chave abaixo):

| Nome da Coluna (Sugestão) | Descrição / Regra |
| :--- | :--- |
| **Citação** | O texto completo da referência. Se estiver vazio, o robô tentará preencher via DOI. |
| **DOI** | O identificador digital (ex: `10.1016/j.article...`). Essencial para o robô e para os badges. |
| **Data** | Data da publicação (Ano ou DD/MM/AAAA). Usado para ordenação. |
| **Palavras-chave** | Termos separados por vírgula. Usados na Nuvem de Palavras. |
| **Internacional** | Se preenchido com `Sim`, adiciona um badge "Internacional". |
| **Link 1** | URL para o artigo/PDF/GitHub. O script gera um botão automático. |
| **Link 2** | URL secundária (opcional). |
| **Link 3** | URL terciária (opcional). |
| **Preprint** | Link para o preprint. Se preenchido, gera um badge roxo. |

### 2. Aba "Perfil" (Obrigatória)
Esta aba alimenta o cabeçalho de estatísticas e os ícones ODS.

| Coluna A (Rótulo) | Coluna B (Valor) |
| :--- | :--- |
| Citações Totais | 1500 |
| Índice H | 20 |
| Artigos Publicados | 45 |
| **ODS** | `3, 6, 9, 12` (Números dos objetivos separados por vírgula) |

> **Nota:** Qualquer linha onde o Rótulo contenha "ODS" será tratada como lista de ícones da ONU. As outras linhas viram caixas de estatísticas.

### 3. Aba "Mapa" (Obrigatória para o Mapa)
Alimenta o gráfico de colaborações internacionais.

| País | Publicações |
| :--- | :--- |
| US | 5 |
| FR | 3 |
| BR | 2 |

### 4. Abas Ignoradas
As abas com nomes `Mapa`, `Perfil` e `Config` são ignoradas na listagem de publicações, assim como qualquer aba oculta.

---

## 💻 Implementação no Google Apps Script

1.  Crie uma nova Planilha Google.
2.  Vá em **Extensões** > **Apps Script**.
3.  Você terá dois arquivos principais: `Código.gs` (Backend) e `index.html` (Frontend).

### Passo 1: Configurar o `Código.gs`
Copie o código Javascript fornecido para o arquivo `.gs`.

**⚠️ Ajustes Necessários no Código:**
Procure a função `gerarCitacao(json)` e a função `buscarDadosOpenAlex(doi)` para personalizar:

1.  **Destaque do Autor:**
    Altere a variável `ehVoce` para reconhecer seu sobrenome e colocar em negrito/caixa alta automaticamente.
    ```javascript
    var ehVoce = (nomeLimpo === "seu-sobrenome" || ...);
    ```
2.  **E-mail de Contato (Boa Prática):**
    Na função `buscarDadosOpenAlex`, altere o header `User-Agent` para seu email real (exigência da API OpenAlex para melhor performance).
    ```javascript
    "User-Agent": "mailto:seu-email@exemplo.com"
    ```

### Passo 2: Configurar o `index.html`
Crie um arquivo HTML chamado `index.html` no editor do Apps Script e cole o código HTML/CSS/JS fornecido.

### Passo 3: Deploy (Publicação)
1.  Clique no botão azul **Implantar** (Deploy) > **Nova implantação**.
2.  Selecione o tipo: **App da Web**.
3.  Configurações:
    * **Descrição:** V1
    * **Executar como:** *Eu* (seu email).
    * **Quem pode acessar:** *Qualquer pessoa* (para que o site seja público).
4.  Copie a URL gerada. Este é o link do seu site.

---

## 🤖 Como usar o Robô de Manutenção

O script possui uma função poderosa chamada `preencherDadosFaltantes`. Ela serve para preencher sua planilha automaticamente.

**Como executar:**
1.  Na planilha, preencha apenas a coluna **DOI** dos seus novos artigos.
2.  No editor do Apps Script, selecione a função `preencherDadosFaltantes` na barra de ferramentas superior.
3.  Clique em **Executar**.
4.  Aguarde os logs. O script irá:
    * Ler o DOI.
    * Consultar o OpenAlex.
    * Preencher a **Citação** (formatada ABNT/Custom), **Data** e **Palavras-chave** (se estiverem vazios).

> **Dica:** Você pode criar um "Acionador" (Trigger) no menu do Apps Script (ícone de relógio) para rodar essa função semanalmente, caso adicione DOIs com frequência.

---

## 🎨 Personalização Visual (CSS)

Toda a estilização está no arquivo `index.html` dentro da tag `<style>`.

* **Cores:** O tema usa tons de roxo (`#4a235a`, `#8e44ad`). Busque e substitua esses hexadecimais para mudar a cor da marca.
* **Fontes:** Utiliza `Bitter` (serifada) para corpo e `Montserrat` (sans-serif) para títulos, importadas do Google Fonts.
* **Badges de Link:** A função `createShieldHtml` no Javascript do HTML define as cores dos botões (PDF, GitHub, Zenodo) baseada na URL.

## 📦 Dependências Externas (CDNs)

O projeto consome as seguintes bibliotecas via CDN (já inclusas no HTML):
* **AnyChart:** Para a nuvem de palavras.
* **Google Charts:** Para o mapa mundi.
* **Altmetric / Dimensions / PlumX:** Scripts oficiais para os badges de métricas.
* **FontAwesome (via Google Fonts):** Para tipografia.

---

## ⚠️ Limites e Cotas
* **Google Translate:** O script usa `LanguageApp`. Existe uma cota diária. O sistema de Cache (`CacheService`) implementado no código reduz drasticamente o consumo, armazenando traduções por 6 horas.
* **Tempo de Execução:** Scripts do Google têm limite de tempo (6 min). A leitura das abas foi otimizada (`sheets.forEach` e leitura em lote) para ser extremamente rápida.
