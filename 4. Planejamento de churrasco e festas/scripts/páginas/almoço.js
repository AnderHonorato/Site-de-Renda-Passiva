// Página "Quantidade para almoço": usa o motor comum de planejamento com o perfil
// "almoço" e a coleção local "planos-de-almoço".
import { configurarPáginaDePlanejamento } from './motor-de-planejamento.js';

configurarPáginaDePlanejamento({ perfil: 'almoço', coleção: 'planos-de-almoço' });
