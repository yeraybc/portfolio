import type { L } from '../i18n/ui';
import type { Lens } from '../lib/lens';

/**
 * What the /match scorer knows about me. Same rule as the CV: only what I can defend in an
 * interview. A skill I have not used is listed as a gap on purpose, so an offer that asks for
 * it is told so instead of being ignored.
 *
 * Aliases are matched on lowercase text without accents, at word boundaries. A trailing "*"
 * matches any ending ("estadistic*" covers "estadística" and "estadísticos"). A "cs:" prefix
 * matches the original text, case-sensitive (for "R" and "VaR").
 */

export type Level = 'proven' | 'used' | 'learning' | 'gap';
export type Interest = 'core' | 'interested' | 'neutral';

export interface Evidence {
  /** Locale-free path, e.g. "/runs/home-credit". */
  href: string;
  label: L;
}

export interface Skill {
  id: string;
  label: L;
  aliases: string[];
  level: Level;
  lens?: Lens;
  evidence: Evidence[];
  /** Skills that cover part of this one, with the share of their credit that carries over. */
  adjacent?: { id: string; credit: number }[];
  /** Shown next to the requirement: what I have instead, or why the level is what it is. */
  note?: L;
  /** Ignore this match when one of these skills is named in the same sentence ("Bachelor's or Master's"). */
  unlessWith?: string[];
}

export interface Sector {
  id: string;
  label: L;
  aliases: string[];
  interest: Interest;
  evidence?: Evidence[];
}

export interface Role {
  id: string;
  label: L;
  aliases: string[];
  /** How well the job itself matches what I do, 0–1. */
  fit: number;
  interest: Interest;
  lens: Lens;
}

const same = (s: string): L => ({ en: s, es: s });

const ev = {
  mdh: { href: '/runs/madrid-data-house', label: same('MadridDataHouse') },
  vol: { href: '/runs/energy-volatility', label: { en: 'Energy volatility paper', es: 'Paper de volatilidad' } },
  hc: { href: '/runs/home-credit', label: same('Home Credit default risk') },
  btc: { href: '/runs/btc-nasdaq-fed', label: { en: 'BTC, NASDAQ and the Fed', es: 'BTC, NASDAQ y la Fed' } },
  agent: { href: '/runs/data-ingestion-agent', label: { en: 'Data ingestion agent', es: 'Agente de homogeneización' } },
  geo: { href: '/runs/geo-referencing', label: { en: 'Listing geo-referencing', es: 'Georreferenciación' } },
  salary: { href: '/runs/salary-predictor', label: same('Salary predictor') },
  teach: { href: '/runs/ds-teaching-portal', label: { en: 'Teaching portal', es: 'Portal de enseñanza' } },
  portfolio: { href: '/runs/portfolio', label: { en: 'This portfolio', es: 'Este portfolio' } },
  velle: { href: '/deployments', label: same('Velle Capital') },
  funds: { href: '/deployments', label: same('Arcanix Fund, UCM Finance Society') },
  certs: { href: '/model-card', label: { en: 'Certifications', es: 'Certificaciones' } },
  cv: { href: '/cv', label: { en: 'CV', es: 'CV' } },
} satisfies Record<string, Evidence>;

