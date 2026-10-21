# Roteiro da Velysoma Voluts

## Etapa 1 — Fundamentos (iniciada)
- [x] Repositório independente e identidade visual
- [x] Tela pública e painel responsivo
- [x] Fluxo Tera ID OAuth PKCE e Firestore tenant-scoped
- [x] Cadastro de igrejas, ministérios, pessoas, eventos e escalas
- [ ] Conectar env de desenvolvimento e validar login real com conta Tera ID
- [ ] Testes ponta-a-ponta para vários perfis e igrejas

## Etapa 2 — Gestão de voluntários
- [ ] Editar, arquivar e excluir com confirmação e auditoria
- [ ] Convidar membros com Tera ID e configurar permissões
- [ ] Calendário com visualização semanal/mensal
- [ ] Disponibilidade, conflitos e trocas de escala
- [ ] Confirmação, check-in e notificações

## Etapa 3 — Gestão da igreja
- [ ] Secretaria, visitantes, pequenos grupos e células
- [ ] Ensino / EBD, Kids e eventos com inscrições
- [ ] Financeiro, doações e relatórios
- [ ] Backup, exportação e políticas de privacidade

## Etapa 2A — planejador (implementado para validação)
- [x] Preferências semanais e datas indisponíveis por pessoa (edição pela administração)
- [x] Visão mensal e sugestões assistidas para alocação
- [x] Validação de disponibilidade, ministério e conflitos de horários na inclusão na escala
- [x] Estados pendente, confirmado, recusado e check-in (ação da liderança)
- [x] Relatórios resumidos e exportação CSV dos primeiros 100 registros por módulo
- [ ] Convites Tera ID para voluntários e confirmação feita pela própria pessoa
- [ ] Escala automática sem intervenção, com locks transacionais e regras para eventos recorrentes
- [ ] Trilha de auditoria, paginação, fusos e escala avançada com vários papéis

As sugestões não criam escalas automaticamente. Uma escala recusada não conta como bloqueio de horário.
