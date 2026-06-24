/* ============================================================
   app.js — Orquestração da interface
   ============================================================ */

/* ---------- Utilitários globais ---------- */
function escapeHtml(txt) {
  return String(txt ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

let _toastTimer = null;
function mostrarToast(msg, erro = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.toggle("erro", !!erro);
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

async function confirmarExclusao(texto) {
  return window.confirm(texto);
}

/* ---------- Aplicação ---------- */
const App = (() => {
  let iniciado = false;

  // Cache das opções de cada lista suspensa
  const opcoes = { tiposRenda: [], categorias: [], tiposAplicacao: [] };

  /* ======== Navegação por abas ======== */
  function initAbas() {
    document.querySelectorAll(".aba").forEach((aba) => {
      aba.addEventListener("click", () => {
        document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));
        document.querySelectorAll(".painel").forEach((p) => p.classList.remove("ativo"));
        aba.classList.add("ativa");
        document.getElementById("painel-" + aba.dataset.aba).classList.add("ativo");
        if (aba.dataset.aba === "dashboard") Dashboard.atualizar();
      });
    });
  }

  /* ======== Listas suspensas e Config ======== */
  async function carregarOpcoes() {
    const [tr, cat, ta] = await Promise.all([
      Apoio.listar("tiposRenda"),
      Apoio.listar("categorias"),
      Apoio.listar("tiposAplicacao"),
    ]);
    opcoes.tiposRenda = tr;
    opcoes.categorias = cat;
    opcoes.tiposAplicacao = ta;

    preencherSelect("renda-tipo", tr, "Cadastre um tipo de renda");
    preencherSelect("despesa-categoria", cat, "Cadastre uma categoria");
    preencherSelect("aplic-tipo", ta, "Cadastre um tipo de aplicação");

    renderListaConfig("tiposRenda", tr);
    renderListaConfig("categorias", cat);
    renderListaConfig("tiposAplicacao", ta);
  }

  function preencherSelect(id, itens, placeholder) {
    const sel = document.getElementById(id);
    const atual = sel.value;
    if (!itens.length) {
      sel.innerHTML = `<option value="" disabled selected>${escapeHtml(placeholder)}</option>`;
      return;
    }
    sel.innerHTML = itens.map((i) => `<option value="${escapeHtml(i.nome)}">${escapeHtml(i.nome)}</option>`).join("");
    if (itens.some((i) => i.nome === atual)) sel.value = atual;
  }

  function renderListaConfig(colecao, itens) {
    const ul = document.getElementById("lista-" + colecao);
    if (!itens.length) {
      ul.innerHTML = `<li class="vazio">Nenhum item cadastrado.</li>`;
      return;
    }
    ul.innerHTML = itens.map((i) => `
      <li>
        <span>${escapeHtml(i.nome)}</span>
        <button class="acao-icone acao-excluir" data-col="${colecao}" data-id="${i.id}" title="Remover">Remover</button>
      </li>`).join("");

    ul.querySelectorAll(".acao-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!(await confirmarExclusao("Remover este item da lista?"))) return;
        try {
          await Apoio.remover(btn.dataset.col, btn.dataset.id);
          await carregarOpcoes();
          mostrarToast("Item removido.");
        } catch (e) {
          mostrarToast("Erro ao remover.", true);
        }
      });
    });
  }

  function initConfigForms() {
    document.querySelectorAll(".config-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector("input");
        const colecao = form.dataset.colecao;
        try {
          await Apoio.adicionar(colecao, input.value);
          input.value = "";
          await carregarOpcoes();
          mostrarToast("Item cadastrado.");
        } catch (err) {
          mostrarToast(err.message || "Erro ao cadastrar.", true);
        }
      });
    });
  }

  /* ======== Configuração genérica de um módulo de lançamento ======== */
  // cfg: { colecao, form, campos:{...}, idCampo, tbody, filtro, filtroLimpar,
  //        submitBtn, cancelarBtn, colunas[], montarDados(), preencherForm() }
  function initModuloLancamento(cfg) {
    const form = document.getElementById(cfg.form);
    const submitBtn = document.getElementById(cfg.submitBtn);
    const cancelarBtn = document.getElementById(cfg.cancelarBtn);
    const idCampo = document.getElementById(cfg.idCampo);

    function resetForm() {
      form.reset();
      idCampo.value = "";
      document.getElementById(cfg.campoComp).value = mesAtual();
      submitBtn.textContent = cfg.rotuloAdd;
      cancelarBtn.hidden = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = cfg.montarDados();
      if (!dados) return;
      try {
        if (idCampo.value) {
          await Lancamentos.atualizar(cfg.colecao, idCampo.value, dados);
          mostrarToast("Lançamento atualizado.");
        } else {
          await Lancamentos.adicionar(cfg.colecao, dados);
          mostrarToast("Lançamento adicionado.");
        }
        resetForm();
        await listar();
      } catch (err) {
        mostrarToast("Erro ao salvar o lançamento.", true);
      }
    });

    cancelarBtn.addEventListener("click", resetForm);

    // Filtro por competência
    const filtro = document.getElementById(cfg.filtro);
    document.getElementById(cfg.filtroLimpar).addEventListener("click", () => {
      filtro.value = "";
      listar();
    });
    filtro.addEventListener("change", listar);

    async function listar() {
      const comp = filtro.value || null;
      let itens = [];
      try {
        itens = await Lancamentos.listarPorComp(cfg.colecao, comp);
      } catch (e) {
        mostrarToast("Erro ao carregar lançamentos.", true);
      }
      const tbody = document.getElementById(cfg.tbody);
      if (!itens.length) {
        tbody.innerHTML = `<tr class="linha-vazia"><td colspan="${cfg.totalColunas}">Nenhum lançamento.</td></tr>`;
        return;
      }
      tbody.innerHTML = itens.map((it) => cfg.linha(it)).join("");

      tbody.querySelectorAll(".acao-editar").forEach((btn) =>
        btn.addEventListener("click", () => {
          const it = itens.find((x) => x.id === btn.dataset.id);
          cfg.preencherForm(it);
          idCampo.value = it.id;
          submitBtn.textContent = cfg.rotuloEdit;
          cancelarBtn.hidden = false;
          form.scrollIntoView({ behavior: "smooth", block: "center" });
        })
      );
      tbody.querySelectorAll(".acao-excluir").forEach((btn) =>
        btn.addEventListener("click", async () => {
          if (!(await confirmarExclusao("Excluir este lançamento?"))) return;
          try {
            await Lancamentos.remover(cfg.colecao, btn.dataset.id);
            await listar();
            mostrarToast("Lançamento excluído.");
          } catch (e) {
            mostrarToast("Erro ao excluir.", true);
          }
        })
      );
    }

    resetForm();
    cfg.listar = listar; // expõe para recarga externa
    return cfg;
  }

  /* ======== Definição dos três módulos ======== */
  function initModulos() {
    // ---- RENDAS ----
    const mRenda = initModuloLancamento({
      colecao: "rendas",
      form: "form-renda",
      campoComp: "renda-comp",
      idCampo: "renda-id",
      tbody: "tbody-rendas",
      filtro: "filtro-renda",
      filtroLimpar: "filtro-renda-limpar",
      submitBtn: "renda-submit",
      cancelarBtn: "renda-cancelar",
      rotuloAdd: "Adicionar renda",
      rotuloEdit: "Salvar alterações",
      totalColunas: 4,
      montarDados() {
        const tipo = document.getElementById("renda-tipo").value;
        const valor = document.getElementById("renda-valor").value;
        const competencia = document.getElementById("renda-comp").value;
        if (!tipo) { mostrarToast("Selecione o tipo de renda.", true); return null; }
        return { tipo, valor, competencia };
      },
      preencherForm(it) {
        document.getElementById("renda-comp").value = it.competencia;
        document.getElementById("renda-tipo").value = it.tipo;
        document.getElementById("renda-valor").value = it.valor;
      },
      linha(it) {
        return `<tr>
          <td>${escapeHtml(fmtComp(it.competencia))}</td>
          <td><span class="tag">${escapeHtml(it.tipo)}</span></td>
          <td class="num">${fmtBRL(it.valor)}</td>
          <td class="acoes-col">
            <button class="acao-icone acao-editar" data-id="${it.id}">Editar</button>
            <button class="acao-icone acao-excluir" data-id="${it.id}">Excluir</button>
          </td></tr>`;
      },
    });

    // ---- DESPESAS ----
    const mDespesa = initModuloLancamento({
      colecao: "despesas",
      form: "form-despesa",
      campoComp: "despesa-comp",
      idCampo: "despesa-id",
      tbody: "tbody-despesas",
      filtro: "filtro-despesa",
      filtroLimpar: "filtro-despesa-limpar",
      submitBtn: "despesa-submit",
      cancelarBtn: "despesa-cancelar",
      rotuloAdd: "Adicionar despesa",
      rotuloEdit: "Salvar alterações",
      totalColunas: 5,
      montarDados() {
        const categoria = document.getElementById("despesa-categoria").value;
        const descricao = document.getElementById("despesa-desc").value.trim();
        const valor = document.getElementById("despesa-valor").value;
        const competencia = document.getElementById("despesa-comp").value;
        if (!categoria) { mostrarToast("Selecione a categoria.", true); return null; }
        return { categoria, descricao, valor, competencia };
      },
      preencherForm(it) {
        document.getElementById("despesa-comp").value = it.competencia;
        document.getElementById("despesa-categoria").value = it.categoria;
        document.getElementById("despesa-desc").value = it.descricao || "";
        document.getElementById("despesa-valor").value = it.valor;
      },
      linha(it) {
        return `<tr>
          <td>${escapeHtml(fmtComp(it.competencia))}</td>
          <td><span class="tag">${escapeHtml(it.categoria)}</span></td>
          <td>${escapeHtml(it.descricao || "")}</td>
          <td class="num">${fmtBRL(it.valor)}</td>
          <td class="acoes-col">
            <button class="acao-icone acao-editar" data-id="${it.id}">Editar</button>
            <button class="acao-icone acao-excluir" data-id="${it.id}">Excluir</button>
          </td></tr>`;
      },
    });

    // ---- APLICAÇÕES ----
    const mAplic = initModuloLancamento({
      colecao: "aplicacoes",
      form: "form-aplicacao",
      campoComp: "aplic-comp",
      idCampo: "aplic-id",
      tbody: "tbody-aplicacoes",
      filtro: "filtro-aplic",
      filtroLimpar: "filtro-aplic-limpar",
      submitBtn: "aplic-submit",
      cancelarBtn: "aplic-cancelar",
      rotuloAdd: "Adicionar aplicação",
      rotuloEdit: "Salvar alterações",
      totalColunas: 3,
      montarDados() {
        const tipo = document.getElementById("aplic-tipo").value;
        const valor = document.getElementById("aplic-valor").value;
        const competencia = document.getElementById("aplic-comp").value;
        if (!tipo) { mostrarToast("Selecione o tipo de aplicação.", true); return null; }
        return { tipo, valor, competencia };
      },
      preencherForm(it) {
        document.getElementById("aplic-comp").value = it.competencia;
        document.getElementById("aplic-tipo").value = it.tipo;
        document.getElementById("aplic-valor").value = it.valor;
      },
      linha(it) {
        return `<tr>
          <td>${escapeHtml(fmtComp(it.competencia))}</td>
          <td><span class="tag">${escapeHtml(it.tipo)}</span></td>
          <td class="num">${fmtBRL(it.valor)}</td>
          <td class="acoes-col">
            <button class="acao-icone acao-editar" data-id="${it.id}">Editar</button>
            <button class="acao-icone acao-excluir" data-id="${it.id}">Excluir</button>
          </td></tr>`;
      },
    });

    return { mRenda, mDespesa, mAplic };
  }

  /* ======== Controles do período do dashboard ======== */
  function initDashboardControles() {
    document.getElementById("dash-mes").value = mesAtual();
    document.getElementById("dash-de").value = mesAtual();
    document.getElementById("dash-ate").value = mesAtual();
    document.getElementById("dash-ano").value = new Date().getFullYear();

    document.querySelectorAll("#modo-periodo .seg").forEach((seg) => {
      seg.addEventListener("click", () => {
        document.querySelectorAll("#modo-periodo .seg").forEach((s) => s.classList.remove("ativo"));
        seg.classList.add("ativo");
        const modo = seg.dataset.modo;
        // alterna campos visíveis
        document.querySelector('[data-campo="mes"]').hidden = modo !== "mes";
        document.querySelector('[data-campo="intervalo-de"]').hidden = modo !== "intervalo";
        document.querySelector('[data-campo="intervalo-ate"]').hidden = modo !== "intervalo";
        document.querySelector('[data-campo="ano"]').hidden = modo !== "ano";
        Dashboard.atualizar();
      });
    });

    ["dash-mes", "dash-de", "dash-ate", "dash-ano"].forEach((id) =>
      document.getElementById(id).addEventListener("change", () => Dashboard.atualizar())
    );
  }

  /* ======== Inicialização (após login) ======== */
  let modulos = null;
  async function iniciar() {
    if (!iniciado) {
      iniciado = true;
      initAbas();
      initConfigForms();
      modulos = initModulos();
      initDashboardControles();
    }
    await carregarOpcoes();
    await Promise.all([
      modulos.mRenda.listar(),
      modulos.mDespesa.listar(),
      modulos.mAplic.listar(),
    ]);
    Dashboard.atualizar();
  }

  return { iniciar };
})();
