# Velysoma Voluts

Nova plataforma de **gestão de igrejas e voluntários**, construída do zero, sem importar código ou cadastros do Velysoma Clinic.

## Primeira versão

- **Site e identidade** preto, grafite e dourado; painel web responsivo.
- **TeraApps / Tera ID** com OAuth Authorization Code + PKCE S256. O fluxo inicia no servidor, guarda os verificadores em cookies HttpOnly e troca o código com a TeraApps.
- **Igrejas isoladas** no Firestore, com proprietário e autorização verificada em cada API.
- **Ministérios, pessoas, programações e escalas** com criação e listagem reais via Firestore.
- **Painel** com indicadores das entidades cadastradas e próximas programações.

### Requisitos

Node.js 22+ e configurações do Firebase/TeraApps. Copie `.env.example` para `.env.local` e complete apenas as variáveis necessárias. Variáveis privadas nunca vão ao navegador.

```bash
npm install
npm run lint
npm test
npm run dev
```

Acesse `http://localhost:3000`; o login está em `/volut/entrar` e o painel em `/painel`.

### Callback da Tera ID

Cadastre o cliente OAuth público `tera_velysoma_volut_web` e o callback **exato** do ambiente usado:

- Desenvolvimento: `http://localhost:3000/volut/entrar`
- Produção no domínio existente: `https://velysoma.com.br/volut/entrar`
- Se implantar em outro domínio, registre esse endereço na TeraApps antes de testar o login.

A TeraApps permanece como a autoridade central de identidade. **Não criamos senha própria** nem modificamos dados de outro produto.

### Modelo de dados Firestore

```text
voluts_users/{uid} -> churchIds[]
voluts_churches/{churchId}
  members/{uid} -> role, status
  ministries/{ministryId}
  people/{personId}
  events/{eventId}
  assignments/{eventId}_{personId}
```

Os endpoints verificam token Firebase com claim `voluts`, e-mail verificado, associação e nível de acesso. As chaves administrativas ficam apenas no servidor. A coleção nova `voluts_*` não possui dependências das antigas coleções clínicas.

### Novas funções: planejamento e escalas

- **Disponibilidade**: dias da semana e datas bloqueadas registradas por quem administra a igreja.
- **Agenda mensal**: visualização das programações por dia.
- **Sugestões de voluntários**: considera ministério, disponibilidade, compromissos conflitantes e distribuição de escalas; a liderança escolhe quem escalar.
- **Confirmar, recusar e fazer check-in**: responsável registra estado da escala; ainda não é o aceite individual do voluntário.
- **Relatórios e CSV**: resumo de participação e exportação de dados carregados, com tratamento de células que parecem fórmulas.
- **Segurança**: ações sensíveis continuam autorizadas no servidor por igreja; não há integração com WhatsApp.

### Escopo e limites

Esta é a fundação da plataforma, não uma versão completa de produção. Ainda faltam: edição/exclusão, convites e papéis detalhados, disponibilidade, confirmação de escala, notificações, Kids, células, financeiro, pagamentos e aplicativo nativo. Listagens principais limitadas a 100 registros enquanto não há paginação; verificações de conflitos usam janelas limitadas e precisam de desenho transacional antes de grandes volumes. Os dados exibidos na ilustração do site são fictícios.

Não foi feito nenhum deploy nem exclusão de dados de outros sistemas a partir deste repositório. Veja [ROADMAP](docs/ROADMAP.md).

## Organização simplificada do painel (prévia)
- Menu principal: **Início**, **Agenda**, **Pessoas**, **Escalas** e **Ministérios**. Relatórios ficam em "Outros".
- Agenda concentra calendário e cadastro de cultos/eventos; tocar num dia mostra suas programações.
- Pessoas concentra cadastros e a aba de disponibilidade; Escalas concentra lista, confirmações e sugestões.
- Formulários só aparecem após escolher "Novo", mantendo as listas limpas.
- Layout compacto e adaptado para celular, com navegação expansível.
- Nenhuma migração nem alteração nos dados ou no login TeraApps.

Em caso de aprovação, mesclar a proposta à `main` e publicar apenas um deploy de produção.
