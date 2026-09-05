/**
 * Os dois labs servem o MESMO build e têm que ter a MESMA configuração.
 *
 * Por que este teste existe: o CLI do Firebase não deixa um `target` apontar
 * para dois sites ("linked to multiple sites, but only one is permitted"),
 * então o bloco de hosting é obrigatoriamente duplicado no firebase.json —
 * um por lab. Duplicata em arquivo de configuração diverge sozinha: alguém
 * acrescenta um domínio na CSP de um e esquece do outro, e aí o lab3 passa a
 * bloquear algo que o lab2 permite. O sintoma disso não é um erro claro, é
 * "no lab3 o login não volta" semanas depois.
 *
 * Como não dá para deduplicar em JSON puro, o teste é a trava.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cfg = JSON.parse(
  readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
const rc = JSON.parse(
  readFileSync(new URL("../.firebaserc", import.meta.url), "utf8"));

describe("Hosting · os labs não podem divergir", () => {
  it("firebase.json tem um bloco por lab", () => {
    assert.ok(Array.isArray(cfg.hosting), "hosting deveria ser uma lista");
    assert.deepEqual(cfg.hosting.map((h) => h.target), ["lab2", "lab3"]);
  });

  it("os blocos são idênticos, tirando o alvo", () => {
    const semAlvo = (h) => {
      const c = JSON.parse(JSON.stringify(h));
      delete c.target;
      return c;
    };
    const [a, b] = cfg.hosting;
    assert.deepEqual(semAlvo(a), semAlvo(b),
      "lab2 e lab3 divergiram — servem o mesmo build, a config tem que ser a mesma");
  });

  it("cada alvo aponta para exatamente um site, e o nome bate", () => {
    const alvos = rc.targets["painel-e5373"].hosting;
    for (const h of cfg.hosting) {
      const sites = alvos[h.target];
      assert.ok(sites, `alvo "${h.target}" não existe no .firebaserc`);
      assert.equal(sites.length, 1, "o CLI recusa alvo com mais de um site");
      assert.equal(sites[0], "painel-e5373-" + h.target);
    }
  });

  it("a CSP libera os dois labs no frame-src (é onde o login do Google volta)", () => {
    for (const h of cfg.hosting) {
      const csp = h.headers
        .flatMap((x) => x.headers)
        .find((x) => x.key.indexOf("Content-Security-Policy") === 0);
      assert.ok(csp, `${h.target} sem CSP`);
      for (const site of ["painel-e5373-lab2", "painel-e5373-lab3"]) {
        assert.ok(csp.value.includes(`https://${site}.web.app`),
          `${h.target}: falta ${site} na CSP`);
      }
    }
  });

  it("todo site conhecido pelo env.js está declarado como alvo ou é produção", () => {
    /* Se aparecer um lab novo no env.js e ninguém criar o alvo, ele nunca
       recebe deploy — vira exatamente o painel-e5373-lab.web.app, congelado
       num build velho e servindo login quebrado. */
    const env = readFileSync(new URL("../public/app/env.js", import.meta.url), "utf8");
    const hosts = [...env.matchAll(/"(painel-e5373[a-z0-9-]*)\.web\.app"/g)].map((m) => m[1]);
    const alvos = Object.values(rc.targets["painel-e5373"].hosting).flat();
    const conhecidos = new Set([...alvos, "painel-e5373", "painel-e5373-lab"]);
    for (const h of hosts) {
      assert.ok(conhecidos.has(h),
        `${h} aparece no env.js mas não tem alvo de deploy — vai congelar`);
    }
  });
});
