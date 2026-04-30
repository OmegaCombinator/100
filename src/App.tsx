import { useEffect, useMemo, useState } from 'react';
import { getMarkdownPath, loadProblemMarkdown, loadProgressData } from './content';
import { renderMarkdown } from './markdown';
import type {
  LoadedState,
  Top100Data,
  Top100Difficulty,
  Top100FrontendGroup,
  Top100Item,
} from './types';

const groupOrder: Top100FrontendGroup[] = [
  'smoke_test',
  'try_now',
  'stdlib_first_then_try',
  'define_foundation',
  'defer',
  'blocked',
];

const groupTone: Record<Top100FrontendGroup, string> = {
  smoke_test: 'border-[#8db596] bg-[#f1f8f1] text-[#285b35]',
  try_now: 'border-[#a7bedf] bg-[#f2f6fc] text-[#244f87]',
  stdlib_first_then_try: 'border-[#d9bf82] bg-[#fbf6e8] text-[#755416]',
  define_foundation: 'border-[#c5b5dc] bg-[#f7f2fc] text-[#5b407b]',
  defer: 'border-[#d8d8d8] bg-[#f7f7f5] text-[#555]',
  blocked: 'border-[#ddb0aa] bg-[#fbf1f0] text-[#7b342d]',
};

const difficultyText: Record<Top100Difficulty, string> = {
  foundation: 'foundation',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  blocked: 'blocked',
};

const signalText = {
  strong: 'strong stdlib signal',
  thin: 'thin stdlib signal',
  missing: 'missing stdlib signal',
};

type Route = { view: 'home' } | { view: 'problem'; id: string };

