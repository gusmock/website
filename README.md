# Website - Prof. Gustavo Mockaitis (Unicamp)

Este repositório armazena os códigos-fonte das aplicações web ("Web Apps") integradas ao site pessoal e acadêmico do Prof. Gustavo Mockaitis.

🌐 **Website Oficial:** [feagri.unicamp.br/mockaitis](http://feagri.unicamp.br/mockaitis) (ou [Google Sites Mirror](https://sites.google.com/unicamp.br/mockaitis))

O site é construído sobre a plataforma **Google Sites**, mas utiliza módulos dinâmicos desenvolvidos em **Google Apps Script** para fornecer funcionalidades avançadas como consulta segura de notas e portfólio de pesquisa interativo.

---

## 📂 Estrutura do Repositório

O código está organizado em duas aplicações principais, localizadas dentro da pasta `scripts`:

| Diretório | Aplicação | Descrição |
| :--- | :--- | :--- |
| **[`/scripts/notas`](./scripts/notas)** | **Portal de Notas** | Sistema seguro de consulta de notas e frequências para alunos da graduação/pós. |
| **[`/scripts/pub_page`](./scripts/pub_page)** | **Publicações** | Portfólio dinâmico de produção bibliográfica, com métricas e filtros. |

---

## 1. Portal de Notas (Ensino)
📍 **Acesse em:** [mockaitis/ensino/portal-de-notas](https://sites.google.com/unicamp.br/mockaitis/ensino/portal-de-notas)

Este módulo é um sistema "Serverless" focado na privacidade e no feedback pedagógico para os alunos.

* **Contexto:** Permite que alunos matriculados nas disciplinas consultem seu desempenho sem expor suas notas publicamente em listas de papel ou PDFs.
* **Funcionalidades Principais:**
    * **Autenticação Automática:** Identifica o aluno pelo login institucional (`@dac.unicamp.br` ou `@unicamp.br`).
    * **Privacidade:** O aluno visualiza estritamente os seus próprios dados.
    * **Feedback Estatístico:** Gera gráficos comparativos (Histogramas e Curvas Normais) mostrando a posição do aluno em relação à turma atual e ao histórico da disciplina.
    * **Dados:** Alimentado em tempo real por uma planilha Google Sheets privada do professor.

---

## 2. Portfólio Dinâmico (Pesquisa)
📍 **Acesse em:** [mockaitis/pesquisa/publicações_1](https://sites.google.com/unicamp.br/mockaitis/pesquisa/publicações_1)

Este módulo substitui listas estáticas de publicações por um painel interativo e rico em dados.

* **Contexto:** Apresentação da produção científica (Artigos, Livros, Congressos) com foco em bibliometria e facilidade de acesso aos textos completos.
* **Funcionalidades Principais:**
    * **Nuvem de Palavras:** Extrai temas recorrentes dos títulos e palavras-chave para filtragem rápida.
    * **Enriquecimento de Dados:** Um robô consulta a API do **OpenAlex** via DOI para preencher automaticamente citações ABNT e metadados faltantes.
    * **Métricas de Impacto:** Exibe badges dinâmicos de *Altmetric*, *Dimensions* e *PlumX*.
    * **Mapa de Colaboração:** Visualização geográfica dos países coautores.
    * **Multilíngue:** Interface traduzida automaticamente (PT/EN/FR).

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
* **Backend:** Google Apps Script (V8 Runtime).
* **Database:** Google Sheets (como banco de dados relacional simplificado).
* **APIs Externas:** OpenAlex (Metadados), Google Charts (Mapas/Gráficos), AnyChart (WordCloud).
* **Hospedagem:** Google Cloud (via Apps Script Web App deployment).

## 🚀 Como Integrar

Ambos os scripts são implantados como **Web Apps** com permissão de execução definida como "Eu" (Owner) e acesso "Qualquer pessoa" (ou restrito ao domínio, no caso das notas). O link gerado (`script.google.com/macros/s/...`) é então inserido no Google Sites através da ferramenta **"Incorporar" (Embed)**.
Para maiores informações, consulte as pastas dos scripts.

---
*Mantido por Gustavo Mockaitis | [GitHub Profile](https://github.com/gusmock)*
