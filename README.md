# Apps

Página pública dos apps **Dá o Papo**, **ContaCerta** e **RadiestesiaPro**: https://luizflaviomatias.github.io/apps/

O RadiestesiaPro tem a landing num repositório público próprio (`radiestesiapro`); aqui ficam os
downloads, o `versao.json` que ela lê e o anúncio de atualização do app.

O código dos apps fica em repositórios próprios. Este repositório só tem as landing pages e o
**motor** que traz as versões novas de lá e publica aqui, para o público baixar.

## Como funciona

1. Cada app, ao publicar uma versão, põe no release dele um `versao.json` (formato 1) com a versão e,
   para cada arquivo (APK, pacote web), a etiqueta do release, o nome do arquivo e o SHA-256.
2. O workflow **Buscar atualizações dos apps** roda quando um app avisa (`repository_dispatch` do tipo
   `nova-versao`), a cada 30 minutos e pelo botão *Run workflow*.
3. O motor (`motor/`) acha o release de versão mais alta que tem `versao.json`, confere o arquivo,
   baixa cada arquivo, confere o SHA-256 e copia para um release daqui (`contacerta-v3.5.0`,
   `da-o-papo-v0.4.0`…). Arquivo com SHA-256 errado não é publicado.
4. Depois escreve em `docs/<app>/`:
   - `versao.json`: o que as landing pages leem (versão, links, tamanho, SHA-256, canal iOS);
   - `atualizacao.json`: o anúncio no formato que cada app instalado já sabe ler;
   - `app/`: o app web, quando o app tem versão web (ContaCerta no iPhone).
5. O commit em `docs/` publica o site pelo GitHub Pages (pasta `docs/` do `main`).

Um app com problema não impede o outro de ser publicado; o workflow fica vermelho e mostra o motivo.

## Configuração

- `apps.json`: lista dos apps e do repositório de cada um.
- Secret **`FONTE_TOKEN`**: token só de leitura (*Contents: Read-only*) nos repositórios dos apps.
  Obrigatório quando eles forem privados; enquanto forem públicos, o token do próprio workflow basta.
  O token fino expira em até 1 ano: renove antes disso.
- Para o app avisar na hora (sem esperar os 30 minutos), o repositório dele precisa de um token com
  permissão de disparar workflows aqui e de um passo que chame `repository_dispatch` com `nova-versao`.

## Rodar no computador

```bash
npm test     # regras do motor, leitor de zip e o fluxo completo com um GitHub de mentira
```

`npm run motor` roda o motor de verdade: lê os apps e **escreve nos releases deste repositório**
(precisa de `GITHUB_TOKEN` com escrita aqui).
