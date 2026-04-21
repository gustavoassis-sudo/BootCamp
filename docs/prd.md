# PRD — email-copy-intelligence

> Atualizado com requisitos finais. Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O time de marketing da Minimal Club cria copy de e-mail manualmente, sem referência aos padrões que performaram melhor historicamente. Não existe ferramenta que cruze o histórico de campanhas (subject, preview, body) com métricas reais (open rate, receita, conversão) para guiar a criação de novos copies.

## Usuário

**Quem vai usar:** Time de marketing da Minimal Club que cria e-mail marketing.

**O que fazem hoje:** Criam copy do zero a cada campanha, sem consultar o que funcionou. Processo manual, subjetivo, sem base em dados.

## Objetivo

Plataforma que conecta ao Klaviyo via API, analisa as campanhas com melhor performance com Claude, identifica padrões de copy (subject, preview, body) e gera novos copies baseados nesses padrões.

## Requisitos (MVP)

- [x] Dashboard com lista de campanhas do Klaviyo + métricas (open rate, receita, conversão)
- [x] Análise automática dos top performers pelo Claude — identifica padrões em subject, preview e body
- [x] Geração de novo copy: 3 opções de subject, 3 de preview text, 1 body completo
- [x] Salvar copies gerados no Supabase
- [x] Página de histórico de copies salvos

## Fora do escopo

- Login/autenticação — acesso direto pela URL
- Mobile responsivo polido
- Integração com Facebook Ads
- Envio de e-mails pela plataforma
- Editor de templates HTML
- Testes A/B automatizados

## Métrica de sucesso

Usuário abre a plataforma, vê campanhas reais do Klaviyo com métricas, clica em "Analisar", recebe padrões identificados pelo Claude, clica em "Gerar", recebe 3 subjects + 3 previews + 1 body pronto pra usar — tudo em menos de 2 minutos.

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Framework**: Next.js 14 + TypeScript + Tailwind
- **IA**: Claude API (claude-sonnet-4-6)
- **Dados**: Klaviyo API v2

## Decisões de arquitetura

- Sem login para maximizar velocidade de entrega no bootcamp
- Cache de campanhas no Supabase para evitar rate limit da Klaviyo API
- Respostas do Claude em JSON estruturado para facilitar renderização
- Klaviyo Reporting API para métricas (endpoint separado dos campaigns)
