# FinTrack: Your Virtual Piggy Bank

Crie uma aplicação web completa chamada FinTrack — Cofrinho Virtual para Acompanhamento de Finanças.

É um projeto de TCC de um curso técnico de Informática para Internet. O objetivo é criar uma plataforma simples e moderna para controle financeiro pessoal.

STACK

Use:

React

TypeScript

Tailwind CSS

shadcn/ui

Supabase

Recharts

Lucide Icons

Use Supabase para autenticação e persistência dos dados.

PÁGINAS

Crie:

/login

/cadastro

/dashboard

/movimentacoes

/metas

/desafios

/perfil

AUTENTICAÇÃO

Implementar:

cadastro com e-mail e senha;

login;

logout;

proteção das páginas autenticadas;

redirecionamento para /dashboard após login;

redirecionamento para /login quando o usuário não estiver autenticado.

Cada usuário deve acessar somente seus próprios dados.

Configure Supabase RLS corretamente.

DASHBOARD

Criar dashboard moderno com:

Card "Saldo atual"

Card "Receitas"

Card "Despesas"

Card "Metas ativas"

Card "Desafios ativos"

Abaixo dos cards:

gráfico de receitas x despesas;

gráfico de evolução financeira;

últimas movimentações;

metas em andamento;

desafios ativos.

O dashboard deve buscar os dados reais do Supabase.

Não use dados mockados depois que o banco estiver configurado.

MOVIMENTAÇÕES

Criar página para listar movimentações.

Cada movimentação possui:

tipo: receita ou despesa;

valor;

data;

descrição;

categoria.

Permitir:

adicionar;

editar;

excluir;

pesquisar;

filtrar;

ordenar.

Criar botão "Nova movimentação".

Após adicionar, editar ou excluir uma movimentação, atualizar automaticamente o saldo e os gráficos.

O saldo é:

receitas - despesas.

METAS

Criar página de metas financeiras.

Campos:

nome;

valor objetivo;

valor atual;

data limite.

Mostrar:

nome;

valor atual;

valor objetivo;

percentual;

barra de progresso;

prazo;

status.

Permitir:

criar;

editar;

excluir.

DESAFIOS

Criar página de desafios financeiros.

Campos:

nome;

valor objetivo;

período;

data inicial;

data final.

Mostrar:

progresso;

percentual;

prazo;

status.

Quando o objetivo for atingido, alterar automaticamente o status para "Concluído".

PERFIL

Criar página para:

visualizar nome;

visualizar e-mail;

editar nome;

alterar senha;

sair da conta.

BANCO

Criar as tabelas Supabase:

profiles
transactions
goals
challenges

Relacionar todas as informações ao usuário através de user_id.

Criar RLS para impedir que um usuário veja ou altere dados de outro usuário.

DESIGN

Quero uma interface:

moderna;

profissional;

minimalista;

responsiva;

adequada para apresentação de TCC.

Use uma identidade visual de aplicativo financeiro.

Desktop:

sidebar fixa à esquerda.

Mobile:

menu inferior ou menu lateral adaptado.

Utilize cards com bordas arredondadas, sombras suaves e bastante espaço visual.

Criar estados de:

loading;

vazio;

erro;

sucesso.

Utilizar toast para informar operações realizadas.

Confirmar antes de excluir dados.

FORMATAÇÃO

Valores:

R$ 1.250,00

Datas:

19/08/2026

IMPORTANTE

Não criar funcionalidades extras como:

investimentos;

PIX;

integração bancária;

cartão;

criptomoedas;

empréstimos.

O projeto deve permanecer focado no escopo do TCC.

PRIORIDADE

Priorize nesta ordem:

Autenticação

Banco de dados

Dashboard

Movimentações

Metas

Desafios

Gráficos

Perfil

Responsividade

Refinamento visual

Não deixe telas apenas como protótipos.

As funcionalidades devem estar conectadas ao Supabase e funcionar de verdade.

Comece criando a estrutura do projeto, banco Supabase, autenticação e Dashboard. Depois implemente as demais funcionalidades.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2fb8975d-e3b8-460f-845d-698d77099f99).

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
