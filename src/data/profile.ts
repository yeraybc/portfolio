import type { L } from '../i18n/ui';

export const contact = {
  name: 'Yeray Benito',
  email: 'yera0304@gmail.com',
  linkedin: 'https://www.linkedin.com/in/yeraybenit0',
  github: 'https://github.com/yeraybc',
};

export type Lens = 'ds' | 'quant' | 'ai' | 'de';
export const lenses: Lens[] = ['ds', 'quant', 'ai', 'de'];

/** Stack highlighted for each focus lens. */
export const lensStack: Record<Lens, string[]> = {
  ds: ['scikit-learn', 'XGBoost', 'SHAP', 'R', 'LightGBM', 'Random Forest', 'tidymodels'],
  quant: ['statsmodels', 'arch', 'PyTorch', 'linearmodels', 'SciPy', 'pmdarima'],
  ai: ['Claude Agent SDK', 'Claude Code', 'PyTorch', 'Jupyter'],
  de: ['PySpark', 'Databricks', 'AWS S3', 'Parquet', 'pytest', 'GitHub Actions', 'SQL'],
};

export interface Kpi {
  value: L;
  label: L;
  run: string;
}

/** Run summary row on the home page. Every figure links to the run it comes from. */
export const kpis: Kpi[] = [
  { value: { en: '30M+', es: '+30M' }, label: { en: 'rows processed', es: 'filas procesadas' }, run: 'home-credit' },
  { value: { en: '−90%', es: '−90 %' }, label: { en: 'memory footprint', es: 'memoria' }, run: 'home-credit' },
  { value: { en: '1,507', es: '1.507' }, label: { en: 'automated tests', es: 'tests automáticos' }, run: 'home-credit' },
  { value: { en: 'R² 0.43 → 0.62', es: 'R² 0,43 → 0,62' }, label: { en: 'vs OLS, Madrid homes', es: 'frente a OLS, viviendas' }, run: 'madrid-data-house' },
  { value: { en: 'QLIKE −52.7%', es: 'QLIKE −52,7 %' }, label: { en: 'vs GARCH, natural gas', es: 'frente a GARCH, gas natural' }, run: 'energy-volatility' },
];

export interface Cert {
  name: string;
  issuer: string;
  date: L;
  note?: L;
  lenses: Lens[];
}

export const certs: Cert[] = [
  {
    name: 'Samsung Innovation Campus: Coding & Programming + AI track',
    issuer: 'Samsung and Universidad Politécnica de Madrid',
    date: { en: 'Sep 2025 – Apr 2026', es: 'sep 2025 – abr 2026' },
    note: {
      en: '400+ hours. Selected among 50 of 300+ applicants; ranked 1st in the first evaluation, which opened the AI track for the top 25.',
      es: 'Más de 400 horas. Seleccionado entre 50 de más de 300 candidatos; 1º de la promoción en la primera evaluación, que daba acceso a la vía de IA para los 25 mejores.',
    },
    lenses: ['ds', 'ai'],
  },
  {
    name: 'Data Science for Economics: Mastering Unstructured Data',
    issuer: 'CEMFI Summer School',
    date: { en: 'Aug 2026', es: 'ago 2026' },
    note: {
      en: 'NLP, embeddings, transformers and LLM fine-tuning. Built an LLM agent with tool use on the Anthropic API.',
      es: 'NLP, embeddings, transformers y fine-tuning de LLM. Construí un agente con tool use sobre la API de Anthropic.',
    },
    lenses: ['ai', 'ds'],
  },
  {
    name: 'FRM Part I (candidate)',
    issuer: 'GARP',
    date: { en: 'Exam Nov 2026', es: 'Examen nov 2026' },
    lenses: ['quant'],
  },
  {
    name: 'Data Analysis in SQL (PostgreSQL), top 1%',
    issuer: 'DataCamp',
    date: { en: 'Nov 2025', es: 'nov 2025' },
    lenses: ['de', 'ds'],
  },
  {
    name: 'Data Management in SQL (PostgreSQL), top 3%',
    issuer: 'DataCamp',
    date: { en: 'Nov 2025', es: 'nov 2025' },
    lenses: ['de'],
  },
  {
    name: 'GitHub Foundations',
    issuer: 'DataCamp',
    date: { en: 'Aug 2026', es: 'ago 2026' },
    lenses: ['de', 'ds', 'ai', 'quant'],
  },
  {
    name: 'Google AI Professional Certificate',
    issuer: 'Google',
    date: { en: 'Mar 2026', es: 'mar 2026' },
    lenses: ['ai'],
  },
  {
    name: 'Responsible AI & Business Innovation',
    issuer: 'Universidad Carlos III de Madrid with IBM',
    date: { en: 'Sep 2025', es: 'sep 2025' },
    note: {
      en: 'Led the final project: an autonomous agent (Langflow) using IoT sensor data for an AgriTech startup.',
      es: 'Lideré el proyecto final: un agente autónomo (Langflow) con datos de sensores IoT para una startup AgriTech.',
    },
    lenses: ['ai'],
  },
  {
    name: 'Finance Analytics School for Students',
    issuer: 'SAS',
    date: { en: 'Aug 2025', es: 'ago 2025' },
    lenses: ['quant'],
  },
  {
    name: 'McKinsey Forward',
    issuer: 'McKinsey & Company',
    date: { en: 'May 2026', es: 'may 2026' },
    lenses: ['ds', 'quant', 'ai', 'de'],
  },
];

