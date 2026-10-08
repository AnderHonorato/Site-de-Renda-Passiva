import { api, dados, en, estado, ligar, mensagemErro, obterSessao } from './comum.js';
import { aplicarTema, lerTema } from '../../núcleo/preferências.js';
import { criarAvatar, criarAvatarDoPerfil, criarIconeNivel, nomesAvataresDisponíveis } from '../../núcleo/nível.js';
import { aplicarPrestigio } from '../../núcleo/prestígio.js';
import { recortarAvatar, fotoParaDados } from '../../núcleo/recortar-avatar.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';
import { sonsAtivos, definirSons } from '../../núcleo/sons.js';
import { mostrarNovoNivel } from '../../núcleo/evolução.js';
import { ícone } from '../../núcleo/ícones.js';
import { ferramentaPorSlug } from '../../../dados/catálogo.js';

let usuario;
let contaAtual;
let perfilAtual;
let fotoPendente = null;
let removerFotoPendente = false;
let estadoInicial = '';
let salvando = false;

const formPerfil = document.getElementById('form-perfil');
const formRecomendadas = document.getElementById('form-recomendadas');
const formPreferencias = document.getElementById('form-preferencias');
const barraSalvar = document.getElementById('conta-salvar');

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

function csrf() {
  const partes = document.cookie.split('; ');
  const host = partes.find(p => p.startsWith('__Host-csrf='));
  const simples = partes.find(p => p.startsWith('csrf='));
  const valor = host ? host.slice('__Host-csrf='.length) : (simples ? simples.slice(5) : '');
  try { return decodeURIComponent(valor); } catch { return ''; }
}

function sociaisDoForm() {
  if(!formPerfil?.elements.site)return perfilAtual?.sociais||{};
  const resultado = {};
  for (const chave of ['site', 'instagram', 'facebook', 'tiktok', 'x', 'whatsapp']) {
    const campo = formPerfil && formPerfil.elements[chave];
    const valor = String(campo ? campo.value : '').trim();
    if (valor) resultado[chave] = valor;
  }
  return resultado;
}

function recomendadasDoForm() {
  if(!formRecomendadas)return perfilAtual?.ferramentas_recomendadas||[];
  return [...document.querySelectorAll('#opcoes-recomendadas input[name="ferramenta"]:checked')].map(i => i.value);
}

function estadoEditavel() {
  if (!formPerfil || !formPreferencias) return {};
  const bannerAtual = document.querySelector('#opcoes-banner [aria-pressed="true"]');
  const molduraAtual = document.querySelector('#opcoes-moldura [aria-pressed="true"]');
  return {
    nome: formPerfil.elements.nome.value,
    bio: formPerfil.elements.bio?.value??perfilAtual?.bio??'',
    local: formPerfil.elements.local?.value??perfilAtual?.local??'',
    avatar: formPerfil.elements.avatar.value,
    bioVisivel: formPerfil.elements.bioVisivel?.checked??perfilAtual?.visibilidade?.bio??true,
    localVisivel: formPerfil.elements.localVisivel?.checked??perfilAtual?.visibilidade?.local??true,
    sociais: sociaisDoForm(),
    recomendadas: recomendadasDoForm(),
    banner: bannerAtual ? bannerAtual.dataset.id : (perfilAtual ? perfilAtual.banner : 'brisa'),
    moldura: molduraAtual ? molduraAtual.dataset.id : (perfilAtual ? perfilAtual.moldura : 'basica'),
    idioma: formPreferencias.elements.idioma.value,
    tema: formPreferencias.elements.tema.value,
  };
}

function serializarEstado() {
  return JSON.stringify(estadoEditavel());
}

function atualizarBarra() {
  if (!barraSalvar) return;
  const alterado = Boolean(fotoPendente || removerFotoPendente || serializarEstado() !== estadoInicial);
  barraSalvar.hidden = !alterado;
}

function marcarAlterado() {
  atualizarBarra();
}

