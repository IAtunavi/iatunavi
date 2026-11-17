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


## Avatar humano 3D

O componente `Hologram3D` tenta carregar um modelo VRM humano e mantém o avatar procedural como fallback caso WebGL, a rede ou o modelo falhem.

- Modelo padrão: **Robert**, da coleção 100Avatars Round 1, distribuída sob CC0.
- Origem do modelo: [Open Source Avatars — 100Avatars R1](https://github.com/ToxSam/open-source-avatars) e [Polygonal Mind — 100Avatars](https://github.com/PolygonalMind/100Avatars).
- Para substituir o modelo padrão, configure `VITE_TUNAVI_AVATAR_VRM` com a URL pública de um arquivo VRM cujo uso comercial e redistribuição estejam autorizados.
- O runtime carrega Three.js e three-vrm sob demanda por ESM CDN; o restante do assistente continua utilizável se o carregamento falhar.
- O avatar usa olhar direcionado ao cursor, expressões VRM disponíveis, piscadas e visemas aproximados derivados dos eventos de fala do navegador.

O modelo padrão é um avatar estilizado, não um humano fotorealista. Para uma identidade visual exclusiva e realismo cinematográfico, substitua-o por um VRM/GLB personalizado com licença adequada e rig facial completo. A variável `VITE_TUNAVI_AVATAR_VRM` deve ser definida no ambiente de build do frontend e conter uma URL HTTPS acessível pelo navegador. O arquivo VRM é baixado diretamente pelo navegador na primeira exibição do avatar, sem ser embutido no bundle JavaScript.


## Linguagem corporal do avatar

O palco 3D foi ampliado para enquadrar o corpo inteiro do modelo VRM. Quando o arquivo contém os ossos humanoides esperados, o avatar anima postura, tronco, cabeça, braços e mãos com movimentos suaves: pequenos acenos enquanto escuta e gestos alternados durante a fala. Modelos sem algum osso continuam funcionando; os movimentos ausentes são simplesmente ignorados. Os gestos são procedurais e não representam captura de movimento.


## Acompanhamento visual opcional

O componente do holograma oferece um controle **Ativar olhar**. A câmera só é solicitada depois do clique explícito do usuário; o recurso usa `getUserMedia` e MediaPipe Face Landmarker no próprio navegador para estimar a posição do rosto e orientar o olhar/cabeça do avatar. Nenhum quadro de câmera é enviado ao servidor, gravado ou usado para identificar a pessoa. O botão **Desativar olhar** encerra a detecção e libera as faixas da câmera.

O recurso requer contexto seguro (HTTPS ou localhost), navegador compatível, câmera disponível e permissão concedida. O runtime de visão e o modelo são carregados sob demanda por CDN; se não estiverem disponíveis, o holograma e o controle de voz continuam funcionando. A detecção indica apenas presença/posição aproximada do rosto: não é reconhecimento de identidade, leitura de emoções nem autenticação.
