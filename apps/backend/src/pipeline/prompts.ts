const OUTPUT_INSTRUCTIONS = `Respond with the complete, updated LaTeX source only, wrapped in a single
\`\`\`latex fenced code block. Do not include any explanation before or after the block. Preserve
the document's existing LaTeX structure, packages, and commands exactly as given — only edit the
content (wording, bullet emphasis, ordering, included/omitted items) to better match the job.
Never invent experience, employers, dates, or skills the original resume does not contain.`;

export function buildInitialTailorPrompt(baseTex: string, jobTitle: string, jobDescription: string) {
  return [
    {
      role: 'system' as const,
      content: `You are an expert resume editor. You tailor a candidate's existing LaTeX resume to
better match a specific job posting, without fabricating any new experience. ${OUTPUT_INSTRUCTIONS}`,
    },
    {
      role: 'user' as const,
      content: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}\n\nCurrent resume (LaTeX source):\n${baseTex}`,
    },
  ];
}

export function buildRevisionPrompt(
  priorTex: string,
  jobTitle: string,
  jobDescription: string,
  feedback: string,
) {
  return [
    {
      role: 'system' as const,
      content: `You are an expert resume editor revising a previously tailored LaTeX resume based on
the candidate's feedback. ${OUTPUT_INSTRUCTIONS}`,
    },
    {
      role: 'user' as const,
      content: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}\n\nPrevious tailored resume (LaTeX source):\n${priorTex}\n\nCandidate's requested changes:\n${feedback}`,
    },
  ];
}

export function buildCompileRepairPrompt(brokenTex: string, compileError: string) {
  return [
    {
      role: 'system' as const,
      content: `You are an expert LaTeX debugger. The following LaTeX source failed to compile.
Fix only what is necessary to make it compile, without changing its visible content or structure
otherwise. ${OUTPUT_INSTRUCTIONS}`,
    },
    {
      role: 'user' as const,
      content: `Compiler error:\n${compileError}\n\nLaTeX source:\n${brokenTex}`,
    },
  ];
}

export function extractTexFromResponse(response: string): string {
  const match = response.match(/```latex\s*([\s\S]*?)```/);
  return (match ? match[1] : response).trim();
}