let transicaoAba=0;
function trocarAba(nome) {
  const paineis=[...document.querySelectorAll('[data-conta-painel]')];
  const seguinte=paineis.find(p=>p.dataset.contaPainel===nome);
  if(!seguinte)return;
  const anterior=paineis.find(p=>!p.hidden);
  clearTimeout(transicaoAba);
  for (const botao of document.querySelectorAll('[data-conta-aba]')) {
    botao.setAttribute('aria-pressed', botao.dataset.contaAba === nome ? 'true' : 'false');
  }
  for(const painel of paineis)painel.classList.remove('conta__aba--saindo','conta__aba--entrando');
  if(anterior===seguinte)return;
  anterior?.classList.add('conta__aba--saindo');
  history.replaceState(history.state,'',`#${nome}`);
  transicaoAba=setTimeout(()=>{
    for(const painel of paineis){painel.hidden=painel!==seguinte;painel.classList.remove('conta__aba--saindo');}
    seguinte.classList.add('conta__aba--entrando');
    if(nome==='trabalhos')import('./trabalhos.js').catch(erro=>estado(mensagemErro(erro),true));
    if(nome==='mensagens')import('./suporte.js').catch(erro=>estado(mensagemErro(erro),true));
    if(nome==='favoritos')void carregarFavoritos();
    if(nome==='planos')void carregarPlanos();
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:140);
}

async function carregarPlanos(){
  const area=document.getElementById('conta-planos');area.textContent=en?'Loading…':'Carregando…';
  try{const resposta=await api('/api/planos');area.replaceChildren();
    for(const plano of resposta.planos||[]){const cartao=elemento('article','painel');cartao.dataset.plano=plano.id;
      cartao.append(elemento('h3','',plano.id==='gratuito'?(en?'Free':'Grátis'):plano.id==='plus'?'Plus':'Premium'));
      for(const [chave,nome]of [['favoritos',en?'favorites':'favoritos'],['trabalhos',en?'saved works':'trabalhos salvos']])cartao.append(elemento('p','',`${plano.limites[chave]} ${nome}`));
      if(plano.id!=='gratuito')cartao.append(elemento('p','',en?'No advertising':'Sem publicidade'));
      if(plano.provisorio)cartao.append(elemento('small','suave',en?'Currently inherits Plus limits.':'Por enquanto, herda os limites do Plus.'));
      if(plano.id===contaAtual.plano)cartao.append(elemento('strong','',en?'Your current plan':'Seu plano atual'));
      area.append(cartao);
    }
  }catch(erro){area.textContent=mensagemErro(erro);}
}

async function carregarFavoritos(){
  const area=document.getElementById('conta-favoritos');
  area.textContent=en?'Loading…':'Carregando…';
  try{const resposta=await api('/api/favoritos');area.replaceChildren();
    for(const slug of resposta.favoritos||[]){const ferramenta=ferramentaPorSlug(slug);if(!ferramenta)continue;
      const linha=elemento('a','conta__favorito',en?(ferramenta.en?.nome||ferramenta.nome):ferramenta.nome);linha.href=`../f/${slug}/`;area.append(linha);
    }
    if(!area.childElementCount)area.append(elemento('p','suave',en?'Favorite a tool to find it here.':'Marque uma ferramenta como favorita para encontrá-la aqui.'));
  }catch(erro){area.textContent=mensagemErro(erro);}
}

function ligarAbas() {
  for (const botao of document.querySelectorAll('[data-conta-aba]')) {
    botao.addEventListener('click', () => trocarAba(botao.dataset.contaAba));
  }
}

function renderAvatarPreview() {
  const area = document.getElementById('avatar-preview');
  if (!area) return;
  area.replaceChildren();

  if (fotoPendente) {
    const img = document.createElement('img');
    img.className = 'avatar-foto';
    img.alt = en ? 'New profile photo preview' : 'Prévia da nova foto de perfil';
    const url = URL.createObjectURL(fotoPendente);
    img.src = url;
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    area.append(img);
    return;
  }

  const perfil = removerFotoPendente
    ? Object.assign({}, perfilAtual, { foto_url: null, avatar: formPerfil.elements.avatar.value })
    : Object.assign({}, perfilAtual, { avatar: formPerfil.elements.avatar.value });

  const avatar = criarAvatarDoPerfil(perfil);
  if (avatar) area.append(avatar);
}

function renderAvatares() {
  const area = document.getElementById('avatar-opcoes');
  if (!area) return;
  area.replaceChildren();

  for (const nome of nomesAvataresDisponíveis) {
    const botao = elemento('button', 'conta__avatar-opcao');
    botao.type = 'button';
    botao.dataset.avatar = nome;
    botao.title = nome.charAt(0).toUpperCase() + nome.slice(1);
    botao.setAttribute('aria-pressed', formPerfil.elements.avatar.value === nome ? 'true' : 'false');
    const avatar = criarAvatar(nome);
    if (avatar) botao.append(avatar);

    botao.addEventListener('click', () => {
      formPerfil.elements.avatar.value = nome;
      for (const outro of area.querySelectorAll('button')) {
        outro.setAttribute('aria-pressed', outro === botao ? 'true' : 'false');
      }
      renderAvatarPreview();
      marcarAlterado();
    });
    area.append(botao);
  }
}

function renderPlano(plano) {
  const link = document.getElementById('plano-visual');
  if (!link) return;

  const nomes = {
    gratuito: en ? 'Free' : 'Gratuito',
    plus: 'Plus',
    premium: 'Premium',
  };
  const planoFinal = plano || 'gratuito';
  link.dataset.plano = planoFinal;

  const emblema = elemento('span', 'conta__plano-emblema');
  emblema.innerHTML = ícone(planoFinal === 'gratuito' ? 'estrela' : 'confere-círculo');

  const texto = elemento('span', 'conta__plano-texto');
  const titulo = elemento('strong', '', nomes[planoFinal] || nomes.gratuito);
  const sub = elemento(
    'small',
    '',
    planoFinal === 'gratuito'
      ? (en ? 'See plans and unlock more features' : 'Veja os planos e desbloqueie mais recursos')
      : (en ? 'Your active account plan' : 'Seu plano ativo')
  );
  texto.append(titulo, sub);

  const seta = elemento('span', 'conta__plano-seta');
  seta.innerHTML = ícone('chevron');
  link.replaceChildren(emblema, texto, seta);
}

function siglaMedalha(nome) {
  return String(nome || '').split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

function criarMedalha(medalha, pequena = false) {
  const item = elemento('div', 'medalha');
  item.dataset.tier = String(medalha.tier || 0);
  item.dataset.desbloqueada = medalha.desbloqueada ? 'sim' : 'nao';
  item.tabIndex = 0;

  const simbolo = elemento('span', 'medalha__simbolo');
  simbolo.append(criarIconeMedalha(medalha));
  item.append(simbolo);

  if (!pequena) {
    const dica = elemento('div', 'medalha__tooltip');
    dica.append(
      elemento('b', '', medalha.nome),
      elemento(
        'p',
        '',
        medalha.desbloqueada
          ? medalha.patamar + ' · ' + medalha.valor + (medalha.completa ? '' : ' / ' + medalha.meta)
          : medalha.valor + ' / ' + medalha.meta
      ),
      elemento('p', '', medalha.descricao)
    );

    const link = elemento('a', '', en ? 'How to earn it' : 'Como ganhar');
    link.href = '../niveis.html#' + encodeURIComponent(medalha.id);
    dica.append(link);
    item.append(dica);
  }

  return item;
}

function renderProgresso(perfil) {
  const progresso = document.getElementById('progresso-nivel');
  if (progresso && perfil.progresso_nivel) {
    const topo = elemento('div', 'conta__progresso-topo');
    topo.append(
      elemento('span', '', (en ? 'Level ' : 'Nível ') + perfil.progresso_nivel.nivel),
      elemento(
        'span',
        '',
        perfil.progresso_nivel.pontos + ' pts · ' + perfil.progresso_nivel.faltam + (en ? ' to next' : ' para o próximo')
      )
    );
    const barra = elemento('div', 'conta__progresso-barra');
    const preenchimento = elemento('span');
    preenchimento.style.width = perfil.progresso_nivel.percentual + '%';
    barra.append(preenchimento);
    progresso.replaceChildren(topo, barra);
  }

  const medalhas = document.getElementById('conta-medalhas');
  if (medalhas) {
    medalhas.replaceChildren();
    for (const medalha of perfil.medalhas || []) medalhas.append(criarMedalha(medalha));
  }
}

function renderPersonalizacoes(perfil) {
  const configuracoes = [
    ['banners', 'opcoes-banner', perfil.banner],
    ['molduras', 'opcoes-moldura', perfil.moldura],
  ];

  for (const [tipo, areaId, valorAtual] of configuracoes) {
    const area = document.getElementById(areaId);
    if (!area) continue;
    area.replaceChildren();

    for (const item of (perfil.personalizacoes && perfil.personalizacoes[tipo]) || []) {
      const botao = elemento('button', 'conta__personalizacao');
      botao.type = 'button';
      botao.dataset.id = item.id;
      botao.dataset.animado = item.animado ? 'sim' : 'nao';
      botao.disabled = !item.desbloqueado;
      botao.setAttribute('aria-pressed', item.id === valorAtual ? 'true' : 'false');
      botao.append(
        elemento('b', '', item.nome),
        elemento(
          'small',
          '',
          item.desbloqueado
            ? (item.animado ? (en ? 'Animated' : 'Animado') : (en ? 'Unlocked' : 'Desbloqueado'))
            : (en ? 'Unlocks at level ' : 'Desbloqueia no nível ') + item.nivel
        )
      );
      botao.addEventListener('click', () => {
        if (botao.disabled) return;
        for (const outro of area.querySelectorAll('button')) {
          outro.setAttribute('aria-pressed', outro === botao ? 'true' : 'false');
        }
        marcarAlterado();
      });
      area.append(botao);
    }
  }
}

function renderRecomendadas(perfil) {
  const area = document.getElementById('opcoes-recomendadas');
  if (!area) return;
  area.replaceChildren();

  const usados = perfil.ferramentas_mais_usadas || [];
  const marcados = new Set(perfil.ferramentas_recomendadas || []);

  for (const ferramenta of usados) {
    const ficha = ferramentaPorSlug[ferramenta.slug];
    const rotulo = elemento('label', 'conta__recomendada');

    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.name = 'ferramenta';
    caixa.value = ferramenta.slug;
    caixa.checked = marcados.has(ferramenta.slug);

    const icone = elemento('span', 'conta__recomendada-icone');
    icone.innerHTML = ícone(ficha && ficha.ícone ? ficha.ícone : 'engrenagem');

    const texto = elemento('span', 'conta__recomendada-texto');
    texto.append(
      elemento('b', '', ficha && ficha.nome ? ficha.nome : ferramenta.slug.replaceAll('-', ' ')),
      elemento('small', '', ferramenta.total + (en ? ' uses' : ' usos'))
    );

    const marca = elemento('span', 'conta__recomendada-marca');
    marca.innerHTML = ícone('confere', { tamanho: 12 });

    caixa.addEventListener('change', () => {
      const total = recomendadasDoForm().length;
      if (total > 5) {
        caixa.checked = false;
        estado(en ? 'Choose up to five tools.' : 'Escolha no máximo cinco ferramentas.', true);
        return;
      }
      marcarAlterado();
    });

    rotulo.append(caixa, icone, texto, marca);
    area.append(rotulo);
  }

  if (!usados.length) {
    area.append(
      elemento(
        'p',
        'suave pequeno',
        en ? 'Use a tool to make recommendations.' : 'Use uma ferramenta para poder recomendá-la.'
      )
    );
  }
}

function renderResumo(perfil, conta) {
  const slot = document.getElementById('conta-resumo-slot');
  if (!slot) return;

  const resumo = elemento('section', 'conta-resumo');

  const avatarResumo = elemento('div', 'conta-resumo__avatar');
  const avatar = criarAvatarDoPerfil(perfil);
  if (avatar) avatarResumo.append(avatar);

  const texto = elemento('div', 'conta-resumo__texto');
  texto.append(elemento('strong', '', perfil.nome || conta.nome || usuario.nome || usuario.usuario));
  texto.append(elemento('span', '', '@' + (perfil.usuario || usuario.usuario)));



  const ver = elemento('a', 'botão botão--linha');
  ver.href = '../perfil.html?usuario=' + encodeURIComponent(perfil.usuario || usuario.usuario);
  ver.innerHTML = ícone('seta-diagonal') + (en ? 'Public profile' : 'Perfil público');

  resumo.append(avatarResumo, texto, ver);
  slot.replaceChildren(resumo);

  const atalho = document.getElementById('atalho-perfil-publico');
  if (atalho) atalho.href = ver.href;
}

function preencher(perfil, conta) {
  const chaves = ['nome', 'usuario', 'bio', 'local'];
  for (const chave of chaves) {
    if (formPerfil.elements[chave]) {
      formPerfil.elements[chave].value = perfil[chave] ?? conta[chave] ?? usuario[chave] ?? '';
    }
  }

  if(formPerfil.elements.bioVisivel)formPerfil.elements.bioVisivel.checked = perfil.visibilidade ? perfil.visibilidade.bio !== false : true;
  if(formPerfil.elements.localVisivel)formPerfil.elements.localVisivel.checked = perfil.visibilidade ? perfil.visibilidade.local !== false : true;
  formPerfil.elements.avatar.value = nomesAvataresDisponíveis.includes(perfil.avatar) ? perfil.avatar : 'sol';

  for (const chave of ['site', 'instagram', 'facebook', 'tiktok', 'x', 'whatsapp']) {
    if (formPerfil.elements[chave]) formPerfil.elements[chave].value = perfil.sociais && perfil.sociais[chave] ? perfil.sociais[chave] : '';
  }

  formPreferencias.elements.idioma.value = conta.idioma || document.documentElement.lang;
  formPreferencias.elements.tema.value = lerTema();

  const remover = document.getElementById('remover-foto');
  if (remover) remover.hidden = !perfil.foto_url;
  const recortar = document.getElementById('recortar-foto');
  if (recortar) recortar.hidden = !perfil.foto_url && !fotoPendente;

  renderAvatarPreview();
  renderAvatares();
  renderRecomendadas(perfil);
  renderPersonalizacoes(perfil);
  renderPlano(conta.plano || usuario.plano || 'gratuito');
  renderProgresso(perfil);
  renderResumo(perfil, conta);
}

async function compactarFoto(arquivo) {
  if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) {
    throw Object.assign(new Error('imagem_invalida'), { message: 'imagem_invalida' });
  }
  if (arquivo.size > 12 * 1024 * 1024) {
    throw Object.assign(new Error('corpo_grande'), { message: 'corpo_grande' });
  }

  const bitmap = await createImageBitmap(arquivo);
  const max = 512;
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .86));
  if (!blob || blob.size > 1_200_000) {
    throw Object.assign(new Error('corpo_grande'), { message: 'corpo_grande' });
  }
  return blob;
}

