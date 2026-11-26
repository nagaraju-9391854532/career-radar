import type { Job } from '../src/index.ts';

export interface ExtractedRequirements {
  /** Deduplicated technology / tool / platform expertise terms */
  technologies: string[];
  /** Concise headline experience range/years if detected (e.g. "6–11 years", "7+ years") */
  experienceSummary: string | null;
  /** Minimum years of experience if detected */
  experienceMin: number | null;
  /** Maximum years of experience if an explicit range/cap was given, else null */
  experienceMax: number | null;
  /** Extracted experience & qualification statements */
  experience: string[];
}

const INDIA_LOCATION_RE =
  /\b(india|bengaluru|bangalore|pune|hyderabad|mumbai|chennai|gurugram|gurgaon|noida|new delhi|delhi|kolkata|ahmedabad|kochi|chandigarh|jaipur|indore|coimbatore|thiruvananthapuram|trivandrum|navi mumbai|thane)\b/i;

export function isIndiaLocation(location: string): boolean {
  return INDIA_LOCATION_RE.test(location);
}

const NON_TECH_TITLE_RE =
  /\b(product\s+specialist|product\s+manager|product\s+marketing|program\s+manager|project\s+manager|territory\s+manager|new\s+business|account\s+(?:executive|manager|strategist|coordinator|director)|sales(?:\s+development|\s+assist|\s+representative|\s+manager|\s+specialist|\s+engineer\s+intern)?|business\s+development|recruiter|recruiting|talent\s+(?:partner|acquisition|sourcer)|human\s+resources|\bhr\b|people\s+partner|legal|counsel|attorney|policy|compliance|communications|public\s+relations|marketing|brand\s+manager|copywriter|creative\s+director|finance|accounting|accountant|tax\b|payroll|audit|treasury|customer\s+success|client\s+partner|vendor\s+operations|market\s+(?:manager|associate|coordinator)|office\s+manager|executive\s+assistant|administrative|facilities|workplace|supply\s+chain|procurement|category\s+lead|operations\s+(?:specialist|manager|associate))\b/i;

