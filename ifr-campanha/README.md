# Campanha Horas de Voo IFR — site da rifa

Site vitrine (mobile-first) para a campanha solidária. Sem frameworks, sem
backend: HTML, CSS e JavaScript puro. O visitante escolhe números e é
direcionado ao WhatsApp para reservar; você confirma o pagamento manualmente
e atualiza os números pela área administrativa.

## Estrutura

```
index.html          Página pública (vitrine + grade de números)
admin.html           Área administrativa protegida por senha
css/style.css         Design system compartilhado (cores, tipografia, componentes)
css/admin.css         Estilos exclusivos do painel administrativo
js/main.js            Lógica da página pública
js/admin.js           Lógica do painel administrativo
data/numbers.json     Fonte de dados dos 1000 números (número, nome, telefone, instagram, status)
images/piloto.jpg      Foto do banner (você voando)
images/bike.jpg        Foto do prêmio (bicicleta)
assets/icons/          Favicon
```

## Como rodar localmente

Como o site carrega `data/numbers.json` via `fetch`, ele precisa ser aberto
através de um servidor local — **não funciona abrindo o `index.html`
diretamente no navegador** (protocolo `file://` bloqueia essa leitura por
segurança). Use uma das opções abaixo, na pasta do projeto:

```bash
# Opção 1 — com Node instalado
npx serve .

# Opção 2 — com Python instalado
python3 -m http.server 8080

# Opção 3 — VS Code
# instale a extensão "Live Server" e clique em "Go Live"
```

Depois acesse `http://localhost:PORTA/index.html`.

## Como publicar (hospedagem estática)

Funciona em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel,
cPanel simples, etc.) — basta enviar a pasta inteira. Não há build, não há
banco de dados.

## Como administrar as reservas

1. Acesse `admin.html` e entre com a senha (padrão: `123456` — **troque-a**
   na constante `ADMIN_PASSWORD` em `js/admin.js` antes de divulgar o site).
2. Ao confirmar um pagamento pelo WhatsApp, clique em **Editar** no número
   correspondente, preencha nome/telefone/Instagram e marque o status como
   **Reservado** ou **Pago**.
3. Suas edições ficam salvas automaticamente no armazenamento local deste
   navegador (por isso "sem banco de dados"). **Isso é só uma cópia sua** —
   os visitantes do site continuam vendo o `data/numbers.json` publicado.
4. Para que todo mundo veja as mudanças, clique em **"Baixar numbers.json
   atualizado"** e substitua o arquivo `data/numbers.json` na sua
   hospedagem (reenvie/faça commit do arquivo). Recarregue a página pública
   para conferir.
5. Use **"Importar numbers.json"** se precisar carregar um arquivo já
   existente (por exemplo, ao trocar de computador).
6. **"Zerar todas as reservas"** volta todos os 1000 números para
   "disponível" e apaga os dados salvos — útil só para reiniciar os testes,
   tome cuidado ao usar em produção.

> Nota sobre segurança: a senha do admin é uma proteção simples em
> JavaScript, pensada para reduzir acessos indevidos casuais — não é uma
> autenticação real. Não trate esse painel como seguro contra alguém com
> conhecimento técnico. Evite divulgar o link de `admin.html` publicamente.

## Dados de demonstração

`data/numbers.json` já vem com ~15% dos números marcados como
reservados/pagos (sem nomes reais) só para o site não parecer vazio na
primeira visualização. Use **"Zerar todas as reservas"** no painel antes de
divulgar a campanha de verdade.

## Personalização rápida

- **Número de WhatsApp e textos da mensagem**: topo de `js/main.js`, objeto `CONFIG`.
- **Cores, fontes, espaçamentos**: `:root` no topo de `css/style.css`.
- **Fotos do banner e do prêmio**: substitua `images/piloto.jpg` e `images/bike.jpg`
  mantendo os mesmos nomes de arquivo (ou ajuste os caminhos em `index.html`
  e em `CONFIG.heroImage` no `js/main.js`).
- **Senha do admin**: `ADMIN_PASSWORD` em `js/admin.js`.

## Próximos passos (integrações futuras)

A estrutura foi deixada simples de propósito para permitir, sem refazer o
projeto:
- Trocar `data/numbers.json` + localStorage por **Firebase** ou **Supabase**
  (bastaria substituir `loadData()`/`persist()` em `js/admin.js` e o
  `fetch` em `js/main.js` por chamadas ao serviço escolhido).
- Adicionar **Mercado Pago / Pix** como um novo passo opcional antes do
  WhatsApp, sem alterar a grade de números.
- Adicionar **login real** no admin (ex: Firebase Auth) no lugar da senha
  simples.