async function enviarFoto(blob) {
  const resposta = await fetch('/api/perfil/foto', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'Content-Type': blob.type,
      'X-CSRF-Token': csrf(),
      Accept: 'application/json',
    },
    body: blob,
  });

  let corpoResposta = {};
  try { corpoResposta = await resposta.json(); } catch {}

  if (!resposta.ok) {
    throw Object.assign(new Error(corpoResposta.erro || 'imagem_invalida'), {
      message: corpoResposta.erro || 'imagem_invalida',
    });
  }
  return corpoResposta;
}

async function salvarAlteracoes() {
  if (salvando) return;
  if (!formPerfil.reportValidity() || !formPreferencias.reportValidity()) return;
  const atual = estadoEditavel();
  const temaAntesDeSalvar = lerTema();
  salvando = true;
  const botao = document.getElementById('salvar-alteracoes');
  const controles = [...document.querySelectorAll('#conta-conteudo input,#conta-conteudo select,#conta-conteudo textarea,#conta-conteudo button')].filter(el => !el.disabled);
  for (const controle of controles) controle.disabled = true;
  document.getElementById('conta-conteudo').setAttribute('aria-busy','true');
  estado(en ? 'Saving changes…' : 'Salvando alterações…');

  try {
    const respostaPerfil = await api('/api/perfil', {
      metodo: 'PATCH',
      dados: {
        nome: atual.nome,
        bio: atual.bio,
        local: atual.local,
        avatar: atual.avatar,
        banner: atual.banner,
        moldura: atual.moldura,
        sociais: atual.sociais,
        visibilidade: { bio: atual.bioVisivel, local: atual.localVisivel },
        ferramentas_recomendadas: atual.recomendadas,
        idioma: atual.idioma,
        tema: atual.tema,
        ...(fotoPendente ? { foto: await fotoParaDados(fotoPendente) } : removerFotoPendente ? { foto: null } : {}),
      },
    });

    perfilAtual = respostaPerfil.perfil || perfilAtual;
    contaAtual = { ...contaAtual, ...(respostaPerfil.usuario || {}), idioma: atual.idioma, tema: atual.tema };
    fotoPendente = null;
    removerFotoPendente = false;
    // Uma escolha feita no cabeçalho durante a requisição continua valendo.
    if (lerTema() === temaAntesDeSalvar) aplicarTema(atual.tema);
    preencher(perfilAtual, contaAtual);
    estadoInicial = serializarEstado();
    atualizarBarra();
    estado(en ? 'Changes saved.' : 'Alterações salvas.');
  } catch (erro) {
    estado(mensagemErro(erro) + (en ? ' Your changes are still here; correct the field or retry.' : ' Suas alterações continuam aqui; corrija o campo ou tente salvar novamente.'), true);
  } finally {
    salvando = false;
    for (const controle of controles) if (controle.isConnected) controle.disabled = false;
    if (botao) botao.disabled = false;
    document.getElementById('conta-conteudo').removeAttribute('aria-busy');
  }
}

