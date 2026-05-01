import { useEffect, useMemo, useState } from 'react';
import { loadFormalizationProgress, loadProblemMarkdown, loadProgressData } from './content';
import { renderMarkdown } from './markdown';
import type {
  FormalizationProgress,
  LoadedState,
  Top100Data,
  Top100Item,
} from './types';

type Route = { view: 'home' } | { view: 'problem'; id: string };

export function App() {
  const [state, setState] = useState<LoadedState>({ status: 'loading' });
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    Promise.all([loadProgressData(), loadFormalizationProgress()])
      .then(([data, progress]) => setState({ status: 'ready', data, progress }))
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
        <ProblemView problem={problem} onBack={navigateHome} />
      ) : (
        <HomeView data={state.data} progress={state.progress} onOpenProblem={navigateProblem} />
      )}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#151515]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </div>
    </main>
  );
}

function HomeView({
  data,
  progress,
  onOpenProblem,
}: {
  data: Top100Data;
  progress: FormalizationProgress;
  onOpenProblem: (id: number) => void;
}) {
  const [query, setQuery] = useState('');

  const formalizedIds = useMemo(() => new Set(progress.formalized_ids), [progress.formalized_ids]);
  const formalizedCount = formalizedIds.size;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const text = [
        item.rank_label,
        item.title,
        item.area_label.en,
        item.area_label.zh,
        item.keywords.join(' '),
      ].join(' ').toLowerCase();
      return !needle || text.includes(needle);
    });
  }, [data.items, query]);

  const jumpToTheorem = (id: number) => {
    setQuery('');
    window.history.replaceState(null, '', `#theorem-${id}`);
    requestAnimationFrame(() => {
      document.getElementById(`theorem-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[190px_minmax(0,1fr)]">
      <SiteSidebar data={data} formalizedCount={formalizedCount} />

      <div className="min-w-0">
        <header id="overview" className="mb-10 scroll-mt-8 border-b border-[#ddd6c8] pb-7">
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
          The current public record contains {data.summary.total} theorems and {formalizedCount} completed
          formalization{formalizedCount === 1 ? '' : 's'}.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#666]">
          Data generated on {data.generated_on}. Progress updated {progress.generated_on ?? 'manually'}.
        </p>
      </header>

        <ProgressMap
          items={data.items}
          formalizedIds={formalizedIds}
          onJump={jumpToTheorem}
        />

      <section className="mb-8">
        <label className="block">
          <span className="sr-only">Search</span>
          <input
            className="h-11 w-full border border-[#d8d0c0] bg-white px-3 text-base outline-none focus:border-[#3567a8]"
            placeholder="Search theorem, area, keyword"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <ol id="theorems" className="scroll-mt-8 space-y-0">
        {filtered.map((item) => (
          <TheoremItem
            key={item.id}
            item={item}
            isFormalized={formalizedIds.has(item.id)}
            onOpenProblem={onOpenProblem}
          />
        ))}
      </ol>
      </div>
    </div>
  );
}

function SiteSidebar({ data, formalizedCount }: { data: Top100Data; formalizedCount: number }) {
  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-8 text-sm leading-7">
        <div className="mb-4 font-800">Contents</div>
        <a className="block text-[#3567a8] no-underline hover:underline" href="#overview">Overview</a>
        <a className="block text-[#3567a8] no-underline hover:underline" href="#progress">Progress map</a>
        <a className="block text-[#3567a8] no-underline hover:underline" href="#theorems">Theorem list</a>
        <div className="mt-6 border-t border-[#e5dfd3] pt-4 text-[#666]">
          <div>{formalizedCount}/{data.summary.total} passed</div>
        </div>
        <div className="mt-6 border-t border-[#e5dfd3] pt-4">
          <div className="mb-2 font-800 text-[#555]">Ranges</div>
          {[1, 21, 41, 61, 81].map((start) => {
            const end = start + 19;
            return (
              <a
                key={start}
                className="block text-[#3567a8] no-underline hover:underline"
                href={`#theorem-${start}`}
              >
                {start}-{end}
              </a>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

function ProgressMap({
  items,
  formalizedIds,
  onJump,
}: {
  items: Top100Item[];
  formalizedIds: Set<number>;
  onJump: (id: number) => void;
}) {
  return (
    <section id="progress" className="mb-9 scroll-mt-8 border-b border-[#ddd6c8] pb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-800 leading-tight">Progress map</h2>
          <p className="mt-1 text-sm leading-6 text-[#666]">
            Green means passed. Red means open. Hover for the theorem title; click a square to jump to the entry.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-[#666]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 border border-[#5f9469] bg-[#6fb37d]" />
            passed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 border border-[#bd8b86] bg-[#df6f68]" />
            open
          </span>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2" aria-label="Formalization progress map">
        {items.map((item) => {
          const isFormalized = formalizedIds.has(item.id);
          const status = isFormalized ? 'passed' : 'open';
          const title = `${item.rank_label} ${item.title}: ${status}`;

          return (
            <button
              key={item.id}
              aria-label={title}
              className={[
                'aspect-square min-h-0 border text-[10px] font-800 leading-none text-white outline-none transition hover:scale-110 focus:scale-110 focus:ring-2 focus:ring-[#3567a8]',
                isFormalized ? 'border-[#5f9469] bg-[#6fb37d]' : 'border-[#bd8b86] bg-[#df6f68]',
              ].join(' ')}
              title={title}
              type="button"
              onClick={() => onJump(item.id)}
            >
              {item.rank}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TheoremItem({
  item,
  isFormalized,
  onOpenProblem,
}: {
  item: Top100Item;
  isFormalized: boolean;
  onOpenProblem: (id: number) => void;
}) {
  const statusLabel = isFormalized ? 'Passed' : 'Open';
  const statusClass = isFormalized
    ? 'border-[#8db596] bg-[#f1f8f1] text-[#285b35]'
    : 'border-[#ddb0aa] bg-[#fbf1f0] text-[#7b342d]';

  return (
    <li id={`theorem-${item.id}`} className="scroll-mt-8 border-b border-[#e5dfd3] py-6">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-xl font-800 leading-snug">
          {item.rank}. {item.title}
        </h2>
        <a className="text-sm text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3" href={`#theorem-${item.id}`}>
          #
        </a>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className={[
          'border px-2 py-0.5 font-700',
          statusClass,
        ].join(' ')}>
          {statusLabel}
        </span>
        <span className="border border-[#ded7c9] bg-white px-2 py-0.5 font-700 text-[#555]">
          {item.area_label.en}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a className="text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3" href={item.source_url} rel="noreferrer" target="_blank">
          Freek source
        </a>
        {isFormalized ? (
          <button
            className="border-0 bg-transparent p-0 text-sm text-[#3567a8] underline decoration-[#bfd1eb] underline-offset-3"
            type="button"
            onClick={() => onOpenProblem(item.id)}
          >
            note
          </button>
        ) : null}
      </div>
    </li>
  );
}

function ProblemView({ problem, onBack }: { problem?: Top100Item; onBack: () => void }) {
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
      <div className="mb-7 border-b border-[#ddd6c8] pb-4">
        <BackButton onBack={onBack} />
      </div>

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
  return `# ${problem.rank_label} ${problem.title}

No public note has been published for this theorem yet.

[Freek source](${problem.source_url})`;
}

function parseRoute(): Route {
  const match = window.location.pathname.match(/^\/problems\/([^/]+)$/);
  if (!match) return { view: 'home' };
  return { view: 'problem', id: decodeURIComponent(match[1]) };
}