export const skills: Skill[] = [
  // Languages and core tools
  { id: 'python', label: same('Python'), aliases: ['python'], level: 'proven', lens: 'ds', evidence: [ev.hc, ev.vol, ev.agent] },
  { id: 'r', label: same('R'), aliases: ['cs:R', 'rstudio', 'tidyverse', 'tidymodels', 'lenguaje r', 'r programming'], level: 'proven', lens: 'ds', evidence: [ev.mdh] },
  { id: 'sql', label: same('SQL'), aliases: ['sql', 'postgresql', 'postgres', 'mysql', 't-sql', 'pl/sql', 'sql server'], level: 'proven', lens: 'de', evidence: [ev.velle, ev.certs] },
  { id: 'pandas', label: same('pandas / NumPy'), aliases: ['pandas', 'numpy'], level: 'proven', lens: 'ds', evidence: [ev.hc] },
  { id: 'polars', label: same('polars'), aliases: ['polars'], level: 'used', lens: 'de', evidence: [ev.cv] },
  { id: 'jupyter', label: same('Jupyter'), aliases: ['jupyter', 'notebooks'], level: 'proven', evidence: [ev.teach] },
  { id: 'git', label: same('Git / GitHub'), aliases: ['git', 'github', 'gitlab', 'version control', 'control de versiones'], level: 'proven', lens: 'de', evidence: [ev.portfolio, ev.hc] },
  { id: 'cicd', label: { en: 'CI/CD', es: 'CI/CD' }, aliases: ['ci/cd', 'github actions', 'continuous integration', 'integracion continua'], level: 'proven', lens: 'de', evidence: [ev.hc, ev.portfolio] },
  { id: 'testing', label: { en: 'Automated testing', es: 'Tests automáticos' }, aliases: ['pytest', 'unit test*', 'testing', 'tests automatizados', 'automated tests', 'pruebas unitarias'], level: 'proven', lens: 'de', evidence: [ev.hc] },
  { id: 'sas', label: same('SAS'), aliases: ['sas'], level: 'used', lens: 'quant', evidence: [ev.cv], note: { en: 'Coursework (Time Series in SAS).', es: 'En asignaturas (Series Temporales en SAS).' } },
  { id: 'matlab', label: same('MATLAB'), aliases: ['matlab'], level: 'used', evidence: [ev.cv], note: { en: 'Coursework only.', es: 'Solo en asignaturas.' } },
  { id: 'excel', label: same('Excel'), aliases: ['excel', 'power query', 'spreadsheets', 'hojas de calculo'], level: 'used', evidence: [ev.velle], note: { en: 'Pivot tables, lookups, Power Query.', es: 'Tablas dinámicas, BUSCARV, Power Query.' } },
  { id: 'powerbi', label: same('Power BI'), aliases: ['power bi', 'powerbi'], level: 'used', lens: 'ds', evidence: [ev.cv] },

  // ML and statistics
  { id: 'ml', label: { en: 'Machine learning', es: 'Machine learning' }, aliases: ['machine learning', 'aprendizaje automatico', 'predictive model*', 'modelos predictivos', 'supervised learning', 'aprendizaje supervisado', 'modelos de ml', 'ml models'], level: 'proven', lens: 'ds', evidence: [ev.mdh, ev.hc] },
  { id: 'sklearn', label: same('scikit-learn'), aliases: ['scikit-learn', 'sklearn', 'scikit learn'], level: 'proven', lens: 'ds', evidence: [ev.hc, ev.salary] },
  { id: 'boosting', label: { en: 'Gradient boosting / random forests', es: 'Gradient boosting / random forest' }, aliases: ['xgboost', 'lightgbm', 'catboost', 'gradient boosting', 'random forest*', 'tree-based', 'ensemble*'], level: 'proven', lens: 'ds', evidence: [ev.mdh, ev.hc] },
  { id: 'deep', label: { en: 'Deep learning', es: 'Deep learning' }, aliases: ['deep learning', 'neural network*', 'redes neuronales', 'lstm', 'aprendizaje profundo'], level: 'used', lens: 'ds', evidence: [ev.vol] },
  { id: 'pytorch', label: same('PyTorch'), aliases: ['pytorch', 'torch'], level: 'used', lens: 'ds', evidence: [ev.vol] },
  {
    id: 'tensorflow', label: same('TensorFlow / Keras'), aliases: ['tensorflow', 'keras'], level: 'gap', lens: 'ds', evidence: [],
    adjacent: [{ id: 'pytorch', credit: 0.7 }], note: { en: 'I use PyTorch, not TensorFlow.', es: 'Uso PyTorch, no TensorFlow.' },
  },
  { id: 'stats', label: { en: 'Statistics', es: 'Estadística' }, aliases: ['statistic*', 'estadistic*', 'hypothesis test*', 'contraste* de hipotesis', 'probability', 'probabilidad', 'statistical inference', 'inferencia estadistica'], level: 'proven', lens: 'ds', evidence: [ev.btc, ev.vol] },
  { id: 'econometrics', label: { en: 'Econometrics', es: 'Econometría' }, aliases: ['econometri*', 'regression analysis', 'analisis de regresion'], level: 'proven', lens: 'quant', evidence: [ev.mdh, ev.btc, ev.vol] },
  { id: 'statsmodels', label: same('statsmodels / arch'), aliases: ['statsmodels', 'arch', 'garch'], level: 'proven', lens: 'quant', evidence: [ev.vol, ev.btc] },
  { id: 'timeseries', label: { en: 'Time series and forecasting', es: 'Series temporales y predicción' }, aliases: ['time series', 'time-series', 'series temporales', 'series de tiempo', 'forecasting', 'demand forecasting', 'prediccion de demanda', 'arima', 'pronostico*'], level: 'proven', lens: 'quant', evidence: [ev.vol, ev.btc] },
  { id: 'spatial', label: { en: 'Spatial data', es: 'Datos espaciales' }, aliases: ['spatial', 'geospatial', 'geoespacial', 'gis', 'geographic*', 'georreferenci*', 'geocoding', 'geocodificacion', 'location data', 'datos de localizacion'], level: 'proven', lens: 'ds', evidence: [ev.mdh, ev.geo] },
  { id: 'risk', label: { en: 'Credit and market risk', es: 'Riesgo de crédito y de mercado' }, aliases: ['credit risk', 'riesgo de credito', 'credit scoring', 'scoring', 'value at risk', 'cs:VaR', 'risk model*', 'modelos de riesgo', 'market risk', 'riesgo de mercado', 'basel', 'basilea', 'irb', 'pd model*'], level: 'proven', lens: 'quant', evidence: [ev.hc, ev.vol] },
  { id: 'quantfin', label: { en: 'Quantitative finance', es: 'Finanzas cuantitativas' }, aliases: ['quantitative finance', 'finanzas cuantitativas', 'portfolio management', 'gestion de carteras', 'asset pricing', 'derivatives', 'derivados', 'frm', 'financial model*', 'modelizacion financiera', 'cointegra*'], level: 'used', lens: 'quant', evidence: [ev.funds, ev.btc], note: { en: 'Student funds and research; FRM Part I candidate.', es: 'Fondos de estudiantes e investigación; candidato a FRM Part I.' } },
  { id: 'features', label: { en: 'Feature engineering', es: 'Feature engineering' }, aliases: ['feature engineering', 'ingenieria de variables', 'ingenieria de caracteristicas'], level: 'proven', lens: 'ds', evidence: [ev.hc, ev.salary] },
  { id: 'explain', label: { en: 'Explainability (SHAP)', es: 'Explicabilidad (SHAP)' }, aliases: ['shap', 'explainab*', 'explicabilidad', 'interpretab*', 'xai'], level: 'proven', lens: 'ds', evidence: [ev.salary, ev.mdh] },
  {
    id: 'causal', label: { en: 'A/B testing and causal inference', es: 'A/B testing e inferencia causal' }, aliases: ['causal inference', 'inferencia causal', 'a/b test*', 'ab test*', 'experimentation', 'experimentacion', 'difference in differences', 'diff-in-diff', 'uplift'], level: 'gap', lens: 'ds', evidence: [],
    adjacent: [{ id: 'econometrics', credit: 0.6 }, { id: 'stats', credit: 0.5 }],
    note: { en: 'I know the econometrics behind it, but I have not run experiments on a product.', es: 'Conozco la econometría que hay detrás, pero no he hecho experimentos sobre un producto.' },
  },
  { id: 'optimization', label: { en: 'Optimisation', es: 'Optimización' }, aliases: ['optimization', 'optimisation', 'optimizacion', 'operations research', 'investigacion operativa', 'linear programming', 'programacion lineal', 'gams'], level: 'used', evidence: [ev.cv], note: { en: 'GAMS in coursework (with honours), nothing in production.', es: 'GAMS en asignaturas (con matrícula de honor), nada en producción.' } },
  { id: 'cv', label: { en: 'Computer vision', es: 'Visión artificial' }, aliases: ['computer vision', 'vision artificial', 'vision por computador', 'image recognition', 'opencv', 'yolo', 'image classification'], level: 'gap', lens: 'ai', evidence: [], adjacent: [{ id: 'pytorch', credit: 0.3 }] },
  { id: 'rl', label: { en: 'Reinforcement learning', es: 'Aprendizaje por refuerzo' }, aliases: ['reinforcement learning', 'aprendizaje por refuerzo'], level: 'gap', lens: 'ai', evidence: [] },

  // AI and agents
  { id: 'llm', label: { en: 'LLMs and agents', es: 'LLM y agentes' }, aliases: ['llm', 'llms', 'large language model*', 'modelos de lenguaje', 'genai', 'gen ai', 'generative ai', 'ia generativa', 'inteligencia artificial generativa', 'agentic', 'ai agents', 'agentes de ia', 'agentes ia', 'prompt engineering', 'tool use'], level: 'proven', lens: 'ai', evidence: [ev.agent, ev.certs] },
  { id: 'claude', label: same('Claude Agent SDK / Claude Code'), aliases: ['claude', 'anthropic', 'claude agent sdk', 'claude code'], level: 'proven', lens: 'ai', evidence: [ev.agent] },
  { id: 'nlp', label: { en: 'NLP and embeddings', es: 'NLP y embeddings' }, aliases: ['nlp', 'natural language processing', 'procesamiento del lenguaje natural', 'transformers', 'hugging face', 'huggingface', 'embeddings', 'text mining'], level: 'used', lens: 'ai', evidence: [ev.certs], note: { en: 'CEMFI summer school: NLP, embeddings, transformers.', es: 'CEMFI Summer School: NLP, embeddings, transformers.' } },
  {
    id: 'langchain', label: same('LangChain / LangGraph / LlamaIndex'), aliases: ['langchain', 'langgraph', 'llamaindex', 'llama index', 'semantic kernel', 'autogen', 'crewai'], level: 'gap', lens: 'ai', evidence: [],
    adjacent: [{ id: 'claude', credit: 0.6 }],
    note: { en: 'I build agents with the Claude Agent SDK; I have not written LangChain code.', es: 'Construyo agentes con el Claude Agent SDK; no he escrito código con LangChain.' },
  },
  {
    id: 'rag', label: same('RAG / vector databases'), aliases: ['rag', 'retrieval augmented', 'retrieval-augmented', 'vector database*', 'vector store*', 'bases de datos vectoriales', 'pinecone', 'faiss'], level: 'gap', lens: 'ai', evidence: [],
    adjacent: [{ id: 'llm', credit: 0.5 }, { id: 'nlp', credit: 0.5 }],
    note: { en: 'No RAG system shipped yet; I have built an agent and worked with embeddings.', es: 'Aún no he llevado un RAG a producción; sí un agente y trabajo con embeddings.' },
  },
  { id: 'langflow', label: same('Langflow'), aliases: ['langflow'], level: 'used', lens: 'ai', evidence: [ev.certs] },
  { id: 'fastapi', label: { en: 'FastAPI / REST APIs', es: 'FastAPI / APIs REST' }, aliases: ['fastapi', 'rest api*', 'api rest', 'apis rest'], level: 'used', lens: 'ai', evidence: [ev.cv] },

  // Data engineering and platforms
  { id: 'spark', label: same('PySpark'), aliases: ['pyspark', 'spark', 'spark sql', 'big data'], level: 'proven', lens: 'de', evidence: [ev.geo, ev.velle] },
  { id: 'databricks', label: same('Databricks'), aliases: ['databricks', 'delta lake', 'unity catalog'], level: 'proven', lens: 'de', evidence: [ev.velle, ev.geo] },
  { id: 'aws', label: same('AWS'), aliases: ['aws', 'amazon web services', 's3'], level: 'used', lens: 'de', evidence: [ev.velle], note: { en: 'S3 through Databricks; not other AWS services.', es: 'S3 a través de Databricks; no otros servicios de AWS.' } },
  {
    id: 'azure', label: same('Azure'), aliases: ['azure'], level: 'learning', lens: 'de', evidence: [], adjacent: [{ id: 'databricks', credit: 0.5 }],
    note: { en: 'Taking an Azure course; my Databricks work runs on AWS.', es: 'Estoy haciendo un curso de Azure; mi trabajo en Databricks va sobre AWS.' },
  },
  {
    id: 'gcp', label: same('Google Cloud'), aliases: ['gcp', 'google cloud', 'bigquery', 'vertex ai'], level: 'gap', lens: 'de', evidence: [], adjacent: [{ id: 'databricks', credit: 0.4 }],
    note: { en: 'Not used; my cloud work is Databricks on AWS.', es: 'No lo he usado; mi trabajo en cloud es Databricks sobre AWS.' },
  },
  { id: 'snowflake', label: same('Snowflake'), aliases: ['snowflake', 'redshift'], level: 'gap', lens: 'de', evidence: [], adjacent: [{ id: 'databricks', credit: 0.5 }] },
  { id: 'hadoop', label: same('Hadoop / Hive'), aliases: ['hadoop', 'hdfs', 'hive'], level: 'learning', lens: 'de', evidence: [], adjacent: [{ id: 'spark', credit: 0.4 }], note: { en: 'Learning it now.', es: 'Lo estoy aprendiendo.' } },
  { id: 'parquet', label: same('Parquet'), aliases: ['parquet'], level: 'used', lens: 'de', evidence: [ev.hc] },
  { id: 'nosql', label: same('MongoDB / NoSQL'), aliases: ['mongodb', 'mongo', 'nosql'], level: 'used', lens: 'de', evidence: [ev.cv] },
  { id: 'etl', label: { en: 'Data pipelines (ETL)', es: 'Pipelines de datos (ETL)' }, aliases: ['etl', 'elt', 'data pipeline*', 'pipelines de datos', 'pipeline*', 'ingesta', 'data ingestion', 'data integration', 'integracion de datos'], level: 'proven', lens: 'de', evidence: [ev.hc, ev.velle, ev.agent] },
  { id: 'quality', label: { en: 'Data quality', es: 'Calidad del dato' }, aliases: ['data quality', 'calidad del dato', 'calidad de datos', 'calidad de los datos', 'data cleaning', 'limpieza de datos', 'data governance', 'gobierno del dato'], level: 'proven', lens: 'de', evidence: [ev.agent, ev.velle] },
  {
    id: 'orchestration', label: same('Airflow / dbt'), aliases: ['airflow', 'dbt', 'prefect', 'dagster'], level: 'gap', lens: 'de', evidence: [], adjacent: [{ id: 'databricks', credit: 0.3 }],
    note: { en: 'I schedule jobs in Databricks; no Airflow or dbt yet.', es: 'Programo jobs en Databricks; aún no Airflow ni dbt.' },
  },
  { id: 'streaming', label: same('Kafka / streaming'), aliases: ['kafka', 'flink', 'real-time streaming', 'stream processing'], level: 'gap', lens: 'de', evidence: [] },
  {
    id: 'docker', label: same('Docker / Kubernetes'), aliases: ['docker', 'containers', 'contenedores', 'kubernetes', 'k8s'], level: 'gap', lens: 'de', evidence: [],
    note: { en: 'Not yet. It is on my list of things to learn on the job.', es: 'Aún no. Está en mi lista de lo que quiero aprender en el puesto.' },
  },
  {
    id: 'mlops', label: { en: 'MLOps', es: 'MLOps' }, aliases: ['mlops', 'mlflow', 'model deployment', 'despliegue de modelos', 'experiment tracking', 'weights & biases', 'wandb', 'model monitoring'], level: 'gap', lens: 'de', evidence: [],
    adjacent: [{ id: 'cicd', credit: 0.4 }],
    note: { en: 'I ship with tests and CI, but I have not run an MLOps stack.', es: 'Trabajo con tests y CI, pero no he llevado un stack de MLOps.' },
  },

  // Reporting
  { id: 'viz', label: { en: 'Dashboards and data viz', es: 'Dashboards y visualización' }, aliases: ['data visuali*', 'visualizacion de datos', 'dashboard*', 'cuadros de mando', 'reporting'], level: 'used', lens: 'ds', evidence: [ev.mdh, ev.portfolio] },
  { id: 'shiny', label: same('Shiny'), aliases: ['shiny'], level: 'used', lens: 'ds', evidence: [ev.mdh] },
  { id: 'streamlit', label: same('Streamlit / Dash'), aliases: ['streamlit', 'plotly dash', 'gradio'], level: 'learning', lens: 'ds', evidence: [], adjacent: [{ id: 'shiny', credit: 0.6 }] },
  {
    id: 'tableau', label: same('Tableau / Looker'), aliases: ['tableau', 'looker', 'qlik'], level: 'gap', lens: 'ds', evidence: [], adjacent: [{ id: 'powerbi', credit: 0.7 }],
    note: { en: 'I use Power BI and Shiny, not Tableau or Looker.', es: 'Uso Power BI y Shiny, no Tableau ni Looker.' },
  },
  {
    id: 'vba', label: same('VBA / macros'), aliases: ['vba', 'macros'], level: 'gap', evidence: [], adjacent: [{ id: 'excel', credit: 0.4 }],
    note: { en: 'Power Query yes, VBA no.', es: 'Power Query sí, VBA no.' },
  },

  // Things I have not used. Listed so an offer that needs them hears it straight.
  {
    id: 'stata', label: same('Stata / EViews / SPSS'), aliases: ['stata', 'eviews', 'spss'], level: 'gap', lens: 'quant', evidence: [], adjacent: [{ id: 'econometrics', credit: 0.6 }],
    note: { en: 'I do econometrics in R and Python, not Stata.', es: 'Hago econometría en R y Python, no en Stata.' },
  },
  { id: 'cpp', label: same('C++ / C#'), aliases: ['c++', 'cpp', 'c#', '.net'], level: 'gap', evidence: [], note: { en: 'Not used yet.', es: 'Aún no los he usado.' } },
  { id: 'jvm', label: same('Java / Scala / Go'), aliases: ['java', 'scala', 'golang', 'rust', 'kotlin'], level: 'gap', evidence: [] },
  { id: 'web', label: same('JavaScript / TypeScript / React'), aliases: ['javascript', 'typescript', 'react', 'node.js', 'nodejs', 'angular', 'vue.js', 'front-end', 'frontend'], level: 'gap', evidence: [] },
  { id: 'linux', label: same('Linux / shell'), aliases: ['linux', 'bash', 'shell scripting', 'unix'], level: 'gap', evidence: [], note: { en: 'Not used yet.', es: 'Aún no lo he usado.' } },
  { id: 'agile', label: same('Scrum / Agile'), aliases: ['scrum', 'agile', 'metodologias agiles', 'kanban', 'jira'], level: 'gap', evidence: [], note: { en: 'I have not worked in sprints yet.', es: 'Aún no he trabajado por sprints.' } },

  // Languages
  { id: 'english', label: { en: 'English (C1)', es: 'Inglés (C1)' }, aliases: ['english', 'ingles'], level: 'proven', evidence: [ev.cv] },
  { id: 'spanish', label: { en: 'Spanish (native)', es: 'Español (nativo)' }, aliases: ['spanish', 'espanol', 'castellano'], level: 'proven', evidence: [ev.cv] },
  { id: 'german', label: { en: 'German (A2)', es: 'Alemán (A2)' }, aliases: ['german', 'aleman', 'deutsch'], level: 'learning', evidence: [ev.cv], note: { en: 'A2: basic.', es: 'A2: básico.' } },
  { id: 'otherlang', label: { en: 'French / Italian / Portuguese', es: 'Francés / italiano / portugués' }, aliases: ['french', 'frances', 'italian', 'italiano', 'portuguese', 'portugues', 'mandarin', 'chinese'], level: 'gap', evidence: [] },

  // Education
  {
    id: 'degree', label: { en: "Bachelor's degree", es: 'Grado universitario' }, aliases: ['bachelor*', 'degree', 'grado en', 'grado universitario', 'titulacion', 'licenciatura', 'university student*', 'estudiante* de grado', 'enrolled', 'matriculad*', 'final year', 'final-year', 'ultimo curso', 'ultimos cursos'], level: 'proven', evidence: [ev.cv],
    note: { en: 'BSc Applied Data Science, UCM. Graduating before August 2027.', es: 'Grado en Ciencia de Datos Aplicada, UCM. Termino antes de agosto de 2027.' },
  },
  {
    id: 'master', label: { en: "Master's degree", es: 'Máster' }, aliases: ['master', "master's", 'masters', 'msc', 'posgrado', 'postgraduate'], level: 'gap', evidence: [], adjacent: [{ id: 'degree', credit: 0.3 }], unlessWith: ['degree'],
    note: { en: "I am finishing my bachelor's (2027).", es: 'Estoy terminando el grado (2027).' },
  },
  { id: 'phd', label: same('PhD'), aliases: ['phd', 'ph.d', 'doctorado', 'doctorate'], level: 'gap', evidence: [], unlessWith: ['degree', 'master'] },
];

