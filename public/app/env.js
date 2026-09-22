/* env.js — em QUAL ambiente esta página está rodando.
   ============================================================================
   Antes isto era escrito à mão dentro de cada HTML: cinco cópias de
   `MURAL_COLL="murals-lab2"` e `panel:"notas-lab2"`. Funcionava enquanto
   existia um lab só. Com o lab3 não funciona mais — o mesmo `public/` é
   publicado nos dois sites, então o texto fixo faria o lab3 gravar por cima
   dos dados do lab2 e os dois virariam o mesmo app em dois endereços.

   Agora o ambiente sai do HOSTNAME. Consequência que vale mais que a
   arrumação: o build passa a saber onde está. Um arquivo servido no
   endereço errado deixa de gravar no lugar certo por acidente — que é
   exatamente o que aconteceu com o painel-e5373-lab.web.app, congelado
   servindo build velho sem ninguém notar.

   O sufixo entra no NOME DAS COLEÇÕES da nuvem. Trocar o de um ambiente que
   já tem dados equivale a esconder esses dados — `lab2` tem que continuar
   sendo `lab2` para sempre.
   ============================================================================ */
(function () {
  "use strict";

  var AMBIENTES = {
    "painel-e5373-lab3.web.app": { id: "lab3", nome: "Lab 3", lab: true },
    "painel-e5373-lab2.web.app": { id: "lab2", nome: "Lab 2", lab: true },
    // Ainda no ar, servindo um build anterior a 3db88a6, e este repo NÃO
    // publica nele. Fica mapeado para o lab2 porque é dele que aquele build
    // lê — mas o certo é aposentar o site, não mantê-lo aqui.
    "painel-e5373-lab.web.app": { id: "lab2", nome: "Lab (antigo)", lab: true },
    "painel-e5373.web.app": { id: "", nome: "Produção", lab: false },
    "painel-e5373.firebaseapp.com": { id: "", nome: "Produção", lab: false }
  };

  /* Qualquer endereço desconhecido (localhost, domínio próprio no futuro) cai
     no lab2. É a escolha conservadora: mandar dado de teste para as coleções
     de produção seria muito pior que misturá-lo com o lab. */
  var PADRAO = { id: "lab2", nome: "Desenvolvimento", lab: true };

  var host = (typeof location !== "undefined" && location.hostname) || "";
  var amb = AMBIENTES[host] || PADRAO;

  /* Nome de coleção por ambiente. Produção não leva sufixo — é como as
     coleções dela já se chamam, e renomear seria perder o que está lá. */
  function col(base) { return amb.id ? base + "-" + amb.id : base; }

  window.Ambiente = {
    id: amb.id,
    nome: amb.nome,
    lab: amb.lab,
    colecao: col,
    /* Monta o CLOUD_PANEL de um painel. Os HTML chamam isto em vez de
       repetir o literal, para não existir um sexto lugar onde o nome do
       ambiente pode ficar desatualizado. */
    painel: function (base, keyPrefix, appScript) {
      return { panel: col(base), keyPrefix: keyPrefix, appScript: appScript };
    }
  };

  // as duas globais que o cloud.js já lia
  window.LAB = amb.lab;
  window.MURAL_COLL = col("murals");

  /* A1/V-09: o mural saiu da raiz e foi para dentro de
     `schools/{escola}/series/{serie}/`. O sufixo de ambiente continua
     obrigatório e agora mora no nome da coleção de itens — `series/` não
     tem sufixo próprio, então sem isto o lab3 escreveria no mural de
     produção. Mesma lista fechada que a regra do Firestore valida. */
  window.ITENS_COLL = col("itens");
})();
