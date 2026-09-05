/* gabaritos.js — respostas oficiais das provas, para o cartão-resposta.
   ============================================================================
   REGRA DESTE ARQUIVO: nada aqui é digitado de cabeça nem estimado.
   Todo gabarito é extraído do PDF oficial da banca e conferido. Um gabarito
   errado não quebra nada visivelmente — ele devolve um número de acertos
   plausível e falso, e o aluno usa isso pra decidir o que estudar. Por isso
   cada edição registra a URL da fonte e a data em que foi conferida.

   POR QUE VERSÃO IMPORTA: a mesma prova é impressa em cadernos diferentes com
   a ORDEM DAS QUESTÕES TROCADA. Corrigir o cartão contra a versão errada dá
   um resultado errado sem nenhum aviso. Por isso a versão é obrigatória, e o
   `rotulo` de cada uma é o que está impresso na CAPA do caderno.

   COMO ESTAS CHAVES FORAM PRODUZIDAS (29/08/2026): baixadas dos sites das
   bancas e extraídas por script, nunca transcritas à mão. Três checagens
   antes de entrar aqui:
     1. o extrator FALHA se o documento não render o total exato de questões —
        chave pela metade corrige errado calada;
     2. onde o documento traz uma segunda tabela (FUVEST), ela é conferida
        contra a primeira;
     3. distribuição das letras — foi ela que revelou que a UNICAMP não tem
        alternativa E (a 1ª fase de lá usa 4 alternativas, não 5).

   MARCADORES:
   - "*" na chave = questão anulada. Conta como acerto para todo mundo, que é
     o que a banca faz ao distribuir o ponto a todos os presentes.
   - `multiplas` = questão com mais de uma alternativa aceita (acontece quando
     a banca retifica o gabarito sem anular a questão).
   ============================================================================ */
