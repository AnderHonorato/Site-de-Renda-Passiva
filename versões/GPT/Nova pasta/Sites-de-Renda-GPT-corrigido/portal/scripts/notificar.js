let prazo;
export function notificar(texto){const alvo=document.getElementById('notificacao');alvo.textContent=texto;alvo.classList.add('visivel');clearTimeout(prazo);prazo=setTimeout(()=>alvo.classList.remove('visivel'),4500);}
