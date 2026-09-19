import { query } from '@anthropic-ai/claude-agent-sdk';

// Runner headless: executa o loop planejar → implementar → testar → corrigir de forma
// autônoma via Claude Agent SDK. Consome API (ANTHROPIC_API_KEY); use com parcimônia.

const feature = process.argv.slice(2).join(' ').trim();
if (!feature) {
  console.error('uso: pnpm ai:feature "<descrição da feature>"');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('defina ANTHROPIC_API_KEY — o runner consome a API da Anthropic.');
  process.exit(1);
}

const systemPrompt = [
  'Você é um engenheiro deste monorepo TypeScript.',
  'Respeite Clean Architecture, SOLID e as camadas core → infra → apps, com comentários mínimos.',
  'Implemente a feature pedida de forma autônoma, neste loop:',
  '1. Planeje (arquivos a tocar, passos, casos de teste).',
  '2. Implemente respeitando as camadas.',
  '3. Rode `pnpm test:unit` e corrija até passar (este é o gate).',
  '4. Rode `pnpm lint` e `pnpm typecheck` e corrija o que apontarem.',
  'Nunca rode `git commit` ou `git push`. Ao terminar, resuma o que mudou.',
].join('\n');

const response = query({
  prompt: feature,
  options: {
    model: 'sonnet',
    cwd: process.cwd(),
    permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    maxTurns: 60,
    systemPrompt,
  },
});

for await (const message of response) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') console.log(block.text);
      else if (block.type === 'tool_use') console.log(`  ↳ [tool] ${block.name}`);
    }
  } else if (message.type === 'result') {
    console.log(`\n=== fim (${message.subtype}) ===`);
  }
}
