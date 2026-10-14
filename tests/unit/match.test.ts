import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { BANDS, assess, extract, fromParams, getSkill, score, toParams, type Query } from '../../src/lib/match';
import { roles, sectors, skills } from '../../src/data/match-profile';
import { examples } from '../../src/data/match-examples';

const band = (q: Query) => score(q)!.band;
const ids = (q: Query) => q.skills.map((s) => s.id).sort();
const prio = (q: Query, id: string) => q.skills.find((s) => s.id === id)?.priority;

describe('match: extraction', () => {
  it('reads skills, sector, role and seniority from an English offer', () => {
    const q = extract(examples[0].text.en);
    expect(q.role).toBe('ds');
    expect(q.sector).toBe('finance');
    expect(q.seniority).toBe('intern');
    expect(ids(q)).toEqual(expect.arrayContaining(['python', 'sql', 'sklearn', 'boosting', 'english', 'spark', 'tableau', 'risk']));
    expect(prio(q, 'python')).toBe('must');
    expect(prio(q, 'tableau')).toBe('nice');
    expect(prio(q, 'risk')).toBe('nice');
  });

  it('reads the Spanish version the same way, accents included', () => {
    const en = extract(examples[0].text.en);
    const es = extract(examples[0].text.es);
    expect(es.role).toBe(en.role);
    expect(es.sector).toBe(en.sector);
    expect(es.seniority).toBe('intern');
    expect(prio(es, 'tableau')).toBe('nice');
    expect(prio(es, 'english')).toBe('must');
  });

  it('marks a mid-sentence "is a plus" as nice without turning the rest of the list nice', () => {
    const q = extract('Requirements:\n- Python\n- Tableau is a plus\n- SQL');
    expect(prio(q, 'tableau')).toBe('nice');
    expect(prio(q, 'sql')).toBe('must');
  });

  it('ignores tools listed under what the company offers', () => {
    const q = extract('Requirements: Python.\nWhat we offer:\n- Docker training and a Kubernetes budget');
    expect(ids(q)).toEqual(['python']);
  });

  it('prefers the longest match: "A/B testing" is not also "testing"', () => {
    expect(ids(extract('Experience with A/B testing'))).toEqual(['causal']);
  });

  it('reads R only as a standalone capital letter', () => {
    expect(ids(extract('Python or R'))).toEqual(['python', 'r']);
    expect(ids(extract('Our R&D team uses Python'))).toEqual(['python']);
  });

  it('does not ask for a master when the offer accepts a bachelor or a master', () => {
    expect(ids(extract("Bachelor's or Master's student in a quantitative field"))).toEqual(['degree']);
    expect(ids(extract("Master's degree required"))).toContain('master');
  });

  it('reads seniority from years of experience, but not from company history', () => {
    expect(extract('5+ years of experience in Python').seniority).toBe('senior');
    expect(extract('Al menos 3 años de experiencia con SQL').seniority).toBe('mid');
    expect(extract('A company with 15 years of history. Python.').seniority).toBeUndefined();
    expect(extract('Data Scientist. You will work with senior engineers and many other people across teams.').seniority).toBeUndefined();
  });

  it('flags an immediate start', () => {
    expect(extract('Incorporación inmediata').asap).toBe(true);
  });
});