export function App() {
  const [state, setState] = useState<LoadedState>({ status: 'loading' });
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    loadProgressData()
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '加载失败',
        }),
      );
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigateHome = () => {
    window.history.pushState(null, '', '/');
    setRoute({ view: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateProblem = (id: number) => {
    window.history.pushState(null, '', `/problems/${id}`);
    setRoute({ view: 'problem', id: id.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (state.status === 'loading') return <Page><LoadingView /></Page>;
  if (state.status === 'error') return <Page><ErrorView message={state.message} /></Page>;

  const problem = route.view === 'problem'
    ? state.data.items.find((item) => item.id.toString() === route.id)
    : undefined;

  return (
    <Page>
      {route.view === 'problem' ? (
        <ProblemView data={state.data} problem={problem} onBack={navigateHome} />
      ) : (
        <HomeView data={state.data} onOpenProblem={navigateProblem} />
      )}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#151515]">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </div>
    </main>
  );
}

function HomeView({ data, onOpenProblem }: { data: Top100Data; onOpenProblem: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Top100FrontendGroup>('all');

  const firstBatchCount = data.recommended.first_batch.length;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const matchesGroup = filter === 'all' || item.frontend_group === filter;
      const text = [
        item.rank_label,
        item.title,
        item.area_label.en,
        item.area_label.zh,
        item.module_path,
        item.status.label_en,
        item.status.label_zh,
        item.notes,
        item.keywords.join(' '),
        item.top_modules.join(' '),
      ].join(' ').toLowerCase();
      return matchesGroup && (!needle || text.includes(needle));
    });
  }, [data.items, filter, query]);

  return (
    <>
      <header className="mb-10 border-b border-[#ddd6c8] pb-7">
        <nav className="mb-8 flex items-center justify-between gap-4 text-sm">
          <a className="font-800 text-[#151515] no-underline" href="/">
            AixMath
          </a>
          <a className="text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3" href={data.source.url} rel="noreferrer" target="_blank">
            Freek Wiedijk's list
          </a>
        </nav>
        <h1 className="mb-4 text-4xl font-800 leading-tight sm:text-5xl">
          100 theorems in Acorn
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-[#444]">
          This page tracks the AixMath effort to formalize Freek Wiedijk's 100 classic theorems in Acorn.
          The current public data records {data.summary.total} targets, {firstBatchCount} first-batch harness targets,
          and standard-library readiness for each theorem.
        </p>
        <p className="mt-3 text-sm text-[#666]">
          Data generated on {data.generated_on}. Source package: <code>{data.source.manifest_path}</code>.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="sr-only">Search</span>
          <input
            className="h-11 w-full border border-[#d8d0c0] bg-white px-3 text-base outline-none focus:border-[#3567a8]"
            placeholder="Search theorem, module, area, keyword"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="sr-only">Group</span>
          <select
            className="h-11 w-full border border-[#d8d0c0] bg-white px-3 text-base outline-none focus:border-[#3567a8]"
            value={filter}
            onChange={(event) => setFilter(event.target.value as 'all' | Top100FrontendGroup)}
          >
            <option value="all">All groups</option>
            {groupOrder.map((group) => (
              <option key={group} value={group}>
                {data.labels.frontend_groups[group].label_en}
              </option>
            ))}
          </select>
        </label>
      </section>

      <ol className="space-y-0">
        {filtered.map((item) => (
          <TheoremItem key={item.id} item={item} onOpenProblem={onOpenProblem} />
        ))}
      </ol>
    </>
  );
}

function TheoremItem({ item, onOpenProblem }: { item: Top100Item; onOpenProblem: (id: number) => void }) {
  return (
    <li id={`theorem-${item.id}`} className="border-b border-[#e5dfd3] py-6">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-xl font-800 leading-snug">
          {item.rank}. {item.title}
        </h2>
        <a className="text-sm text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3" href={`#theorem-${item.id}`}>
          #
        </a>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className={`border px-2 py-0.5 font-700 ${groupTone[item.frontend_group]}`}>
          {item.frontend_group_label.en}
        </span>
        <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
          {item.area_label.en}
        </span>
        <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
          {difficultyText[item.difficulty]}
        </span>
        <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
          {signalText[item.stdlib_signal]}
        </span>
      </div>

      <p className="mb-3 leading-7 text-[#444]">{item.notes}</p>
      <p className="mb-3 text-sm leading-6 text-[#555]">
        Acorn target: <code>{item.module_path}</code>
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a className="text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3" href={item.source_url} rel="noreferrer" target="_blank">
          Freek source
        </a>
        <button
          className="border-0 bg-transparent p-0 text-sm text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3"
          type="button"
          onClick={() => onOpenProblem(item.id)}
        >
          details
        </button>
        {item.top_modules.length ? (
          <span className="text-[#666]">
            modules: {item.top_modules.slice(0, 4).join(', ')}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ProblemView({ data, problem, onBack }: { data: Top100Data; problem?: Top100Item; onBack: () => void }) {
  const [markdownState, setMarkdownState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; html: string }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  useEffect(() => {
    if (!problem) return;
    setMarkdownState({ status: 'loading' });
    loadProblemMarkdown(problem)
      .then((markdown) => setMarkdownState({ status: 'ready', html: renderMarkdown(markdown) }))
      .catch(() => setMarkdownState({ status: 'ready', html: renderMarkdown(getFallbackMarkdown(problem)) }));
  }, [problem]);

  if (!problem) {
    return (
      <div className="space-y-4">
        <BackButton onBack={onBack} />
        <ErrorView message="找不到这个题目。" />
      </div>
    );
  }

  return (
    <article>
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-[#ddd6c8] pb-4">
        <BackButton onBack={onBack} />
        <span className="text-sm text-[#666]">generated {data.generated_on}</span>
      </div>

      <header className="mb-8">
        <div className="mb-2 text-sm font-700 text-[#666]">{problem.rank_label}</div>
        <h1 className="mb-4 text-4xl font-800 leading-tight">{problem.title}</h1>
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <span className={`border px-2 py-0.5 font-700 ${groupTone[problem.frontend_group]}`}>
            {problem.frontend_group_label.en}
          </span>
          <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
            {problem.area_label.en}
          </span>
          <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
            {difficultyText[problem.difficulty]}
          </span>
        </div>
        <p className="text-lg leading-8 text-[#444]">{problem.notes}</p>
      </header>

      <section className="markdown-body">
        {markdownState.status === 'loading' ? (
          <LoadingView />
        ) : markdownState.status === 'error' ? (
          <ErrorView message={markdownState.message} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: markdownState.html }} />
        )}
      </section>
    </article>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      className="border-0 bg-transparent p-0 text-sm text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3"
      type="button"
      onClick={onBack}
    >
      ← Back to the list
    </button>
  );
}

function LoadingView() {
  return (
    <div className="py-16 text-center text-[#666]">
      Loading
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="border border-[#ddb0aa] bg-[#fbf1f0] p-4 text-[#7b342d]">
      {message}
    </div>
  );
}

function getFallbackMarkdown(problem: Top100Item): string {
  const modules = problem.top_modules.length ? problem.top_modules.map((module) => `- \`${module}\``).join('\n') : '- 暂无';
  const keywords = problem.keywords.length ? problem.keywords.map((keyword) => `\`${keyword}\``).join(', ') : '暂无';
  const caveat = problem.caveat ? `\n## Caveat\n\n${problem.caveat}\n` : '';

  return `## Formalization status

- Frontend group: ${problem.frontend_group_label.en}
- Current status: ${problem.status.label_en}
- Difficulty: ${difficultyText[problem.difficulty]}
- Priority: ${problem.priority_label.en}
- Standard-library signal: ${signalText[problem.stdlib_signal]}
- Acorn target: \`${problem.module_path}\`

## Standard-library leads

${modules}

## Keywords

${keywords}
${caveat}
## Markdown override

Create \`public/content/${getMarkdownPath(problem)}\` to replace this generated summary with a public proof note.`;
}

function parseRoute(): Route {
  const match = window.location.pathname.match(/^\/problems\/([^/]+)$/);
  if (!match) return { view: 'home' };
  return { view: 'problem', id: decodeURIComponent(match[1]) };
}
