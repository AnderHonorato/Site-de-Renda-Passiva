/**
 * Categorias e tipos de tarefa em inglês, por id. Mesmos ids de dados/categorias.js.
 * testes/idioma.test.mjs confere que nenhum fica de fora.
 */
export default Object.freeze({
  categorias: {
    dinheiro: { nome: 'Money and pricing', resumo: 'Price, margin, interest, installments and bill splitting.' },
    vendas: { nome: 'Sales and proposals', resumo: 'Quotes, proposals, commission and follow-up.' },
    cálculo: { nome: 'Math and conversion', resumo: 'Percentages, rule of three and units of measure.' },
    datas: { nome: 'Dates and hours', resumo: 'Differences, deadlines, business days and workload.' },
    texto: { nome: 'Text', resumo: 'Count, clean, standardize, compare and transform.' },
    documentos: { nome: 'Documents and PDF', resumo: 'Generate, convert, organize and sign documents.' },
    planilhas: { nome: 'Spreadsheets and data', resumo: 'Clean, compare, convert and analyze tables.' },
    imagens: { nome: 'Images', resumo: 'Resize, convert, compress and inspect.' },
    desenvolvimento: { nome: 'Development', resumo: 'JSON, codes, converters and technical utilities.' },
    segurança: { nome: 'Passwords and security', resumo: 'Generate secrets, validate documents and check data.' },
    trabalho: { nome: 'HR and work', resumo: 'Working hours, vacation, resume, schedules and reviews.' },
    operações: { nome: 'Stock and logistics', resumo: 'Stock, replenishment, freight, volume and checking.' },
    marketing: { nome: 'Marketing', resumo: 'Campaigns, metrics, UTM and content materials.' },
    produtividade: { nome: 'Productivity', resumo: 'Tasks, meetings, planning and tracking.' },
    estudos: { nome: 'Study', resumo: 'Activities, practice, review and printable material.' },
    ofício: { nome: 'Craft, home and building', resumo: 'Handmade production, renovation, parties and packaging.' },
  },
  tarefas: {
    calcular: 'Calculate',
    converter: 'Convert',
    criar: 'Create',
    organizar: 'Organize',
    comparar: 'Compare',
    validar: 'Validate',
    analisar: 'Analyze',
    exportar: 'Export',
  },
});
