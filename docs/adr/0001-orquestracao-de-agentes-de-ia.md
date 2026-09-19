# ADR 0001 — Orquestração de agentes de IA no fluxo de desenvolvimento

- Status: aceito
- Data: 2026-09-18

## Contexto

O desenvolvimento é acelerado por IA, mas "acelerado por IA" sem estrutura vira código
inconsistente e sem garantia de qualidade. Precisamos de um fluxo em que a IA produza
rápido **e** a qualidade seja garantida por etapas verificáveis, com o humano no controle
das decisões.

## Decisão

Adotar um pipeline de **agentes especializados por etapa** (planejamento, codificação,
testes, revisão), coordenados pelo agente principal, com **testes automatizados como gate**
e **validação humana** antes de qualquer PR.

- Subagentes dedicados: `planner`, `test-runner`, `security-reviewer` (em `.claude/agents/`).
- Revisão de correção/SOLID pela revisão nativa (`/code-review`); revisão de segurança pelo
  subagente dedicado.
- Comando `/feature` encapsula a orquestração de forma repetível.
- Hooks garantem formatação e `lint`/`typecheck` como baseline.
- Um runner headless (Claude Agent SDK) roda o loop plan→gerar→testar→corrigir de forma
  autônoma, para uso opt-in (custa API; fora do CI por padrão).

## Consequências

**Positivas**

- Qualidade não depende de disciplina manual: o gate de testes bloqueia regressões.
- Cada etapa tem uma responsabilidade única — mais fácil auditar e melhorar isoladamente.
- O fluxo é reproduzível e versionado no repositório (não vive só na cabeça de quem usa).

**Custos / limites**

- Os hooks passam a valer nas sessões locais do Claude Code neste repositório.
- O runner headless consome créditos de API e exige `ANTHROPIC_API_KEY`.
- A IA erra: a validação humana continua obrigatória — a automação reduz esforço, não
  substitui julgamento.