function cancelarAlteracoes() {
  fotoPendente = null;
  removerFotoPendente = false;
  preencher(perfilAtual, contaAtual);
  estadoInicial = serializarEstado();
  atualizarBarra();
  estado(en ? 'Changes cancelled.' : 'Alterações canceladas.');
}

async function carregarAmizades() {
  const area = document.getElementById('amizades');
  if (!area) return;
  area.replaceChildren();

  try {
    const resposta = await api('/api/amizades');
    for (const amizade of resposta.amizades || []) {
      const linha = document.createElement('p');
      const nome = document.createElement('a');
      nome.href = '../perfil.html?usuario=' + encodeURIComponent(amizade.usuario);
      nome.textContent = '@' + amizade.usuario;
      linha.append(nome, elemento('span', '', amizade.estado));

      if (amizade.estado === 'pendente' && amizade.destino === usuario.id) {
        const aceitar = elemento('button', 'botão', en ? 'Accept' : 'Aceitar');
        aceitar.type = 'button';
        aceitar.addEventListener('click', async () => {
          aceitar.disabled = true;
          try {
            await api('/api/amizades/aceitar', {
              metodo: 'POST',
              dados: { usuario: amizade.usuario },
            });
            await carregarAmizades();
          } catch (erro) {
            estado(mensagemErro(erro), true);
            aceitar.disabled = false;
          }
        });
        linha.append(aceitar);
      }
      area.append(linha);
    }

    if (!area.childElementCount) {
      area.append(elemento('p', 'suave pequeno', en ? 'No connections yet.' : 'Nenhuma conexão ainda.'));
    }
  } catch (erro) {
    area.textContent = mensagemErro(erro);
  }
}

