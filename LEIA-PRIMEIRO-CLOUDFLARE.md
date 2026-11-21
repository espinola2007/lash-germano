# Lash Germano — publicação com HTTPS gratuito na Cloudflare

Esta versão adapta a API Node/Express original para **Cloudflare Workers + D1** e mantém a página React/Vite, as imagens e o fluxo de solicitação no WhatsApp. O antigo servidor Express foi preservado apenas para consulta/desenvolvimento local e **não deve ser implantado na Cloudflare**. A publicação final **ainda não foi testada na conta da proprietária**.

## Atenção: não publique a versão antiga

O banco `D1` é obrigatório: ele armazena configurações, sessões administrativas e as sete fotos. A Cloudflare oferece um limite gratuito de armazenamento, mas **não armazenamento ilimitado**. As fotografias são compactadas no navegador antes de serem enviadas, cada uma com no máximo 1,5 MB, devido ao limite de BLOB do D1. As fotografias já cadastradas no seu computador **não são migradas automaticamente**: será necessário enviá-las de novo pelo painel.

Antes de receber clientes: configure WhatsApp, dias/horários, senha forte, segredos, teste a alteração de preços e os uploads e corrija eventuais problemas de segurança. Não coloque seu `.env` no GitHub e não reutilize senhas ou segredos que tenham aparecido em prints ou na conversa.

## Preparação, uma etapa por vez

1. **Crie um backup do site atual**. Extraia este ZIP em uma pasta separada. Não apague o projeto anterior.
2. Substitua os arquivos do repositório GitHub `espinola2007/lash-germano` pelos desta versão, preservando a pasta `atelier-cilios` na raiz. Confira os arquivos `atelier-cilios/cloudflare-worker.ts`, `atelier-cilios/wrangler.jsonc` e `atelier-cilios/schema.sql` no GitHub. **Não suba** `.env`, `node_modules`, `server/data` nem dados de clientes.
3. Crie um banco D1 na Cloudflare: **Storage & databases > D1 > Create database**. Nome: `lash-germano-db`. Copie o **Database ID** apresentado pela Cloudflare.
4. No arquivo `atelier-cilios/wrangler.jsonc`, substitua `SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1` pelo Database ID. Envie essa alteração ao GitHub. **Não é uma senha**.
5. Crie as tabelas no banco usando o painel D1 > Console, executando cada comando SQL presente em `schema.sql`, OU pelo terminal (com Wrangler autenticado): `npx wrangler d1 execute lash-germano-db --remote --file=./schema.sql` de dentro de `atelier-cilios`. Confirme as quatro tabelas: `settings`, `images`, `attempts`, `sessions`.
6. Na Cloudflare Workers > Create application > Connect GitHub, escolha `espinola2007/lash-germano`. Configure o **Root directory** como `atelier-cilios` (se houver esse campo), **Build command** `npm run build:cloudflare` e **Deploy command** `npx wrangler deploy`. O nome do Worker deve corresponder ao `name` do arquivo `wrangler.jsonc`, isto é, `lash-germano`. Não ative Cloudflare Access para a página inteira, porque isso impediria clientes de acessar o site; o painel administrativo exige sua própria senha.
7. Na aplicação Cloudflare, defina **Secrets** (nunca no GitHub): `ADMIN_PASSWORD` (nova senha forte, no mínimo 16 caracteres) e `SESSION_SECRET` (chave aleatória nova de 32+ caracteres). Crie usando **Settings > Variables and Secrets**; mande uma nova implantação se solicitado. O site retorna erro 503 na API enquanto os secrets estiverem ausentes.
8. Confira o endereço `https://<seu-nome>.workers.dev`. Teste catálogo, agendamento, WhatsApp, login, cadastrar/trocar/excluir fotos e salvar as configurações. Configure o WhatsApp pelo painel administrativo.

### Local para testes

Para testar o Worker (com banco de dados de desenvolvimento local): instale dependências com `npm install`, compile com `npm run build:cloudflare` e execute `npx wrangler dev`. O ambiente Worker usa o D1 local; execute também a migração local de `schema.sql`. O `npm run dev` antigo inicia o servidor Express, e **não testa a versão da Cloudflare**.

### Limitações e segurança

- D1 gratuito tem limite de dados e de operações. A aplicação não foi projetada para grande escala.
- Login limitado por tentativas por IP (registradas no D1); sessão com cookie HttpOnly/Secure/SameSite=Strict e revogação no logout.
- Uploads limitados a imagens JPEG, PNG e WebP; o código confere os cabeçalhos de formato. O navegador as otimiza; o Worker não reprocessa internamente imagens. Se for necessário validar metadados e decodificação no servidor, adicione processamento seguro específico.
- O site não confirma automaticamente horários: clientes enviam **solicitação** pelo WhatsApp.
- O projeto original apresentou alertas de dependências (`multer@1.x`). Esse Express/Multer não é usado no Worker, mas permanece nos arquivos locais e deve ser atualizado/removido em manutenção futura.
- Não foi possível instalar as dependências nesta sessão de preparação, por indisponibilidade de acesso ao registro npm. A verificação sintática de `cloudflare-worker.ts` e `client/src/main.tsx` foi realizada; **a compilação final e o deploy ainda precisam ser executados**.
