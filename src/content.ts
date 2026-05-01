import type { FormalizationProgress, Top100Data, Top100Item } from './types';

export async function loadProgressData(): Promise<Top100Data> {
  const response = await fetch(`/content/top100.json?ts=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`无法读取 top100.json (${response.status})`);
  }

  const data = (await response.json()) as Top100Data;

  return {
    ...data,
    groups: [...data.groups].sort((left, right) => left.order - right.order),
    items: [...data.items].sort((left, right) => left.rank - right.rank),
  };
}

export async function loadFormalizationProgress(): Promise<FormalizationProgress> {
  const response = await fetch(`/content/progress.json?ts=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return { formalized_ids: [], notes: {} };
  }

  if (!response.ok) {
    throw new Error(`无法读取 progress.json (${response.status})`);
  }

  const data = (await response.json()) as FormalizationProgress;
  return {
    formalized_ids: data.formalized_ids ?? [],
    notes: data.notes ?? {},
    generated_on: data.generated_on,
  };
}

export async function loadProblemMarkdown(problem: Top100Item): Promise<string> {
  const response = await fetch(`/content/${getMarkdownPath(problem)}?ts=${Date.now()}`, {
    headers: { Accept: 'text/markdown,text/plain,*/*' },
  });

  if (!response.ok) {
    throw new Error(`无法读取 Markdown (${response.status})`);
  }

  return response.text();
}

export function getMarkdownPath(problem: Top100Item): string {
  return `problems/${problem.id.toString().padStart(3, '0')}.md`;
}
