// autenticacao-rotas.js — API de autenticação e conta (docs/contratos.md §11 "Autenticação").
import { criarErro } from '../../servidor-erros.js';
import { chaveIp } from '../../seguranca/seguranca-limite-trafego.js';
import {
  autenticar,
  buscarUsuarioPorEmail,
  criarConta as criarContaNoBanco,
  criarTokenRecuperacao,
  paraUsuarioPublico,
  redefinirSenhaComToken,
} from './autenticacao-controle.js';
import { gravarEmailRecuperacao } from './autenticacao-email.js';
import {
  normalizarEmail,
  validarCriarConta,
  validarEntrar,
  validarRecuperarSenha,
  validarRedefinirSenha,
} from './autenticacao-validacao.js';

export default function registrarRotas(app, contexto) {
  const { banco, configuracao, limitador, sessao, registrarLog } = contexto;

  app.post(
    '/api/autenticacao/criar-conta',
    limitador.middleware('criar_conta', { chave: chaveIp }),
    async (req, res, next) => {
      try {
        const { nome, email, senha, aceitou_termos } = req.body ?? {};
        const validacao = validarCriarConta({ nome, email, senha, aceitou_termos });
        if (!validacao.ok) {
          return next(criarErro(400, validacao.codigo, validacao.campos ? { campos: validacao.campos } : {}));
        }

        const emailNormalizado = normalizarEmail(email);
        if (buscarUsuarioPorEmail(banco, emailNormalizado)) {
          return next(criarErro(400, 'email_em_uso'));
        }

        const usuario = await criarContaNoBanco({ banco, nome: nome.trim(), email: emailNormalizado, senha });
        sessao.criarSessao(req, res, usuario.id);
        registrarLog?.('info', 'conta_criada', { usuario_id: usuario.id });
        res.status(201).json({ usuario: paraUsuarioPublico(usuario) });
      } catch (erro) {
        next(erro);
      }
    },
  );

  app.post('/api/autenticacao/entrar', async (req, res, next) => {
    try {
      const { email, senha } = req.body ?? {};
      const validacao = validarEntrar({ email, senha });
      if (!validacao.ok) {
        return next(criarErro(400, validacao.codigo, { campos: validacao.campos }));
      }

      const emailNormalizado = normalizarEmail(email);
      const chave = `${chaveIp(req)}|${emailNormalizado}`;

      const bloqueio = limitador.verificar('entrar_falhas', chave);
      if (bloqueio.bloqueado) {
        res.set('Retry-After', String(bloqueio.segundosRestantes));
        return next(
          criarErro(429, 'muitas_tentativas', {
            tentar_de_novo_em_segundos: bloqueio.segundosRestantes,
            minutos: Math.ceil(bloqueio.segundosRestantes / 60),
          }),
        );
      }

      const resultado = await autenticar({ banco, email: emailNormalizado, senha });

      if (!resultado.ok) {
        if (resultado.suspenso) {
          limitador.limparFalhas('entrar_falhas', chave);
          return next(criarErro(403, 'conta_suspensa'));
        }
        const falha = limitador.registrarFalha('entrar_falhas', chave);
        if (falha.bloqueado) {
          res.set('Retry-After', String(falha.segundosRestantes));
          return next(
            criarErro(429, 'muitas_tentativas', {
              tentar_de_novo_em_segundos: falha.segundosRestantes,
              minutos: Math.ceil(falha.segundosRestantes / 60),
            }),
          );
        }
        return next(criarErro(401, 'credenciais_invalidas'));
      }

      limitador.limparFalhas('entrar_falhas', chave);
      sessao.criarSessao(req, res, resultado.usuario.id);
      res.status(200).json({ usuario: paraUsuarioPublico(resultado.usuario) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/autenticacao/sair', (req, res) => {
    sessao.encerrarSessao(req, res);
    res.status(204).end();
  });

  app.get('/api/autenticacao/sessao', (req, res) => {
    res.json({ usuario: req.usuario ?? null });
  });

  app.post(
    '/api/autenticacao/recuperar-senha',
    limitador.middleware('recuperar_senha', {
      chave: (req) => `${chaveIp(req)}|${normalizarEmail(req.body?.email)}`,
    }),
    async (req, res, next) => {
      try {
        const { email } = req.body ?? {};
        const validacao = validarRecuperarSenha({ email });
        if (!validacao.ok) {
          return next(criarErro(400, validacao.codigo, validacao.campos ? { campos: validacao.campos } : {}));
        }

        const emailNormalizado = normalizarEmail(email);
        const usuario = buscarUsuarioPorEmail(banco, emailNormalizado);

        if (usuario) {
          const { token } = criarTokenRecuperacao({ banco, usuarioId: usuario.id });
          const link = `${configuracao.urlPublica}/recuperar-senha?token=${token}`;
          gravarEmailRecuperacao({
            pastaExecucao: configuracao.pastaExecucao,
            usuarioId: usuario.id,
            idioma: usuario.idioma,
            nome: usuario.nome,
            link,
          });
          registrarLog?.('info', 'recuperacao_senha_solicitada', { usuario_id: usuario.id });
        }

        res.status(202).end();
      } catch (erro) {
        next(erro);
      }
    },
  );

  app.post('/api/autenticacao/redefinir-senha', async (req, res, next) => {
    try {
      const { token, senha } = req.body ?? {};
      const validacao = validarRedefinirSenha({ token, senha });
      if (!validacao.ok) {
        return next(criarErro(400, validacao.codigo));
      }

      const resultado = await redefinirSenhaComToken({ banco, token, senhaNova: senha });
      if (!resultado.ok) {
        return next(criarErro(400, 'token_invalido'));
      }

      sessao.encerrarTodas(resultado.usuarioId);
      registrarLog?.('info', 'senha_redefinida', { usuario_id: resultado.usuarioId });
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });
}