export const sectors: Sector[] = [
  {
    id: 'finance', label: { en: 'Finance and banking', es: 'Finanzas y banca' }, interest: 'core', evidence: [ev.velle, ev.vol],
    aliases: ['retail banking', 'commercial banking', 'banca minorista', 'banca comercial', 'bank', 'banks', 'banking', 'banca', 'banco', 'bancari*', 'financial services', 'servicios financieros', 'fintech', 'asset management', 'gestion de activos', 'gestora*', 'investment bank*', 'banca de inversion', 'private equity', 'hedge fund*', 'trading', 'capital markets', 'mercados de capitales', 'wealth management', 'payments', 'medios de pago'],
  },
  {
    id: 'realestate', label: { en: 'Real estate', es: 'Inmobiliario' }, interest: 'core', evidence: [ev.mdh, ev.velle],
    aliases: ['real estate', 'inmobiliari*', 'proptech', 'property', 'properties', 'vivienda*', 'housing', 'npl', 'npls', 'reo', 'reos'],
  },
  {
    id: 'energy', label: { en: 'Energy and commodities', es: 'Energía y materias primas' }, interest: 'core', evidence: [ev.vol, ev.funds],
    aliases: ['energy', 'energia', 'energetic*', 'commodit*', 'materias primas', 'oil', 'petroleo', 'natural gas', 'gas natural', 'utilities', 'renewable*', 'renovable*', 'electricity', 'electricidad', 'power markets'],
  },
  { id: 'insurance', label: { en: 'Insurance', es: 'Seguros' }, interest: 'interested', aliases: ['insurance', 'insurer*', 'seguros', 'aseguradora*', 'reinsurance', 'reaseguro'] },
  { id: 'consulting', label: { en: 'Consulting', es: 'Consultoría' }, interest: 'interested', aliases: ['consulting', 'consultancy', 'consultoria', 'consultora', 'advisory', 'big four', 'big 4'] },
  { id: 'competition', label: { en: 'Economic consulting', es: 'Consultoría económica' }, interest: 'interested', aliases: ['antitrust', 'competition economics', 'competition policy', 'economic consulting', 'consultoria economica', 'defensa de la competencia', 'merger control', 'control de concentraciones'] },
  { id: 'industry', label: { en: 'Industry and infrastructure', es: 'Industria e infraestructuras' }, interest: 'interested', aliases: ['infrastructure', 'infraestructura*', 'construction', 'construccion', 'airport*', 'aeropuerto*', 'automotive', 'automocion', 'manufacturing', 'industrial', 'mobility', 'movilidad', 'logistics', 'logistica', 'supply chain', 'cadena de suministro'] },
  { id: 'consumer', label: { en: 'Consumer and retail', es: 'Consumo y retail' }, interest: 'interested', aliases: ['fmcg', 'cpg', 'consumer goods', 'gran consumo', 'retail', 'e-commerce', 'ecommerce', 'fashion', 'moda', 'luxury', 'lujo'] },
  { id: 'health', label: { en: 'Health and pharma', es: 'Salud y farma' }, interest: 'interested', aliases: ['pharma*', 'farma*', 'healthcare', 'salud', 'sanitari*', 'hospital*', 'biotech', 'medicamento*'] },
  { id: 'telecom', label: { en: 'Telecom', es: 'Telecomunicaciones' }, interest: 'interested', aliases: ['telecom*', 'telco', '5g', 'mobile network*', 'redes moviles'] },
  { id: 'public', label: { en: 'Public sector', es: 'Sector público' }, interest: 'neutral', aliases: ['public sector', 'sector publico', 'government', 'administracion publica'] },
  { id: 'marketing', label: { en: 'Marketing and adtech', es: 'Marketing y adtech' }, interest: 'neutral', aliases: ['adtech', 'advertising', 'publicidad', 'digital marketing', 'marketing digital'] },
  { id: 'gaming', label: { en: 'Gaming and betting', es: 'Videojuegos y apuestas' }, interest: 'neutral', aliases: ['gaming', 'videojuegos', 'videogames', 'betting', 'apuestas'] },
];

