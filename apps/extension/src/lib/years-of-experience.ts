export type YoeBucket = 'green' | 'yellow' | 'red';

export interface YoeMention {
  text: string;
  start: number;
  end: number;
  requiredYears: number;
}

// Matches phrases like "3+ years", "5-7 years of experience", "minimum 2 years",
// "at least 4 years". The first captured number is treated as the minimum required.
const YOE_PATTERN =
  /(?:minimum(?:\s+of)?\s+|at\s+least\s+|min\.?\s+)?(\d{1,2})(?:\s*-\s*(\d{1,2}))?\+?\s*years?(?:\s+of\s+experience)?/gi;

export function findYearsOfExperienceMentions(text: string): YoeMention[] {
  const mentions: YoeMention[] = [];
  for (const match of text.matchAll(YOE_PATTERN)) {
    const requiredYears = Number(match[1]);
    if (Number.isNaN(requiredYears) || match.index === undefined) continue;
    mentions.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      requiredYears,
    });
  }
  return mentions;
}

export function bucketYearsOfExperience(
  requiredYears: number,
  userYears: number,
): YoeBucket {
  const diff = requiredYears - userYears;
  if (diff <= 0) return 'green';
  if (diff <= 2) return 'yellow';
  return 'red';
}
