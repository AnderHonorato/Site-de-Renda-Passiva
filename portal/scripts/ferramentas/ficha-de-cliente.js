/** Ficha de cliente: CRM local, sem sincronização de contatos com a API. */
import {
  montarFerramenta, preencherFormulário, ErroDeEntrada,
  baixar, baixarPlanilha, avisar, nomeDeArquivo,
} from '../núcleo/montador.js';
import { escapar } from '../núcleo/texto.js';
import { gravar, ler, armazenamentoAtivo } from '../núcleo/armazenamento.js';
import { ícone } from '../núcleo/ícones.js';
import {
  ErroFicha, LIMITE_CLIENTES, validarListaFichas, guardarFicha, apagarFicha,
  pesquisarFichas, criarBackupFicha, importarBackupFicha,
} from '../cálculos/ficha-de-cliente.js';

const CHAVE = 'ficha-de-cliente.v1';
function exibirErro(erro) {
  avisar(erro instanceof Error ? erro.message : 'Não foi possível concluir.');
}

function cartaoCliente(ficha) {
  return [
    '<article class="ficha-clientes__item" data-cliente-id="', escapar(ficha.id), '">',
    '<div class="ficha-clientes__item-cabecalho"><div class="ficha-clientes__identidade">',
    '<h3>', escapar(ficha.nome), '</h3>',
    ficha.contato ? '<p class="pequeno suave">' + escapar(ficha.contato) + '</p>' : '',
    '</div><div class="ações">',
    '<button class="botão botão--linha" type="button" data-ficha-editar="', escapar(ficha.id), '">',
    ícone('atualizar'), 'Editar</button>',
    '<button class="botão botão--linha" type="button" data-ficha-apagar="', escapar(ficha.id), '">',
    ícone('lixeira'), 'Excluir</button></div></div>',
    ficha.historico ? '<details><summary>Histórico de compras</summary><p class="ficha-clientes__texto">'
      + escapar(ficha.historico) + '</p></details>' : '',
    ficha.observacoes ? '<details><summary>Observações</summary><p class="ficha-clientes__texto">'
      + escapar(ficha.observacoes) + '</p></details>' : '',
    '<p class="pequeno suave">Atualizado em ',
    escapar(new Date(ficha.atualizadoEm).toLocaleDateString('pt-BR')), '</p></article>',
  ].join('');
}

