# Iatunavi

Construa a plataforma completa do TUNAVI: "pode executar tudo , deixe a tunavi completa , e ja ative o super painel com o login: tunavinetwork@gmail.com e senha @Oc45123* , ja ative com todos os controles". Siga rigorosamente todas as especificações do arquivo anexado "PROMPT 01 — TUNAVI Construção da interface principal".

### Locked
- **Direção visual:** Holográfica HUD (adotada e salva nos anexos).
- **Tema e Paleta:**
  - Fundo principal: `#0B0813` com gradiente radial `#2a1356` para `#0B0813`.
  - Destaque primário: Violeta elétrico `#7C3AED` e Lavanda `#DDD6FE`.
  - Superfícies / Cards: Vidro escuro translúcido `rgba(22, 16, 38, 0.55)` com `backdrop-filter: blur(18px)` e bordas finas `border-lav/10` a `border-lav/15`.
  - Tipografia: 'Space Grotesk' para títulos/display, 'JetBrains Mono' para dados, relógio e elementos técnicos, e fonte limpa para textos gerais.
  - Frase de efeito oficial no topo: "Sua inteligência. Seu mundo. Suas possibilidades."
- **Assistente Central / Holograma:**
  - Busto de um ser humano masculino real projetado como holograma futurista com iluminação volumétrica violeta, scanlines, feixes verticais e anel emissor de base com partículas.
  - 5 estados interativos funcionais no frontend:
    1. Repouso: brilho suave e respiração/movimento sutil.
    2. Ouvindo: ondas sonoras e pulsos luminosos reativos.
    3. Processando: anéis orbitais girando e partículas ativas.
    4. Respondendo: pulsação visual sincronizada e espectrograma de voz ativo.
    5. Executando: barra de progresso holográfica e indicadores de atividade.
  - Seletor rápido de estados ou trigger ao clicar no microfone / enviar mensagem para demonstrar as animações ao vivo.
- **Estrutura de Navegação (14 módulos no menu lateral):**
  1. Visão geral (Dashboard principal com holograma, atalhos, cards de tarefas, projetos e atividades)
  2. Conversar com TUNAVI (Chat completo com histórico, campo de entrada, espectrograma de voz, sugestões de comandos e indicador de estado)
  3. Meu espaço (Dashboard pessoal com widgets customizáveis)
  4. Projetos (Gestor de projetos com status e barras de progresso)
  5. Tarefas (Quadro de tarefas interativo com check e prioridades)
  6. Pesquisa e inteligência (Módulo de pesquisa de mercado e tendências com relatórios demonstrativos)
  7. Criador (Estúdio criativo para geração de conteúdo e código)
  8. Agentes (Lista de agentes especializados como Atlas, Nébula, etc., com cards de status)
  9. Memória (Painel de memórias, fatos salvos e preferências contextuais)
  10. Voz (Painel de testes de voz, entonação, velocidade e microfone)
  11. Integrações (Hub de conexões e integrações preparadas)
  12. TUNAVI Desktop (Painel de sincronização desktop com status de conexão)
  13. Segurança (Auditoria de segurança, controle de chaves e privacidade)
  14. Configurações (Preferências de sistema, tema e idioma)
- **Super Painel / Painel Master:**
  - Rota ou modal de acesso administrativo com autenticação pré-configurada para o login `tunavinetwork@gmail.com` e senha `@Oc45123*`.
  - Ao autenticar, desbloqueia todos os controles mestres: gestão de usuários, controle e alternância de modelos de IA, limites de consumo de tokens, controle global de módulos, logs de auditoria e configurações avançadas.
  - Alternador visível para acessar o Super Painel diretamente pelo avatar ou menu de configurações.

### Open
- Arquitetura de rotas limpa (React Router / TanStack com layout compartilhado de sidebar e header).
- Estado reativo com persistência em localStorage para permitir adicionar tarefas, alternar estados do assistente, enviar mensagens no chat e salvar preferências sem perder dados no reload.
- Efeitos sonoros sutis de UI futurista (opcional com botão mute no header).
- Responsividade completa para Desktop, Tablet e Mobile (menu recolhível e gaveta mobile).

build a real working app, not a clickable prototype; the screen and kit files show layout, content and look (a wireframe's, structure only) and are never code to copy. The screens are the moments the user designed, not the whole product. Before building, walk through each flow as its user would and design what the pictures leave out, as a product designer would for this product: the steps a flow needs to finish and how the app responds to what the user does, including the moments its users will actually run into, like waiting on something or finding nothing yet. Add nothing a user of this product would never meet, and keep an app the user wants simple, simple. Never leave a step the product's core flows need as "coming soon", unless the brief says the user chose to. Where such a step needs an outside service, build every part up to it and say in your reply what's left to connect. Fill product gaps only, never a look the design set: an added step reuses the UI kit's tokens, chrome and parts and the nearest designed screen's layout, with no new visual direction. Look at every screen's picture before writing code; design.md says which picture or sheet holds each screen. Open the UI kit's shells and parts HTML for the header, tab bar, composer and components, not only its tokens. Use each finished screen's copy exactly as design.md lists it; never invent copy for one. A wireframe under design.md's Wireframes gives structure only: build it in the design's look, as design.md says. The screens' photos are placeholders for the mockups only: replace every photo design.md lists with the user's own upload for it, else as design.md says (a photo without people re-composed with imagegen--edit_image from it as a reference, a photo of people generated from its brief and never from the photo), and ship no set photo or its URL. For a design that came with no design.md, every photo on assets.lovable.dev or images.unsplash.com is a set photo: replace it with the user's own upload for it, else a new image generated for its slot, any person in it one who doesn't exist, never from the photo or a picture showing it. Build and check each screen at the canvas it was drawn at: phone 393×764, tablet landscape 1133×744, tablet portrait 744×1133, desktop 1280×832. After building, screenshot the app at those sizes and states, compare each finished screen with its picture, and fix every visual difference you didn't choose; check a wireframe's screen against its structure, never its grey look. End your reply with "Changed from the mockups": each deliberate change and why, and "Added beyond the mockups": each step, state or interaction you built that no screen shows.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://iatunavi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7c48910-540c-46c9-ba57-bb1ddfa28867).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
