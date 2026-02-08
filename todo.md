# ZapCorridas - TODO

## Banco de Dados
- [x] Schema: tabela passengers (phone, name, totalRides, createdAt)
- [x] Schema: tabela drivers (phone, name, carModel, carColor, plate, expiresAt, isBlocked, createdAt)
- [x] Schema: tabela rides (passengerId, driverId, origin, destination, distance, duration, status, timestamps)
- [x] Schema: tabela verification_codes (phone, code, expiresAt)
- [x] Schema: tabela notifications (title, message, target, isActive)
- [x] Migrar schema para banco de dados

## Autenticação via WhatsApp
- [x] Tela de login com campo de telefone
- [x] Envio de código de verificação via Z-API
- [x] Validação de código e criação de sessão JWT permanente
- [x] Auto-cadastro de passageiros novos (solicitar nome)
- [x] Bloqueio de motoristas com conta vencida
- [x] Sessão permanente (não expira até logout)

## Área do Passageiro
- [x] Tela de solicitação de corrida com origem/destino
- [x] Integração Google Maps autocomplete
- [x] GPS automático para localização atual
- [x] Estimativa de distância e tempo
- [x] Visualização de corrida ativa (status em tempo real)
- [x] Histórico de corridas detalhado
- [x] Cancelamento de corrida
- [x] Exibição de notificações do admin

## Área do Motorista
- [x] Dashboard do motorista com corrida ativa
- [x] Link para aceitar corrida (vindo do WhatsApp)
- [x] Aceitar corrida e ficar indisponível
- [x] Iniciar viagem / Finalizar viagem
- [x] Cancelamento de corrida
- [x] Histórico de corridas detalhado
- [x] Exibição de notificações do admin

## Integração Z-API (WhatsApp)
- [x] Envio de código de verificação
- [x] Notificação no grupo de motoristas (nova corrida)
- [x] Mensagem privada ao motorista (dados do passageiro + localização)
- [x] Mensagem ao passageiro (dados do motorista que aceitou)
- [x] Notificação de cancelamento (ambas as partes)
- [x] Envio de localização via WhatsApp

## Painel Administrativo
- [x] Dashboard com estatísticas (totais, gráficos)
- [x] Gerenciamento de passageiros (listar, editar, bloquear, buscar)
- [x] Gerenciamento de motoristas (cadastrar, editar, bloquear, buscar)
- [x] Histórico de corridas com filtros e detalhes
- [x] Sistema de notificações (criar, ativar/desativar, segmentar)

## Design e UX
- [x] Interface mobile-first responsiva
- [x] Design elegante com cores modernas
- [x] Botões grandes e acessíveis
- [x] Experiência fluida e intuitiva

## Melhorias Solicitadas
- [x] Admin fazer login via WhatsApp (mesmo fluxo dos outros usuários)
- [x] Gerenciamento de administradores (cadastrar, bloquear, desbloquear)
- [x] Adicionar número do motorista e passageiro no histórico de corridas
- [x] Novo menu para editar templates de mensagens WhatsApp com variáveis
- [x] Redesign do painel admin com menu colapsável/oculto

## Bugs
- [x] Fix: Google Maps JavaScript API carregada múltiplas vezes na página


## Ajustes Finais
- [x] Remover login Manus OAuth do painel administrativo (apenas WhatsApp)
- [x] Adicionar 5568999086827 como administrador no banco de dados


## Melhorias em Progresso
- [x] Implementar menu completo de edição de templates de mensagens WhatsApp com variáveis dinâmicas
  - [x] Mensagem: Verificação de código de login
  - [x] Mensagem: Nova corrida disponível (grupo de motoristas)
  - [x] Mensagem: Dados do passageiro para motorista que aceitou
  - [x] Mensagem: Confirmação de aceitar corrida (passageiro)
  - [x] Mensagem: Cancelamento por passageiro
  - [x] Mensagem: Cancelamento por motorista
  - [x] Mensagem: Corrida iniciada
  - [x] Mensagem: Corrida finalizada

## Bugs Reportados
- [x] Menu de templates de mensagens WhatsApp não estava aparecendo no painel admin
- [x] Números de telefone não aparecem no histórico de corridas (passageiro e motorista)
