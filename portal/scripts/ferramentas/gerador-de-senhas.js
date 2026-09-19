/** Senhas fortes, PIN, senha de Wi-Fi e medidor de entropia. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { gerarSenha, entropiaDaSenha } from '../cálculos/aleatório.js';

const PERFIS = {
  forte: { tamanho: 20, conjuntos: ['minúsculas', 'maiúsculas', 'números', 'símbolos'] },
  wifi: { tamanho: 16, conjuntos: ['minúsculas', 'maiúsculas', 'números'] },
  pin: { tamanho: 6, conjuntos: ['números'] },
};

export default {
  instruções: {
    passos: [
      'Escolha o perfil: senha forte, senha de Wi-Fi (sem símbolos, mais fácil de ditar) ou PIN numérico.',
      'Ajuste o tamanho e os tipos de caractere se quiser.',
      'Toque em Gerar. Saem várias opções de uma vez.',
      'Copie a que preferir e guarde num gerenciador de senhas.',
    ],
    exemplo: { texto: 'Uma senha de 20 caracteres com os quatro conjuntos tem cerca de 122 bits de entropia: inviável de adivinhar por força bruta.' },
    limites: 'A aleatoriedade vem de crypto.getRandomValues, a fonte criptográfica do navegador, com amostragem sem viés. '
      + 'As senhas são geradas no seu aparelho, nunca trafegam e não ficam salvas em lugar nenhum: se você fechar a página, elas somem. '
      + 'Caracteres ambíguos (l, I, O, 0, 1) ficam de fora, para não errar ao ditar ou copiar à mão.',
    perguntas: [
      { p: 'O que é entropia em bits?', r: 'É a medida de quantas tentativas alguém precisaria para adivinhar. Cada bit dobra o trabalho. Acima de 80 bits a senha é forte; acima de 128 é excelente.' },
      { p: 'Vocês guardam as senhas geradas?', r: 'Não. Não existe servidor: a geração acontece dentro do seu navegador e nada é registrado.' },
      { p: 'Devo anotar a senha num papel?', r: 'Prefira um gerenciador de senhas. Se for anotar, guarde em lugar separado do aparelho e nunca junto do nome do serviço e do usuário.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar',
      campos: [
        {
          nome: 'perfil', rótulo: 'Perfil', tipo: 'seleção', padrão: 'forte',
          opções: [
            { valor: 'forte', rótulo: 'Senha forte (20, com símbolos)' },
            { valor: 'wifi', rótulo: 'Senha de Wi-Fi (16, sem símbolos)' },
            { valor: 'pin', rótulo: 'PIN numérico (6)' },
            { valor: 'personalizado', rótulo: 'Personalizado' },
          ],
        },
        { nome: 'tamanho', rótulo: 'Tamanho', tipo: 'número', padrão: '20' },
        { nome: 'quantidade', rótulo: 'Quantas gerar', tipo: 'número', padrão: '5' },
        { nome: 'minúsculas', rótulo: 'Letras minúsculas', tipo: 'caixa', padrão: true },
        { nome: 'maiúsculas', rótulo: 'Letras maiúsculas', tipo: 'caixa', padrão: true },
        { nome: 'números', rótulo: 'Números', tipo: 'caixa', padrão: true },
        { nome: 'símbolos', rótulo: 'Símbolos', tipo: 'caixa', padrão: true },
      ],
      calcular(dados) {
        const perfil = PERFIS[dados.perfil];
        const tamanho = perfil
          ? perfil.tamanho
          : número(dados, 'tamanho', { rótulo: 'Tamanho', mín: 4, máx: 128, inteiro: true });
        const conjuntos = perfil
          ? perfil.conjuntos
          : ['minúsculas', 'maiúsculas', 'números', 'símbolos'].filter((c) => dados[c] === 'sim');
        const quantidade = número(dados, 'quantidade', { rótulo: 'Quantidade', mín: 1, máx: 20, inteiro: true });

        const senhas = Array.from({ length: quantidade }, () => gerarSenha({ tamanho, conjuntos }));
        const { bits, classificação } = entropiaDaSenha(tamanho, conjuntos);

        return {
          valor: senhas[0],
          resumo: `${tamanho} caracteres · ${bits} bits de entropia · segurança ${classificação}.`,
          texto: senhas.join('\n'),
          linhas: senhas.slice(1).map((s, i) => [`Opção ${i + 2}`, s]),
          observações: [
            'Geradas no seu navegador com fonte criptográfica. Não ficam salvas em lugar nenhum.',
            bits < 60 ? 'Esta combinação é fraca para proteger conta importante. Aumente o tamanho ou marque mais tipos de caractere.' : 'Guarde num gerenciador de senhas em vez de reutilizar a mesma senha em vários serviços.',
          ],
        };
      },
      aoMontar(elemento, recalcular) {
        // O perfil pronto desabilita os controles finos, para não dar impressão
        // falsa de que eles estão valendo.
        const seleção = elemento.querySelector('#campo-perfil');
        const finos = ['tamanho', 'minúsculas', 'maiúsculas', 'números', 'símbolos'];
        const sincronizar = () => {
          const personalizado = seleção.value === 'personalizado';
          for (const nome of finos) {
            const campo = elemento.querySelector(`#campo-${nome}`);
            if (campo) {
              campo.disabled = !personalizado;
              campo.closest('.campo').classList.toggle('campo--inativo', !personalizado);
            }
          }
        };
        seleção.addEventListener('change', () => { sincronizar(); recalcular(); });
        sincronizar();
      },
    });
  },
};
