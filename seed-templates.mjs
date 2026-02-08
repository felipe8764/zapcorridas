import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const templates = [
  {
    key: 'verification_code',
    name: 'Código de Verificação',
    description: 'Enviado ao usuário durante o login',
    template: 'Seu código de verificação ZapCorridas é: {{code}}. Válido por 10 minutos.',
    variables: 'code',
    isActive: true,
  },
  {
    key: 'new_ride_group',
    name: 'Nova Corrida (Grupo de Motoristas)',
    description: 'Enviada ao grupo de motoristas quando uma nova corrida é solicitada',
    template: 'Nova corrida disponível! De {{origem}} para {{destino}}. Distância: {{distancia}}km, ~{{tempo}}min. Passageiro: {{nome_passageiro}} ({{telefone_passageiro}})',
    variables: 'origem,destino,distancia,tempo,nome_passageiro,telefone_passageiro',
    isActive: true,
  },
  {
    key: 'driver_accepted_private',
    name: 'Motorista Aceitou (Privado)',
    description: 'Enviada ao motorista que aceitou a corrida com dados do passageiro',
    template: 'Corrida aceita! Passageiro: {{nome_passageiro}} ({{telefone_passageiro}}). De {{origem}} para {{destino}}. Distância: {{distancia}}km.',
    variables: 'nome_passageiro,telefone_passageiro,origem,destino,distancia',
    isActive: true,
  },
  {
    key: 'passenger_accepted',
    name: 'Corrida Aceita (Passageiro)',
    description: 'Enviada ao passageiro quando motorista aceita a corrida',
    template: 'Motorista {{nome_motorista}} aceitou sua corrida! Tel: {{telefone_motorista}}, Placa: {{placa}} ({{cor_carro}}). Chegando em ~{{tempo}}min.',
    variables: 'nome_motorista,telefone_motorista,placa,cor_carro,tempo',
    isActive: true,
  },
  {
    key: 'passenger_cancelled',
    name: 'Cancelamento por Passageiro',
    description: 'Enviada ao motorista quando passageiro cancela a corrida',
    template: 'A corrida foi cancelada pelo passageiro. De {{origem}} para {{destino}}.',
    variables: 'origem,destino',
    isActive: true,
  },
  {
    key: 'driver_cancelled',
    name: 'Cancelamento por Motorista',
    description: 'Enviada ao passageiro quando motorista cancela a corrida',
    template: 'O motorista {{nome_motorista}} cancelou a corrida. Procurando outro motorista...',
    variables: 'nome_motorista',
    isActive: true,
  },
  {
    key: 'ride_started',
    name: 'Corrida Iniciada',
    description: 'Enviada ao passageiro quando motorista inicia a viagem',
    template: 'Motorista {{nome_motorista}} iniciou sua corrida! Chegando em {{tempo}} minutos.',
    variables: 'nome_motorista,tempo',
    isActive: true,
  },
  {
    key: 'ride_completed',
    name: 'Corrida Finalizada',
    description: 'Enviada ao passageiro quando corrida é concluída',
    template: 'Corrida finalizada! Distância: {{distancia}}km, Tempo: {{tempo}}min. Obrigado por usar ZapCorridas!',
    variables: 'distancia,tempo',
    isActive: true,
  },
];

for (const template of templates) {
  await connection.execute(
    'INSERT INTO message_templates (key, name, description, template, variables, isActive) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE template=?, isActive=?',
    [template.key, template.name, template.description, template.template, template.variables, template.isActive, template.template, template.isActive]
  );
}

console.log('Templates initialized successfully!');
await connection.end();
