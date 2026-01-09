function doGet(e) {
  try {
    var userEmail = Session.getActiveUser().getEmail();

    // 1. Identificação
    var emailIdentificado = true;
    var raUsuario = "";
    
    if (!userEmail || userEmail === "") {
      emailIdentificado = false;
    } else {
      var partesEmail = userEmail.split('@');
      if (partesEmail.length > 1) {
        raUsuario = (partesEmail[1].indexOf("dac.unicamp.br") !== -1) ? partesEmail[0].substring(1) : partesEmail[0];
        raUsuario = raUsuario.trim().toLowerCase();
      } else {
        emailIdentificado = false;
      }
    }

    // --- LOG DE ACESSO (Agora com proteção contra conflitos) ---
    if (emailIdentificado) {
      registrarAcesso(userEmail, raUsuario);
    }
    // -----------------------------------------------------------

    // 2. Leitura
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var abasIgnoradas = ['Gabarito', 'Configurações', 'Base', 'Respostas', 'Logs']; // 'Logs' ignorada
    
    var dadosParaOFrontend = {
      temDados: false,
      emailIdentificado: emailIdentificado,
      usuario: userEmail,
      ra: raUsuario,
      abas: []
    };

    if (emailIdentificado) {
      allSheets.forEach(function(sheet) {
        var nomeAba = sheet.getName();
        if (abasIgnoradas.indexOf(nomeAba) !== -1) return;

        var data = sheet.getDataRange().getValues();
        if (data.length < 2) return; 

        var header = data[0];
        var bgColors = sheet.getDataRange().getBackgrounds();
        var fontColors = sheet.getDataRange().getFontColors();

        // Mapeamento
        var idxRA = -1, idxMP = -1, idxNF = -1, idxOfer = -1;
        var indicesFalta = [];
        
        for (var k = 0; k < header.length; k++) {
          var col = String(header[k]).toUpperCase().trim();
          if (col === 'RA') idxRA = k;
          if (col === 'MP' || col === 'MEDIA PARCIAL' || col === 'MÉDIA PARCIAL') idxMP = k; 
          if (col === 'NF' || col === 'NOTA FINAL' || col === 'MÉDIA FINAL') idxNF = k;    
          if (col === 'OFERECIMENTO' || col === 'TURMA' || col === 'ANO') idxOfer = k;
          if (col.indexOf('FALTA') !== -1 || col.indexOf('FREQ') !== -1) indicesFalta.push(k);
        }

        if (idxRA === -1) return; 

        // Filtra linhas do aluno
        var ocorrenciasAluno = [];
        for (var i = 1; i < data.length; i++) {
          var celulaRA = String(data[i][idxRA]).trim().toLowerCase();
          if (celulaRA === raUsuario) {
            var ofertaAtual = (idxOfer !== -1) ? String(data[i][idxOfer]) : "Único";
            ocorrenciasAluno.push({
              linha: i,
              dados: data[i],
              bgs: bgColors[i],
              fonts: fontColors[i],
              oferecimento: ofertaAtual
            });
          }
        }

        if (ocorrenciasAluno.length > 0) {
          dadosParaOFrontend.temDados = true;

          // Ordenação
          ocorrenciasAluno.sort(function(a, b) {
            return b.oferecimento.localeCompare(a.oferecimento, undefined, {numeric: true, sensitivity: 'base'});
          });
          
          var ultimaOcorrencia = ocorrenciasAluno[0];
          var oferecimentoRecente = ultimaOcorrencia.oferecimento;

          // Lógica de Visibilidade
          var indicesVisiveis = [];
          for (var c = 0; c < header.length; c++) {
            var temDado = false;
            for (var r = 0; r < ocorrenciasAluno.length; r++) {
              var valor = ocorrenciasAluno[r].dados[c];
              if (ehDadoValido(valor)) {
                temDado = true;
                break; 
              }
            }
            if (temDado) indicesVisiveis.push(c);
          }

          var minhasNotasMP = [], minhasNotasNF = [];
          ocorrenciasAluno.forEach(ocr => {
            if (idxMP !== -1 && isNumeric(ocr.dados[idxMP])) {
              minhasNotasMP.push({ valor: parseFloat(ocr.dados[idxMP]), oferta: ocr.oferecimento });
            }
            if (idxNF !== -1 && isNumeric(ocr.dados[idxNF])) {
              minhasNotasNF.push({ valor: parseFloat(ocr.dados[idxNF]), oferta: ocr.oferecimento });
            }
          });

          var notasTurmaMP = [], notasTurmaNF = [];
          var notasGeralMP = [], notasGeralNF = [];

          for (var i = 1; i < data.length; i++) {
            var valMP = (idxMP !== -1 && isNumeric(data[i][idxMP])) ? parseFloat(data[i][idxMP]) : null;
            var valNF = (idxNF !== -1 && isNumeric(data[i][idxNF])) ? parseFloat(data[i][idxNF]) : null;
            var valOfer = (idxOfer !== -1) ? String(data[i][idxOfer]) : "Único";

            if (valMP !== null) notasGeralMP.push(valMP);
            if (valNF !== null) notasGeralNF.push(valNF);

            if (valOfer === oferecimentoRecente) {
              if (valMP !== null) notasTurmaMP.push(valMP);
              if (valNF !== null) notasTurmaNF.push(valNF);
            }
          }

          dadosParaOFrontend.abas.push({
            nome: nomeAba,
            oferecimentoExibido: oferecimentoRecente,
            header: header, 
            indicesVisiveis: indicesVisiveis,
            indicesFalta: indicesFalta,
            ocorrencias: ocorrenciasAluno, 
            minhasNotasMP: minhasNotasMP,
            minhasNotasNF: minhasNotasNF,
            stats: {
              turma: {
                mp: calcularEstatisticas(notasTurmaMP),
                nf: calcularEstatisticas(notasTurmaNF)
              },
              geral: {
                mp: calcularEstatisticas(notasGeralMP),
                nf: calcularEstatisticas(notasGeralNF)
              }
            }
          });
        }
      });
    }

    var jsonDados = JSON.stringify(dadosParaOFrontend);
    var htmlFinal = getHtmlContent(jsonDados);
    
    return HtmlService.createHtmlOutput(htmlFinal)
      .setTitle("Portal de Notas - Prof. Gustavo Mockaitis")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } catch (erro) {
    return HtmlService.createHtmlOutput("<h3>Erro no sistema:</h3><p>" + erro.message + "</p>");
  }
}

