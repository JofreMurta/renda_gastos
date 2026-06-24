/* ============================================================
   data.js — Camada de acesso a dados (Cloud Firestore) e utilitários
   ============================================================ */

/* ---------- Utilitários de formatação ---------- */
const fmtBRL = (valor) =>
  (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// "2025-03" -> "03/2025"
const fmtComp = (comp) => {
  if (!comp || !comp.includes("-")) return comp || "";
  const [ano, mes] = comp.split("-");
  return `${mes}/${ano}`;
};

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* ---------- Coleções de apoio (listas suspensas) ---------- */
const Apoio = {
  // Retorna array [{id, nome}, ...] ordenado por nome
  async listar(colecao) {
    const snap = await db.collection(colecao).orderBy("nome").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async adicionar(colecao, nome) {
    const limpo = (nome || "").trim();
    if (!limpo) throw new Error("Informe um nome.");
    return db.collection(colecao).add({
      nome: limpo,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },
  async remover(colecao, id) {
    return db.collection(colecao).doc(id).delete();
  },
};

/* ---------- Lançamentos (rendas, despesas, aplicações) ---------- */
const Lancamentos = {
  async adicionar(colecao, dados) {
    return db.collection(colecao).add({
      ...dados,
      valor: Number(dados.valor) || 0,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async atualizar(colecao, id, dados) {
    return db.collection(colecao).doc(id).update({
      ...dados,
      valor: Number(dados.valor) || 0,
    });
  },

  async remover(colecao, id) {
    return db.collection(colecao).doc(id).delete();
  },

  // Lista por competência exata (ou todas, se comp = null)
  async listarPorComp(colecao, comp) {
    let ref = db.collection(colecao);
    if (comp) ref = ref.where("competencia", "==", comp);
    const snap = await ref.get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.competencia || "").localeCompare(a.competencia || ""));
  },

  // Lista por período: {tipo:"mes", comp} | {tipo:"intervalo", de, ate} | {tipo:"ano", ano}
  async listarPorPeriodo(colecao, periodo) {
    let ref = db.collection(colecao);

    if (periodo.tipo === "mes") {
      ref = ref.where("competencia", "==", periodo.comp);
    } else if (periodo.tipo === "intervalo") {
      ref = ref.where("competencia", ">=", periodo.de)
               .where("competencia", "<=", periodo.ate);
    } else if (periodo.tipo === "ano") {
      ref = ref.where("competencia", ">=", `${periodo.ano}-01`)
               .where("competencia", "<=", `${periodo.ano}-12`);
    }

    const snap = await ref.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};