describe('match: honesty', () => {
  it('never shows a skill I have not used as one I have', () => {
    for (const s of skills.filter((x) => x.level === 'gap')) expect(assess(s).status).not.toBe('have');
  });

  it('gives Stata partial credit through econometrics, with the note', () => {
    const r = score({ skills: [{ id: 'stata', priority: 'must' }] })!;
    expect(r.items[0].status).toBe('adjacent');
    expect(r.items[0].via?.id).toBe('econometrics');
    expect(r.items[0].skill.note?.en).toMatch(/R and Python/);
  });

  it('lets interest lift the verdict one band at most', () => {
    for (const ex of examples) {
      for (const lang of ['en', 'es'] as const) {
        const r = score(extract(ex.text[lang]))!;
        expect(BANDS.indexOf(r.band)).toBeLessThanOrEqual(BANDS.indexOf(r.bandWithoutPrior) + 1);
      }
    }
  });

  it('caps the verdict at "partial" when most must-haves are gaps, whatever the sector', () => {
    const q: Query = {
      role: 'ds',
      sector: 'finance',
      skills: [
        { id: 'cpp', priority: 'must' },
        { id: 'jvm', priority: 'must' },
        { id: 'linux', priority: 'must' },
        { id: 'python', priority: 'must' },
      ],
    };
    expect(BANDS.indexOf(band(q))).toBeLessThanOrEqual(BANDS.indexOf('partial'));
  });

  it('caps a senior role at "partial"', () => {
    expect(band({ role: 'ds', sector: 'finance', seniority: 'senior', skills: [{ id: 'python', priority: 'must' }] })).not.toMatch(/strong|nuanced/);
  });

  it('is monotonic: a skill I have never lowers the score, a gap never raises it', () => {
    const base: Query = { role: 'analyst', skills: [{ id: 'python', priority: 'must' }, { id: 'tableau', priority: 'must' }] };
    const s0 = score(base)!.score;
    expect(score({ ...base, skills: [...base.skills, { id: 'sql', priority: 'must' }] })!.score).toBeGreaterThanOrEqual(s0);
    expect(score({ ...base, skills: [...base.skills, { id: 'cpp', priority: 'must' }] })!.score).toBeLessThanOrEqual(s0);
  });

  it('leans up for a sector I am focused on', () => {
    const q: Query = { role: 'analyst', skills: [{ id: 'python', priority: 'must' }, { id: 'tableau', priority: 'must' }] };
    expect(score({ ...q, sector: 'energy' })!.score).toBeGreaterThan(score({ ...q, sector: 'gaming' })!.score);
  });
});

describe('match: golden offers', () => {
  it('a data science internship at a bank is a clear fit', () => {
    for (const lang of ['en', 'es'] as const) expect(band(extract(examples[0].text[lang]))).toBe('strong');
  });
  it('an AI engineer internship built on LangChain and RAG fits with nuances', () => {
    for (const lang of ['en', 'es'] as const) expect(band(extract(examples[1].text[lang]))).toBe('nuanced');
  });
  it('a senior C++ quant developer role is not a fit', () => {
    for (const lang of ['en', 'es'] as const) expect(band(extract(examples[2].text[lang]))).toBe('no');
  });
  it('an actuarial internship at an insurer fits at least with nuances', () => {
    const q = extract('Beca Estadístico Actuarial – Seguros. Requisitos: estudiante de Estadística, Excel avanzado, SQL. Se valorará: Python, R, SAS.');
    expect(q.sector).toBe('insurance');
    expect(['nuanced', 'strong']).toContain(band(q));
  });
  it('a frontend developer role is not a fit', () => {
    expect(band(extract('Frontend Developer. Requirements: JavaScript, TypeScript, React.'))).toBe('no');
  });
});

describe('match: data', () => {
  it('links every piece of evidence to a page that exists', () => {
    const pages = new Set(['/deployments', '/model-card', '/cv']);
    for (const s of [...skills, ...sectors]) {
      for (const ev of s.evidence ?? []) {
        const ok = pages.has(ev.href) || (ev.href.startsWith('/projects/') && existsSync(`src/content/runs/${ev.href.slice(10)}.yaml`));
        expect(ok, `${s.id} → ${ev.href}`).toBe(true);
      }
    }
  });

  it('has unique ids, valid adjacency and both languages everywhere', () => {
    for (const list of [skills, sectors, roles]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    for (const s of skills) {
      for (const a of s.adjacent ?? []) expect(getSkill(a.id), `${s.id} → ${a.id}`).toBeDefined();
      for (const l of [s.label, s.note].filter(Boolean)) expect(l!.en && l!.es).toBeTruthy();
    }
    for (const ex of examples) expect(ex.text.en && ex.text.es && ex.label.en && ex.label.es).toBeTruthy();
  });

  it('round-trips a query through the URL and drops unknown ids', () => {
    const q = extract(examples[1].text.en);
    expect(fromParams(toParams(q))).toEqual({ ...q, seniority: q.seniority, asap: q.asap });
    expect(fromParams(new URLSearchParams('skills=python,nope,~sql,python&role=nope')).skills).toEqual([
      { id: 'python', priority: 'must' },
      { id: 'sql', priority: 'nice' },
    ]);
  });
});