// --- FUNÇÃO DE LOG ROBUSTA (COM LOCK) ---
function registrarAcesso(email, ra) {
  // Usa LockService para evitar erro se dois alunos entrarem no mesmo milissegundo
  var lock = LockService.getScriptLock();
  try {
    // Tenta obter acesso exclusivo por 10 segundos
    lock.waitLock(10000); 
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetLogs = ss.getSheetByName('Logs');

    if (!sheetLogs) {
      sheetLogs = ss.insertSheet('Logs');
      sheetLogs.appendRow(['Data e Hora', 'Email', 'RA']);
      sheetLogs.setFrozenRows(1);
    }

    // Adiciona o registro no final
    sheetLogs.appendRow([new Date(), email, ra]);
    
  } catch (e) {
    console.log("Erro ao salvar log: " + e.message);
  } finally {
    // Libera o acesso para o próximo aluno
    lock.releaseLock(); 
  }
}
// ----------------------------------------

function ehDadoValido(valor) {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'number') return true;
  var s = String(valor).trim();
  if (s === "") return false;
  if (s === "-") return false;
  if (s === "—") return false;
  if (s === "#N/A") return false;
  if (s === "#VALUE!") return false;
  if (s === "#DIV/0!") return false;
  return true;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function calcularEstatisticas(arr) {
  var hist = new Array(21).fill(0);
  if (!arr || arr.length === 0) return { media: 0, desvio: 0, histograma: hist, n: 0 };
  
  var soma = arr.reduce((a, b) => a + b, 0);
  var media = soma / arr.length;
  var somaDiff = arr.reduce((a, b) => a + Math.pow(b - media, 2), 0);
  var desvio = Math.sqrt(somaDiff / arr.length);

  arr.forEach(n => {
    var idx = Math.round(n * 2);
    if (idx >= 0 && idx <= 20) hist[idx]++;
    if (idx > 20) hist[20]++;
  });

  return { 
    media: parseFloat(media.toFixed(1)), 
    desvio: parseFloat(desvio.toFixed(1)), 
    n: arr.length,
    histograma: hist
  };
}

