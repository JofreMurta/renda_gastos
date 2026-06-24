/* ============================================================
   dashboard.js — Consolidação de indicadores e gráficos
   ============================================================ */

const Dashboard = (() => {
  let chartCategorias = null;
  let chartComposicao = null;

  // Paleta para fatias de categoria
  const CORES = [
    "#C44536", "#1E7F5C", "#3A5BA0", "#B88A1E", "#7D5BA6",
    "#2C8C99", "#D2725A", "#5B8C5A", "#A14A76", "#4F6D7A",
    "#9C6644", "#3E885B",
  ];

  // Lê o período selecionado a partir dos campos da interface
  function lerPeriodo() {
    const modo = document.querySelector("#modo-periodo .seg.ativo").dataset.modo;
    if (modo === "mes") {
      return { tipo: "mes", comp: document.getElementById("dash-mes").value };
    }
    if (modo === "intervalo") {
      return {
        tipo: "intervalo",
        de: document.getElementById("dash-de").value,
        ate: document.getElementById("dash-ate").value,
      };
    }
    return { tipo: "ano", ano: String(document.getElementById("dash-ano").value || "") };
  }

  function periodoValido(p) {
    if (p.tipo === "mes") return !!p.comp;
    if (p.tipo === "intervalo") return !!p.de && !!p.ate && p.de <= p.ate;
    if (p.tipo === "ano") return /^\d{4}$/.test(p.ano);
    return false;
  }

  async function atualizar() {
    const periodo = lerPeriodo();
    if (!periodoValido(periodo)) {
      mostrarToast("Selecione um período válido para o dashboard.", true);
      return;
    }

    const [rendas, despesas, aplicacoes] = await Promise.all([
      Lancamentos.listarPorPeriodo("rendas", periodo),
      Lancamentos.listarPorPeriodo("despesas", periodo),
      Lancamentos.listarPorPeriodo("aplicacoes", periodo),
    ]);

    const somar = (arr) => arr.reduce((t, x) => t + (Number(x.valor) || 0), 0);
    const totalRenda = somar(rendas);
    const totalDespesa = somar(despesas);
    const totalAplic = somar(aplicacoes);
    const saldo = totalRenda - totalDespesa;

    // KPIs
    document.getElementById("kpi-renda").textContent = fmtBRL(totalRenda);
    document.getElementById("kpi-despesa").textContent = fmtBRL(totalDespesa);
    document.getElementById("kpi-saldo").textContent = fmtBRL(saldo);
    document.getElementById("kpi-aplic").textContent = fmtBRL(totalAplic);
    document.querySelector(".card-saldo").classList.toggle("negativo", saldo < 0);

    // Agrupamento de despesas por categoria
    const porCategoria = {};
    despesas.forEach((d) => {
      const cat = d.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + (Number(d.valor) || 0);
    });
    const catOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

    renderChartCategorias(catOrdenadas, totalDespesa);
    renderChartComposicao(totalRenda, totalDespesa, totalAplic);
    renderTabelaCategorias(catOrdenadas, totalDespesa);
  }

  function renderChartCategorias(cats, total) {
    const vazio = document.getElementById("vazio-categorias");
    const canvas = document.getElementById("chart-categorias");
    if (chartCategorias) chartCategorias.destroy();

    if (!cats.length) {
      canvas.style.display = "none";
      vazio.hidden = false;
      return;
    }
    canvas.style.display = "block";
    vazio.hidden = true;

    chartCategorias = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: cats.map((c) => c[0]),
        datasets: [{
          data: cats.map((c) => c[1]),
          backgroundColor: cats.map((_, i) => CORES[i % CORES.length]),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { font: { family: "Inter" }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed;
                const pct = total ? ((v / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${fmtBRL(v)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function renderChartComposicao(renda, despesa, aplic) {
    const vazio = document.getElementById("vazio-composicao");
    const canvas = document.getElementById("chart-composicao");
    if (chartComposicao) chartComposicao.destroy();

    if (!renda && !despesa && !aplic) {
      canvas.style.display = "none";
      vazio.hidden = false;
      return;
    }
    canvas.style.display = "block";
    vazio.hidden = true;

    chartComposicao = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Renda", "Despesas", "Aplicações"],
        datasets: [{
          data: [renda, despesa, aplic],
          backgroundColor: ["#1E7F5C", "#C44536", "#3A5BA0"],
          borderRadius: 6,
          maxBarThickness: 70,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${fmtBRL(ctx.parsed.y)}` } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: "IBM Plex Mono" },
              callback: (v) => "R$ " + Number(v).toLocaleString("pt-BR"),
            },
          },
          x: { ticks: { font: { family: "Inter" } } },
        },
      },
    });
  }

  function renderTabelaCategorias(cats, total) {
    const tbody = document.getElementById("tbody-resumo-cat");
    if (!cats.length) {
      tbody.innerHTML = `<tr class="linha-vazia"><td colspan="3">Sem despesas no período.</td></tr>`;
      return;
    }
    tbody.innerHTML = cats.map(([cat, valor]) => {
      const pct = total ? ((valor / total) * 100).toFixed(1) : "0,0";
      return `<tr>
        <td>${escapeHtml(cat)}</td>
        <td class="num">${fmtBRL(valor)}</td>
        <td class="num">${pct}%</td>
      </tr>`;
    }).join("");
  }

  return { atualizar, lerPeriodo };
})();
