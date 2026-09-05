#!/usr/bin/env python3
"""
Extrai o gabarito da 1a fase da UNICAMP a partir do PDF oficial da Comvest.

POR QUE ISTO EXISTE
-------------------
A regra do public/app/gabaritos.js e que nenhuma letra seja digitada. Um
gabarito errado nao quebra nada visivelmente: devolve um numero de acertos
plausivel e falso, e o aluno decide o que estudar em cima dele. 72 caracteres
copiados a mao erram, e ninguem confere.

USO
---
  # ver as chaves de um ou mais PDFs
  python tools/extrai-gabarito-unicamp.py caminho/QZ.pdf caminho/RW.pdf

  # PROVA DE CONFIANCA: reproduzir byte a byte o que ja esta conferido
  python tools/extrai-gabarito-unicamp.py --validar <ano> caminho/*.pdf

Rodar o --validar contra uma edicao JA conferida antes de gerar chave nova.
Se o extrator nao reproduz o que ja foi validado, ele nao tem autoridade
para produzir chave nenhuma. Foi assim que a primeira versao deste arquivo
reprovou: o \\b final da expressao nao casava depois de "*", entao TODA
questao anulada sumia e ele lia 71 de 72.

ONDE ACHAR OS PDFS
------------------
O site da Comvest nao lista os gabaritos antigos em pagina navegavel. O jeito
que funcionou foi o indice do Internet Archive:

  https://web.archive.org/cdx/search/cdx?url=comvest.unicamp.br&matchType=domain
    &filter=original:.*[Gg]abarito.*&collapse=urlkey&output=json&fl=original

Baixar SEMPRE do dominio da banca, e conferir que o arquivo comeca com "%PDF".
Ja aconteceu de a URL responder 200 com uma pagina de erro em HTML dentro --
foi assim que dois "gabaritos" da UNESP se revelaram falsos.

CUIDADOS QUE O FORMATO IMPOE
----------------------------
- A prova sai em PARES DE CADERNOS (Q/Z, R/Y, ...), cada um com a ordem das
  questoes trocada. Uma pagina do PDF por par.
- "*" marca questao anulada: ponto para todos os presentes.
- A 1a fase usa QUATRO alternativas (A-D). Um "E" aqui e sinal de leitura
  torta, nao de questao dificil.
- Em 2021 a 1a fase foi partida em DOIS DIAS, com provas diferentes por area,
  e os mesmos rotulos de caderno se repetem entre os dias.
"""
import json
import pathlib
import re
import subprocess
import sys
from collections import Counter

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("falta a dependencia: python -m pip install pypdf")

TOTAL = 72
ALTERNATIVAS = "ABCD"
REPO = pathlib.Path(__file__).resolve().parent.parent


class Falha(Exception):
    pass


def _rotulo(texto, npag):
    m = re.search(r"PROVAS?\s+([A-Z])\s+e\s+([A-Z])", texto)
    if not m:
        raise Falha(f"pagina {npag}: nao achei o rotulo 'PROVAS X e Y'")
    return m.group(1) + m.group(2)


def _area(texto):
    t = texto.upper()
    if "BIOL" in t and "SA" in t:
        return "Biológicas e Saúde"
    if "HUMANAS" in t:
        return "Humanas/Artes e Exatas/Tecnológicas"
    return None


def _chave(texto, npag):
    achados = {}
    # o fim NAO pode ser \b: "*" nao e caractere de palavra, e ali some toda
    # questao anulada. Ver o cabecalho deste arquivo.
    for num, letra in re.findall(r"\b(\d{2})\s+([A-Z*])(?![A-Za-z0-9])", texto):
        n = int(num)
        if not 1 <= n <= TOTAL:
            raise Falha(f"pagina {npag}: questao {n} fora de 1..{TOTAL}")
        if letra != "*" and letra not in ALTERNATIVAS:
            raise Falha(f"pagina {npag}: questao {n} respondida '{letra}', fora "
                        f"de {ALTERNATIVAS}. Se a banca mudou o numero de "
                        f"alternativas, o cartao-resposta tambem precisa mudar.")
        if n in achados and achados[n] != letra:
            raise Falha(f"pagina {npag}: questao {n} aparece como "
                        f"{achados[n]} E {letra}")
        achados[n] = letra
    faltando = sorted(set(range(1, TOTAL + 1)) - set(achados))
    if faltando:
        raise Falha(f"pagina {npag}: li {len(achados)} de {TOTAL} questoes. "
                    f"Faltaram {faltando}. NAO gero chave parcial -- chave pela "
                    f"metade corrige errado calada.")
    return "".join(achados[n] for n in range(1, TOTAL + 1))


