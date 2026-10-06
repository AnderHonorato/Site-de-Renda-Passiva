/**
 * Configuração dos anúncios e das proteções do site.
 *
 * Fica num arquivo só, sem importar nada, para o gerador (Node) e o navegador lerem a mesma coisa.
 * Os valores abaixo são o estado de fábrica: nada de anúncio sem um ID de editor válido, e nenhum
 * bloqueio de "bloqueador de anúncios" enquanto não houver anúncio de verdade na página.
 * Quando a API de contas existir, o admin passa a editar estes campos no painel e a página lê o resultado
 * em `GET /api/anuncios`; até lá, edite aqui e rode `npm run gerar`.
 */

/** ID do editor do Google AdSense: "ca-pub-" e 16 dígitos. */
export const FORMATO_DO_EDITOR = /^ca-pub-\d{16}$/;
/** ID de um bloco de anúncio (data-ad-slot): só dígitos. */
export const FORMATO_DO_BLOCO = /^\d{6,20}$/;

export const anúncios = Object.freeze({
  /** Chave geral. Desligada, nenhuma página carrega nada do Google. */
  ligado: false,
  /** Identificador do editor (ex.: "ca-pub-1234567890123456"). Vazio até o dono criar a conta no AdSense. */
  editor: '',
  /** Anúncios de teste (não geram receita nem risco de cliques inválidos). Mantenha ligado até publicar. */
  modoTeste: true,
  /** Pede para desativar o bloqueador de anúncios antes de usar uma ferramenta (só vale com anúncios ligados). */
  exigirSemBloqueador: true,
  /**
   * Blocos por posição. O valor é o ID do bloco criado no painel do AdSense.
   * Posições existentes no HTML: topo (abaixo do título), resultado (depois do resultado), fim (acima do rodapé).
   */
  blocos: Object.freeze({ topo: '', resultado: '', fim: '' }),
});

/** Verdadeiro só com a chave ligada, editor válido e ao menos um bloco válido. */
export function anúnciosAtivos(config = anúncios) {
  if (!config.ligado || !FORMATO_DO_EDITOR.test(String(config.editor ?? ''))) return false;
  return Object.values(config.blocos ?? {}).some((id) => FORMATO_DO_BLOCO.test(String(id)));
}

/** Proteções do conteúdo. São dissuasão, não cofre: quem quer copiar de verdade consegue. */
export const proteções = Object.freeze({
  /** Bloqueia seleção, cópia, menu de contexto e arrastar imagens fora dos campos e dos resultados. */
  antiCópia: true,
});
