// Confere uma configuração de "Flashcards" salva ou importada antes de aceitá-la.
export function validarFlashcardsSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.pares) &&
    registro.pares.length >= 1 &&
    registro.pares.length <= 40 &&
    registro.pares.every(
      (par) =>
        par !== null &&
        typeof par === 'object' &&
        typeof par.pergunta === 'string' &&
        par.pergunta.trim().length >= 1 &&
        par.pergunta.length <= 80 &&
        typeof par.resposta === 'string' &&
        par.resposta.trim().length >= 1 &&
        par.resposta.length <= 80,
    ) &&
    typeof registro.espelharVerso === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}