try {
  const sessao = await obterSessao();

  if (!sessao.usuario) {
    location.replace('../entrar.html?volta=' + encodeURIComponent(location.pathname));
  } else {
    usuario = sessao.usuario;
    document.getElementById('conta-conteudo').hidden = false;

    if (usuario.papel === 'admin') {
      const admin = document.getElementById('conta-admin');
      if (admin) admin.hidden = false;
    }

    const respostas = await Promise.all([
      api('/api/conta'),
      api('/api/perfil/' + encodeURIComponent(usuario.usuario)),
    ]);

    contaAtual = respostas[0].usuario || respostas[0].conta || respostas[0];
    perfilAtual = respostas[1].perfil || respostas[1];

    preencher(perfilAtual, contaAtual);
    ligarAbas();
    if(location.hash)trocarAba(location.hash.slice(1));
    await carregarAmizades();

    estadoInicial = serializarEstado();
    atualizarBarra();

    for (const form of [formPerfil, formRecomendadas, formPreferencias]) {
      if (!form) continue;
      form.addEventListener('input', marcarAlterado);
      form.addEventListener('change', marcarAlterado);
      form.addEventListener('submit', evento => evento.preventDefault());
    }
  }
} catch (erro) {
  estado(mensagemErro(erro), true);
}

document.getElementById('foto-perfil')?.addEventListener('change', async evento => {
  const arquivo = evento.target.files && evento.target.files[0];
  if (!arquivo) return;
  try {
  const recorte = await recortarAvatar(arquivo);
  if (!recorte) return;
  fotoPendente = recorte;
  removerFotoPendente = false;
  renderAvatarPreview();
  marcarAlterado();
  document.getElementById('recortar-foto').hidden = false;
  } catch (erro) { estado(mensagemErro(erro),true); }
  finally { evento.target.value = ''; }
});

