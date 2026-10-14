// The /match scorer: reads a job offer, turns it into requirements and scores my fit with a
// small logit whose every term is shown on the page. Pure functions, no DOM.
import { roles, sectors, skills, type Evidence, type Interest, type Level, type Role, type Sector, type Skill } from '../data/match-profile';
import type { Lens } from './lens';
import {
  BAND_THRESHOLDS,
  COVERAGE_CENTER,
  COVERAGE_SLOPE,
  LEVEL_CREDIT,
  MAX_PRIOR,
  MUST_COVERAGE_FLOOR,
  MUST_COVERAGE_STRONG,
  PRIORITY_WEIGHT,
  ROLE_CENTER,
  ROLE_PRIOR,
  ROLE_SLOPE,
  SECTOR_PRIOR,
  SENIORITY_TERM,
  START_ASAP_TERM,
} from './match-config';

export type Priority = 'must' | 'nice';
export type Seniority = 'intern' | 'junior' | 'mid' | 'senior';
export type Band = 'no' | 'partial' | 'nuanced' | 'strong';
export const BANDS: Band[] = ['no', 'partial', 'nuanced', 'strong'];
export type Status = 'have' | 'learning' | 'adjacent' | 'gap';

export interface Query {
  role?: string;
  sector?: string;
  seniority?: Seniority;
  /** The offer needs someone before February 2027. */
  asap?: boolean;
  skills: { id: string; priority: Priority }[];
}

export const emptyQuery = (): Query => ({ skills: [] });

const skillById = new Map(skills.map((s) => [s.id, s]));
const roleById = new Map(roles.map((r) => [r.id, r]));
const sectorById = new Map(sectors.map((s) => [s.id, s]));
export const getSkill = (id: string) => skillById.get(id);
export const getRole = (id?: string) => (id ? roleById.get(id) : undefined);
export const getSector = (id?: string) => (id ? sectorById.get(id) : undefined);

// ---------------------------------------------------------------- extraction

/** Lowercase, no accents. For precomposed text the length is kept, so positions match the original. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const patternCache = new Map<string, RegExp>();

/** Regex for one alias (see the alias rules at the top of match-profile.ts). */
function aliasPattern(alias: string): { re: RegExp; caseSensitive: boolean } {
  const caseSensitive = alias.startsWith('cs:');
  const body = caseSensitive ? alias.slice(3) : alias;
  let re = patternCache.get(alias);
  if (!re) {
    const prefix = body.endsWith('*');
    const core = escape(prefix ? body.slice(0, -1) : body);
    const tail = prefix ? '' : caseSensitive ? "(?![\\p{L}\\p{N}&+#'’])" : '(?![\\p{L}\\p{N}+#])';
    re = new RegExp(`(?<![\\p{L}\\p{N}])${core}${tail}`, caseSensitive ? 'gu' : 'giu');
    patternCache.set(alias, re);
  }
  return { re, caseSensitive };
}

interface Hit {
  id: string;
  start: number;
  end: number;
}

function findHits(items: { id: string; aliases: string[] }[], raw: string, norm: string): Hit[] {
  const hits: Hit[] = [];
  for (const item of items) {
    for (const alias of item.aliases) {
      const { re, caseSensitive } = aliasPattern(alias);
      re.lastIndex = 0;
      for (const m of (caseSensitive ? raw : norm).matchAll(re)) hits.push({ id: item.id, start: m.index!, end: m.index! + m[0].length });
    }
  }
  return hits;
}

/** Longest match wins where matches overlap, so "A/B testing" is not also read as "testing". */
function dropOverlaps(hits: Hit[]): Hit[] {
  const kept: Hit[] = [];
  for (const h of [...hits].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)) {
    if (!kept.some((k) => h.start < k.end && k.start < h.end && k.id !== h.id)) kept.push(h);
  }
  return kept.sort((a, b) => a.start - b.start);
}

