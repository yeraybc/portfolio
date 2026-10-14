import type { L } from '../i18n/ui';

/** Made-up offers for the /match demo buttons. One clear fit, one with nuances, one honest no. */
export const examples: { id: string; label: L; text: L }[] = [
  {
    id: 'bank',
    label: { en: 'Data science intern, bank', es: 'Prácticas de data science, banca' },
    text: {
      en: `Data Science Intern – Retail Banking (Madrid)
Join our credit analytics team and help us build the next generation of risk models.
Requirements:
- Final-year student in Statistics, Mathematics, Data Science or similar
- Python and SQL
- Machine learning with scikit-learn or XGBoost
- Fluent English
Nice to have:
- Spark or Databricks
- Tableau
- Knowledge of credit risk models
Full-time internship starting February 2027.`,
      es: `Prácticas Data Science – Banca minorista (Madrid)
Únete a nuestro equipo de analítica de crédito y ayúdanos a construir la próxima generación de modelos de riesgo.
Requisitos:
- Estudiante de último curso de Estadística, Matemáticas, Ciencia de Datos o similar
- Python y SQL
- Machine learning con scikit-learn o XGBoost
- Inglés fluido
Se valorará:
- Spark o Databricks
- Tableau
- Conocimientos de modelos de riesgo de crédito
Prácticas a jornada completa desde febrero de 2027.`,
    },
  },
  {
    id: 'ai',
    label: { en: 'AI engineer intern, consulting', es: 'Becario AI engineer, consultoría' },
    text: {
      en: `AI Engineer Intern – Consulting
You will build generative AI solutions for our clients.
What we're looking for:
- Python
- Hands-on experience with LLMs and generative AI
- LangChain or LlamaIndex
- RAG with vector databases
- Professional English
Nice to have: Docker, Azure, REST APIs with FastAPI.`,
      es: `Becario/a AI Engineer – Consultoría
Construirás soluciones de IA generativa para nuestros clientes.
Requisitos:
- Python
- Experiencia práctica con LLMs e IA generativa
- LangChain o LlamaIndex
- RAG con bases de datos vectoriales
- Inglés profesional
Se valorará: Docker, Azure, APIs REST con FastAPI.`,
    },
  },
  {
    id: 'hft',
    label: { en: 'Senior C++ quant developer', es: 'Senior quant developer en C++' },
    text: {
      en: `Senior Quantitative Developer – Hedge Fund (London)
5+ years of experience building low-latency trading systems.
Requirements:
- Expert C++
- Python
- Linux
- Statistics and time series
Nice to have: Kubernetes.`,
      es: `Senior Quantitative Developer – Hedge fund (Londres)
Más de 5 años de experiencia construyendo sistemas de trading de baja latencia.
Requisitos:
- C++ avanzado
- Python
- Linux
- Estadística y series temporales
Se valorará: Kubernetes.`,
    },
  },
];
