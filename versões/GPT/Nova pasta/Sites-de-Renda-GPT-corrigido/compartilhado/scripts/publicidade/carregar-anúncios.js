// Carrega o script do AdSense uma única vez e inicia cada espaço configurado uma única vez.
// Só deve ser chamada depois de podeCarregarAnúncios() retornar pode: true.
// Falha de rede ou bloqueador: os espaços são recolhidos e a página segue funcionando.

let scriptSolicitado = false;

function recolherEspaços(espaços) {
  for (const espaço of espaços) espaço.remove();
  document.documentElement.classList.remove('publicidade-ativa');
}

export function carregarAnúncios(configuração) {
  const { identificadorDoPublicador, blocos = {} } = configuração.publicidade;
  const espaços = [...document.querySelectorAll('.espaço-publicitário[data-bloco]')];
  const configurados = [];
  for (const espaço of espaços) {
    const bloco = String(blocos[espaço.dataset.bloco] ?? blocos.padrão ?? '');
    if (/^\d{6,20}$/.test(bloco)) configurados.push({ espaço, bloco });
    else espaço.remove();
  }
  if (configurados.length === 0) return;

  document.documentElement.classList.add('publicidade-ativa');
  if (!scriptSolicitado) {
    scriptSolicitado = true;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(identificadorDoPublicador)}`;
    script.addEventListener('error', () => recolherEspaços(configurados.map((item) => item.espaço)));
    document.head.append(script);
  }

  for (const { espaço, bloco } of configurados) {
    if (espaço.dataset.iniciado === 'sim') continue;
    const anúncio = document.createElement('ins');
    anúncio.className = 'adsbygoogle';
    anúncio.dataset.adClient = identificadorDoPublicador;
    anúncio.dataset.adSlot = bloco;
    anúncio.dataset.adFormat = 'auto';
    anúncio.dataset.fullWidthResponsive = 'true';
    espaço.append(anúncio);
    espaço.dataset.iniciado = 'sim';
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      espaço.remove();
    }
  }
}