def extrai(caminho):
    """Devolve [{pagina, cadernos, area, chave}] de um PDF de gabarito."""
    caminho = pathlib.Path(caminho)
    with open(caminho, "rb") as fh:
        if fh.read(4) != b"%PDF":
            raise Falha(f"{caminho.name}: nao comeca com %PDF. Download que "
                        f"voltou 200 mas trouxe pagina de erro em HTML?")
    saida = []
    for i, pg in enumerate(PdfReader(str(caminho)).pages):
        texto = pg.extract_text() or ""
        if "GABARITO" not in texto.upper():
            continue
        saida.append({"pagina": i + 1, "cadernos": _rotulo(texto, i + 1),
                      "area": _area(texto), "chave": _chave(texto, i + 1)})
    if not saida:
        raise Falha(f"{caminho.name}: nenhuma pagina de gabarito reconhecida")
    return saida


def conferidas_no_repo(inst="UNICAMP"):
    """Le as chaves que ja estao em public/app/gabaritos.js, via node."""
    js = (
        "const fs=require('fs');const w={};"
        "new Function('window',fs.readFileSync(process.argv[1],'utf8'))(w);"
        "const o={};for(const e of w.Gabaritos.edicoes(process.argv[2]))"
        "for(const v of Object.keys(e.versoes))o[e.ano+':'+v]=e.versoes[v].chave;"
        "process.stdout.write(JSON.stringify(o));"
    )
    r = subprocess.run(
        ["node", "-e", js, str(REPO / "public/app/gabaritos.js"), inst],
        capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def _distribuicao(chave):
    c = Counter(chave)
    return " ".join(f"{k}={c[k]}" for k in sorted(c))


def main(argv):
    validar_ano = None
    if argv and argv[0] == "--validar":
        if len(argv) < 2:
            sys.exit("--validar precisa do ano: --validar 2022 arquivo.pdf ...")
        validar_ano, argv = argv[1], argv[2:]
    if not argv:
        sys.exit(__doc__)

    referencia = conferidas_no_repo() if validar_ano else {}
    problemas = 0

    for arq in argv:
        p = pathlib.Path(arq)
        print("=" * 72)
        print(p.name)
        try:
            blocos = extrai(p)
        except Falha as e:
            print(f"  !! FALHOU: {e}")
            problemas += 1
            continue

        for b in blocos:
            anul = [i + 1 for i, ch in enumerate(b["chave"]) if ch == "*"]
            print(f"  cadernos {b['cadernos']}"
                  + (f"  [{b['area']}]" if b["area"] else ""))
            print(f"    chave:  {b['chave']}")
            print(f"    letras: {_distribuicao(b['chave'])}"
                  + (f"   ANULADA(S): {anul}" if anul else ""))
            if validar_ano:
                ref = referencia.get(f"{validar_ano}:{b['cadernos']}")
                if ref is None:
                    print(f"    -- sem referencia {validar_ano}:{b['cadernos']} "
                          f"no gabaritos.js (edicao nova?)")
                elif ref != b["chave"]:
                    dif = [i + 1 for i, (x, y) in enumerate(zip(b["chave"], ref))
                           if x != y]
                    print(f"    !! DIVERGE do ja conferido nas questoes {dif}")
                    problemas += 1
                else:
                    print("    ok reproduziu byte a byte o que ja estava conferido")

        # versoes da mesma prova sao as mesmas questoes reordenadas: a conta de
        # cada letra tem que bater. Se nao bate, o PDF nao e da mesma prova.
        grupos = {}
        for b in blocos:
            grupos.setdefault(b["area"], []).append(b)
        for area, gs in grupos.items():
            if len({"".join(sorted(g["chave"])) for g in gs}) != 1:
                print(f"  !! as versoes [{area}] NAO sao permutacoes umas das "
                      f"outras -- leitura torta ou PDFs de provas diferentes")
                problemas += 1

    print()
    if problemas:
        print(f"{problemas} problema(s). NAO usar estas chaves.")
        return 1
    print("sem divergencia." + (" Extrator autorizado a gerar chave nova."
                                if validar_ano else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
