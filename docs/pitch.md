# Pitch — influencer-approval

> 2 minutos cronometrados. Preencher ao longo do dia. Versão final até 17h30.
> **Dica**: muito disso sai DIRETO do `docs/prd.md`.

## Problema (20s)

O time de marketing da Moon aprova influenciadores um por um, manualmente, sem critério padronizado. Cada análise leva 5-10 minutos — por influenciador, por campanha, por marca.

## Solução (40s)

Uma plataforma que automatiza essa análise. Você cola os dados do influenciador, seleciona a marca (Minimal Club ou Hoomy), e o Claude avalia o fit em segundos — retornando aprovado, reprovado ou revisar, com justificativa. Tudo salvo e organizado por campanha.

## Demo (50s)

- **URL Vercel**: <cole aqui quando deployar>
- Passo 1: Adicionar influenciador via formulário (nome, handle, seguidores, engajamento, nicho)
- Passo 2: Selecionar marca e campanha
- Passo 3: Ver análise automática do Claude com decisão e justificativa
- Passo 4: Navegar pelo histórico de influenciadores aprovados/reprovados

## Próximos passos (10s)

Integração direta com Instagram para puxar dados automaticamente. Regras de aprovação customizáveis por campanha. Potencial de virar ferramenta interna oficial da Moon para as duas marcas.

---

## Métricas do dia (preencher ao final)

- Tokens consumidos: <pegue no dashboard Anthropic>
- Commits: `git log --oneline | wc -l`
- Tempo total ativo: <estimativa>
