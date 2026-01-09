function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Minhas Publicações')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- FUNÇÃO DE TRADUÇÃO COM CACHE (OTIMIZADA) ---
// Isso evita chamar o Google Tradutor repetidamente, acelerando o carregamento
function getCachedTranslation(text, targetLang) {
  if (!text) return "";
  var cache = CacheService.getScriptCache();
  var cacheKey = "tr_" + targetLang + "_" + Utilities.base64Encode(text).substring(0, 20); // Chave única
  
  var cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    var translated = LanguageApp.translate(text, 'pt', targetLang);
    cache.put(cacheKey, translated, 21600); // Guarda na memória por 6 horas
    return translated;
  } catch (e) {
    return text; // Fallback
  }
}

function getPublicationData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var output = { 
    publications: {}, 
    mapData: [], 
    profileData: [], 
    odsData: [], 
    wordCloudData: [],
    categoryTranslations: {} 
  };
  var keywordMap = {};

  var sheets = ss.getSheets();
  
  // Leitura em Lote (Mais rápido)
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    
    if (name !== "Mapa" && name !== "Perfil" && name !== "Config" && !sheet.isSheetHidden()) {
      
      // 1. Tradução da Aba (Com Cache)
      if (!output.categoryTranslations[name]) {
        output.categoryTranslations[name] = {
          pt: name,
          en: getCachedTranslation(name, 'en'),
          fr: getCachedTranslation(name, 'fr')
        };
      }

      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var pubs = [];
        var headers = data[0];
        
        var colMap = {citation:0, int:6, doi:1, l1:2, l2:3, l3:4, pre:5, key:7, date:8};
        for(var k=0; k<headers.length; k++){
          var h = headers[k].toString().toLowerCase();
          if(h.includes("citação") || h.includes("citation")) colMap.citation = k;
          if(h.includes("internacional")) colMap.int = k;
          if(h.includes("doi")) colMap.doi = k;
          if(h.includes("keyword") || h.includes("palavras")) colMap.key = k;
          if(h.includes("data") || h.includes("date")) colMap.date = k;
        }

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          
          var displayDate = "";
          if (row[colMap.date]) {
            var rawDate = row[colMap.date];
            if (rawDate instanceof Date) displayDate = Utilities.formatDate(rawDate, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
            else displayDate = String(rawDate).split("T")[0]; 
          }
          
          pubs.push({
            citation: row[colMap.citation],
            international: row[colMap.int],
            doi: row[colMap.doi],
            link1: row[colMap.l1],
            link2: row[colMap.l2],
            link3: row[colMap.l3],
            preprint: row[colMap.pre],
            date: displayDate,
            keywords: row[colMap.key] 
          });

          if (row[colMap.key]) {
            var keys = row[colMap.key].toString().split(",");
            keys.forEach(function(word) {
              var clean = word.trim();
              if (clean.length > 2) keywordMap[clean] = (keywordMap[clean] || 0) + 1;
            });
          }
        }
        if (pubs.length > 0) output.publications[name] = pubs;
      }
    }
  });

  var cloudArray = [];
  for (var key in keywordMap) { cloudArray.push({x: key, value: keywordMap[key]}); }
  cloudArray.sort(function(a, b) { return b.value - a.value; });
  output.wordCloudData = cloudArray;

  var mapSheet = ss.getSheetByName("Mapa");
  output.mapData = mapSheet ? mapSheet.getDataRange().getValues() : [];
  
  // --- PERFIL COM CACHE DE TRADUÇÃO ---
  var profileSheet = ss.getSheetByName("Perfil");
  if (profileSheet) {
    var pData = profileSheet.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
       var labelRaw = String(pData[j][0]).trim();
       var value = pData[j][1];
       
       if (labelRaw !== "") {
         if (labelRaw.toUpperCase().includes("ODS")) {
           var odsList = String(value).split(/[,;]/);
           odsList.forEach(function(n) {
             var cleanN = n.trim();
             if(cleanN) output.odsData.push(cleanN);
           });
         } else {
           // OBJETO DE TRADUÇÃO
           var labelObj = { 
             pt: labelRaw,
             en: getCachedTranslation(labelRaw, 'en'),
             fr: getCachedTranslation(labelRaw, 'fr')
           };
           output.profileData.push({ labels: labelObj, value: value });
         }
       }
    }
  }

  return JSON.stringify(output);
}

// --- ROBÔ DE MANUTENÇÃO (Preenche Citação, Data e Keywords via OpenAlex) ---
function preencherDadosFaltantes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var ignorar = ["Mapa", "Perfil", "Config"]; 

  ss.toast("Buscando Citações, Datas e Keywords...", "Iniciando", -1);

  sheets.forEach(function(sheet) {
    if (ignorar.indexOf(sheet.getName()) === -1 && !sheet.isSheetHidden()) {
      processarAbaCompleta(sheet);
    }
  });
  
  ss.toast("Dados atualizados! Atualize a página do site.", "Concluído", 10);
}

