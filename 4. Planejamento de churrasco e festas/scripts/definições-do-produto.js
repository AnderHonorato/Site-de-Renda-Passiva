// Coleções que o Mesa Farta guarda no aparelho (página Salvos, exportação e importação).
import { validarChecklistSalvo } from './validação/validar-checklist-salvo.js';
import { validarDivisãoSalva } from './validação/validar-divisão-salva.js';
import { validarListaDeConvidadosSalva } from './validação/validar-lista-de-convidados-salva.js';
import { validarPlanoDeEventoSalvo } from './validação/validar-plano-de-evento-salvo.js';

const totalDePessoas = (registro) => `${registro.adultos + registro.crianças} pessoa${registro.adultos + registro.crianças === 1 ? '' : 's'}`;

export const coleçõesLocais = [
  {
    chave: 'planos-de-churrasco',
    rótulo: 'Planos de churrasco',
    rótuloSingular: 'plano de churrasco',
    páginaDeEdição: 'páginas/churrasco.html',
    descrever: (registro) => `${registro.nome} — ${totalDePessoas(registro)}`,
    validar: validarPlanoDeEventoSalvo,
  },
  {
    chave: 'planos-de-festa-infantil',
    rótulo: 'Planos de festa infantil',
    rótuloSingular: 'plano de festa infantil',
    páginaDeEdição: 'páginas/festa-infantil.html',
    descrever: (registro) => `${registro.nome} — ${totalDePessoas(registro)}`,
    validar: validarPlanoDeEventoSalvo,
  },
  {
    chave: 'planos-de-almoço',
    rótulo: 'Planos de almoço ou encontro',
    rótuloSingular: 'plano de almoço',
    páginaDeEdição: 'páginas/almoço.html',
    descrever: (registro) => `${registro.nome} — ${totalDePessoas(registro)}`,
    validar: validarPlanoDeEventoSalvo,
  },
  {
    chave: 'divisões-de-despesas',
    rótulo: 'Divisões de despesas',
    rótuloSingular: 'divisão de despesas',
    páginaDeEdição: 'páginas/divisor-de-despesas.html',
    descrever: (registro) => `${registro.nome} — ${registro.pagantes.length} pagante${registro.pagantes.length === 1 ? '' : 's'}`,
    validar: validarDivisãoSalva,
  },
  {
    chave: 'checklists',
    rótulo: 'Checklists de evento',
    rótuloSingular: 'checklist',
    páginaDeEdição: 'páginas/checklist.html',
    descrever: (registro) => {
      const concluídas = registro.tarefas.filter((tarefa) => tarefa.concluída).length;
      return `${registro.nome} — ${concluídas}/${registro.tarefas.length} concluídas`;
    },
    validar: validarChecklistSalvo,
  },
  {
    chave: 'listas-de-convidados',
    rótulo: 'Listas de convidados',
    rótuloSingular: 'lista de convidados',
    páginaDeEdição: 'páginas/lista-de-convidados.html',
    descrever: (registro) => `${registro.nome} — ${registro.convidados.length} convidado${registro.convidados.length === 1 ? '' : 's'}`,
    validar: validarListaDeConvidadosSalva,
  },
];