(function () {
  "use strict";

  var EDICOES = [
    {
      inst: "FUVEST", ano: 2025, fase: "1ª fase", total: 90,
      nome: "FUVEST 2025 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf",
      conferido: "29/08/2026",
      versoes: {
        V1: { rotulo: "Prova V1", chave: "EBBCACCEDADDBADCCEBEBEDCBEEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEB" },
        V2: { rotulo: "Prova V2", chave: "ADDBADCCEBEBEDCBEEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCED" },
        V3: { rotulo: "Prova V3", chave: "EEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCEDADDBADCCEBEBEDCB" },
        V4: { rotulo: "Prova V4", chave: "CECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCEDADDBADCCEBEBEDCBEEDCBBEBEEECADC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "FUVEST", ano: 2024, fase: "1ª fase", total: 90,
      nome: "FUVEST 2024 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest2024_gabarito_primeira_fase_retificado_2023-11-24.pdf",
      conferido: "29/08/2026",
      // Gabarito duplo numa questão: a página 1 traz "D E" e a página 2 só "E".
      // Entra em `multiplas`, aceitando as duas.
      versoes: {
        V: { rotulo: "Prova V", chave: "CCECCCCBDBECBEEAADBCAEEBECDABBBEAABCCEDABDEEBEEDCACCBDCDCDDEAACADAEBCDBACBCDDCBCDBDEDBEADD" },
        K: { rotulo: "Prova K", chave: "DEAAEECBDEEEBDCBCDCCBCECCBDEBDDADEBCDDCBCBACDAACBADBECEBEAEBACDEDACBDECBDCCACADDECCDAEBABB" },
        Q: { rotulo: "Prova Q", chave: "DDAEBDEDBDCBCDDCBCABDCBEADACAAEDDCDCBDCCACDEEBEEDBADECCBAAEBBBACDEBEEACBDAAEEBCEBDBCCCCECC" },
        X: { rotulo: "Prova X", chave: "BBABEADCCEDDACACCDBCEDBADCEDCABEAEBECBEDABCAADCABCBCDDCBEDADDBEDBCCECBCCDCBCDBEEEDBCEEAAED" },
        Z: { rotulo: "Prova Z", chave: "ACDAACBADEBCBEEAEBCADECDABDECBDCCACADDECCDAEBABBDEAAEECBDEEEBDCBCDCCBCECCBDEBDDADEBCDDCBCB" }
      },
      multiplas: {
        V: { 48: "DE" },
        K: { 9: "DE" },
        Z: { 57: "DE" },
        X: { 82: "DE" },
        Q: { 43: "DE" }
      },
      assuntos: null
    },
    {
      inst: "FUVEST", ano: 2023, fase: "1ª fase", total: 90,
      nome: "FUVEST 2023 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest2023_gabarito_primeira_fase.pdf",
      conferido: "29/08/2026",
      versoes: {
        V: { rotulo: "Prova V", chave: "DCDBACEDACABCCEBEADBBDBBCAADCDCBECACCDCBBCEEADCDEAEECCEEDDBAADEAAAADECCABEBABCDDABDECBCEAA" },
        K: { rotulo: "Prova K", chave: "EBCECADCAAAAAAADBDEECCEAEABECCCDCDCEADCCBDDBCABBDECCAACDDBCBABDBBEDBADEBCBDEACEDEEAAADECCB" },
        Q: { rotulo: "Prova Q", chave: "AEECDDBCDCDACBDCEDEDADABADDEBAACBEBECDCAADECCABEEEBBCACEEDCABBBAADCDCDCCCBECAECAABAAABDECB" },
        X: { rotulo: "Prova X", chave: "BBEDABBDDCDACDEACCBBBECABCAADCDDCCBECCECECECAEECEADECCAACBACEDAADBADBDEBCAAAEDABDCEDEDBBAA" },
        Z: { rotulo: "Prova Z", chave: "ADBADBDEBCAADCDCDBDCDCECAEAEADCDEACEDACABBBECCCEBCBBECEDABDCDDEBAADECCBCBACCEAEAABADEEAABC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "FUVEST", ano: 2022, fase: "1ª fase", total: 90,
      nome: "FUVEST 2022 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest_2022_primeira_fase_gabarito_retificado.pdf",
      conferido: "29/08/2026",
      // A FUVEST anulou uma questão e retificou o gabarito em 15/12/2021. Ela
      // aparece em posição diferente em cada caderno (q7 na V, q54 na K...).
      versoes: {
        V: { rotulo: "Prova V", chave: "CCEBDABCEBAACBDDEADDECEADCABBCACCDBEAEBDDBDCECDCECBDD*CADEDCBBADEDAABDCDACBEEABADCACCAAAEA" },
        K: { rotulo: "Prova K", chave: "ECECDBDCBDCAABCACEDAEEACDACCAAAEBAADDBCEBAABBBAEDCACEBCDCDEECBAABBADCDCDDECEBAEDADDBCCDDD*" },
        Q: { rotulo: "Prova Q", chave: "ACDBCD*DDDBBCDABCDEAEEECBAAADECBDEECADCABABDECDEBDCCAEDBBBEADECAACDCDCBEABDECCACCAACDAABAD" },
        X: { rotulo: "Prova X", chave: "ACDACCAAAEAEECBDEDAACCDADBDAABBCEBDDD*DBCDCADADECBAEADCCEDBBACCDDEAEBCBEBCEDCABABAEBDCECDC" },
        Z: { rotulo: "Prova Z", chave: "BBCDEDBADAAEDECECDBDCEACDCDABABEBCCDCCDAAAAABBBBACCDBEAEBCDCADECEADEEADADBCCAACEECDDCDD*BA" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "FUVEST", ano: 2021, fase: "1ª fase", total: 90,
      nome: "FUVEST 2021 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest_2021_primeira_fase_gabarito_v2.pdf",
      conferido: "29/08/2026",
      versoes: {
        V: { rotulo: "Prova V", chave: "BEDCDBEEACACCBDDBACEACECADEBAABCEBECDEABEABAEACBEBBDBBCCEABCCBEDCEAABCBDBEEAACDCADCBBBDEBB" },
        K: { rotulo: "Prova K", chave: "EEBAABCDEAABCBDBEEAAEDCEACDCADCBBBDEBBBEACCEDBBBBAACBECADEBBEBEDCDBCEAACCBBCECACACEACDBEDB" },
        Q: { rotulo: "Prova Q", chave: "BCCCEABEABADEABCEBCADEBEABACEDCEAABCBDBEEAACDCADCBBBDEBBCDBACEADEBBEBBDBBCEACEDBCCAEEACCDB" },
        X: { rotulo: "Prova X", chave: "ACABDEACBEBBABDCBBDEBCCDEEDCABCBDBEEAAABCBCECACDBACEADEBEACCBEBBDBBEEABAABCDECBEDCDBCCAEEA" },
        Z: { rotulo: "Prova Z", chave: "EDCEAABCBDBEEAACDCADCBBBDEBBABEABEACDEDEACEACDBBCDBCAEEABEDCCBBCCEACCBEAEBBDBBCBECADCBAABE" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNICAMP", ano: 2025, fase: "1ª fase", total: 72,
      nome: "UNICAMP 2025 · 1ª fase",
      alternativas: 4,
      fonte: "https://www.comvest.unicamp.br/wp-content/uploads/2024/10/{QZ,RW,SX,TY}_gabarito_2025_FINAL_site.pdf",
      conferido: "05/09/2026",
      // 05/09/2026: faltavam TRES dos quatro pares de cadernos. Só o Q/Z
      // estava carregado, então quem fez R/W, S/X ou T/Y só tinha a opção
      // errada para escolher — e receberia um número de acertos plausível e
      // falso, sem nenhum aviso. É o defeito que este arquivo existe para
      // impedir, e ele estava aqui dentro.
      versoes: {
        QZ: { rotulo: "Q ou Z", chave: "BBACDBDDBABBABBDCDABDCDBDDBDADBDBABCDADBDCDACCAABAAC*BBBDABADBBDCACCABBD" },
        RW: { rotulo: "R ou W", chave: "CDBDDBDADBDBABCDADBDCDACCAABAAC*BBBDABADBBDCACCABBDBBACDBDDBABBABBDCDABD" },
        SX: { rotulo: "S ou X", chave: "BCDADBDCDACCAABAAC*BBBDABADBBDCACCABBDBBACDBDDBABBABBDCDABDCDBDDBDADBDBA" },
        TY: { rotulo: "T ou Y", chave: "BADBBDCACCABBDBCDADBDCDACCAABAAC*BBBDACDBDDBDADBDBABBACDBDDBABBABBDCDABD" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNICAMP", ano: 2024, fase: "1ª fase", total: 72,
      nome: "UNICAMP 2024 · 1ª fase",
      alternativas: 4,
      fonte: "https://www.comvest.unicamp.br/wp-content/uploads/2023/10/{Q_Y,R_Z,S_W,T_X}.pdf",
      conferido: "05/09/2026",
      // Mesmo caso do 2025: três pares de cadernos estavam faltando.
      // Nenhuma questão anulada nesta edição.
      versoes: {
        QY: { rotulo: "Q ou Y", chave: "BACADDCCDBCCAABCCDCCDADCBAACDCBACABCABDBDBACBBADCBDCCCDBCCCBBBDCCCDDCBAC" },
        RZ: { rotulo: "R ou Z", chave: "CDADCBAACDCBACABCABDBDBACBBADCBDCCCDBCCCBBBDCCCDDCBACBACADDCCDBCCAABCCDC" },
        SW: { rotulo: "S ou W", chave: "BACADDCCDBCCAABCCDCABCABDBDBACBBACDADCBAACDCBACDCBDCCCDBCCCBBBDCCCDDCBAC" },
        TX: { rotulo: "T ou X", chave: "DCBDCCCDBCCCBBBDCCCDDCBACABCABDBDBACBBACDADCBAACDCBACBACADDCCDBCCAABCCDC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNICAMP", ano: 2023, fase: "1ª fase", total: 72,
      nome: "UNICAMP 2023 · 1ª fase",
      alternativas: 4,
      fonte: "https://www.comvest.unicamp.br/wp-content/uploads/2022/11/Gabarito_F1_VEST2023_V2.pdf",
      conferido: "05/09/2026",
      // A Comvest publicou este gabarito duas vezes: Gabarito_F1_VEST2023.pdf
      // em 08/11/2022 e o _V2 no dia seguinte. Vale o V2, que é a retificação.
      // Uma anulada por caderno, em posição diferente em cada um — escolher o
      // caderno errado muda o resultado de verdade.
      versoes: {
        QZ: { rotulo: "Q ou Z", chave: "BDDBABBBBAACADACBABDCC*AADBDCDDCCCBACCADABABBBDCBCABCABBCBADCAADACBDBCBA" },
        RY: { rotulo: "R ou Y", chave: "CC*AADBDCDDCCCBACCADABABBBDCBCABCABBCBADCAADACBDBCBABDDBABBBBAACADACBABD" },
        SX: { rotulo: "S ou X", chave: "BDDBABBBBAACADACBABDCC*AADBDCDDCCCBACBADCAADACBDBCBACCADABABBBDCBCABCABB" },
        TW: { rotulo: "T ou W", chave: "CBADCAADACBDBCBABDDBABBBBAACADACBABDCCADABABBBDCBCABCABBCC*AADBDCDDCCCBA" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNICAMP", ano: 2022, fase: "1ª fase", total: 72,
      nome: "UNICAMP 2022 · 1ª fase",
      alternativas: 4,
      fonte: "https://www.comvest.unicamp.br/wp-content/uploads/2021/11/gabarito_2022_DIVULGA.pdf",
      conferido: "05/09/2026",
      // 4 pares de cadernos, cada um com ordem própria E anulada própria
      // (Q/X anulou a 42, R/W a 2, S/Z a 58, T/Y a 26).
      versoes: {
        QX: { rotulo: "Q ou X", chave: "DABDDCCDBDCADBDACBBCDBACADBBDCAAABACDADBB*DCABCCDAABCCCBCBBCCDBCCCBADCDA" },
        RW: { rotulo: "R ou W", chave: "B*DCABCCDAABCCCBCBBCCDBCCCBADCDADABDDCCDBDCADBDACBBCDBACADBBDCAAABACDADB" },
        SZ: { rotulo: "S ou Z", chave: "ADBBDCAAABACDADBDABDDCCDBDCADBDACBBCDBACCBBCCDBCCCBADCDAB*DCABCCDAABCCCB" },
        TY: { rotulo: "T ou Y", chave: "DABDDCCDBDCADBDACBBCDBACB*DCABCCDAABCCCBADBBDCAAABACDADBCBBCCDBCCCBADCDA" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNICAMP", ano: 2021, fase: "1ª fase", total: 72,
      nome: "UNICAMP 2021 · 1ª fase",
      alternativas: 4,
      fonte: "https://www.comvest.unicamp.br/wp-content/uploads/2021/01/DIA1_gabarito_2021.pdf + DIA2_gabarito_2020.pdf",
      conferido: "05/09/2026",
      // Ano da pandemia: a 1ª fase foi partida em DOIS DIAS, com provas
      // diferentes por área — dia 1 para Humanas/Artes e Exatas/Tecnológicas,
      // dia 2 para Biológicas e Saúde. Cada candidato fez só um dos dois, e
      // os cadernos Q/Z, R/Y, S/X e T/W existem SÓ no dia 2. Por isso o id da
      // versão carrega o dia: sem ele, 'Q ou Z' seria ambíguo entre os anos.
      // O arquivo do dia 2 se chama DIA2_gabarito_2020.pdf no site da Comvest
      // — o nome está errado na origem, o conteúdo é do vestibular 2021.
      versoes: {
        D1EG: { rotulo: "Dia 1 (Humanas/Exatas) · E ou G", grupo: "dia1", chave: "BBDCAACDCACDBAAAABDCCDACDBACBBACCBDCACADDBDCACABAABBDCDDCCACDAABCDCAABCD" },
        D1FH: { rotulo: "Dia 1 (Humanas/Exatas) · F ou H", grupo: "dia1", chave: "CDACDBACBBACCBDCACADBBDCAACDCACDBAAAABDCCCACDAABCDCAABCDDBDCACABAABBDCDD" },
        D1JL: { rotulo: "Dia 1 (Humanas/Exatas) · J ou L", grupo: "dia1", chave: "CCACDAABCDCAABCDBBDCAACDCACDBAAAABDCCDACDBACBBACCBDCACADDBDCACABAABBDCDD" },
        D1KM: { rotulo: "Dia 1 (Humanas/Exatas) · K ou M", grupo: "dia1", chave: "BBDCAACDCACDBAAAABDCCCACDAABCDCAABCDDBDCACABAABBDCDDCDACDBACBBACCBDCACAD" },
        D2QZ: { rotulo: "Dia 2 (Biológicas/Saúde) · Q ou Z", grupo: "dia2", chave: "CBDBBBDABACBCDDBBCAACBADBCBBBCCACDBCCACBBCCDBAD*DACBBCBDACBDBACBCCCBDCBA" },
        D2RY: { rotulo: "Dia 2 (Biológicas/Saúde) · R ou Y", grupo: "dia2", chave: "CBADBCBBBCCACDBCCACBBCCDBAD*DACBBCBDACBDBACBCCCBDCBACBDBBBDABACBCDDBBCAA" },
        D2SX: { rotulo: "Dia 2 (Biológicas/Saúde) · S ou X", grupo: "dia2", chave: "BCCACDBCCBADBCBBACBDBACBCCCBDCBACACBBCCDBAD*DACBBCBDCBDBBBDABACBCDDBBCAA" },
        D2TW: { rotulo: "Dia 2 (Biológicas/Saúde) · T ou W", grupo: "dia2", chave: "ACBDBACBCCCBDCBACBADBCBBBCCACDBCCBDBBBDABACBCDDBBCAACACBBCCDBAD*DACBBCBD" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNESP", ano: 2025, fase: "1ª fase", total: 90,
      nome: "UNESP 2025 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.curso-objetivo.br/vestibular/resolucao-comentada/unesp/2025/1fase/UNESP2025_1fase_gabarito.pdf",
      conferido: "05/09/2026",
      // Documento da própria VUNESP (VNSP2404), espelhado pelo
      // Objetivo — traz o código interno da banca e o aviso de
      // confidencialidade, não é lista digitada por terceiro.
      nota: "Só existe publicado o gabarito da Versão 1. A VUNESP aplica a prova em mais de uma versão, com a ordem das questões trocada — confira na capa do seu caderno antes de corrigir.",
      versoes: {
        1: { rotulo: "Versão 1", chave: "BBCABADECCBEDACABDEEACDBAEEBACDCEBABEEDACBECDABCECDAACEBBDAEACBBEDACBCEDEBCAEADBECDBAEDBCA" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNESP", ano: 2024, fase: "1ª fase", total: 90,
      nome: "UNESP 2024 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.curso-objetivo.br/vestibular/resolucao-comentada/unesp/2024/1fase/UNESP2024_1fase_gabarito.pdf",
      conferido: "05/09/2026",
      // Documento da própria VUNESP (VNSP2303), espelhado pelo
      // Objetivo — traz o código interno da banca e o aviso de
      // confidencialidade, não é lista digitada por terceiro.
      nota: "Só existe publicado o gabarito da Versão 1. A VUNESP aplica a prova em mais de uma versão, com a ordem das questões trocada — confira na capa do seu caderno antes de corrigir.",
      versoes: {
        1: { rotulo: "Versão 1", chave: "DBCABDCAEDBADCDCBEACDAABDCEEDBAACDBEACEDBBACEDBECABDCEBDECCABAEDCDBEAEDCAEBDCBCDABECADECBD" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNESP", ano: 2023, fase: "1ª fase", total: 90,
      nome: "UNESP 2023 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.curso-objetivo.br/vestibular/resolucao-comentada/unesp/2023/1fase/UNESP2023_1fase_gabarito.pdf",
      conferido: "05/09/2026",
      // Documento da própria VUNESP (VNSP2206), espelhado pelo
      // Objetivo — traz o código interno da banca e o aviso de
      // confidencialidade, não é lista digitada por terceiro.
      nota: "Só existe publicado o gabarito da Versão 1. A VUNESP aplica a prova em mais de uma versão, com a ordem das questões trocada — confira na capa do seu caderno antes de corrigir.",
      versoes: {
        1: { rotulo: "Versão 1", chave: "AADCABECBAEDCAEBDCBEAADCDBDAECBBEBDACECDCABEADBCADECBDECAAAECBDDABECDEBDCAACDEBCADEECBDCAB" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNESP", ano: 2022, fase: "1ª fase", total: 90,
      nome: "UNESP 2022 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.curso-objetivo.br/vestibular/resolucao_comentada/unesp/2022/1fase/{1dia,2dia}/UNESP2022_1fase_gabarito.pdf",
      conferido: "05/09/2026",
      // Documento da própria VUNESP (VNSP2105), espelhado pelo
      // Objetivo — traz o código interno da banca e o aviso de
      // confidencialidade, não é lista digitada por terceiro.
      // Como a UNICAMP 2021, a 1ª fase saiu em DOIS DIAS por área:
      // 14/11 Biológicas, 15/11 Exatas e Humanidades. São provas
      // diferentes, não versões da mesma — por isso o `grupo`.
      nota: "Só existe publicado o gabarito da Versão 1. A VUNESP aplica a prova em mais de uma versão, com a ordem das questões trocada — confira na capa do seu caderno antes de corrigir.",
      versoes: {
        BIO1: { rotulo: "Biológicas · Versão 1", grupo: "bio", chave: "ADBCECBADCEACBDBECDABECEABDCEEABDCDAEBDECADBEACBDEBDCADAEDBBBDEABCBDACEEBCADCCEDABBDDCEABE" },
        EXH1: { rotulo: "Exatas e Humanidades · Versão 1", grupo: "exh", chave: "CAADBABEECADBBBEDACBDBEACDEACBECDDEAACBDEBCAABBECAEACDABCEDAEBBCDAEBCDBAECECABDDECBDBACDEC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "UNESP", ano: 2021, fase: "1ª fase", total: 90,
      nome: "UNESP 2021 · 1ª fase",
      alternativas: 5,
      fonte: "https://www.curso-objetivo.br/vestibular/resolucao_comentada/unesp/2021/1fase/{1dia,2dia}/UNESP2021_1fase_gabarito.pdf",
      conferido: "05/09/2026",
      // Documento da própria VUNESP (VNSP2006), espelhado pelo
      // Objetivo — traz o código interno da banca e o aviso de
      // confidencialidade, não é lista digitada por terceiro.
      // Também dividida em dois dias: 30/01 Biológicas, 31/01 Exatas e
      // Humanidades. O arquivo saiu do ar no curso-objetivo; foi obtido
      // da cópia arquivada, e o PDF é o da própria VUNESP (VNSP2006).
      nota: "Só existe publicado o gabarito da Versão 1. A VUNESP aplica a prova em mais de uma versão, com a ordem das questões trocada — confira na capa do seu caderno antes de corrigir.",
      versoes: {
        BIO1: { rotulo: "Biológicas · Versão 1", grupo: "bio", chave: "ACEBBDAEBCDCAEEEDBECABDEBCAADDEBACBDBDCEDABDECDACABAEBDECAABEDCDCEABEEEDEABDCADEBBCEADDCBE" },
        EXH1: { rotulo: "Exatas e Humanidades · Versão 1", grupo: "exh", chave: "BDABCEDAEABCDEBACDEBAACCDBDEBACBACDEBBBDBCEADBADCECBDAADCEBDBCAEDBCCCAEDBCEBADCAEBDBACECEA" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "ENEM", ano: 2025, fase: "prova completa", total: 180,
      nome: "ENEM 2025",
      alternativas: 5,
      fonte: "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D1_CD1.pdf + .../2025_GB_impresso_D2_CD5.pdf",
      conferido: "29/08/2026",
      // Dia 1 = caderno AZUL, dia 2 = caderno AMARELO. As cores têm ORDEM DE
      // QUESTÕES DIFERENTE: quem fez outra cor não pode usar esta chave.
      versoes: {
        AzulAmarelo: { rotulo: "Dia 1 Azul · Dia 2 Amarelo", chave: "DDDEAECDCEBCECAECAEBCBCBEBABABDEBCEDABCABADDCEDECADCEEDCADBDEBBACDDECBADABBCABACEEDDBCBCEACBDDCDAEAAAECBBCEAEEBDEE*ABBBD*CDCBBBDCEADDCDCECCADDBEBCACECBDDDBADEEABBECCDABEADDEBEAA*CC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "ENEM", ano: 2024, fase: "prova completa", total: 180,
      nome: "ENEM 2024",
      alternativas: 5,
      fonte: "https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD1.pdf + .../2024_GB_impresso_D2_CD5.pdf",
      conferido: "29/08/2026",
      versoes: {
        AzulAmarelo: { rotulo: "Dia 1 Azul · Dia 2 Amarelo", chave: "CAAAEECBECEDDCBDEDDCECBDCBCEADBBDBDDCBEDADEEBCECEBEBCDBADDEBBABCDCAECEDADBAEABEADCEDADACBCCAEDAACCAEE*CBBAEDBBCAACDEDCBCEECAAEDDDEBBDDBCECEBEDADCAADECDBBCEBDCCCACABBABBADDDCEADBBCE" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "ENEM", ano: 2023, fase: "prova completa", total: 180,
      nome: "ENEM 2023",
      alternativas: 5,
      fonte: "https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D1_CD1.pdf + .../2023_GB_impresso_D2_CD5.pdf",
      conferido: "29/08/2026",
      versoes: {
        AzulAmarelo: { rotulo: "Dia 1 Azul · Dia 2 Amarelo", chave: "BBDABDACEEDCCDBADBDEDCCEBCACEACAACAACACBBEAAECDAEECABAACEAADECBDAABCDCABADCDEABAABCDDEBADBCAAADCCCCDDDABDCACDBEEEDCEDAEECCDBEABDBABBAEBDCECACCBDECBEEABEABDDAADDABBBCCBCCDDAEBDA*EEB" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "ENEM", ano: 2022, fase: "prova completa", total: 180,
      nome: "ENEM 2022",
      alternativas: 5,
      fonte: "https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D1_CD1.pdf + .../2022_GB_impresso_D2_CD5.pdf",
      conferido: "29/08/2026",
      versoes: {
        AzulAmarelo: { rotulo: "Dia 1 Azul · Dia 2 Amarelo", chave: "DCBDEEAAACABBDBEBACCBEEECCBBDCAAADCCABEDBDECEDEABEEDAEBAAECBECBABCDDAAADBCEDAEACDBBCDCBECAEACDDEBEACCCDABCEECBBCCAEBEDABEADBADDCBDDAAEBDBAAACEBEDAECCBECDEECBDCABECBEABDDCCDBD*CBAAC" }
      },
      multiplas: null,
      assuntos: null
    },
    {
      inst: "ENEM", ano: 2021, fase: "prova completa", total: 180,
      nome: "ENEM 2021",
      alternativas: 5,
      fonte: "https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D1_CD1.pdf + .../2021_GB_impresso_D2_CD5.pdf",
      conferido: "29/08/2026",
      versoes: {
        AzulAmarelo: { rotulo: "Dia 1 Azul · Dia 2 Amarelo", chave: "CAABBBDCDEADCEDBEDDDABBBBDEBCEADABDBACACDCDDCBADCBADBCEDDEBBADBCABEECCAEABEBAAECBBABAAEEBBADCDCDBBBECDCCDCBCBDABCAADCBEBABEEBBBCABEDEDEDDCABDCCAEDCEBBDBDAEEBADCAECDBCCCCDDCEEBAB*EE" }
      },
      multiplas: null,
      assuntos: null
    }
  ];

  function edicoes(inst) {
    return EDICOES.filter(function (e) { return !inst || e.inst === inst; });
  }
  function temPara(inst) { return edicoes(inst).length > 0; }
  function versoesDe(ed) { return Object.keys(ed.versoes); }
  function rotuloDe(ed, v) {
    var x = ed.versoes[v];
    return (x && x.rotulo) || v;
  }
  // quantas alternativas o cartão deve oferecer. A UNICAMP usa 4 (A–D); dar um
  // botão "E" ali seria oferecer uma opção que nunca existiu na prova.
  function alternativasDe(ed) {
    return "ABCDE".slice(0, ed.alternativas || 5).split("");
  }

  /* respostas: array com "A".."E" ou "" (em branco).
     Devolve acertos, erros, brancos, anuladas e o detalhe questão a questão. */
  function corrigir(ed, versao, respostas) {
    var entrada = ed.versoes[versao];
    if (!entrada) throw new Error("Versão desconhecida: " + versao);
    var chave = entrada.chave;
    if (chave.length !== ed.total) {
      throw new Error("Gabarito inconsistente em " + ed.nome + " (" + versao + ")");
    }
    var mult = (ed.multiplas && ed.multiplas[versao]) || {};
    var detalhe = [], acertos = 0, erros = 0, brancos = 0, anuladas = 0;
    for (var i = 0; i < ed.total; i++) {
      var marcada = (respostas[i] || "").toUpperCase();
      var bruta = chave.charAt(i);
      var anulada = bruta === "*";
      // questão retificada aceita mais de uma letra
      var aceitas = mult[i + 1] || (anulada ? "" : bruta);
      var ok;
      if (anulada) {
        // ponto de todo mundo: acerto mesmo em branco, e não conta como erro
        ok = true; anuladas++; acertos++;
      } else if (!marcada) {
        ok = false; brancos++;
      } else if (aceitas.indexOf(marcada) >= 0) {
        ok = true; acertos++;
      } else {
        ok = false; erros++;
      }
      detalhe.push({
        q: i + 1,
        marcada: marcada,
        certa: anulada ? "" : aceitas.charAt(0),
        aceitas: aceitas,
        anulada: anulada,
        ok: ok,
        assunto: ed.assuntos ? ed.assuntos[i] : null
      });
    }
    return {
      acertos: acertos, erros: erros, brancos: brancos, anuladas: anuladas,
      total: ed.total, detalhe: detalhe
    };
  }

  window.Gabaritos = {
    edicoes: edicoes, temPara: temPara, versoesDe: versoesDe,
    rotuloDe: rotuloDe, alternativasDe: alternativasDe, corrigir: corrigir
  };
})();
