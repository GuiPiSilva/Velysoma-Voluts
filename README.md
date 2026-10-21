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

### Escopo e limites

Esta é a fundação da plataforma, não uma versão completa de produção. Ainda faltam: edição/exclusão, convites e papéis detalhados, disponibilidade, confirmação de escala, notificações, Kids, células, financeiro, pagamentos e aplicativo nativo. Listagens limitadas a 100 registros enquanto não há paginação. Os dados exibidos na ilustração do site são fictícios.

Não foi feito nenhum deploy nem exclusão de dados de outros sistemas a partir deste repositório. Veja [ROADMAP](docs/ROADMAP.md).
