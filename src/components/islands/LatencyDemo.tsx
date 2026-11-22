import { useEffect, useState } from "react";

// The dashboard speed-up, felt: the same small dashboard twice, loading in
// 2000 ms (before) and 150 ms (after). It opens on that result; a tab or
// Reload runs both again at once, with a live timer each. Made-up data. Styles: journey.css (05 Web & Enterprise).

const TABS = {
	Sites: { kpi: "Visits this week", value: "4,812", bars: [40, 55, 48, 70, 62, 84] },
	ERP: { kpi: "Orders processed", value: "1,326", bars: [62, 58, 74, 66, 80, 77] },
	CRM: { kpi: "Open deals", value: "38", bars: [30, 42, 39, 51, 47, 60] },
} as const;
type Tab = keyof typeof TABS;

const BEFORE = 2000;
const AFTER = 150;

function Pane({ name, delay, run, tab, onDone }: { name: string; delay: number; run: number; tab: Tab; onDone: (ms: number) => void }) {
	// opens on the finished result, so it never reads as stuck at 0 ms
	const [ms, setMs] = useState<number>(delay);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!run) return;
		const t0 = performance.now();
		let raf = 0;
		setLoading(true);
		setMs(0);
		const tick = () => {
			setMs(performance.now() - t0);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		const timer = setTimeout(() => {
			cancelAnimationFrame(raf);
			const took = Math.round(performance.now() - t0);
			setMs(took);
			setLoading(false);
			onDone(took);
		}, delay);
		return () => {
			clearTimeout(timer);
			cancelAnimationFrame(raf);
		};
		// a new run (or tab) restarts the load; onDone is stable enough
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [run, tab, delay]);

	const d = TABS[tab];
	return (
		<section className={`lat__pane${loading ? " is-loading" : ""}`} aria-label={`${name}: loads in ${delay} ms`} aria-busy={loading}>
			<header>
				<span className="lat__name">{name}</span>
				<span className="lat__ms" data-ms={ms}>
					{`${Math.round(ms).toLocaleString("en-US")} ms`}
				</span>
			</header>
			{loading ? (
				<div className="lat__skel" aria-hidden="true">
					<i className="lat__spin"></i>
					<b></b>
					<b></b>
					<div>
						{d.bars.map((_, i) => (
							<span key={i}></span>
						))}
					</div>
				</div>
			) : (
				<div className="lat__body">
					<p>{d.kpi}</p>
					<strong>{d.value}</strong>
					<div className="lat__bars" aria-hidden="true">
						{d.bars.map((h, i) => (
							<span key={i} style={{ height: `${h}%` }}></span>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

export default function LatencyDemo() {
	const [tab, setTab] = useState<Tab>("Sites");
	const [run, setRun] = useState(0);
	const [took, setTook] = useState<{ before?: number; after?: number }>({ before: BEFORE, after: AFTER });

	const reload = (t: Tab = tab) => {
		setTook({});
		setTab(t);
		setRun((r) => r + 1);
	};

	const both = took.before !== undefined && took.after !== undefined;

	return (
		<div className="lat">
			<div className="dash__head">
				<span>Overview</span>
				<div className="dash__tabs" role="group" aria-label="Dashboard view, reloads both panes">
					{(Object.keys(TABS) as Tab[]).map((t) => (
						<button key={t} type="button" aria-pressed={t === tab} onClick={() => reload(t)}>
							{t}
						</button>
					))}
				</div>
			</div>
			<div className="lat__panes">
				<Pane name="Before" delay={BEFORE} run={run} tab={tab} onDone={(ms) => setTook((o) => ({ ...o, before: ms }))} />
				<Pane name="After" delay={AFTER} run={run} tab={tab} onDone={(ms) => setTook((o) => ({ ...o, after: ms }))} />
			</div>
			<div className="lat__foot">
				<p aria-live="polite">
					{both
						? `Before: ${took.before!.toLocaleString("en-US")} ms. After: ${took.after} ms. Over 13× faster.`
						: "Loading…"}
				</p>
				<button type="button" className="lat__reload" onClick={() => reload()}>
					Reload
				</button>
			</div>
		</div>
	);
}