function getHtmlContent(jsonDados) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <base target="_top">
    <script src="https://www.gstatic.com/charts/loader.js"></script>
    <style>
      body { font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; background: #f4f4f9; color: #333; margin: 0; padding: 20px; }
      .container { max-width: 1000px; margin: auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { color: #004d99; margin-bottom: 5px; }
      .subtitle { color: #666; font-size: 0.9em; margin-bottom: 25px; }
      .intro { margin-bottom: 20px; color: #555; line-height: 1.5; }
      
      #overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.85); z-index: 1000;
        display: flex; justify-content: center; align-items: center;
      }
      .overlay-content {
        background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;
        text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      }
      .overlay-content h2 { color: #c62828; margin-top: 0; }
      .overlay-content ul { text-align: left; margin: 20px 0; color: #444; }
      .overlay-content li { margin-bottom: 10px; }
      .btn-fechar {
        background-color: #004d99; color: white; border: none; padding: 12px 25px;
        font-size: 16px; border-radius: 4px; cursor: pointer; margin-top: 15px;
      }
      .btn-fechar:hover { background-color: #003366; }

      select { padding: 10px; width: 100%; margin: 15px 0; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
      .table-wrapper { overflow-x: auto; margin-bottom: 10px; border: 1px solid #eee; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; min-width: 600px; }
      th { background: #004d99; color: white; padding: 12px; text-align: left; position: sticky; top: 0; }
      td { padding: 12px; border-bottom: 1px solid #eee; }

      .user-id-footer { text-align: right; font-size: 0.85em; color: #777; margin-bottom: 20px; padding-right: 5px; }

      .legenda-notas { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 30px; font-size: 0.9em; color: #555; }
      .legenda-notas h4 { margin: 0 0 10px 0; color: #004d99; font-size: 1em; }
      .legenda-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; }
      .legenda-item span { font-weight: bold; color: #333; }
      
      .charts-section-title { color: #004d99; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; }
      .charts-explainer { color: #666; font-size: 0.95em; margin-bottom: 20px; line-height: 1.5; }

      .stats-panel { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px; }
      .stat-box { flex: 1; min-width: 350px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; }
      .stat-header { font-weight: bold; color: #004d99; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      
      .stat-numbers { display: flex; justify-content: space-around; margin-bottom: 15px; font-size: 0.85em; background: #f9f9f9; padding: 10px; border-radius: 4px; }
      .stat-item { text-align: center; }
      .stat-item b { display: block; font-size: 1.1em; color: #333; margin-top: 2px; }
      
      .legenda-turma { color: #0288d1; border-bottom: 3px solid #0288d1; display:inline-block; margin-bottom: 2px; padding-bottom: 2px;}
      .legenda-geral { color: #ffcc80; border-bottom: 3px solid #ffcc80; display:inline-block; margin-bottom: 2px; padding-bottom: 2px;}
      
      .chart-div { width: 100%; height: 350px; }
      .aviso { padding: 20px; background: #fff3cd; color: #856404; border-radius: 4px; text-align: center; }
      .error-box { padding: 20px; background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; border-radius: 4px; }
    </style>
  </head>
  <body>

    <div id="overlay">
      <div class="overlay-content">
        <h2>⚠️ Instruções de Acesso</h2>
        <ul>
          <li><strong>Problemas para abrir?</strong> Se você ver uma tela de erro ou acesso negado, você provavelmente está logado com seu Gmail pessoal.</li>
          <li><strong>Solução:</strong> Abra este link em uma <b>Janela Anônima</b> (Ctrl+Shift+N).</li>
          <li>Faça login <b>apenas</b> com seu e-mail institucional (@dac.unicamp.br ou @unicamp.br).</li>
        </ul>
        <button class="btn-fechar" onclick="fecharAviso()">Li e Entendi. Acessar Portal.</button>
      </div>
    </div>

    <div class="container">
      <h1>Portal de Notas</h1>
      <div class="subtitle">Prof. Gustavo Mockaitis</div>
      
      <p class='intro'>Bem-vindo(a) ao portal de notas das disciplinas ministradas pelo Prof. Mockaitis. Selecione a disciplina na caixa abaixo para verificar e comparar seu desempenho acadêmico, notas e frequências.</p>
      
      <p class='intro' style='font-size: 0.9em; margin-top: -10px;'>Verifique <b>no plano de desenvolvimento da disciplina (PDD)</b> ou com o professor como as médias são calculadas, pois pode variar de acordo com o oferecimento.</p>
      
      <div id="app-content">Carregando dados...</div>
    </div>

    <script>
      var dados = ${jsonDados}; 

      function fecharAviso() {
        document.getElementById('overlay').style.display = 'none';
      }

      google.charts.load('current', {'packages':['corechart']});
      google.charts.setOnLoadCallback(iniciarApp);

      function iniciarApp() {
        try {
          var div = document.getElementById('app-content');
          
          if (!dados.emailIdentificado) {
             div.innerHTML = "<div class='error-box'><h3>Usuário não identificado</h3><p>O Google não conseguiu identificar seu e-mail. Isso acontece quando há múltiplas contas logadas (Pessoal + Unicamp).</p><p><b>Por favor, abra este link em uma Janela Anônima.</b></p></div>";
             return;
          }
          
          if (!dados.temDados) {
            div.innerHTML = "<div class='aviso'>Aluno (" + dados.ra + ") não encontrado em nenhuma disciplina.</div>";
            return;
          }

          var html = "";
          html += "<label><b>Selecione a Disciplina:</b></label>";
          html += "<select id='abaSelector' onchange='renderizarAba(this.value)'>";
          dados.abas.forEach((aba, idx) => {
            html += "<option value='" + idx + "'>" + aba.nome + "</option>";
          });
          html += "</select>";
          html += "<div id='abaConteudo'></div>";
          
          div.innerHTML = html;
          renderizarAba(0);
        } catch (e) {
          document.getElementById('app-content').innerHTML = "<div class='error-box'>Erro no navegador: " + e.message + "</div>";
        }
      }

      function renderizarAba(index) {
        var aba = dados.abas[index];
        var container = document.getElementById('abaConteudo');
        
        // 1. Tabela
        var htmlTabela = "<div class='table-wrapper'><table><thead><tr>";
        
        aba.header.forEach((h, i) => {
          if (aba.indicesVisiveis.indexOf(i) !== -1) {
            htmlTabela += "<th>" + h + "</th>";
          }
        });
        htmlTabela += "</tr></thead><tbody>";
        
        aba.ocorrencias.forEach(ocr => {
          htmlTabela += "<tr>";
          ocr.dados.forEach((val, i) => {
             if (aba.indicesVisiveis.indexOf(i) !== -1) {
               if (typeof val === 'string' && val.indexOf('T00:00:00') > -1) val = val.split('T')[0];
               
               if (typeof val === 'number') {
                  if (aba.indicesFalta.indexOf(i) !== -1) {
                    val = val.toFixed(0); 
                  } else {
                    val = val.toFixed(1); 
                  }
               }

               var style = "";
               if (ocr.bgs[i] !== '#ffffff') style += "background-color:" + ocr.bgs[i] + ";";
               if (ocr.fonts[i] !== '#000000') style += "color:" + ocr.fonts[i] + ";";
               
               var displayVal = (val === "" || val === null) ? "-" : val;
               htmlTabela += "<td style='" + style + "'>" + displayVal + "</td>";
             }
          });
          htmlTabela += "</tr>";
        });
        htmlTabela += "</tbody></table></div>";
        
        htmlTabela += "<div class='user-id-footer'>Logado como: " + dados.usuario + " (RA: " + dados.ra + ")</div>";

        // 2. Legenda
        htmlTabela += montarLegenda(aba.header, aba.indicesVisiveis);

        // 3. Gráficos
        htmlTabela += "<h3 class='charts-section-title'>Compare seu desempenho</h3>";
        htmlTabela += "<p class='charts-explainer'>Os gráficos abaixo comparam suas notas (destacadas como 'Você') com a distribuição da sua <b>Turma atual (barras azuis)</b> e com o <b>Histórico de todas as turmas (barras laranjas ao fundo)</b>. A curva cinza representa a distribuição estatística ideal.</p>";

        htmlTabela += "<div class='stats-panel'>";
        
        var txtTurmaMP = (aba.stats.turma.mp && aba.stats.turma.mp.media !== undefined) ? aba.stats.turma.mp.media.toFixed(1) + " ± " + aba.stats.turma.mp.desvio.toFixed(1) : "-";
        var txtGeralMP = (aba.stats.geral.mp && aba.stats.geral.mp.media !== undefined) ? aba.stats.geral.mp.media.toFixed(1) + " ± " + aba.stats.geral.mp.desvio.toFixed(1) : "-";

        var txtTurmaNF = (aba.stats.turma.nf && aba.stats.turma.nf.media !== undefined) ? aba.stats.turma.nf.media.toFixed(1) + " ± " + aba.stats.turma.nf.desvio.toFixed(1) : "-";
        var txtGeralNF = (aba.stats.geral.nf && aba.stats.geral.nf.media !== undefined) ? aba.stats.geral.nf.media.toFixed(1) + " ± " + aba.stats.geral.nf.desvio.toFixed(1) : "-";

        htmlTabela += criarBoxEstatistica("Média Parcial (MP)", "chart_mp", txtTurmaMP, txtGeralMP, aba.oferecimentoExibido);
        htmlTabela += criarBoxEstatistica("Nota Final (NF)", "chart_nf", txtTurmaNF, txtGeralNF, aba.oferecimentoExibido);
        htmlTabela += "</div>";

        container.innerHTML = htmlTabela;

        desenharGrafico('chart_mp', aba.stats.turma.mp, aba.stats.geral.mp, aba.minhasNotasMP);
        desenharGrafico('chart_nf', aba.stats.turma.nf, aba.stats.geral.nf, aba.minhasNotasNF);
      }

      function montarLegenda(header, indicesVisiveis) {
        var itens = [];
        var colsVisiveis = [];
        header.forEach((h, i) => {
           if (indicesVisiveis.indexOf(i) !== -1) {
             colsVisiveis.push(String(h).toUpperCase().trim());
           }
        });

        if (colsVisiveis.indexOf('P1') !== -1) itens.push("<span>P1</span> - Primeira avaliação");
        if (colsVisiveis.indexOf('P2') !== -1) itens.push("<span>P2</span> - Segunda avaliação");
        if (colsVisiveis.indexOf('P3') !== -1) itens.push("<span>P3</span> - Terceira avaliação");
        if (colsVisiveis.indexOf('PROJ') !== -1 || colsVisiveis.indexOf('PROJETO') !== -1) itens.push("<span>Proj</span> - Projeto");
        if (colsVisiveis.indexOf('MP') !== -1 || colsVisiveis.indexOf('MEDIA PARCIAL') !== -1 || colsVisiveis.indexOf('MÉDIA PARCIAL') !== -1) itens.push("<span>MP</span> - Média Parcial (≥ 6,0 para aprovação sem exame)");
        if (colsVisiveis.indexOf('NF') !== -1 || colsVisiveis.indexOf('NOTA FINAL') !== -1 || colsVisiveis.indexOf('MÉDIA FINAL') !== -1) itens.push("<span>NF</span> - Nota Final (≥ 5,0 para aprovação final)");

        if (itens.length === 0) return "";

        var htmlLegenda = "<div class='legenda-notas'>";
        htmlLegenda += "<h4>Legenda</h4>";
        htmlLegenda += "<div class='legenda-grid'>";
        itens.forEach(function(item) {
           htmlLegenda += "<div class='legenda-item'>" + item + "</div>";
        });
        htmlLegenda += "</div></div>";
        
        return htmlLegenda;
      }

      function criarBoxEstatistica(titulo, idChart, txtTurma, txtGeral, ofer) {
        return \`
          <div class='stat-box'>
            <div class='stat-header'>\${titulo}</div>
            <div class='stat-numbers'>
              <div class='stat-item'><span class='legenda-turma'>Turma (\${ofer})</span><br><b>\${txtTurma}</b></div>
              <div class='stat-item'><span class='legenda-geral'>Histórico Completo</span><br><b>\${txtGeral}</b></div>
            </div>
            <div id='\${idChart}' class='chart-div'></div>
          </div>
        \`;
      }

      function calcularNormal(x, media, desvio) {
        if (!desvio || desvio === 0) return 0;
        var termo1 = 1 / (desvio * Math.sqrt(2 * Math.PI));
        var termo2 = Math.exp(-0.5 * Math.pow((x - media) / desvio, 2));
        return (termo1 * termo2) * 50; 
      }

      function desenharGrafico(idDiv, objTurma, objGeral, listaNotasAluno) {
        if(!objTurma || !objGeral) return;

        var dataTable = new google.visualization.DataTable();
        
        dataTable.addColumn('string', 'Nota');
        dataTable.addColumn('number', 'Dist. Normal'); 
        dataTable.addColumn('number', 'Geral');        
        dataTable.addColumn('number', 'Turma');        
        dataTable.addColumn({type: 'string', role: 'annotation'}); 

        for (var i = 0; i <= 20; i++) {
          var nota = i / 2; 
          var label = (nota % 1 === 0) ? nota.toFixed(0) : ""; 
          
          var anotacao = "";
          if (listaNotasAluno && listaNotasAluno.length > 0) {
            var notasNoBin = listaNotasAluno.filter(function(n) {
               var rounded = Math.round(n.valor * 2) / 2;
               return rounded === nota;
            });
            
            if (notasNoBin.length > 0) {
              var textosUnicos = [];
              notasNoBin.forEach(function(n) {
                 var txt = n.valor.toFixed(1) + " (" + n.oferta + ")";
                 if(textosUnicos.indexOf(txt) === -1) textosUnicos.push(txt);
              });
              anotacao = "Você: " + textosUnicos.join(", ");
            }
          }

          var valTurma = (objTurma.n > 0 && objTurma.histograma[i] !== undefined) ? (objTurma.histograma[i] / objTurma.n) * 100 : 0;
          var valGeral = (objGeral.n > 0 && objGeral.histograma[i] !== undefined) ? (objGeral.histograma[i] / objGeral.n) * 100 : 0;
          var valNormal = calcularNormal(nota, objGeral.media, objGeral.desvio);

          dataTable.addRow([label, valNormal, valGeral, valTurma, (anotacao || null)]);
        }

        var options = {
          legend: { position: 'bottom' },
          
          colors: ['#37474f', '#ffcc80', '#0288d1'], 
          
          seriesType: 'bars', 
          series: {
             0: { type: 'area', lineWidth: 0, opacity: 0.1, visibleInLegend: false }, // Normal (Cinza)
             1: { type: 'bars', opacity: 0.5 },  // Geral (Laranja)
             2: { type: 'bars', opacity: 0.9 }   // Turma (Azul Forte)
          },
          isStacked: false, 
          vAxis: {
             title: '% Frequência',
             gridlines: { count: 4 }
          },
          hAxis: {
            title: 'Notas (intervalo 0.5)',
            textStyle: { fontSize: 10 }
          },
          chartArea: {width: '85%', height: '70%'},
          annotations: {
            alwaysOutside: true,
            textStyle: { fontSize: 10, color: '#004d99', bold: true },
            stem: { length: 5 }
          },
          bar: { groupWidth: '90%' } 
        };

        var chart = new google.visualization.ComboChart(document.getElementById(idDiv));
        chart.draw(dataTable, options);
      }
    </script>
  </body>
  </html>
  `;
}
