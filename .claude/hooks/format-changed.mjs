// Hook PostToolUse: formata com Prettier o arquivo recém-editado. Nunca falha o fluxo.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FORMATTABLE = /\.(ts|tsx|js|mjs|cjs|json|css|md|ya?ml)$/;

let file;
try {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  file = payload?.tool_input?.file_path ?? payload?.tool_input?.path;
} catch {
  process.exit(0);
}

if (file && FORMATTABLE.test(file)) {
  try {
    execSync(`pnpm exec prettier --write "${file}"`, { stdio: 'ignore' });
  } catch {
    // formatação é best-effort; não interrompe o trabalho
  }
}

process.exit(0);
