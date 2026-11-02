import {elemento} from './elemento.js';
export function renderizarLegal(tipo,config){const alvo=document.getElementById('pagina-legal');alvo.replaceChildren();const titulos={privacidade:'Sua privacidade.',termos:'Termos de uso.',contato:'Vamos conversar.'};alvo.append(elemento('span','sobretitulo','DOCE OFÍCIO'),elemento('h1','',titulos[tipo]??'Página não encontrada.'));
 const textos=tipo==='privacidade'?[
 ['Quem cuida deste espaço','Este portal é criado por Anderson. Os dados de contato do responsável aparecem na página Contato quando configurados.'],
 ['O que fica no seu aparelho','Cálculos, textos, imagens e PDFs são processados neste navegador. Os arquivos selecionados não são enviados pelo portal e não entram nos registros salvos. Ao solicitar um salvamento, os campos de texto e números ficam no armazenamento local deste navegador. Favoritos e preferências também são locais.'],
 ['Controle dos dados','Você pode excluir registros na página Salvos e exportar uma cópia em JSON. Limpar os dados deste site no navegador apaga salvos, favoritos e preferências. O gerador de senha não oferece salvamento de suas entradas ou resultados.'],
 ['Publicidade e medição','Esta versão não carrega anúncios, analytics ou rastreadores nas ferramentas. As preferências opcionais podem ser revistas no rodapé; aceitar não ativa um serviço inexistente. Uma futura finalidade exige atualização da política e nova escolha.'],
 ['Hospedagem e segurança','Ao acessar um site, a hospedagem recebe dados técnicos da conexão, como IP e navegador, conforme a configuração do provedor. Não há cadastro nem banco de dados de usuários neste portal. Não confunda armazenamento local com backup permanente: outros usuários deste mesmo perfil do navegador podem acessar os registros.']
 ]:tipo==='termos'?[
 ['Uso gratuito','As ferramentas podem ser usadas sem conta e sem doação. O apoio é voluntário e não desbloqueia recursos.'],
 ['Resultados e premissas','Resultados dependem dos valores e premissas informados. Confira unidades, margens, arredondamentos e a metodologia da ferramenta. Estimativas de custo, tempo ou consumo não constituem aconselhamento financeiro nem orçamento profissional.'],
 ['Arquivos e impressão','Mantenha os arquivos originais. Conversões podem alterar qualidade, metadados e elementos interativos. Moldes exigem impressão a 100% e conferência da régua antes do corte; encaixe físico depende de papel e montagem.'],
 ['Autoria','Código autoral e identidade deste portal: Anderson, 2026. Dependências mantêm suas licenças. Não há depoimentos, indicadores de público ou garantias de lucro inventados.'],
 ['Apoio por Pix','O QR estático apresenta uma instrução de pagamento. O portal não debita valores nem confirma recebimento bancário. Confira o recebedor no aplicativo do seu banco.']
 ]:tipo==='contato'?[['Criado por Anderson','Sugestões e relatos de problemas ajudam a melhorar as ferramentas.']]:[['Vamos voltar?','Use a navegação para encontrar uma ferramenta ou voltar ao início.']];
 for(const [titulo,texto] of textos)alvo.append(elemento('h2','',titulo),elemento('p','',texto));
 if(tipo==='contato'){const contato=config.criador?.contato;const portfolio=config.criador?.portfolio;let valido=false;for(const [rotulo,url] of [['Contato',contato],['Portfólio',portfolio]]){if(url&&/^(https:\/\/|mailto:)/i.test(url)){const a=elemento('a','botao secundario',rotulo);a.href=url;a.rel='noopener noreferrer';alvo.append(a);valido=true;}}if(!valido)alvo.append(elemento('p','','O canal público de contato ainda não foi configurado pelo responsável.'));}
}