document.getElementById('recortar-foto')?.addEventListener('click',async()=>{
  try {
    let arquivo=fotoPendente;
    if(!arquivo&&perfilAtual.foto_url){const r=await fetch(perfilAtual.foto_url,{credentials:'same-origin',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('imagem_invalida');arquivo=await r.blob();}
    if(!arquivo)return;const recorte=await recortarAvatar(arquivo);if(!recorte)return;
    fotoPendente=recorte;removerFotoPendente=false;renderAvatarPreview();marcarAlterado();
  }catch(erro){estado(mensagemErro(erro),true);}
});

document.addEventListener('portal:tema-alterado',evento=>{
  if(formPreferencias&&!salvando){formPreferencias.elements.tema.value=evento.detail.tema;marcarAlterado();}
});

const controleSons=document.getElementById('sons-ativos');
if(controleSons){controleSons.checked=sonsAtivos();controleSons.addEventListener('change',()=>definirSons(controleSons.checked));}

document.getElementById('remover-foto')?.addEventListener('click', () => {
  fotoPendente = null;
  removerFotoPendente = true;
  const botao = document.getElementById('remover-foto');
  if (botao) botao.hidden = true;
  renderAvatarPreview();
  marcarAlterado();
});

document.getElementById('salvar-alteracoes')?.addEventListener('click', salvarAlteracoes);
document.getElementById('cancelar-alteracoes')?.addEventListener('click', cancelarAlteracoes);
document.getElementById('previa-conquista')?.addEventListener('click',()=>{const nivel=Number(perfilAtual?.nivel)||1;mostrarNovoNivel(nivel-1,nivel);});

ligar('form-senha', async form => {
  await api('/api/conta/senha', { metodo: 'PATCH', dados: dados(form) });
  form.reset();
  estado(en ? 'Password changed.' : 'Senha alterada.');
});

ligar('form-amizade', async form => {
  const amigo = dados(form).amigo.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(amigo)) throw new Error('dados_invalidos');
  await api('/api/amizades', { metodo: 'POST', dados: { usuario: amigo } });
  form.reset();
  estado(en ? 'Friend request sent.' : 'Pedido de amizade enviado.');
  await carregarAmizades();
});

document.getElementById('sair-conta')?.addEventListener('click', async () => {
  try {
    await api('/api/autenticacao/sair', { metodo: 'POST' });
    location.assign('../');
  } catch (erro) {
    estado(mensagemErro(erro), true);
  }
});

document.getElementById('exportar-conta')?.addEventListener('click', async () => {
  try {
    const dadosConta = await api('/api/conta/exportar');
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(dadosConta, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meus-dados.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (erro) {
    estado(mensagemErro(erro), true);
  }
});

document.getElementById('excluir-conta')?.addEventListener('click', () => {
  const form = document.getElementById('form-excluir');
  form.hidden = false;
  form.elements.senhaExclusao.focus();
});

document.getElementById('cancelar-exclusao')?.addEventListener('click', () => {
  const form = document.getElementById('form-excluir');
  form.reset();
  form.hidden = true;
});

ligar('form-excluir', async form => {
  await api('/api/conta', {
    metodo: 'DELETE',
    dados: { senha: form.elements.senhaExclusao.value },
  });
  form.reset();
  location.assign('../');
});
