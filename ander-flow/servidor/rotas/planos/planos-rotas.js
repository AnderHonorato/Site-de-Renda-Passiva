// planos-rotas.js — API pública dos planos e limites (docs/contratos.md §10.3, §11).

function planoParaApi(plano) {
  return {
    id: plano.id,
    preco_mensal: plano.preco_mensal,
    preco_anual: plano.preco_anual,
    limites: { ...plano.limites },
    recursos: [...(plano.recursos ?? [])],
  };
}

export default function registrarRotas(app, contexto) {
  const { configuracao } = contexto;

  app.get('/api/planos', (req, res) => {
    const dados = configuracao.planos ?? {};
    res.json({
      moeda: dados.moeda,
      pagamento_integrado: Boolean(dados.pagamento_integrado),
      planos: (dados.planos ?? []).map(planoParaApi),
    });
  });
}
