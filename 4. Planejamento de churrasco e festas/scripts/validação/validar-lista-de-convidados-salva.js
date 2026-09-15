// Confere uma lista de convidados salva ou importada antes de aceitá-la. Os nomes ficam
// só no aparelho: esta validação nunca envia nem confere dados fora do dispositivo.
const ESTADOS_VÁLIDOS = ['confirmado', 'pendente', 'recusado'];

function convidadoVálido(convidado) {
  return (
    convidado !== null &&
    typeof convidado === 'object' &&
    typeof convidado.nome === 'string' &&
    convidado.nome.trim().length >= 1 &&
    convidado.nome.length <= 80 &&
    ESTADOS_VÁLIDOS.includes(convidado.estado) &&
    typeof convidado.éCriança === 'boolean'
  );
}

export function validarListaDeConvidadosSalva(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.convidados) &&
    registro.convidados.length <= 1000 &&
    registro.convidados.every(convidadoVálido)
  );
}
