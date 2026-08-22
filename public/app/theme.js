/* theme.js — modo claro/escuro compartilhado por todas as páginas do Estuda+.
   Persiste em localStorage ("educa-theme": "light"|"dark"); sem preferência salva,
   segue o sistema operacional (prefers-color-scheme). O tema é aplicado antes do
   paint por um snippet inline no <head> de cada página — este arquivo só cuida
   do toggle e de manter o rótulo do botão em sincronia. */
(function () {
  "use strict";
  window.EducaTheme = {
    current: function () {
      return document.documentElement.classList.contains("light") ? "light" : "dark";
    },
    apply: function () {
      var t = window.EducaTheme.current();
      var b = document.getElementById("btn-theme");
      if (b) b.textContent = t === "light" ? "🌙" : "☀️";
    },
    toggle: function () {
      var isLight = document.documentElement.classList.toggle("light");
      try { localStorage.setItem("educa-theme", isLight ? "light" : "dark"); } catch (e) { }
      window.EducaTheme.apply();
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", window.EducaTheme.apply);
  else window.EducaTheme.apply();
})();