const NICE_CUES = /\b(nice to have|a plus|is a plus|are a plus|bonus|preferred|preferably|desirable|ideally|good to have|would be great|valorable|valorables|se valorara|valoraremos|deseable|deseables|sera un plus|un plus|opcional|optional)\b/;
const NICE_START = new RegExp(`^\\W*${NICE_CUES.source}`);
const MUST_CUES = /^\W*(requirements|required|requisitos|must have|you have|you bring|what we look for|what we are looking for|what we're looking for|what you need|imprescindible|necesario|buscamos|requerid[oa]s?|perfil|profile|qualifications|cualificaciones)\b/;
/** Sections whose tools are not asked of the candidate: "What we offer", "Benefits"… */
const SKIP_CUES = /^\W*(what we offer|we offer|ofrecemos|que ofrecemos|benefits|beneficios|perks|about us|sobre nosotros|quienes somos)\b/;

type SentencePriority = Priority | 'skip';
interface Sentence {
  start: number;
  end: number;
  priority: SentencePriority;
}

/**
 * Splits the offer into sentences and gives each the priority of the section it sits in.
 * A sentence that starts with a cue ("Nice to have:", "Requisitos") opens a section; a cue in
 * the middle ("Tableau is a plus") only affects its own sentence.
 */
function sentences(norm: string): Sentence[] {
  const out: Sentence[] = [];
  let section: SentencePriority = 'must';
  for (const m of norm.matchAll(/[^\n.;•·]+/g)) {
    const text = m[0].trim();
    if (!text) continue;
    let priority: SentencePriority = section;
    if (SKIP_CUES.test(text)) section = priority = 'skip';
    else if (MUST_CUES.test(text)) section = priority = 'must';
    else if (NICE_CUES.test(text)) {
      priority = 'nice';
      if (NICE_START.test(text)) section = 'nice';
    }
    out.push({ start: m.index!, end: m.index! + m[0].length, priority });
  }
  // With a requirements section, the intro above it describes the job: what it names is a plus, not a must.
  const firstReq = out.findIndex((x, i) => i > 0 && MUST_CUES.test(norm.slice(x.start, x.end).trim()));
  for (let i = 0; i < firstReq; i++) if (out[i].priority === 'must') out[i].priority = 'nice';
  return out;
}

function seniorityOf(norm: string): Seniority | undefined {
  if (/(?<![\p{L}])(intern|interns|internship|practicas|becari[oa]s?|beca|trainee|graduate program(me)?|early career|estudiante|student)(?![\p{L}])/u.test(norm)) return 'intern';
  // Years count only in a sentence about experience, so "15 years of history" does not.
  const years = norm
    .split(/[\n.;]/)
    .filter((s) => s.includes('experien'))
    .flatMap((s) => [...s.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|anos)/g)].map((m) => Number(m[1])));
  if (years.length) {
    const n = Math.max(...years);
    if (n >= 5) return 'senior';
    if (n >= 3) return 'mid';
    return 'junior';
  }
  // Title words count only near the top, so "you will work with senior engineers" does not.
  const head = norm.split(/[\n.]/)[0].slice(0, 140);
  if (/\b(senior|sr|lead|principal|staff|head of)\b/.test(head)) return 'senior';
  if (/\b(mid-level|mid level|semi senior|semi-senior)\b/.test(head)) return 'mid';
  if (/\b(junior|jr|entry[- ]level|new grad|recien titulad[oa])\b/.test(norm)) return 'junior';
  return undefined;
}

/** An alternative inside a sentence: "Bachelor's or Master's", "grado o máster", "BSc/MSc". */
const OR = /\s(or|o|u)\s|\//;

const ASAP = /\b(incorporacion inmediata|immediate start|start immediately|asap|as soon as possible|lo antes posible|cuanto antes)\b/;

/** Picks the most-mentioned item; ties go to the earliest mention. */
function mostMentioned(hits: Hit[]): string | undefined {
  const count = new Map<string, { n: number; first: number }>();
  for (const h of hits) {
    const c = count.get(h.id) ?? { n: 0, first: h.start };
    c.n += 1;
    count.set(h.id, c);
  }
  return [...count.entries()].sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)[0]?.[0];
}

