---
description: Orquestra o desenvolvimento de uma feature ponta a ponta (planejar → implementar → testar em loop → revisar).
argument-hint: <descrição da feature>
---

Feature solicitada: $ARGUMENTS

Conduza o fluxo de ponta a ponta, parando para validação humana nos pontos de decisão:

1. **Planejar** — delegue ao subagente `planner` para produzir o plano. Apresente o plano e aguarde meu OK (ou ajustes) antes de codar.
2. **Implementar** — implemente seguindo o plano, respeitando as camadas (core → infra → apps), Clean Architecture e SOLID, com comentários mínimos.
3. **Testar (gate)** — delegue ao `test-runner`. Se o resultado for `FAIL`, corrija usando as falhas reportadas e rode de novo. Repita até `PASS`.
4. **Revisar** — rode `/code-review` (correção/SOLID/reuso) e delegue ao `security-reviewer` (segurança). Trate os achados relevantes.
5. **Fechar** — apresente um resumo (o que mudou, testes, achados) pronto para commit/PR. Não faça commit sem meu OK.