function processarAbaCompleta(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];

  var colDoi = -1, colKey = -1, colDate = -1, colCit = -1;

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase();
    if (h.includes("doi")) colDoi = i;
    if (h.includes("keyword") || h.includes("palavras")) colKey = i;
    if (h.includes("data") || h.includes("date")) colDate = i;
    if (h.includes("citação") || h.includes("citation") || h.includes("referência")) colCit = i;
  }

  if (colDoi === -1) return; 

  var alteracoes = false;
  
  for (var i = 1; i < values.length; i++) {
    var doi = String(values[i][colDoi]).trim();
    
    if (doi && (doi.indexOf("10.") === 0 || doi.indexOf("doi:10.") === 0)) {
      
      var precisaKey = (colKey !== -1 && values[i][colKey] === "");
      var precisaDate = (colDate !== -1 && values[i][colDate] === "");
      var precisaCit = (colCit !== -1 && values[i][colCit] === ""); 

      if (precisaKey || precisaDate || precisaCit) {
        var cleanDoi = doi.replace(/^doi:/i, '').replace(/^https?:\/\/doi\.org\//i, '').trim();
        var match = cleanDoi.match(/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/);
        if(match) cleanDoi = match[1];

        Logger.log("Consultando OpenAlex: " + cleanDoi);
        
        var dados = buscarDadosOpenAlex(cleanDoi);
        
        if (dados) {
          if (precisaCit && dados.citation) { values[i][colCit] = dados.citation; alteracoes = true; }
          if (precisaKey && dados.keywords) { values[i][colKey] = dados.keywords; alteracoes = true; }
          if (precisaDate && dados.date) { values[i][colDate] = dados.date; alteracoes = true; }
          Utilities.sleep(150); // Evita limite da API
        }
      }
    }
  }

  if (alteracoes) {
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
}

function buscarDadosOpenAlex(doi) {
  try {
    var url = "https://api.openalex.org/works/doi:" + doi;
    var params = { headers: { "User-Agent": "mailto:admin@exemplo.com" }, muteHttpExceptions: true };
    var response = UrlFetchApp.fetch(url, params);
    
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      var resultado = { keywords: "", date: "", citation: "" };

      // Keywords
      if (json.concepts) {
        var terms = [];
        json.concepts.sort(function(a, b){ return b.score - a.score });
        for (var k = 0; k < json.concepts.length; k++) {
          if (json.concepts[k].level > 0 && terms.length < 5) terms.push(json.concepts[k].display_name);
        }
        resultado.keywords = terms.join(", ");
      }

      // Data
      if (json.publication_date) resultado.date = json.publication_date;
      else if (json.publication_year) resultado.date = json.publication_year;

      // Citação Customizada
      resultado.citation = gerarCitacao(json);

      return resultado;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function gerarCitacao(json) {
  var citacao = "";

  // 1. Autores
  if (json.authorships && json.authorships.length > 0) {
    var autoresFormatados = [];
    
    for (var i = 0; i < json.authorships.length; i++) {
      var nomeCompleto = json.authorships[i].author.display_name;
      if (!nomeCompleto) continue;
      
      var partes = nomeCompleto.trim().split(" ");
      var sobrenome = partes.pop(); 
      var iniciais = "";
      
      for (var p = 0; p < partes.length; p++) {
        var parte = partes[p];
        if (parte.length > 0 && /^[A-Z]/.test(parte)) { 
           iniciais += parte.charAt(0) + ". ";
        }
      }
      iniciais = iniciais.trim();

      // AJUSTE SEU NOME AQUI PARA NEGRITO/MAIÚSCULO
      var nomeLimpo = sobrenome.toLowerCase();
      // Detecta Mockaitis ou Mockaitis Neto, etc
      var ehVoce = (nomeLimpo === "mockaitis" || nomeLimpo === "mockaitis-neto" || nomeLimpo.includes("mockaitis"));

      if (ehVoce) {
        // Seu nome em destaque
        autoresFormatados.push("MOCKAITIS, " + (iniciais || "G."));
      } else {
        autoresFormatados.push(sobrenome + ", " + iniciais);
      }
    }
    citacao += autoresFormatados.join("; ") + ". ";
  }

  // 2. Título (Ponto final após o título para o script de Frontend detectar)
  if (json.title) {
    citacao += json.title + ". ";
  }

  // 3. Fonte
  var journal = "";
  if (json.primary_location && json.primary_location.source) {
    journal = json.primary_location.source.display_name;
  }
  
  var biblio = json.biblio || {};
  var vol = biblio.volume ? "v. " + biblio.volume : "";
  var pages = "";
  if (biblio.first_page) {
    pages = "p. " + biblio.first_page;
    if (biblio.last_page) pages += "–" + biblio.last_page;
  }
  var year = json.publication_year;

  var detalhes = [];
  if (journal) detalhes.push(journal);
  if (vol) detalhes.push(vol);
  if (pages) detalhes.push(pages);
  if (year) detalhes.push(year);

  citacao += detalhes.join(", ") + ".";
  
  return citacao;
}
