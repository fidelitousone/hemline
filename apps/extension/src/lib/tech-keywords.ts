export const TECH_KEYWORDS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Go',
  'Golang',
  'Rust',
  'C++',
  'C#',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Scala',
  'Vue',
  'React',
  'Angular',
  'Svelte',
  'Next.js',
  'Node.js',
  'Django',
  'Flask',
  'FastAPI',
  'Spring',
  'Rails',
  'Express',
  'Fastify',
  'GraphQL',
  'REST',
  'gRPC',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'CI/CD',
];

export interface TechMention {
  text: string;
  start: number;
  end: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function edgeBoundary(char: string, side: 'start' | 'end'): string {
  if (!/\w/.test(char)) return '';
  return side === 'start' ? '(?<![\\w])' : '(?![\\w])';
}

function buildTechKeywordPattern(keywords: string[]): RegExp {
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const alternatives = sorted.map((keyword) => {
    const start = edgeBoundary(keyword.charAt(0), 'start');
    const end = edgeBoundary(keyword.charAt(keyword.length - 1), 'end');
    return `${start}${escapeRegExp(keyword)}${end}`;
  });
  return new RegExp(alternatives.join('|'), 'gi');
}

const TECH_KEYWORD_PATTERN = buildTechKeywordPattern(TECH_KEYWORDS);

export function findTechKeywordMentions(text: string): TechMention[] {
  const mentions: TechMention[] = [];
  for (const match of text.matchAll(TECH_KEYWORD_PATTERN)) {
    if (match.index === undefined) continue;
    mentions.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return mentions;
}