/** Reads a pasted offer (English or Spanish) into a query the visitor can then edit. */
export function extract(text: string): Query {
  const norm = normalize(text);
  const sents = sentences(norm);
  const sentenceAt = (pos: number) => sents.find((s) => pos >= s.start && pos < s.end);

  const skillHits = dropOverlaps(findHits(skills, text, norm));
  const found = new Map<string, Priority>();
  for (const h of skillHits) {
    const sent = sentenceAt(h.start);
    const skill = skillById.get(h.id)!;
    if (skill.unlessWith && sent && OR.test(norm.slice(sent.start, sent.end)) && skillHits.some((o) => skill.unlessWith!.includes(o.id) && o.start >= sent.start && o.start < sent.end)) continue;
    const priority = sent?.priority ?? 'must';
    if (priority === 'skip') continue;
    if (found.get(h.id) !== 'must') found.set(h.id, priority);
  }

  // Role: the first one named (usually the title). Sector: the most mentioned.
  const roleHits = dropOverlaps(findHits(roles, text, norm));
  const sectorHits = dropOverlaps(findHits(sectors, text, norm));

  return {
    role: roleHits[0]?.id,
    sector: mostMentioned(sectorHits),
    seniority: seniorityOf(norm),
    asap: ASAP.test(norm) || undefined,
    skills: [...found.entries()].map(([id, priority]) => ({ id, priority })),
  };
}

// ---------------------------------------------------------------- scoring

export interface Item {
  skill: Skill;
  priority: Priority;
  status: Status;
  credit: number;
  /** The skill that earned the credit when it came from an adjacent one. */
  via?: Skill;
  evidence: Evidence[];
}

export type TermKey = 'coverage' | 'role' | 'interest' | 'seniority' | 'start';
export interface Term {
  key: TermKey;
  value: number;
}

export interface MatchResult {
  score: number;
  band: Band;
  /** The verdict the evidence alone gives, before the interest prior. */
  bandWithoutPrior: Band;
  scoreWithoutPrior: number;
  /** Which guardrail held the verdict down, if any. */
  capped?: 'prior' | 'strong' | 'must' | 'senior';
  coverage: number | null;
  mustCoverage: number | null;
  terms: Term[];
  items: Item[];
  role?: Role;
  sector?: Sector;
  lens: Lens;
  suggested: Evidence[];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function bandOf(score: number): Band {
  if (score >= BAND_THRESHOLDS.strong) return 'strong';
  if (score >= BAND_THRESHOLDS.nuanced) return 'nuanced';
  if (score >= BAND_THRESHOLDS.partial) return 'partial';
  return 'no';
}

export function assess(skill: Skill): { status: Status; credit: number; via?: Skill } {
  const own = LEVEL_CREDIT[skill.level];
  let best = { credit: 0, via: undefined as Skill | undefined };
  for (const a of skill.adjacent ?? []) {
    const other = skillById.get(a.id);
    if (!other) continue;
    const c = a.credit * LEVEL_CREDIT[other.level];
    if (c > best.credit) best = { credit: c, via: other };
  }
  const statusOf: Record<Level, Status> = { proven: 'have', used: 'have', learning: 'learning', gap: 'gap' };
  if (best.credit > own) return { status: skill.level === 'learning' ? 'learning' : 'adjacent', credit: best.credit, via: best.via };
  return { status: statusOf[skill.level], credit: own };
}

const interestPrior = (sector?: Sector, role?: Role) =>
  Math.min(MAX_PRIOR, SECTOR_PRIOR[(sector?.interest ?? 'neutral') as Interest] + ROLE_PRIOR[(role?.interest ?? 'neutral') as Interest]);

/** Scores a query. Returns null when there is nothing to score yet. */
export function score(q: Query): MatchResult | null {
  const role = getRole(q.role);
  const sector = getSector(q.sector);
  const items: Item[] = q.skills
    .map(({ id, priority }) => {
      const skill = skillById.get(id);
      if (!skill) return null;
      const a = assess(skill);
      return { skill, priority, ...a, evidence: a.via ? a.via.evidence : skill.evidence };
    })
    .filter((i): i is Item => i !== null);
  if (!items.length && !role) return null;

  const weight = (i: Item) => PRIORITY_WEIGHT[i.priority];
  const totalW = items.reduce((s, i) => s + weight(i), 0);
  const coverage = totalW ? items.reduce((s, i) => s + weight(i) * i.credit, 0) / totalW : null;
  const musts = items.filter((i) => i.priority === 'must');
  const mustCoverage = musts.length ? musts.reduce((s, i) => s + i.credit, 0) / musts.length : null;

  const terms: Term[] = [
    { key: 'coverage', value: coverage === null ? 0 : COVERAGE_SLOPE * (coverage - COVERAGE_CENTER) },
    { key: 'role', value: role ? ROLE_SLOPE * (role.fit - ROLE_CENTER) : 0 },
    { key: 'interest', value: interestPrior(sector, role) },
    { key: 'seniority', value: q.seniority ? SENIORITY_TERM[q.seniority] : 0 },
    { key: 'start', value: q.asap ? START_ASAP_TERM : 0 },
  ];
  const z = terms.reduce((s, t) => s + t.value, 0);
  const prior = terms.find((t) => t.key === 'interest')!.value;

  const scoreValue = sigmoid(z);
  const scoreWithoutPrior = sigmoid(z - prior);
  const bandWithoutPrior = bandOf(scoreWithoutPrior);
  let idx = BANDS.indexOf(bandOf(scoreValue));
  let capped: MatchResult['capped'];

  // Guardrails. Interest can lift the verdict one band at most…
  const priorCap = BANDS.indexOf(bandWithoutPrior) + 1;
  if (idx > priorCap) {
    idx = priorCap;
    capped = 'prior';
  }
  // …a clear fit needs (almost) every must-have…
  if (idx === BANDS.indexOf('strong') && mustCoverage !== null && mustCoverage < MUST_COVERAGE_STRONG) {
    idx -= 1;
    capped = 'strong';
  }
  // …and interest cannot hide that the must-haves or the seniority are out of reach.
  const ceiling = BANDS.indexOf('partial');
  if (q.seniority === 'senior' && idx > ceiling) {
    idx = ceiling;
    capped = 'senior';
  } else if (mustCoverage !== null && musts.length >= 2 && mustCoverage < MUST_COVERAGE_FLOOR && idx > ceiling) {
    idx = ceiling;
    capped = 'must';
  }

  return {
    score: scoreValue,
    band: BANDS[idx],
    bandWithoutPrior,
    scoreWithoutPrior,
    capped,
    coverage,
    mustCoverage,
    terms,
    items: items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'must' ? -1 : 1)),
    role,
    sector,
    lens: suggestLens(items, role),
    suggested: suggestEvidence(items),
  };
}

