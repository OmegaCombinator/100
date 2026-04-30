import MarkdownIt from 'markdown-it';

const renderer = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});

export function renderMarkdown(rawMarkdown: string): string {
  return renderer.render(stripFrontmatter(rawMarkdown));
}

export function stripFrontmatter(rawMarkdown: string): string {
  if (!rawMarkdown.startsWith('---')) return rawMarkdown;
  const closing = rawMarkdown.indexOf('\n---', 3);
  if (closing === -1) return rawMarkdown;
  return rawMarkdown.slice(closing + 4).trimStart();
}