const TECH_IT_TITLE_RE =
  /(?:\b(?:software|sde|mts|developer|engineer(?:ing)?|programmer|architect|devops|sre|site\s+reliability|platform|infrastructure|cloud|aws|azure|gcp|kubernetes|docker|terraform|linux|unix|sysadmin|system\s+admin(?:istrator)?|systems\s+admin|network(?:ing)?|cyber\s*security|infosec|appsec|devsecops|security\s+(?:engineer|analyst|architect|operations|specialist)|soc\s+analyst|data\s+(?:engineer|scientist|analyst|architect|platform)|analytics\s+engineer|bi\s+(?:developer|engineer|analyst)|business\s+intelligence|etl|database|dba|dbre|sql|mysql|postgres|oracle|mongodb|redis|kafka|spark|hadoop|cdh|cloudera|snowflake|databricks|airflow|machine\s+learning|mlops|\bml\b|\bai\b|artificial\s+intelligence|llm|genai|deep\s+learning|computer\s+vision|nlp|qa\b|quality\s+(?:assurance|engineer)|sdet|test\s+(?:engineer|automation|lead)|automation\s+(?:engineer|developer|specialist)|frontend|front[- ]end|backend|back[- ]end|full[- ]?stack|web\s+developer|mobile\s+(?:engineer|developer)|ios|android|flutter|react|angular|vue|node\.?js|typescript|javascript|python|java|golang|go|rust|kotlin|swift|php|ruby|scala|sap|abap|salesforce|servicenow|workday\s+(?:developer|engineer|integration|analyst)|it\s+(?:support|specialist|engineer|analyst|administrator|manager|operations|security|infrastructure|desk|development)|information\s+technology|technical\s+support|application\s+support|production\s+support|help\s*desk|service\s+desk|firmware|embedded|vlsi|asic|rtl|hardware\s+engineer|ui\/?ux\s+(?:engineer|developer)|adas|ci\/cd|integration\/ci)\b|(?:^|[^\w])(?:c\+\+|c#|\.net)(?:$|[^\w]))/i;

const EXPLICIT_TECHNICAL_ROLE_RE =
  /\b(sde|mts|software\s+engineer|developer|programmer|architect|devops|sre|data\s+engineer|data\s+scientist|ml\s+engineer|security\s+engineer|it\s+engineer|it\s+specialist|it\s+development|systems\s+engineer|network\s+engineer|database|sdet|qa\s+engineer)\b/i;

export function isTechItRole(title: string): boolean {
  const clean = title.trim();
  if (!clean) return false;
  if (
    NON_TECH_TITLE_RE.test(clean) &&
    !EXPLICIT_TECHNICAL_ROLE_RE.test(clean)
  ) {
    return false;
  }
  return TECH_IT_TITLE_RE.test(clean);
}

export function matchesExperienceFilter(
  req: Pick<ExtractedRequirements, 'experienceMin' | 'experienceMax'>,
  filter: string
): boolean {
  if (!filter || filter === 'all') return true;
  if (req.experienceMin == null) return true; // assumed 0–1, always passes
  if (filter === '0-2') return req.experienceMin <= 2;
  if (filter === 'lt5') return req.experienceMin < 5;
  if (filter === '0-5') return req.experienceMin <= 5;
  return true;
}

interface TechRule {
  label: string;
  pattern: RegExp;
}

const TECH_RULES: TechRule[] = [
  // Languages
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'JavaScript', pattern: /\bjavascript\b|\becmascript\b/i },
  { label: 'Python', pattern: /\bpython\b/i },
  { label: 'Java', pattern: /\bjava\b(?!\s*script)/i },
  {
    label: 'Go',
    pattern:
      /\bgolang\b|\bgo\s+(?:programming|language|services|microservices|backend|code)\b/i,
  },
  { label: 'Rust', pattern: /\brust\b/i },
  { label: 'C++', pattern: /(?:^|[^\w])c\+\+(?:$|[^\w])/i },
  { label: 'C#', pattern: /(?:^|[^\w])c#(?:$|[^\w])/i },
  { label: 'Kotlin', pattern: /\bkotlin\b/i },
  { label: 'Swift', pattern: /\bswift\b/i },
  { label: 'Ruby', pattern: /\bruby\b/i },
  { label: 'PHP', pattern: /\bphp\b/i },
  { label: 'Scala', pattern: /\bscala\b/i },
  { label: 'SQL', pattern: /\bsql\b|\btsql\b|\bpl\/sql\b/i },
  { label: 'GraphQL', pattern: /\bgraphql\b/i },
  { label: 'Bash / Shell', pattern: /\bbash\b|\bshell(?:\s+scripting)?\b/i },
  { label: 'HTML / CSS', pattern: /\bhtml5?\b|\bcss3?\b/i },

  // Frontend & Mobile
  { label: 'React', pattern: /\breact(?:\.js|js)?\b(?!\s*native)/i },
  { label: 'React Native', pattern: /\breact\s+native\b/i },
  { label: 'Next.js', pattern: /\bnext\.?js\b/i },
  { label: 'Vue.js', pattern: /\bvue(?:\.js|js)?\b/i },
  { label: 'Angular', pattern: /\bangular\b/i },
  { label: 'Svelte', pattern: /\bsvelte\b/i },
  { label: 'Tailwind CSS', pattern: /\btailwind(?:\s*css)?\b/i },
  { label: 'Flutter', pattern: /\bflutter\b/i },
  { label: 'iOS', pattern: /\bios\b/i },
  { label: 'Android', pattern: /\bandroid\b/i },

  // Backend & APIs
  { label: 'Node.js', pattern: /\bnode(?:\.js|js)\b/i },
  { label: 'Bun', pattern: /\bbun\b/i },
  { label: 'Deno', pattern: /\bdeno\b/i },
  { label: 'Django', pattern: /\bdjango\b/i },
  { label: 'FastAPI', pattern: /\bfastapi\b/i },
  { label: 'Flask', pattern: /\bflask\b/i },
  {
    label: 'Spring Boot',
    pattern: /\bspring\s*boot\b|\bspring\s+framework\b/i,
  },
  { label: '.NET', pattern: /(?:^|[^\w])\.net(?:\s*core)?\b/i },
  { label: 'Ruby on Rails', pattern: /\bruby\s+on\s+rails\b|\brails\b/i },
  { label: 'gRPC', pattern: /\bgrpc\b/i },
  { label: 'REST APIs', pattern: /\brest(?:ful)?\s+apis?\b/i },

  // Data, Streaming & AI/ML
  { label: 'Apache Kafka', pattern: /\b(?:apache\s+)?kafka\b/i },
  { label: 'Apache Spark', pattern: /\b(?:apache\s+)?spark\b|\bpyspark\b/i },
  { label: 'Apache Flink', pattern: /\b(?:apache\s+)?flink\b/i },
  { label: 'Apache Airflow', pattern: /\b(?:apache\s+)?airflow\b/i },
  { label: 'Apache Iceberg', pattern: /\b(?:apache\s+)?iceberg\b/i },
  { label: 'Cloudera / CDH', pattern: /\bcdh\b|\bcloudera\b/i },
  { label: 'Hadoop', pattern: /\bhadoop\b/i },
  { label: 'dbt', pattern: /\bdbt\b/i },
  { label: 'Snowflake', pattern: /\bsnowflake\b/i },
  { label: 'Databricks', pattern: /\bdatabricks\b/i },
  { label: 'BigQuery', pattern: /\bbigquery\b/i },
  { label: 'Redshift', pattern: /\bredshift\b/i },
  { label: 'PyTorch', pattern: /\bpytorch\b/i },
  { label: 'TensorFlow', pattern: /\btensorflow\b/i },
  { label: 'LangChain', pattern: /\blangchain\b/i },
  {
    label: 'LLMs / GenAI',
    pattern:
      /\bllms?\b|\blarge\s+language\s+models?\b|\bgenai\b|\bgenerative\s+ai\b/i,
  },
  { label: 'RAG', pattern: /\brag\b|\bretrieval[- ]augmented\b/i },
  { label: 'Machine Learning', pattern: /\bmachine\s+learning\b/i },

  // Databases & Caching
  { label: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/i },
  { label: 'MySQL', pattern: /\bmysql\b/i },
  { label: 'MongoDB', pattern: /\bmongodb\b/i },
  { label: 'Redis', pattern: /\bredis\b/i },
  { label: 'ElastiCache', pattern: /\belasticache\b/i },
  { label: 'DynamoDB', pattern: /\bdynamodb\b/i },
  { label: 'Cassandra', pattern: /\bcassandra\b/i },
  { label: 'Elasticsearch', pattern: /\belasticsearch\b/i },
  { label: 'OpenSearch', pattern: /\bopensearch\b/i },
  { label: 'ClickHouse', pattern: /\bclickhouse\b/i },
  { label: 'SQL Server', pattern: /\bsql\s*server\b/i },
  { label: 'Oracle DB', pattern: /\boracle\s+(?:db|database)\b/i },

  // Cloud, Infra & Observability
  { label: 'AWS', pattern: /\baws\b|\bamazon\s+web\s+services\b/i },
  {
    label: 'Google Cloud (GCP)',
    pattern: /\bgcp\b|\bgoogle\s+cloud(?:\s+platform)?\b/i,
  },
  { label: 'Azure', pattern: /\bazure\b/i },
  { label: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Terraform', pattern: /\bterraform\b/i },
  { label: 'Ansible', pattern: /\bansible\b/i },
  { label: 'Helm', pattern: /\bhelm\b/i },
  { label: 'Linux', pattern: /\blinux\b/i },
  { label: 'Git', pattern: /\bgit\b(?!hub|lab)/i },
  { label: 'GitHub Actions', pattern: /\bgithub\s+actions\b/i },
  { label: 'GitLab CI', pattern: /\bgitlab\b/i },
  { label: 'Jenkins', pattern: /\bjenkins\b/i },
  { label: 'CI/CD', pattern: /\bci\/?cd\b/i },
  { label: 'Datadog', pattern: /\bdatadog\b/i },
  { label: 'Prometheus', pattern: /\bprometheus\b/i },
  { label: 'Grafana', pattern: /\bgrafana\b/i },
  { label: 'CloudWatch', pattern: /\bcloudwatch\b/i },
  { label: 'OpenTelemetry', pattern: /\bopentelemetry\b|\botel\b/i },
  { label: 'Splunk', pattern: /\bsplunk\b/i },
  { label: 'Nginx', pattern: /\bnginx\b/i },

  // Product / Analytics / Enterprise
  { label: 'Salesforce', pattern: /\bsalesforce\b/i },
  { label: 'SAP', pattern: /\bsap\b/i },
  { label: 'Jira', pattern: /\bjira\b/i },
  { label: 'Figma', pattern: /\bfigma\b/i },
  { label: 'Tableau', pattern: /\btableau\b/i },
  { label: 'Power BI', pattern: /\bpower\s*bi\b/i },
  { label: 'Looker', pattern: /\blooker\b/i },
];

const TECH_ALIAS_MAP: Record<string, string> = {
  'amazon web services': 'AWS',
  'google cloud': 'Google Cloud (GCP)',
  'google cloud platform': 'Google Cloud (GCP)',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  k8s: 'Kubernetes',
  golang: 'Go',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  reactjs: 'React',
  'react.js': 'React',
  kafka: 'Apache Kafka',
  'apache kafka': 'Apache Kafka',
};

const BOILERPLATE_HEADING =
  /\b(equal opportunity|eeo|diversity|inclusion|belonging|accommodation|scam|benefits|perks|how we['’]ll take care|about us|about the company|who we are|life at|our commitment|pay range|compensation)\b/i;

const RELEVANT_HEADING =
  /\b(about you|requirements|qualifications|what you['’]ll bring|what we['’]re looking for|skills|expertise|experience|must have|nice to have|preferred|tech stack|technologies|your background|education|who you are)\b/i;

const YEARS_EXPERIENCE_RE =
  /(?:at\s+least\s+|minimum\s+(?:of\s+)?|min\.?\s+)?\d{1,2}\s*(?:[-–—to]+\s*\d{1,2})?\+?\s*years?(?:\s+of)?(?:\s+[a-z0-9+.#/-]+){0,12}/gi;

const EXPERIENCE_SIGNAL_RE =
  /\b(years?\s+of|at\s+least\s+\d+\s+years|experience\s+(?:with|in|building|leading|managing|designing|operating|running)|expertise\s+in|proficient\s+in|proficiency\s+in|deep\s+knowledge|strong\s+(?:background|knowledge|understanding|foundation)|hands[- ]on|familiarity\s+with|bachelor|master|phd|degree\s+in)\b/i;

const NOISE_LINE_RE =
  /\b(equal opportunity|recruiting scams|reasonable accommodation|salary range|pay range|base pay|travel credits|visit our website|follow us on|linkedin|instagram|privacy policy|ai tools while applying|needed for the requirement)\b/i;

function normalizeTechName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const mapped = TECH_ALIAS_MAP[cleaned.toLowerCase()];
  return mapped ?? cleaned;
}

function tryParseJson(content: string): Record<string, unknown> | null {
  if (!content.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function collectStructuredSkills(
  raw: Record<string, unknown> | null
): string[] {
  if (!raw) return [];
  const results: string[] = [];

  const pushItem = (val: unknown) => {
    if (typeof val === 'string') {
      const normalized = normalizeTechName(val);
      if (normalized && normalized.length <= 60) results.push(normalized);
    } else if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      for (const key of ['text', 'name', 'label', 'title']) {
        if (typeof obj[key] === 'string') {
          const normalized = normalizeTechName(obj[key]);
          if (normalized && normalized.length <= 60) results.push(normalized);
          break;
        }
      }
    }
  };

  const inspectField = (field: unknown) => {
    if (Array.isArray(field)) {
      for (const item of field) pushItem(item);
    } else if (field && typeof field === 'object') {
      const obj = field as Record<string, unknown>;
      for (const subKey of [
        'mustTohave',
        'goodtohave',
        'mustHave',
        'niceToHave',
        'required',
        'preferred',
      ]) {
        if (Array.isArray(obj[subKey])) {
          for (const item of obj[subKey] as unknown[]) pushItem(item);
        }
      }
    }
  };

  for (const key of ['skills', 'technologies', 'techStack', 'requiredSkills']) {
    inspectField(raw[key]);
  }

  return results;
}

interface ParsedExperienceRange {
  summary: string;
  min: number;
  max: number | null;
}

function parseRangeNumbers(text: string): ParsedExperienceRange | null {
  const upToMatch = /\bup\s+to\s+(\d{1,2})\s*years?\b/i.exec(text);
  if (upToMatch) {
    const max = Number(upToMatch[1]);
    return { summary: `0–${max} years`, min: 0, max };
  }

  const rangeMatch =
    /\b(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})\s*\+?\s*years?\b/i.exec(text);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (min <= max) {
      return { summary: `${min}–${max} years`, min, max };
    }
  }

  const minMatch =
    /\b(?:at\s+least\s+|minimum\s+(?:of\s+)?|min\.?\s+)?(\d{1,2})\s*\+?\s*years?\b/i.exec(
      text
    );
  if (minMatch) {
    const min = Number(minMatch[1]);
    return { summary: `${min}+ years`, min, max: null };
  }

  return null;
}

function extractStructuredExperience(
  raw: Record<string, unknown> | null
): ParsedExperienceRange | null {
  if (!raw) return null;

  const expRange = typeof raw.expRange === 'string' ? raw.expRange.trim() : '';
  if (expRange) {
    const parsed = parseRangeNumbers(expRange);
    if (parsed) return parsed;
  }

  const minRaw = raw.minimumExp != null ? String(raw.minimumExp).trim() : '';
  const maxRaw = raw.maximumExp != null ? String(raw.maximumExp).trim() : '';
  const minNum = minRaw !== '' ? Number(minRaw) : NaN;
  const maxNum = maxRaw !== '' ? Number(maxRaw) : NaN;

  if (
    Number.isFinite(minNum) &&
    Number.isFinite(maxNum) &&
    !(minNum === 0 && maxNum === 0) &&
    minNum <= maxNum
  ) {
    return { summary: `${minNum}–${maxNum} years`, min: minNum, max: maxNum };
  }
  if (Number.isFinite(minNum) && minNum > 0) {
    return { summary: `${minNum}+ years`, min: minNum, max: null };
  }
  if (Number.isFinite(maxNum) && maxNum > 0) {
    return { summary: `0–${maxNum} years`, min: 0, max: maxNum };
  }
  return null;
}

function cleanMarkdownLine(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandLongParagraphs(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (line.length <= 220) {
      result.push(line);
      continue;
    }
    const sentences = line
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) {
      result.push(...sentences);
    } else {
      result.push(line);
    }
  }
  return result;
}

function splitRelevantBody(body: string): {
  relevantText: string;
  cleanText: string;
  relevantLines: string[];
  allCleanLines: string[];
} {
  const lines = body.split(/\r?\n/);
  const relevantLines: string[] = [];
  const allCleanLines: string[] = [];

  let inRelevantSection = false;
  let inBoilerplateSection = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const isHeading =
      /^#{1,6}\s+/.test(trimmed) ||
      (/^\*\*[^*]{2,80}\*\*$/.test(trimmed) && trimmed.length < 90);

    if (isHeading) {
      const headingText = cleanMarkdownLine(trimmed);
      if (BOILERPLATE_HEADING.test(headingText)) {
        inBoilerplateSection = true;
        inRelevantSection = false;
      } else if (RELEVANT_HEADING.test(headingText)) {
        inRelevantSection = true;
        inBoilerplateSection = false;
      } else {
        inRelevantSection = false;
        inBoilerplateSection = false;
      }
      continue;
    }

    if (inBoilerplateSection) continue;

    const cleaned = cleanMarkdownLine(trimmed);
    if (!cleaned || NOISE_LINE_RE.test(cleaned)) continue;

    allCleanLines.push(cleaned);
    if (inRelevantSection) {
      relevantLines.push(cleaned);
    }
  }

  return {
    relevantText: relevantLines.join('\n'),
    cleanText: allCleanLines.join('\n'),
    relevantLines: expandLongParagraphs(relevantLines),
    allCleanLines: expandLongParagraphs(allCleanLines),
  };
}

function pickExperienceRange(
  structured: ParsedExperienceRange | null,
  cleanLines: string[]
): ParsedExperienceRange | null {
  if (structured) return structured;
  for (const line of cleanLines) {
    if (/\(e\.g\./i.test(line)) continue;
    const parsed = parseRangeNumbers(line);
    if (parsed) return parsed;
  }
  return null;
}

export function extractJobRequirements(
  job: Job,
  renderedBody: string
): ExtractedRequirements {
  const raw = tryParseJson(job.content);
  const structuredSkills = collectStructuredSkills(raw);
  const structuredExp = extractStructuredExperience(raw);

  const { relevantText, cleanText, relevantLines, allCleanLines } =
    splitRelevantBody(renderedBody);

  const scanTarget = (relevantText || cleanText).replace(
    /https?:\/\/\S+/gi,
    ' '
  );
  const fallbackTarget = cleanText.replace(/https?:\/\/\S+/gi, ' ');

  const techSet = new Map<string, string>();
  const addTech = (label: string) => {
    const key = label.toLowerCase();
    if (!techSet.has(key)) techSet.set(key, label);
  };

  for (const skill of structuredSkills) {
    addTech(skill);
  }

  for (const rule of TECH_RULES) {
    if (rule.pattern.test(scanTarget) || rule.pattern.test(fallbackTarget)) {
      addTech(rule.label);
    }
  }

  const experienceSet = new Map<string, string>();
  const addExp = (line: string) => {
    const cleaned = line.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 10 || /\(e\.g\./i.test(cleaned)) return;
    const key = cleaned.toLowerCase();
    if (!experienceSet.has(key)) experienceSet.set(key, cleaned);
  };

  if (structuredExp) {
    addExp(`Required experience: ${structuredExp.summary}`);
  }

  const candidateLines = relevantLines.length ? relevantLines : allCleanLines;

  for (const line of candidateLines) {
    if (experienceSet.size >= 7) break;
    if (YEARS_EXPERIENCE_RE.test(line)) {
      YEARS_EXPERIENCE_RE.lastIndex = 0;
      addExp(line);
      continue;
    }
    YEARS_EXPERIENCE_RE.lastIndex = 0;
    if (EXPERIENCE_SIGNAL_RE.test(line)) {
      addExp(line);
    }
  }

  if (experienceSet.size === 0 && relevantLines.length > 0) {
    for (const line of relevantLines.slice(0, 6)) {
      addExp(line);
    }
  }

  if (experienceSet.size < 2) {
    for (const line of allCleanLines) {
      if (experienceSet.size >= 6) break;
      if (YEARS_EXPERIENCE_RE.test(line)) {
        YEARS_EXPERIENCE_RE.lastIndex = 0;
        addExp(line);
      }
      YEARS_EXPERIENCE_RE.lastIndex = 0;
    }
  }

  const parsedRange = pickExperienceRange(structuredExp, allCleanLines);

  // When no explicit experience range is found anywhere, default to 0–1 years.
  // This ensures jobs that simply don't state years (common for fresher roles)
  // are still visible under entry-level filters instead of being hidden.
  const finalRange: ParsedExperienceRange = parsedRange ?? {
    summary: '0–1 years (assumed)',
    min: 0,
    max: 1,
  };

  return {
    technologies: [...techSet.values()],
    experienceSummary: finalRange.summary,
    experienceMin: finalRange.min,
    experienceMax: finalRange.max,
    experience: [...experienceSet.values()],
  };
}
