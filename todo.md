# ZapCorridas - TODO

## Banco de Dados
- [x] Schema: tabela passengers (phone, name, totalRides, createdAt)
- [x] Schema: tabela drivers (phone, name, carModel, carColor, plate, expiresAt, isBlocked, createdAt)
- [x] Schema: tabela rides (passengerId, driverId, origin, destination, distance, duration, status, timestamps)
- [x] Schema: tabela verification_codes (phone, code, expiresAt)
- [x] Schema: tabela notifications (title, message, target, isActive)
- [x] Schema: tabela message_templates (key, name, template, variables, isActive)
- [x] Migrar schema para banco de dados

## Autenticação via WhatsApp
- [x] Tela de login com campo de telefone
- [x] Envio de código de verificação via Z-API
- [x] Validação de código e criação de sessão JWT permanente
- [x] Auto-cadastro de passageiros novos (solicitar nome)
- [x] Bloqueio de motoristas com conta vencida
- [x] Sessão permanente (não expira até logout)
- [x] Admin fazer login via WhatsApp (mesmo fluxo dos outros usuários)

## Área do Passageiro
- [x] Tela de solicitação de corrida com origem/destino
- [x] Integração Google Maps autocomplete
- [x] GPS automático para localização atual
- [x] Estimativa de distância e tempo
- [x] Visualização de corrida ativa (status em tempo real)
- [x] Histórico de corridas detalhado com números de telefone
- [x] Cancelamento de corrida
- [x] Exibição de notificações do admin

## Área do Motorista
- [x] Dashboard do motorista com corrida ativa
- [x] Link para aceitar corrida (vindo do WhatsApp)
- [x] Aceitar corrida e ficar indisponível
- [x] Iniciar viagem / Finalizar viagem
- [x] Cancelamento de corrida
- [x] Histórico de corridas detalhado com números de telefone
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
- [x] Gerenciamento de administradores (cadastrar, bloquear, desbloquear)
- [x] Histórico de corridas com filtros e detalhes
- [x] Sistema de notificações (criar, ativar/desativar, segmentar)
- [x] Menu de templates de mensagens WhatsApp com variáveis dinâmicas
- [x] Redesign completo: responsivo mobile-first, menu colapsável, design profissional
- [x] Remover login Manus OAuth (apenas WhatsApp)

## Design e UX
- [x] Interface mobile-first responsiva
- [x] Design elegante com cores modernas (tema verde)
- [x] Botões grandes e acessíveis
- [x] Experiência fluida e intuitiva
- [x] Painel admin com sidebar colapsável
- [x] Navegação por abas/pills responsiva

## Bugs Corrigidos
- [x] Google Maps JavaScript API carregada múltiplas vezes
- [x] Menu de templates de mensagens não funciona
- [x] Números de telefone não aparecem no histórico
- [x] Painel admin não responsivo para celular

## Dados Iniciais
- [x] 8 templates de mensagens WhatsApp criados no banco
- [x] Admin 5568999086827 adicionado ao banco de dados

## Testes
- [x] 17 testes unitários passando (zapi.test.ts, zapcorridas.test.ts, auth.logout.test.ts)


## Bugs Atuais
- [x] Menu Mensagens WhatsApp não está alterando/desabilitando as mensagens no sistema


## Sistema de Avaliação
- [x] Criar tabela ratings no banco de dados (rideId, driverId, passengerId, stars, comment, createdAt)
- [x] Adicionar rotas tRPC para criar/listar/editar avaliações
- [x] Tela de avaliação no frontend (após corrida finalizada)
- [x] Exibir histórico de avaliações no perfil do motorista
- [x] Calcular média de avaliações do motorista
- [x] Mostrar avaliações no painel admin


## Bugs Críticos v4
- [x] Funções de editar passageiros e motoristas não aparecem no painel admin
- [x] Login: se cadastrar motorista com número já em passageiros, sempre vai para tela do motorista

## Bugs v5
- [x] Formatar telefone sem código 55: (11) 94010-8878 em vez de 5511940108878
- [x] Mensagens mostram {{nome_motorista}} em vez do nome real (variáveis substituídas corretamente no backend)
- [x] Calcular distância antes de aceitar corrida (localização atual do motorista)
- [x] Histórico do passageiro: "Tel:" não mostra o número do motorista


## Melhorias v6
- [x] Aplicar formatação de telefone em TODOS os lugares do sistema (admin, histórico, motorista, passageiro, notificações)


## Bugs v7
- [x] Botão de sair do painel admin não funciona