function suggestLens(items: Item[], role?: Role): Lens {
  if (role) return role.lens;
  const tally: Record<Lens, number> = { ds: 0, quant: 0, ai: 0, de: 0 };
  for (const i of items) if (i.skill.lens) tally[i.skill.lens] += i.credit * PRIORITY_WEIGHT[i.priority];
  return (Object.entries(tally) as [Lens, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

/** The three pages that back most of the requirements I meet. */
function suggestEvidence(items: Item[]): Evidence[] {
  const byHref = new Map<string, { ev: Evidence; w: number }>();
  for (const i of items) {
    if (i.credit === 0) continue;
    i.evidence.forEach((ev, rank) => {
      if (!ev.href.startsWith('/projects/') && ev.href !== '/deployments') return;
      const cur = byHref.get(ev.href) ?? { ev, w: 0 };
      cur.w += (i.credit * PRIORITY_WEIGHT[i.priority]) / (rank + 1);
      byHref.set(ev.href, cur);
    });
  }
  return [...byHref.values()].sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.ev);
}

// ---------------------------------------------------------------- URL state

/** Query → search params. The pasted text is never part of it. */
export function toParams(q: Query): URLSearchParams {
  const p = new URLSearchParams();
  if (q.role) p.set('role', q.role);
  if (q.sector) p.set('sector', q.sector);
  if (q.seniority) p.set('level', q.seniority);
  if (q.asap) p.set('start', 'asap');
  if (q.skills.length) p.set('skills', q.skills.map((s) => (s.priority === 'nice' ? `~${s.id}` : s.id)).join(','));
  return p;
}

export function fromParams(p: URLSearchParams): Query {
  const seniority = p.get('level');
  const ids = (p.get('skills') ?? '').split(',').filter(Boolean);
  const seen = new Set<string>();
  return {
    role: roleById.has(p.get('role') ?? '') ? p.get('role')! : undefined,
    sector: sectorById.has(p.get('sector') ?? '') ? p.get('sector')! : undefined,
    seniority: (['intern', 'junior', 'mid', 'senior'] as const).find((s) => s === seniority),
    asap: p.get('start') === 'asap' || undefined,
    skills: ids
      .map((raw) => ({ id: raw.replace(/^~/, ''), priority: (raw.startsWith('~') ? 'nice' : 'must') as Priority }))
      .filter((s) => skillById.has(s.id) && !seen.has(s.id) && seen.add(s.id)),
  };
}
