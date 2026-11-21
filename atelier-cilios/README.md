# Ateliê do Olhar — Site de agendamento de extensão de cílios

Site responsivo com catálogo dos **sete modelos**, agendamento em etapas, envio da solicitação pelo WhatsApp e painel para a proprietária gerenciar fotos, preços, WhatsApp, dias e horários.

## 1. Preparar o ambiente

Requisitos: **Node.js 22+**, npm, conexão à internet na instalação inicial.

1. Extraia o ZIP.
2. Abra a pasta `atelier-cilios` no VS Code.
3. Abra o terminal nessa pasta.
4. Execute `npm install`.
5. Copie o arquivo `.env.example` e renomeie a cópia para `.env`.
6. Edite o arquivo `.env` e substitua os valores `ADMIN_PASSWORD` e `SESSION_SECRET`. A senha precisa ter **pelo menos 16 caracteres**; o segredo, **pelo menos 32 caracteres aleatórios**. Não os compartilhe nem faça commit do `.env`.
7. Execute `npm run dev`.
8. Abra **http://localhost:5173** no navegador.

No Windows PowerShell, para criar `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Para criar um segredo aleatório, rode no PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copie o resultado para `SESSION_SECRET`. Crie uma senha *diferente* e longa para `ADMIN_PASSWORD`.

## 2. Acessar o painel

No topo do site, clique em **Área administrativa**. Digite a senha `ADMIN_PASSWORD` configurada no `.env`.

## 3. Adicionar a foto de Brasileiro 3D

1. Na área administrativa, localize **Gerenciar imagens**.
2. Encontre o item **Brasileiro 3D**.
3. Clique em **Adicionar foto**.
4. Escolha uma foto JPEG, PNG ou WebP do seu celular/computador (máximo 5 MB).
5. Confira a prévia e clique em **Salvar foto**. A imagem é processada e salva no servidor.
6. A imagem aparecerá imediatamente no card do catálogo e na seleção de modelos.

## 4. Fotos dos outros modelos

Repita a operação para **Fox Eyes**, **Sirena**, **Glow**, **Glamour**, **Efeito Wispy** e **Efeito Suave**.

Para trocar uma imagem, clique em **Alterar foto**. Para excluir, clique no ícone de lixeira. Ao trocar a imagem, clique em **Salvar foto**. A exclusão salva imediatamente, sem precisar usar o botão geral de configurações.

## 5. WhatsApp, dias, horários e preços

1. No painel, em **Identidade e contato**, preencha o telefone com **DDI e DDD**, somente números. Exemplo de formato: `5583999999999` (número ilustrativo, **não é um contato real**).
2. Em **Dias e horários**, selecione os dias de atendimento, abertura, encerramento e intervalo entre horários apresentados. Use `AAAA-MM-DD` nas datas bloqueadas, uma por linha.
3. Em **Preços dos procedimentos**, edite nomes e valores se desejar. Os sete modelos e os preços definidos pelo pedido inicial já vêm cadastrados.
4. Clique em **Salvar configurações**.
5. Teste o fluxo na página pública. O WhatsApp abrirá uma mensagem **pré-preenchida**, que a cliente poderá revisar e enviar.

**Importante:** o site não faz bloqueio de horários já pedidos e não promete disponibilidade real. O dia e horário são **preferências**, e o estúdio confirma pessoalmente pelo WhatsApp. Não há pagamento online.

## 6. Persistência e segurança

- Configurações ficam em `server/data/config.json` e imagens em `server/data/uploads/`. Faça backup desses dois caminhos.
- O painel é protegido por senha, sessão assinada em cookie HttpOnly e verificações de permissão no servidor.
- O servidor limita tentativas de login e exige a origem configurada (`PUBLIC_ORIGIN`) para mudanças na API.
- Upload limitado a 5 MB e reprocessado como WebP; as imagens possuem nome aleatório.
- As informações pessoais do formulário **não são persistidas** no backend; vão apenas para a mensagem aberta pela cliente.
- Não coloque o conteúdo de `server/data` nem o `.env` em diretórios públicos.
- As sessões ficam na memória e são invalidadas quando o servidor é reiniciado.

## 7. Publicação com HTTPS

**Publicação exige hospedagem Node.js**, volume persistente para `server/data`, proxy HTTPS e variáveis secretas configuradas no provedor. Este pacote não foi publicado em um servidor por conta própria.

1. Escolha uma hospedagem que permita Node.js e disco **persistente** (ou adapte para banco e armazenamento em nuvem).
2. Configure `NODE_ENV=production`, `ADMIN_PASSWORD`, `SESSION_SECRET` e `PUBLIC_ORIGIN=https://seu-dominio-real.com` no ambiente da hospedagem.
3. Execute `npm install`, depois `npm run build` e `npm start` na raiz do projeto.
4. Configure o proxy HTTPS (ex.: Caddy/Nginx) encaminhando para `127.0.0.1:3001`, sem expor diretamente a porta do backend na internet. O certificado TLS deve estar ativo e válido.
5. Faça backup persistente e teste o site **no endereço HTTPS verdadeiro**, inclusive login, upload, exclusão e WhatsApp.

**Aviso:** o servidor escuta somente em `127.0.0.1` por segurança; algumas plataformas gerenciadas exigem um ajuste explícito de bind/proxy. Confirme isso antes de publicar.

## 8. Verificação de segurança antes de publicar

- [ ] O site está servido por HTTPS e cookies da sessão são `Secure` em produção.
- [ ] A senha e o segredo foram gerados e não estão no Git/repositório público.
- [ ] Uma pessoa sem login recebe `401` ao tentar alterar preços, fotos ou configurações.
- [ ] O formulário rejeita campos inválidos e arquivos não permitidos.
- [ ] As imagens continuam acessíveis depois de reiniciar o servidor.
- [ ] Uma conta não autenticada não consegue apagar/substituir imagens.
- [ ] O link de WhatsApp aponta para o número **real e autorizado** do estúdio.
- [ ] Os horários são apresentados como preferência, não como confirmação.
- [ ] Backups, logs, atualizações de dependências e política de privacidade foram revisados.
- [ ] Realize auditoria de dependências (`npm audit`) e testes em ambiente de homologação antes de uso público.

**Limitações conhecidas:** não existe sistema de ocupação/agenda compartilhada; sessão apenas em memória (uma instância); persistência em disco local não atende a hospedagens de arquivos efêmeros; políticas de privacidade finais exigem revisão pela responsável; hospedagem e HTTPS precisam ser configurados. Não é possível garantir ausência total de vulnerabilidades sem auditoria e testes de implantação.


## Atualização da personalização Lash Germano

A foto da página inicial agora está em `client/public/hero-lash.jpg` (sem a extensão `.jpeg` extra). O nome do estúdio está definido como Lash Germano no painel e também nos valores iniciais do backend. O título da aba também foi atualizado.

**Segurança:** este ZIP não contém seu arquivo `.env` e não inclui `node_modules`. Ao substituir a pasta local, mantenha uma cópia de segurança do projeto antigo e copie seu `.env` localmente para a pasta nova (nunca envie suas credenciais em conversas ou repositórios). Como credenciais anteriores apareceram em capturas de tela, gere novas credenciais privadas antes de publicar.

As sete imagens dos serviços e as configurações cadastradas foram preservadas em `server/data/`. Para evitar perdas, não apague os dados existentes sem um backup. Este ZIP não representa uma publicação HTTPS: a hospedagem com HTTPS e a persistência do armazenamento precisam ser configuradas e testadas separadamente.
