import { useEffect, useMemo, useState } from 'react';
import { getMarkdownPath, loadProblemMarkdown, loadProgressData } from './content';
import { renderMarkdown } from './markdown';
import type {
  LoadedState,
  Top100Data,
  Top100Difficulty,
  Top100FrontendGroup,
  Top100Group,
  Top100Item,
} from './types';

const groupMeta: Record<
  Top100FrontendGroup,
  { short: string; tone: string; icon: string; dot: string }
> = {
  smoke_test: {
    short: 'Smoke',
    tone: 'bg-[#dff5e6] text-[#135a2d] border-[#9dd7ad]',
    icon: 'i-lucide-check-circle-2',
    dot: 'bg-[#1f9d55]',
  },
  try_now: {
    short: '可试',
    tone: 'bg-[#e5f0ff] text-[#184c8f] border-[#a8c8f5]',
    icon: 'i-lucide-play-circle',
    dot: 'bg-[#2f80ed]',
  },
  stdlib_first_then_try: {
    short: 'Stdlib',
    tone: 'bg-[#fff3ce] text-[#785313] border-[#e8c76a]',
    icon: 'i-lucide-library',
    dot: 'bg-[#d49416]',
  },
  define_foundation: {
    short: '定义',
    tone: 'bg-[#efe6ff] text-[#5f3a95] border-[#ceb7ee]',
    icon: 'i-lucide-blocks',
    dot: 'bg-[#8d62ce]',
  },
  defer: {
    short: '长期',
    tone: 'bg-[#eeeeea] text-[#55554f] border-[#d8d8cf]',
    icon: 'i-lucide-clock-3',
    dot: 'bg-[#98988f]',
  },
  blocked: {
    short: '暂缓',
    tone: 'bg-[#ffe1df] text-[#8c2c25] border-[#f3aaa2]',
    icon: 'i-lucide-octagon-alert',
    dot: 'bg-[#d84a3a]',
  },
};

const groupFilters: Array<{ value: 'all' | Top100FrontendGroup; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'smoke_test', label: 'Smoke test' },
  { value: 'try_now', label: '可试' },
  { value: 'stdlib_first_then_try', label: '补库' },
  { value: 'define_foundation', label: '定义层' },
  { value: 'defer', label: '长期' },
  { value: 'blocked', label: '暂缓' },
];

const difficultyTone: Record<Top100Difficulty, string> = {
  foundation: 'bg-[#dff5e6] text-[#135a2d] border-[#9dd7ad]',
  easy: 'bg-[#e5f0ff] text-[#184c8f] border-[#a8c8f5]',
  medium: 'bg-[#fff3ce] text-[#785313] border-[#e8c76a]',
  hard: 'bg-[#eeeeea] text-[#55554f] border-[#d8d8cf]',
  blocked: 'bg-[#ffe1df] text-[#8c2c25] border-[#f3aaa2]',
};

const signalText = {
  strong: '强',
  thin: '薄',
  missing: '缺',
};

const signalTone = {
  strong: 'bg-[#dff5e6] text-[#135a2d]',
  thin: 'bg-[#fff3ce] text-[#785313]',
  missing: 'bg-[#ffe1df] text-[#8c2c25]',
};

type ProofStatus = 'not_started' | 'in_progress' | 'review' | 'proved';
type ProofStatusMap = Record<string, ProofStatus>;

const proofStatuses: ProofStatus[] = ['not_started', 'in_progress', 'review', 'proved'];
const proofStorageKey = 'aixmath-100-proof-status';

const proofStatusMeta: Record<ProofStatus, { label: string; icon: string; tone: string }> = {
  not_started: {
    label: '未开始',
    icon: 'i-lucide-circle',
    tone: 'bg-[#eeeeea] text-[#55554f] border-[#d8d8cf]',
  },
  in_progress: {
    label: '进行中',
    icon: 'i-lucide-loader-circle',
    tone: 'bg-[#fff3ce] text-[#785313] border-[#e8c76a]',
  },
  review: {
    label: '复核中',
    icon: 'i-lucide-eye',
    tone: 'bg-[#e5f0ff] text-[#184c8f] border-[#a8c8f5]',
  },
  proved: {
    label: '已完成',
    icon: 'i-lucide-check-circle-2',
    tone: 'bg-[#dff5e6] text-[#135a2d] border-[#9dd7ad]',
  },
};

