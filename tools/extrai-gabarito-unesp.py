#!/usr/bin/env python3
"""
Extrai o gabarito da 1a fase da UNESP. Irmao de extrai-gabarito-unicamp.py --
mesma regra (nada digitado a mao), formato de documento diferente.

SOBRE A FONTE
-------------
O PDF vem espelhado pelo curso-objetivo.br, mas NAO e uma lista digitada por
cursinho: e o documento da propria VUNESP. Da para provar pelo cabecalho, que
o extrator le e imprime -- o codigo interno do concurso (VNSP2105, VNSP2404),
a data de aplicacao e o aviso "CONFIDENCIAL ATE O MOMENTO DA APLICACAO".
Se um dia esses campos sumirem do PDF, e sinal de que a fonte mudou de
natureza, e ai vale desconfiar.

O QUE A FONTE NAO TEM, E POR ISSO IMPORTA
-----------------------------------------
O documento diz "Versao 1". A VUNESP aplica a prova em mais de uma versao,
com a ordem das questoes trocada, e publica so a primeira. A cobertura e
legitimamente parcial -- e por isso a edicao no gabaritos.js PRECISA declarar
`nota` avisando disso. Sem o aviso, quem fez outra versao acha uma opcao so no
seletor, escolhe por falta de alternativa, e recebe um numero plausivel e
errado. Ha teste travando isso.

ONDE ACHAR OS PDFS ANTIGOS
--------------------------
Em 2021 e 2022 a 1a fase foi partida em DOIS DIAS por area (Biologicas num
dia, Exatas e Humanidades no outro), e por isso a URL ganha um nivel a mais:

  .../resolucao_comentada/unesp/2022/1fase/{1dia,2dia}/UNESP2022_1fase_gabarito.pdf

Dois detalhes fazem o chute de URL falhar: os anos antigos usam
"resolucao_comentada" com UNDERLINE (os novos usam hifen), e o subdiretorio do
dia so existe nesses dois anos. Os arquivos de 2021 sairam do ar -- foram
obtidos da copia arquivada:

  https://web.archive.org/web/<timestamp>id_/<url original>

O "id_" devolve os bytes originais, sem o wrapper do Archive. Para listar o
que existiu num dominio, usar o indice CDX (ver o extrator da UNICAMP).

CONFERIR SEMPRE que o arquivo comeca com "%PDF": URL errada no curso-objetivo
responde 200 com uma pagina de erro em HTML de 47430 bytes.

USO
---
  python tools/extrai-gabarito-unesp.py caminho/UNESP2022_1fase_gabarito.pdf
"""
import re
import sys
import pathlib
from collections import Counter

from pypdf import PdfReader

TOTAL = 90
ALTERNATIVAS = "ABCDE"


class Falha(Exception):
    pass


def _meta(texto):
    """Codigo interno da VUNESP, data, area e versao -- e o que prova que o
    documento e o da banca, e nao uma lista digitada por terceiro."""
    cod = re.search(r"\b(VNSP\d{4})\b", texto)
    data = re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b", texto)
    ver = re.search(r"(?i)vers[aã]o\s*(\d+)", texto)
    t = texto.upper()
    if "BIOL" in t:
        area = "Biológicas"
    elif "EXATAS" in t or "HUMANIDADES" in t:
        area = "Exatas e Humanidades"
    else:
        area = None
    return {"codigo": cod.group(1) if cod else None,
            "data": data.group(1) if data else None,
            "versao": ver.group(1) if ver else None,
            "area": area}


def extrai(caminho):
    caminho = pathlib.Path(caminho)
    with open(caminho, "rb") as fh:
        if fh.read(4) != b"%PDF":
            raise Falha(f"{caminho.name}: nao comeca com %PDF")
    r = PdfReader(str(caminho))
    texto = "\n".join((p.extract_text() or "") for p in r.pages)

    achados = {}
    for num, letra in re.findall(r"\b(\d{1,2})\s*-\s*([A-E])\b", texto):
        n = int(num)
        if not 1 <= n <= TOTAL:
            continue
        if n in achados and achados[n] != letra:
            raise Falha(f"{caminho.name}: questao {n} aparece como "
                        f"{achados[n]} E {letra}")
        achados[n] = letra

    faltando = sorted(set(range(1, TOTAL + 1)) - set(achados))
    if faltando:
        raise Falha(f"{caminho.name}: li {len(achados)} de {TOTAL}. "
                    f"Faltaram {faltando}. NAO gero chave parcial.")
    chave = "".join(achados[n] for n in range(1, TOTAL + 1))
    m = _meta(texto)
    m["chave"] = chave
    return m


if __name__ == "__main__":
    for arq in sys.argv[1:]:
        try:
            m = extrai(arq)
        except Falha as e:
            print(f"!! {e}")
            continue
        c = Counter(m["chave"])
        print(pathlib.Path(arq).name)
        print(f"   {m['codigo']}  {m['data']}  area={m['area']}  versao={m['versao']}")
        print(f"   chave:  {m['chave']}")
        print(f"   letras: " + " ".join(f"{k}={c[k]}" for k in sorted(c)))