export const roles: Role[] = [
  { id: 'ds', label: { en: 'Data scientist', es: 'Data scientist' }, fit: 1, interest: 'core', lens: 'ds', aliases: ['data scientist*', 'cientific* de datos', 'data science'] },
  { id: 'ai', label: { en: 'AI engineer / forward deployed', es: 'AI engineer / forward deployed' }, fit: 0.85, interest: 'core', lens: 'ai', aliases: ['ai engineer*', 'ingenier* de ia', 'ingenier* de inteligencia artificial', 'forward deployed', 'genai engineer*', 'llm engineer*', 'applied ai', 'ai developer*', 'desarrollador* de ia', 'ai specialist*'] },
  { id: 'mle', label: { en: 'ML engineer', es: 'ML engineer' }, fit: 0.8, interest: 'core', lens: 'ds', aliases: ['machine learning engineer*', 'ml engineer*', 'ingenier* de machine learning', 'ingenier* de ml'] },
  { id: 'quant', label: { en: 'Quant / risk analyst', es: 'Quant / analista de riesgos' }, fit: 0.8, interest: 'core', lens: 'quant', aliases: ['quant', 'quants', 'quantitative analyst*', 'quantitative research*', 'analista cuantitativ*', 'risk analyst*', 'analista de riesgo*', 'model validation', 'validacion de modelos', 'risk modell*', 'risk model*'] },
  { id: 'quantdev', label: { en: 'Quant developer', es: 'Quant developer' }, fit: 0.45, interest: 'interested', lens: 'quant', aliases: ['quantitative developer*', 'quant developer*', 'quant dev'] },
  { id: 'analyst', label: { en: 'Data / BI analyst', es: 'Analista de datos / BI' }, fit: 0.8, interest: 'interested', lens: 'ds', aliases: ['data analyst*', 'analista de datos', 'bi analyst*', 'business intelligence', 'analista bi', 'analytics intern*', 'reporting analyst*'] },
  { id: 'de', label: { en: 'Data engineer', es: 'Data engineer' }, fit: 0.75, interest: 'interested', lens: 'de', aliases: ['data engineer*', 'ingenier* de datos', 'analytics engineer*', 'big data engineer*'] },
  { id: 'research', label: { en: 'Research analyst / economist', es: 'Research analyst / economista' }, fit: 0.7, interest: 'interested', lens: 'quant', aliases: ['research analyst*', 'economist*', 'economista*', 'economic analyst*', 'research assistant*', 'research intern*'] },
  { id: 'actuarial', label: { en: 'Actuarial', es: 'Actuarial' }, fit: 0.65, interest: 'interested', lens: 'quant', aliases: ['actuar*'] },
  { id: 'ba', label: { en: 'Business analyst (AI projects)', es: 'Business analyst (proyectos de IA)' }, fit: 0.6, interest: 'interested', lens: 'ai', aliases: ['business analyst*', 'analista de negocio', 'product analyst*'] },
  { id: 'swe', label: { en: 'Software engineer', es: 'Ingeniero de software' }, fit: 0.3, interest: 'neutral', lens: 'de', aliases: ['software engineer*', 'software developer*', 'desarrollador* de software', 'backend', 'back-end', 'full stack', 'fullstack', 'full-stack', 'devops'] },
];
