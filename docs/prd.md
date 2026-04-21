# PRD — influencer-approval

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O processo de aprovação de influenciadores na Moon é 100% manual. O time de marketing avalia cada influenciador individualmente — verificando seguidores, engajamento, fit com a marca — sem padronização, sem automação e sem histórico organizado. Isso consome tempo excessivo e gera inconsistência nas decisões.

## Usuário

**Quem vai usar essa ferramenta?** (preencher às 13h)

*Ex: "Time de marketing da Minimal Club e Hoomy que hoje revisa influenciadores um por um em planilhas."*

**O que o usuário faz hoje pra resolver isso (manual/workaround)?** (preencher às 13h)

## Objetivo

Plataforma que recebe dados de influenciadores, usa Claude para analisar automaticamente o fit com a marca (Minimal Club ou Hoomy) e retorna aprovado/reprovado/revisar com justificativa — mantendo histórico organizado por campanha.

## Requisitos (o que PRECISA ter pra funcionar)

*Preencher às 13h. Máximo 5 — se passou disso, cortar escopo.*

- [ ] Requisito crítico 1
- [ ] Requisito crítico 2
- [ ] Requisito crítico 3

## Fora do escopo (o que NÃO vai ter hoje)

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integração direta com Instagram/TikTok API — simular com formulário/CSV
- Testes automatizados
- Notificações por WhatsApp/email

## Métrica de sucesso

**Como você vai saber que funciona?** 1 frase concreta com ação + resultado.

*Ex: "Usuário cola dados de um influenciador, seleciona a marca, recebe decisão (aprovado/reprovado/revisar) com justificativa em menos de 30 segundos — e isso fica salvo no histórico."*

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Linguagem/framework**: Next.js + TypeScript
- **Outras libs**: _____ (preencher conforme for usando)

## Decisões de arquitetura (append ao longo do dia)

*Use essa seção pra registrar escolhas técnicas importantes à medida que aparecem.*

- <ex: "decidi usar Supabase Auth em vez de rolar JWT próprio — economiza 2h">
