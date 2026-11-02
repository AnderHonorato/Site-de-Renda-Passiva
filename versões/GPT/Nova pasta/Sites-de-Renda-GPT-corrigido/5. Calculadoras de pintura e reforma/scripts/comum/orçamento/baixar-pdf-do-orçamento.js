// Sincronizado de compartilhado/scripts/orçamento/baixar-pdf-do-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Baixa o orçamento em PDF. O gerador é carregado só quando o usuário pede.
import { baixarArquivo } from '../armazenamento/baixar-arquivo.js';
import { obterIdentidadeDaPágina } from './obter-identidade-da-página.js';

export async function baixarPdfDoOrçamento(orçamento) {
  const { gerarPdfDoOrçamento } = await import('./gerar-pdf-do-orçamento.js');
  const identidade = obterIdentidadeDaPágina();
  const bytes = gerarPdfDoOrçamento(orçamento, { marca: identidade.marca || orçamento.marca, cores: identidade.cores });
  baixarArquivo(`orçamento-${orçamento.criadoEm.slice(0, 10)}.pdf`, new Blob([bytes], { type: 'application/pdf' }));
}