type Route = { view: 'home' } | { view: 'problem'; id: string };

export function App() {
  const [state, setState] = useState<LoadedState>({ status: 'loading' });
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const proofStatusMap = useProofStatusMap();

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

  if (state.status === 'loading') return <Shell><LoadingView /></Shell>;
  if (state.status === 'error') return <Shell><ErrorView message={state.message} /></Shell>;

  const problem = route.view === 'problem'
    ? state.data.items.find((item) => item.id.toString() === route.id)
    : undefined;

  return (
    <Shell>
      {route.view === 'problem' ? (
        <ProblemView
          data={state.data}
          problem={problem}
          proofStatusMap={proofStatusMap.value}
          onBack={navigateHome}
        />
      ) : (
        <Dashboard
          data={state.data}
          proofStatusMap={proofStatusMap.value}
          setProofStatus={proofStatusMap.setStatus}
          onOpenProblem={navigateProblem}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f6ef] text-[#171716]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function Dashboard({
  data,
  proofStatusMap,
  setProofStatus,
  onOpenProblem,
}: {
  data: Top100Data;
  proofStatusMap: ProofStatusMap;
  setProofStatus: (id: number, status: ProofStatus) => void;
  onOpenProblem: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Top100FrontendGroup>('all');
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const proofStats = useMemo(() => getProofStats(data.items, proofStatusMap), [data.items, proofStatusMap]);
  const firstBatch = useMemo(() => {
    const byId = new Map(data.items.map((item) => [item.id, item]));
    return data.recommended.first_batch.map((id) => byId.get(id)).filter(Boolean) as Top100Item[];
  }, [data.items, data.recommended.first_batch]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.items.filter((problem) => {
      const matchesGroup = filter === 'all' || problem.frontend_group === filter;
      const matchesRecommended = !onlyRecommended || problem.recommended;
      const haystack = [
        problem.title,
        problem.rank_label,
        problem.module_path,
        problem.area_label.zh,
        problem.area_label.en,
        problem.difficulty_label.zh,
        problem.priority_label.zh,
        problem.frontend_group_label.zh,
        problem.status.label_zh,
        problem.notes,
        problem.caveat,
        problem.keywords.join(' '),
        problem.top_modules.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesGroup && matchesRecommended && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [data.items, filter, onlyRecommended, query]);

  return (
    <div className="space-y-5">
      <header className="grid gap-4 border border-[#24241f] bg-[#fbfaf4] p-4 md:grid-cols-[1fr_370px]">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[#5f5d54]">
              <span className="inline-flex items-center gap-1">
                <span className="i-lucide-book-open size-4" />
                AixMath
              </span>
              <span className="h-1 w-1 bg-[#5f5d54]" />
              <span>{data.source.name}</span>
            </div>
            <h1 className="max-w-4xl text-balance text-3xl font-800 leading-tight sm:text-5xl">
              形式化一百题进度面板
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#4f4d45]">
            <span className="inline-flex items-center gap-1">
              <span className="i-lucide-calendar-days size-4" />
              数据生成 {data.generated_on}
            </span>
            <a
              className="inline-flex items-center gap-1 border-b border-[#171716] text-[#171716] hover:text-[#2d6cdf]"
              href={data.source.url}
              rel="noreferrer"
              target="_blank"
            >
              <span className="i-lucide-external-link size-4" />
              Freek Top 100
            </a>
          </div>
        </div>
        <ProgressPanel data={data} proofStats={proofStats} />
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {data.groups.slice(0, 3).map((group) => (
          <GroupCard key={group.key} group={group} />
        ))}
      </section>

      <section className="border border-[#24241f] bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-900">优先展示</h2>
            <p className="text-sm leading-6 text-[#5f5d54]">{data.recommended.description_zh}</p>
          </div>
          <button
            className={[
              'inline-flex h-10 items-center gap-2 border px-3 text-sm font-800 transition',
              onlyRecommended ? 'border-[#171716] bg-[#171716] text-white' : 'border-[#24241f] bg-white hover:bg-[#eeeeea]',
            ].join(' ')}
            type="button"
            onClick={() => setOnlyRecommended((value) => !value)}
          >
            <span className="i-lucide-sparkles size-4" />
            只看推荐
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {firstBatch.slice(0, 8).map((problem) => (
            <button
              key={problem.id}
              className="border border-[#d8d8cf] bg-[#fbfaf4] p-3 text-left transition hover:border-[#2d6cdf] hover:bg-[#f7fbff] focus:outline-none focus:ring-3 focus:ring-[#2d6cdf]/18"
              type="button"
              onClick={() => onOpenProblem(problem.id)}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-900 text-[#55554f]">{problem.rank_label}</span>
                <span className={`px-2 py-0.5 text-xs font-900 ${signalTone[problem.stdlib_signal]}`}>
                  stdlib {signalText[problem.stdlib_signal]}
                </span>
              </div>
              <div className="line-clamp-2 min-h-10 text-sm font-900 leading-5">{problem.title}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <label className="relative block">
          <span className="i-lucide-search pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#747268]" />
          <input
            className="h-12 w-full border border-[#24241f] bg-white pl-10 pr-3 text-base outline-none transition focus:border-[#2d6cdf] focus:ring-3 focus:ring-[#2d6cdf]/18"
            placeholder="搜索题目、模块、领域或关键词"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex overflow-x-auto border border-[#24241f] bg-white p-1">
          {groupFilters.map((item) => (
            <button
              key={item.value}
              className={[
                'h-10 shrink-0 px-3 text-sm font-700 transition',
                filter === item.value
                  ? 'bg-[#171716] text-white'
                  : 'text-[#4f4d45] hover:bg-[#eeeeea] hover:text-[#171716]',
              ].join(' ')}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="border border-[#24241f] bg-white">
        <div className="grid grid-cols-[64px_1fr_96px] border-b border-[#24241f] bg-[#eeeeea] px-3 py-2 text-xs font-800 uppercase tracking-0 text-[#55554f] sm:grid-cols-[76px_1fr_130px_128px_118px]">
          <span>#</span>
          <span>题目</span>
          <span>路线</span>
          <span className="hidden sm:block">难度</span>
          <span className="hidden sm:block">进度</span>
        </div>
        <div className="divide-y divide-[#e3e0d5]">
          {filtered.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              proofStatus={proofStatusMap[problem.id] ?? 'not_started'}
              setProofStatus={setProofStatus}
              onOpen={onOpenProblem}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressPanel({ data, proofStats }: { data: Top100Data; proofStats: Record<ProofStatus, number> }) {
  const completed = proofStats.proved;
  const total = data.summary.total;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const segments: Top100FrontendGroup[] = ['smoke_test', 'try_now', 'stdlib_first_then_try', 'define_foundation', 'defer', 'blocked'];

  return (
    <aside className="border border-[#24241f] bg-white p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-700 text-[#5f5d54]">形式化完成</div>
          <div className="text-4xl font-900 leading-none">{completed}/{total}</div>
        </div>
        <div className="text-3xl font-900 text-[#1f9d55]">{percent}%</div>
      </div>
      <div className="mb-4 flex h-4 overflow-hidden border border-[#24241f] bg-[#eeeeea]">
        {segments.map((status) => {
          const count = data.summary.by_frontend_group[status] ?? 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={status}
              className={groupMeta[status].dot}
              style={{ width: `${width}%` }}
              title={`${data.labels.frontend_groups[status].label_zh}: ${count}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {segments.map((status) => (
          <div key={status} className="flex items-center justify-between border border-[#e3e0d5] px-2 py-1">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 ${groupMeta[status].dot}`} />
              {groupMeta[status].short}
            </span>
            <strong>{data.summary.by_frontend_group[status] ?? 0}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

function GroupCard({ group }: { group: Top100Group }) {
  const meta = groupMeta[group.key];
  return (
    <div className="border border-[#24241f] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-800 ${meta.tone}`}>
          <span className={`${meta.icon} size-4`} />
          {group.label.zh}
        </span>
        <span className="text-2xl font-900">{group.count}</span>
      </div>
      <p className="text-sm leading-6 text-[#5f5d54]">{group.description_zh}</p>
    </div>
  );
}

function ProblemRow({
  problem,
  proofStatus,
  setProofStatus,
  onOpen,
}: {
  problem: Top100Item;
  proofStatus: ProofStatus;
  setProofStatus: (id: number, status: ProofStatus) => void;
  onOpen: (id: number) => void;
}) {
  const routeMeta = groupMeta[problem.frontend_group];
  const proofMeta = proofStatusMeta[proofStatus];

  return (
    <button
      className="grid w-full grid-cols-[64px_1fr_96px] gap-3 px-3 py-3 text-left transition hover:bg-[#f7fbff] focus:bg-[#f7fbff] focus:outline-none focus:ring-3 focus:ring-inset focus:ring-[#2d6cdf]/18 sm:grid-cols-[76px_1fr_130px_128px_118px]"
      type="button"
      onClick={() => onOpen(problem.id)}
    >
      <div className="font-mono text-sm font-800 text-[#55554f]">{problem.rank_label}</div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-800">{problem.title}</h2>
          {problem.recommended ? (
            <span className="border border-[#2d6cdf] bg-[#f7fbff] px-2 py-0.5 text-xs font-900 text-[#184c8f]">
              推荐
            </span>
          ) : null}
          <span className="border border-[#d8d8cf] bg-[#fbfaf4] px-2 py-0.5 text-xs font-700 text-[#55554f]">
            {problem.area_label.zh}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#636158]">{problem.notes}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 text-xs font-900 ${signalTone[problem.stdlib_signal]}`}>
            stdlib {signalText[problem.stdlib_signal]}
          </span>
          {problem.top_modules.slice(0, 3).map((module) => (
            <span key={module} className="bg-[#e8f2ef] px-2 py-0.5 text-xs font-700 text-[#24564a]">
              {module}
            </span>
          ))}
        </div>
      </div>
      <div>
        <span className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-800 ${routeMeta.tone}`}>
          <span className={`${routeMeta.icon} size-4`} />
          {problem.frontend_group_label.zh}
        </span>
      </div>
      <div className="hidden sm:block">
        <span className={`inline-flex items-center border px-2 py-1 text-xs font-900 ${difficultyTone[problem.difficulty]}`}>
          {problem.difficulty_label.zh}
        </span>
      </div>
      <div className="hidden sm:block">
        <select
          className={`h-9 w-full border px-2 text-xs font-900 outline-none ${proofMeta.tone}`}
          value={proofStatus}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setProofStatus(problem.id, event.target.value as ProofStatus)}
        >
          {proofStatuses.map((status) => (
            <option key={status} value={status}>
              {proofStatusMeta[status].label}
            </option>
          ))}
        </select>
      </div>
    </button>
  );
}

function ProblemView({
  data,
  problem,
  proofStatusMap,
  onBack,
}: {
  data: Top100Data;
  problem?: Top100Item;
  proofStatusMap: ProofStatusMap;
  onBack: () => void;
}) {
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

  const routeMeta = groupMeta[problem.frontend_group];
  const proofStatus = proofStatusMap[problem.id] ?? 'not_started';
  const proofMeta = proofStatusMeta[proofStatus];

  return (
    <article className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackButton onBack={onBack} />
        <span className="text-sm text-[#636158]">数据生成 {data.generated_on}</span>
      </div>

      <header className="border border-[#24241f] bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-900 text-[#55554f]">{problem.rank_label}</span>
          <span className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-800 ${routeMeta.tone}`}>
            <span className={`${routeMeta.icon} size-4`} />
            {problem.frontend_group_label.zh}
          </span>
          <span className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-800 ${proofMeta.tone}`}>
            <span className={`${proofMeta.icon} size-4`} />
            {proofMeta.label}
          </span>
          <span className={`border px-2 py-1 text-xs font-800 ${difficultyTone[problem.difficulty]}`}>
            {problem.difficulty_label.zh}
          </span>
          <span className="border border-[#d8d8cf] px-2 py-1 text-xs font-800">{problem.area_label.zh}</span>
        </div>
        <h1 className="text-balance text-3xl font-900 leading-tight sm:text-5xl">{problem.title}</h1>
        <p className="mt-4 text-lg leading-8 text-[#55554f]">{problem.notes}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#4f4d45]">
          <a className="inline-flex items-center gap-1 border-b border-[#171716]" href={problem.source_url} rel="noreferrer" target="_blank">
            <span className="i-lucide-external-link size-4" />
            Freek 原题
          </a>
          <span className="inline-flex items-center gap-1">
            <span className="i-lucide-package size-4" />
            stdlib {signalText[problem.stdlib_signal]}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="i-lucide-search-code size-4" />
            {problem.search_hits} hits
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="i-lucide-file-code-2 size-4" />
            {problem.module_path}
          </span>
        </div>
      </header>

      <section className="prose-panel mt-4 border border-[#24241f] bg-white p-4 sm:p-7">
        {markdownState.status === 'loading' ? (
          <LoadingView />
        ) : markdownState.status === 'error' ? (
          <ErrorView message={markdownState.message} />
        ) : (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownState.html }} />
        )}
      </section>
    </article>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 border border-[#24241f] bg-white px-3 text-sm font-800 transition hover:bg-[#eeeeea] focus:outline-none focus:ring-3 focus:ring-[#2d6cdf]/18"
      type="button"
      onClick={onBack}
    >
      <span className="i-lucide-arrow-left size-4" />
      返回
    </button>
  );
}

function LoadingView() {
  return (
    <div className="flex min-h-48 items-center justify-center text-[#55554f]">
      <span className="i-lucide-loader-circle mr-2 size-5 animate-spin" />
      加载中
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="border border-[#d84a3a] bg-[#fff0ee] p-4 text-[#8c2c25]">
      <div className="mb-1 flex items-center gap-2 font-900">
        <span className="i-lucide-triangle-alert size-5" />
        出错了
      </div>
      <p>{message}</p>
    </div>
  );
}

function getProofStats(items: Top100Item[], map: ProofStatusMap): Record<ProofStatus, number> {
  return items.reduce<Record<ProofStatus, number>>(
    (counts, item) => {
      counts[map[item.id] ?? 'not_started'] += 1;
      return counts;
    },
    { not_started: 0, in_progress: 0, review: 0, proved: 0 },
  );
}

function useProofStatusMap() {
  const [value, setValue] = useState<ProofStatusMap>(() => {
    try {
      const raw = window.localStorage.getItem(proofStorageKey);
      return raw ? (JSON.parse(raw) as ProofStatusMap) : {};
    } catch {
      return {};
    }
  });

  const setStatus = (id: number, status: ProofStatus) => {
    setValue((current) => {
      const next = { ...current };
      if (status === 'not_started') {
        delete next[id];
      } else {
        next[id] = status;
      }
      window.localStorage.setItem(proofStorageKey, JSON.stringify(next));
      return next;
    });
  };

  return { value, setStatus };
}

function getFallbackMarkdown(problem: Top100Item): string {
  const modules = problem.top_modules.length ? problem.top_modules.map((module) => `- \`${module}\``).join('\n') : '- 暂无';
  const keywords = problem.keywords.length ? problem.keywords.map((keyword) => `\`${keyword}\``).join(', ') : '暂无';
  const caveat = problem.caveat ? `\n## Caveat\n\n${problem.caveat}\n` : '';

  return `# ${problem.title}

${problem.notes}

## 形式化路线

- 前端分组: ${problem.frontend_group_label.zh}
- 当前状态: ${problem.status.label_zh}
- 难度: ${problem.difficulty_label.zh}
- 优先级: ${problem.priority_label.zh}
- 标准库信号: ${signalText[problem.stdlib_signal]}
- 目标模块: \`${problem.module_path}\`

## 标准库线索

${modules}

## 关键词

${keywords}
${caveat}
## Markdown 覆盖

如果要把这页改成正式证明说明，新建 \`public/content/${getMarkdownPath(problem)}\` 即可覆盖这份自动摘要。`;
}

function parseRoute(): Route {
  const match = window.location.pathname.match(/^\/problems\/([^/]+)$/);
  if (!match) return { view: 'home' };
  return { view: 'problem', id: decodeURIComponent(match[1]) };
}
