# Sono plasma Plenitude

Sistema de Sonoplastia Maçônica – Áudio Externo + Cronômetro
🎯 Objetivo do Projeto

Criar um sistema web de sonoplastia cerimonial maçônica, simples, silencioso e funcional, voltado ao controle de músicas instrumentais externas, com cronômetro automático por etapa, uso em tablet e celular, e nomes simbólicos nos controles.

O sistema deve ser respeitoso, discreto e confiável, ideal para uso durante os trabalhos.

🔊 Integração com Áudio Externo

O sistema deve permitir tocar áudios externos via URL, como por exemplo:

MP3 hospedado em servidor próprio

CDN

Google Drive (link direto)

S3

Outro storage externo

Regras:

Apenas 1 áudio pode tocar por vez

Ao iniciar outro áudio:

O anterior para automaticamente

Controles disponíveis:

▶ Iniciar

⏸ Pausar

⏹ Parar

Controle de volume geral

Indicador visual discreto de áudio ativo

🧠 Nomes Simbólicos dos Botões (UI)

Cada etapa deve usar nomes simbólicos, não técnicos:

Etapa Técnica	Nome Simbólico
Abertura	Acendimento das Luzes
Entrada	Marcha ao Oriente
Reflexão	Silêncio Interior
Trabalhos	Coluna em Harmonia
Encerramento	Fechamento dos Trabalhos
Ambiente	Véu do Silêncio

Os botões devem exibir:

Nome simbólico

Ícone simples (luz, coluna, compasso abstrato – sem símbolos explícitos)

⏱️ Modo Cronômetro Automático

Cada etapa deve possuir um tempo configurável, com opção de execução automática.

Funcionalidades:

Campo para definir duração (em minutos)

Cronômetro regressivo visível

Ao terminar o tempo:

Parar o áudio automaticamente

(Opcional) Avançar para a próxima etapa

Botão:

▶ Iniciar com tempo

⏸ Pausar tempo

⏹ Resetar

Exemplo de tempos padrão:

Acendimento das Luzes: 3 min

Marcha ao Oriente: 2 min

Silêncio Interior: 5 min

Coluna em Harmonia: tempo livre

Fechamento dos Trabalhos: 3 min

Véu do Silêncio: contínuo

🗄️ Estrutura de Banco de Dados

Criar banco relacional simples.

📄 Tabela: sonoplastia_etapas
Campo	Tipo
id	int (PK)
nome_simbolico	varchar
descricao	text
audio_url	varchar
tempo_padrao	int (minutos)
ordem	int
ativo	boolean
📄 Tabela: sonoplastia_execucao
Campo	Tipo
id	int (PK)
etapa_id	int (FK)
inicio	datetime
fim	datetime
tempo_executado	int
status	varchar
📱 Interface para Tablet / Celular (Templo)
Layout:

Responsivo (mobile-first)

Botões grandes (uso rápido)

Fonte legível à distância

Interface em modo escuro

Contraste alto

Nada de menus escondidos

Organização:

Lista vertical de etapas

Cada etapa em um card

Cronômetro visível dentro do card

Destaque visual apenas na etapa ativa

🎨 Identidade Visual

Fundo: grafite / azul profundo

Texto: cinza claro

Destaques: dourado discreto

Sem animações chamativas

Transições suaves e silenciosas

⚙️ Regras de Funcionamento

Nunca tocar dois áudios simultaneamente

Sempre parar o áudio anterior ao iniciar outro

Sistema deve funcionar:

Sem login

Offline parcial (se áudio já carregado)

Ideal para:

Tablet

Celular

Notebook conectado a caixa de som

🧩 Objetivo Final

Servir como central cerimonial de sonoplastia, garantindo ordem, fluidez, silêncio respeitoso e ambientação simbólica adequada aos trabalhos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sonoplasma.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ae9a8ecc-beed-48ec-b8b2-c9ee4925660d).

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

## Mestre de Harmonia: conectar a OpenAI

Cada usuário pode conectar sua própria chave da API OpenAI diretamente na aba **Mestre de Harmonia**. A chave é validada e criptografada no servidor, vinculada ao ID autenticado da conta e nunca retornada ao navegador após ser salva. Seu uso é cobrado pela OpenAI separadamente do ChatGPT Plus.

Antes de publicar a integração:

1. Configure o secret `OPENAI_CREDENTIALS_ENCRYPTION_KEY` no Supabase. Gere uma chave aleatória de 32 bytes codificada em Base64; por exemplo, no PowerShell:

   ```powershell
   $bytes = New-Object byte[] 32
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Guarde uma cópia segura dessa chave. Se ela for perdida ou substituída, as chaves OpenAI já salvas não poderão mais ser descriptografadas.
2. Aplique as migrations do Supabase para criar o armazenamento privado das conexões.
3. Publique as funções:

```sh
supabase functions deploy manage-openai-connection
supabase functions deploy suggest-audios
supabase functions deploy suggest-youtube-tracks
```

Depois, cada usuário pode criar uma chave em [OpenAI API keys](https://platform.openai.com/api-keys) e conectá-la pela interface. A chave de criptografia fica apenas nos secrets do Supabase; nunca a coloque no código ou em arquivos versionados.
