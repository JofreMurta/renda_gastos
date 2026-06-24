/* ============================================================
   auth.js — Autenticação (Firebase Authentication)
   ============================================================ */

const Auth = (() => {
  const telaLogin = document.getElementById("tela-login");
  const app = document.getElementById("app");

  function mostrarApp(usuario) {
    telaLogin.setAttribute("aria-hidden", "true");
    telaLogin.style.display = "none";
    app.hidden = false;
    app.setAttribute("aria-hidden", "false");
    document.getElementById("user-email").textContent = usuario.email || "";
    if (typeof App !== "undefined") App.iniciar();
  }

  function mostrarLogin() {
    app.hidden = true;
    app.setAttribute("aria-hidden", "true");
    telaLogin.style.display = "flex";
    telaLogin.setAttribute("aria-hidden", "false");
  }

  function traduzErro(codigo) {
    const mapa = {
      "auth/invalid-email": "E-mail inválido.",
      "auth/user-disabled": "Usuário desativado.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente em instantes.",
      "auth/network-request-failed": "Falha de conexão. Verifique a internet.",
    };
    return mapa[codigo] || "Não foi possível entrar. Verifique os dados.";
  }

  function init() {
    const form = document.getElementById("form-login");
    const erro = document.getElementById("login-erro");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro.textContent = "";
      const email = document.getElementById("login-email").value.trim();
      const senha = document.getElementById("login-senha").value;
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await auth.signInWithEmailAndPassword(email, senha);
      } catch (err) {
        erro.textContent = traduzErro(err.code);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("btn-sair").addEventListener("click", () => {
      auth.signOut();
    });

    // Observa o estado da sessão
    auth.onAuthStateChanged((usuario) => {
      if (usuario) mostrarApp(usuario);
      else mostrarLogin();
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Auth.init);