export default {
  instruções: {
    passos: [
      'Cadastre nome e contato. Anote compras e observações, se quiser.',
      'Salve a ficha no navegador. Use a busca para encontrar um cliente pelo nome, contato, histórico ou observação.',
      'Edite ou exclua cada ficha pelos botões da própria lista; antes de excluir aparece uma confirmação.',
      'Baixe um backup JSON para restaurar depois ou uma planilha Excel com todos os clientes.',
      'Para restaurar, escolha o arquivo JSON exportado por esta ferramenta. A restauração substitui a lista atual somente depois da sua confirmação.',
    ],
    exemplo: {
      texto: 'Cliente Ana Souza, contato ana@exemplo.com, histórico “02/11: comprou 2 produtos”. '
        + 'Depois de salvar, ela aparece na lista; ao buscar “Ana” ou “produtos”, a ficha é encontrada.',
    },
    limites: 'Até 250 clientes no armazenamento deste navegador. Nada é sincronizado com conta, chat ou servidor. '
      + 'Dados podem desaparecer ao limpar os dados do site, trocar de aparelho ou usar navegação privada. '
      + 'O backup JSON e a planilha Excel contêm contatos em texto legível, sem criptografia; guarde os arquivos em local seguro. '
      + 'A restauração aceita somente backups JSON desta ferramenta e substitui, não mistura, o cadastro existente.',
    perguntas: [
      { p: 'As fichas ficam disponíveis no meu outro celular?', r: 'Não. Só neste navegador e aparelho. Para mudar, exporte JSON e importe no outro aparelho.' },
      { p: 'O portal envia os contatos para a minha conta?', r: 'Não. Esta ferramenta não oferece “Salvar trabalho”, e os contatos não são enviados pela função de uso.' },
      { p: 'O backup é protegido com senha?', r: 'Não. O arquivo contém informações legíveis; armazene-o em uma pasta protegida e compartilhe apenas com pessoas autorizadas.' },
    ],
  },
  montar(raiz, ferramenta) {
    let clientes = [], bloqueado = false, editando = null, painel = null;
    try {
      // Uma falha de JSON não pode ser confundida com cadastro vazio e sobrescrita.
      const bruto = typeof localStorage === 'undefined' ? null : localStorage.getItem('portal.' + CHAVE);
      if (bruto !== null) JSON.parse(bruto);
      clientes = validarListaFichas(ler(CHAVE, []));
    } catch { bloqueado = true; }

    function atualizarLista() {
      if (!painel) return;
      const termo = painel.querySelector('#ficha-clientes-busca').value;
      const encontrados = pesquisarFichas(clientes, termo);
      const lista = painel.querySelector('#ficha-clientes-lista');
      const limite = 80;
      painel.querySelector('#ficha-clientes-contagem').textContent =
        encontrados.length + ' de ' + clientes.length + ' cliente(s) · limite ' + LIMITE_CLIENTES;
      for (const botão of painel.querySelectorAll('[data-ficha-exportar]')) botão.disabled = clientes.length === 0;
      lista.innerHTML = encontrados.length
        ? encontrados.slice(0, limite).map(cartaoCliente).join('')
        : '<p class="pequeno suave">Nenhum cliente encontrado. Cadastre acima ou ajuste a busca.</p>';
      if (encontrados.length > limite) {
        lista.insertAdjacentHTML('beforeend',
          '<p class="pequeno suave">Exibindo 80 de ' + encontrados.length + ' resultados. Refine a busca para encontrar os demais.</p>');
      }
      const enviar = raiz.querySelector('#formulário [type="submit"]');
      if (enviar) enviar.disabled = bloqueado || !armazenamentoAtivo;
      const aviso = painel.querySelector('#ficha-clientes-aviso');
      aviso.hidden = armazenamentoAtivo && !bloqueado;
      aviso.textContent = !armazenamentoAtivo
        ? 'Este navegador não permite armazenamento local. Habilite o recurso antes de cadastrar.'
        : 'O cadastro anterior está corrompido ou em versão incompatível. Restaure um backup antes de cadastrar; não apagamos os dados antigos.';
    }
    function persistir(novos) {
      const validados = validarListaFichas(novos);
      if (!armazenamentoAtivo || !gravar(CHAVE, validados)) {
        throw new ErroFicha('Não foi possível gravar neste navegador. Libere espaço ou verifique as permissões.');
      }
      clientes = validados;
      bloqueado = false;
      atualizarLista();
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Salvar ficha neste aparelho',
      // O cadastro não pode ser enviado ao backend de "Meus trabalhos".
      permitirSalvarTrabalho: false,
      registrarUsoAtivo: false,
      campos: [
        { nome: 'nome', rótulo: 'Nome do cliente', exemplo: 'Ana Souza',
          dica: 'Obrigatório, entre 2 e 120 caracteres.' },
        { nome: 'contato', rótulo: 'Contato (telefone ou e-mail)', exemplo: 'ana@exemplo.com',
          dica: 'Opcional. Sem envio automático de mensagens.' },
        { nome: 'historico', rótulo: 'Histórico de compras', tipo: 'área', linhas: 4,
          exemplo: '02/11/2026 — Comprou dois produtos' },
        { nome: 'observacoes', rótulo: 'Observações', tipo: 'área', linhas: 4,
          exemplo: 'Prefere receber contato à tarde' },
      ],
      calcular(dados) {
        if (bloqueado || !armazenamentoAtivo) {
          throw new ErroDeEntrada('Armazenamento indisponível. Restaure um backup ou permita guardar dados neste navegador.', 'nome');
        }
        try {
          const resultado = guardarFicha(clientes, dados, { id: editando });
          persistir(resultado.clientes);
          editando = null;
          raiz.querySelector('#formulário [type="submit"]').innerHTML = ícone('confere') + 'Salvar ficha neste aparelho';
          return {
            valor: resultado.editado ? 'Ficha atualizada' : 'Cliente cadastrado',
            resumo: resultado.cliente.nome + ' foi salvo somente neste aparelho.',
            observações: [
              'Os dados desta ficha não foram enviados para a conta do portal.',
              'Faça um backup JSON para evitar perdas ao limpar o navegador ou trocar de celular.',
            ],
            texto: 'Ficha salva neste aparelho.',
          };
        } catch (erro) {
          if (erro instanceof ErroFicha) throw new ErroDeEntrada(erro.message, erro.campo);
          throw erro;
        }
      },
      aoMontar() {
        painel = document.createElement('section');
        painel.className = 'ficha-clientes t-3';
        painel.setAttribute('aria-label', 'Clientes salvos neste aparelho');
        painel.innerHTML = [
          '<div class="ficha-clientes__topo"><div><h2>Clientes neste aparelho</h2>',
          '<p class="pequeno suave">Dados locais, sem sincronização com sua conta.</p></div>',
          '<span class="etiqueta etiqueta--info">Armazenamento local</span></div>',
          '<p class="pequeno" id="ficha-clientes-aviso" role="alert" hidden></p>',
          '<div class="campo ficha-clientes__campo-busca">',
          '<label for="ficha-clientes-busca">Buscar por nome, contato ou histórico</label>',
          '<input id="ficha-clientes-busca" type="search" autocomplete="off" placeholder="Buscar cliente..."></div>',
          '<p id="ficha-clientes-contagem" class="pequeno suave" role="status" aria-live="polite"></p>',
          '<div id="ficha-clientes-lista" class="ficha-clientes__lista"></div>',
          '<div class="ações ficha-clientes__ações">',
          '<button class="botão botão--linha" type="button" data-ficha-novo>', ícone('mais'), 'Novo cadastro</button>',
          '<button class="botão botão--linha" type="button" data-ficha-exportar="json">',
          ícone('baixar'), 'Backup JSON</button>',
          '<button class="botão botão--linha" type="button" data-ficha-exportar="xlsx">',
          ícone('planilha'), 'Planilha Excel</button></div>',
          '<div class="campo ficha-clientes__importar">',
          '<label for="ficha-clientes-importar">Restaurar backup JSON</label>',
          '<input id="ficha-clientes-importar" type="file" accept=".json,application/json">',
          '<span class="campo__dica">Substitui os registros atuais após confirmação. Máximo de 2 MB.</span></div>',
          '<p class="pequeno suave">O JSON e a planilha contêm dados pessoais sem senha. Guarde-os em local seguro.</p>',
        ].join('');
        raiz.append(painel);

        const formulario = raiz.querySelector('#formulário');
        const novo = () => {
          editando = null;
          formulario.reset();
          formulario.querySelector('[type="submit"]').innerHTML = ícone('confere') + 'Salvar ficha neste aparelho';
          formulario.querySelector('[name="nome"]').focus();
        };
        // O botão Limpar do montador também encerra o modo de edição.
        formulario.addEventListener('reset', () => {
          editando = null;
          formulario.querySelector('[type="submit"]').innerHTML = ícone('confere') + 'Salvar ficha neste aparelho';
        });
        painel.querySelector('#ficha-clientes-busca').addEventListener('input', atualizarLista);
        painel.addEventListener('click', (evento) => {
          const botão = evento.target.closest('button');
          if (!botão || !painel.contains(botão)) return;
          if (botão.matches('[data-ficha-novo]')) { novo(); return; }
          const idEditar = botão.dataset.fichaEditar;
          if (idEditar) {
            const ficha = clientes.find((c) => c.id === idEditar);
            if (!ficha) return;
            editando = ficha.id;
            preencherFormulário(formulario, ficha);
            formulario.querySelector('[type="submit"]').innerHTML = ícone('confere') + 'Atualizar ficha neste aparelho';
            formulario.scrollIntoView({ block: 'start' });
            formulario.querySelector('[name="nome"]').focus();
            return;
          }
          const idApagar = botão.dataset.fichaApagar;
          if (idApagar) {
            const ficha = clientes.find((c) => c.id === idApagar);
            if (!ficha || !confirm('Excluir a ficha de ' + ficha.nome +
              '? Esta ação não poderá ser desfeita sem um backup.')) return;
            try {
              persistir(apagarFicha(clientes, ficha.id));
              if (editando === ficha.id) novo();
              avisar('Ficha excluída deste aparelho.');
            } catch (erro) { exibirErro(erro); }
            return;
          }
          const formato = botão.dataset.fichaExportar;
          if (!formato || !clientes.length) return;
          try {
            if (formato === 'json') {
              baixar(JSON.stringify(criarBackupFicha(clientes), null, 2),
                'clientes-backup-' + new Date().toISOString().slice(0, 10) + '.json',
                'application/json;charset=utf-8');
            } else if (formato === 'xlsx') {
              baixarPlanilha([
                ['Nome', 'Contato', 'Histórico de compras', 'Observações', 'Criado em', 'Atualizado em'],
                ...pesquisarFichas(clientes).map((ficha) => [
                  ficha.nome, ficha.contato, ficha.historico, ficha.observacoes,
                  ficha.criadoEm.slice(0, 10), ficha.atualizadoEm.slice(0, 10),
                ]),
              ], nomeDeArquivo('fichas-de-clientes'), {
                aba: 'Clientes', larguras: [32, 28, 40, 40, 14, 14],
              });
            }
          } catch (erro) { exibirErro(erro); }
        });
        painel.querySelector('#ficha-clientes-importar').addEventListener('change', async (evento) => {
          const campo = evento.currentTarget;
          const arquivo = campo.files?.[0];
          if (!arquivo) return;
          try {
            if (!armazenamentoAtivo) throw new ErroFicha('O navegador não permite gravar dados locais.');
            if (arquivo.size > 2 * 1024 * 1024) throw new ErroFicha('Arquivo muito grande: máximo de 2 MB.');
            const conteudo = JSON.parse(await arquivo.text());
            const restaurados = importarBackupFicha(conteudo);
            if (!confirm('Restaurar ' + restaurados.length + ' clientes? Isso substituirá os ' +
              clientes.length + ' registros atuais neste aparelho.')) return;
            persistir(restaurados);
            novo();
            avisar('Backup restaurado: ' + restaurados.length + ' clientes.');
          } catch (erro) { exibirErro(erro); }
          finally { campo.value = ''; }
        });
        atualizarLista();
      },
    });
  },
};