export const education = {
  degree: { en: 'BSc in Applied Data Science', es: 'Grado en Ciencia de Datos Aplicada' },
  school: 'Universidad Complutense de Madrid',
  period: { en: 'Sep 2023 – May 2027 (expected)', es: 'sep 2023 – may 2027 (previsto)' },
  courses: {
    en: 'Supervised Learning II–III, Econometrics, Spatial Data Analysis, Time Series (SAS), Simulation, Parametric and Non-parametric Inference, NoSQL Databases',
    es: 'Aprendizaje Supervisado II–III, Econometría, Análisis de Datos Espaciales, Series Temporales (SAS), Simulación, Inferencia Paramétrica y No Paramétrica, Bases de Datos NoSQL',
  },
};

export const languages: { name: L; level: L }[] = [
  { name: { en: 'Spanish', es: 'Español' }, level: { en: 'native', es: 'nativo' } },
  { name: { en: 'English', es: 'Inglés' }, level: { en: 'C1', es: 'C1' } },
  { name: { en: 'German', es: 'Alemán' }, level: { en: 'A2', es: 'A2' } },
];

export const skills: { group: L; items: string[] }[] = [
  { group: { en: 'Languages', es: 'Lenguajes' }, items: ['Python', 'R', 'SQL', 'SAS', 'MATLAB', 'GAMS'] },
  { group: { en: 'ML & stats', es: 'ML y estadística' }, items: ['scikit-learn', 'XGBoost', 'LightGBM', 'PyTorch', 'statsmodels', 'arch', 'SHAP', 'spatialreg', 'tidymodels'] },
  { group: { en: 'Data', es: 'Datos' }, items: ['pandas', 'NumPy', 'polars', 'PySpark', 'Databricks', 'Parquet', 'MongoDB', 'Power BI'] },
  { group: { en: 'AI & agents', es: 'IA y agentes' }, items: ['Claude Agent SDK', 'Claude Code', 'FastAPI'] },
  { group: { en: 'Engineering', es: 'Ingeniería' }, items: ['Git', 'GitHub Actions', 'pytest', 'Conda', 'Shiny'] },
];

export const otherWork: L = {
  en: 'Event Support Staff, Shifty (Nov 2024 – Aug 2026): 100+ shifts, 5/5 client rating in over 95% of them. Sales Assistant, Purificación García (Jan 2025 – Jun 2026): beat Sunday sales targets by 5–10%, 30+ returning clients.',
  es: 'Event Support Staff, Shifty (nov 2024 – ago 2026): más de 100 turnos, valoración 5/5 en más del 95 %. Sales Assistant, Purificación García (ene 2025 – jun 2026): superé los objetivos de venta de los domingos entre un 5 y un 10 %, más de 30 clientes recurrentes.',
};

/** The model card, rendered as YAML. Keys stay in English on purpose (it is a config file). */
export const modelCard: Record<'en' | 'es', Record<string, unknown>> = {
  en: {
    model: 'yeray-benito',
    version: '2026.10',
    architecture: 'BSc Applied Data Science (UCM, 2027) + Samsung Innovation Campus (AI track, ranked 1st in Coding & Programming)',
    training_data: ['econometrics', 'supervised ML', 'spatial data', 'quantitative finance'],
    fine_tuning: ['CEMFI Summer School 2026 (NLP, embeddings, LLMs, agents)', 'FRM Part I (candidate, Nov 2026)'],
    intended_use: ['Data Science', 'ML Engineering', 'Applied AI for finance and real estate'],
    languages: { es: 'native', en: 'C1', de: 'A2' },
    availability: 'full-time internship from February 2027',
    evaluation: 'see /runs',
    limitations: [
      'Prefers the simple model when the complex one is not significantly better.',
      'Performs worse before coffee and after 30 km.',
    ],
    known_biases: ['finance', 'spatial data', 'code with tests'],
  },
  es: {
    model: 'yeray-benito',
    version: '2026.10',
    architecture: 'Grado en Ciencia de Datos Aplicada (UCM, 2027) + Samsung Innovation Campus (vía de IA, 1º de la promoción en Coding & Programming)',
    training_data: ['econometría', 'ML supervisado', 'datos espaciales', 'finanzas cuantitativas'],
    fine_tuning: ['CEMFI Summer School 2026 (NLP, embeddings, LLMs, agentes)', 'FRM Part I (candidato, nov 2026)'],
    intended_use: ['Data Science', 'ML Engineering', 'IA aplicada a finanzas e inmobiliario'],
    languages: { es: 'nativo', en: 'C1', de: 'A2' },
    availability: 'prácticas a jornada completa desde febrero de 2027',
    evaluation: 'ver /runs',
    limitations: [
      'Prefiere el modelo simple si el complejo no es significativamente mejor.',
      'Rinde peor antes del café y después del km 30.',
    ],
    known_biases: ['finanzas', 'datos espaciales', 'código con tests'],
  },
};
