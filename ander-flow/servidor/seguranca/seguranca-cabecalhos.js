// seguranca-cabecalhos.js — cabeçalhos HTTP de segurança (§9.1 dos contratos).
// CSP estrita (sem 'unsafe-inline'/'unsafe-eval'), Referrer-Policy, Permissions-Policy
// restritiva, HSTS só em produção e x-powered-by desligado.
import helmet from 'helmet';

// helmet 8.x não tem middleware para Permissions-Policy; montamos o valor à mão.
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'display-capture=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'interest-cohort=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
].join(', ');

const UM_ANO_EM_SEGUNDOS = 365 * 24 * 60 * 60;

/** @param {import('express').Express} app */
export function aplicarCabecalhos(app, configuracao = {}) {
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: configuracao.emProducao
        ? { maxAge: UM_ANO_EM_SEGUNDOS, includeSubDomains: true, preload: false }
        : false,
      // Sem <iframe> na aplicação: frame-ancestors 'none' na CSP já cobre isso;
      // X-Frame-Options continua no padrão do helmet como reforço para navegadores antigos.
    }),
  );

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });
}
