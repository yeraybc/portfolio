// Minimal YAML printer for display purposes (config blocks, model card). Not a full YAML emitter.

export type Token = { kind: 'key' | 'str' | 'num' | 'bool' | 'punct' | 'comment' | 'plain'; text: string };
export type Line = Token[];

const needsQuotes = (s: string) => s === '' || /^[\s>|&*!%@`'"{}[\],#?-]|: |\s#|\s$/.test(s) || /^(true|false|null|yes|no)$/i.test(s);

function scalar(v: unknown): Token[] {
  if (typeof v === 'number') return [{ kind: 'num', text: String(v) }];
  if (typeof v === 'boolean') return [{ kind: 'bool', text: String(v) }];
  const s = String(v);
  const hash = s.indexOf('  # ');
  if (hash > 0) {
    return [
      { kind: 'str', text: s.slice(0, hash) },
      { kind: 'comment', text: s.slice(hash) },
    ];
  }
  return [{ kind: 'str', text: needsQuotes(s) ? JSON.stringify(s) : s }];
}

const isFlat = (arr: unknown[]) => arr.every((x) => typeof x !== 'object' || x === null) && JSON.stringify(arr).length < 64;

export function toYamlLines(obj: Record<string, unknown>, indent = 0): Line[] {
  const pad = ' '.repeat(indent);
  const lines: Line[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const keyTok: Token[] = [{ kind: 'plain', text: pad }, { kind: 'key', text: k }, { kind: 'punct', text: ':' }];
    if (Array.isArray(v)) {
      if (isFlat(v)) {
        const inner: Token[] = [{ kind: 'punct', text: ' [' }];
        v.forEach((x, i) => {
          if (i) inner.push({ kind: 'punct', text: ', ' });
          inner.push(...scalar(x));
        });
        inner.push({ kind: 'punct', text: ']' });
        lines.push([...keyTok, ...inner]);
      } else {
        lines.push(keyTok);
        for (const x of v) {
          if (x && typeof x === 'object') {
            const sub = toYamlLines(x as Record<string, unknown>, indent + 4);
            sub[0].splice(0, 1, { kind: 'plain', text: `${pad}  ` }, { kind: 'punct', text: '- ' });
            lines.push(...sub);
          } else {
            lines.push([{ kind: 'plain', text: `${pad}  ` }, { kind: 'punct', text: '- ' }, ...scalar(x)]);
          }
        }
      }
    } else if (v && typeof v === 'object') {
      lines.push(keyTok);
      lines.push(...toYamlLines(v as Record<string, unknown>, indent + 2));
    } else {
      lines.push([...keyTok, { kind: 'plain', text: ' ' }, ...scalar(v)]);
    }
  }
  return lines;
}
