# TUNAVI

Plataforma de assistente pessoal com IA, módulos de produtividade e interface holográfica HUD.

## Identidade visual

- Fundo: `#0B0813`, com gradiente radial `#2a1356`.
- Destaques: violeta `#7C3AED` e lavanda `#DDD6FE`.
- Superfícies de vidro escuro com blur e bordas lavanda sutis.
- Tipografia: Space Grotesk e JetBrains Mono.
- Frase oficial: **Sua inteligência. Seu mundo. Suas possibilidades.**

## Módulos

Visão geral, Conversar, Meu espaço, Projetos, Tarefas, Pesquisa e inteligência, Criador, Agentes, Memória, Voz, Integrações, TUNAVI Desktop, Segurança e Configurações.

## Administração e autenticação

O acesso de administrador é controlado pela tabela `user_roles` do Supabase. A migração `supabase/migrations/20261116180000_master_admin.sql` promove a conta existente `tunavinetwork@gmail.com` para administradora se ela já estiver cadastrada no Supabase Auth. Se a conta ainda não existir ao aplicar a migração, crie e confirme a conta no Supabase Auth e execute a migração novamente. O cadastro público nunca concede privilégios administrativos. **Nunca armazene senhas, tokens privados ou chaves de serviço neste README, no frontend ou no histórico Git.**

O Super Painel usa a sessão autenticada e verifica a função `admin` antes de exibir os controles. Os endpoints de IA exigem sessão válida e aplicam o limite diário por usuário. As políticas RLS do banco devem continuar sendo a autoridade final para cada operação.

## Ambiente

Configure no ambiente de execução os valores necessários do Supabase:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Não coloque `service_role`, chaves privadas ou credenciais de terceiros em variáveis expostas ao navegador. O arquivo `.env` local não deve ser versionado; use um arquivo de exemplo sem valores reais para documentar a configuração.

## Desenvolvimento

```sh
git clone https://github.com/IAtunavi/iatunavi.git
cd iatunavi
npm install
npm run dev
```

Scripts disponíveis: `npm run build`, `npm run lint` e `npm test`.

## Lovable

Projeto conectado ao Lovable: https://lovable.dev/projects/d7c48910-540c-46c9-ba57-bb1ddfa28867

Aplicação: https://iatunavi.lovable.app
