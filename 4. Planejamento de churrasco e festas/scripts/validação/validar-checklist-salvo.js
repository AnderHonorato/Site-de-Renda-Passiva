// Confere uma lista de tarefas (checklist do evento) salva ou importada antes de aceitá-la.
function tarefaVálida(tarefa) {
  return (
    tarefa !== null &&
    typeof tarefa === 'object' &&
    typeof tarefa.texto === 'string' &&
    tarefa.texto.trim().length >= 1 &&
    tarefa.texto.length <= 200 &&
    typeof tarefa.concluída === 'boolean'
  );
}

export function validarChecklistSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.tarefas) &&
    registro.tarefas.length >= 1 &&
    registro.tarefas.length <= 200 &&
    registro.tarefas.every(tarefaVálida)
  );
}
