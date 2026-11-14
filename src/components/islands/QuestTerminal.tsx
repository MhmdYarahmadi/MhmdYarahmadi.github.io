import { useEffect, useRef, useState, type CSSProperties } from "react";

// The Gamified School's quest card as a small playable terminal. Docker and
// PostgreSQL are simulated (as in the real app, nothing is installed): the
// visitor types the four objectives, or taps one to fill it in, and each
// right command ticks its objective and adds XP. Until the visitor touches
// it, the card plays itself while on screen; the first touch hands it over
// for good. Styles: journey.css (02 Gamified School).

type Line = { k: "in" | "out" | "ok" | "err" | "dim"; t: string };

const OBJECTIVES = [
	"docker pull postgres",
	"docker run -d postgres",
	"CREATE TABLE heroes (...);",
	"SELECT * FROM heroes;",
];
// what "run next" and the auto-play type: a complete version of each objective
const FULL = [
	"docker pull postgres",
	"docker run -d postgres",
	"CREATE TABLE heroes (id serial, name text, class text, xp int);",
	"SELECT * FROM heroes;",
];
const XP_EACH = 250;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
// Forgiving matches: any tag, extra docker flags, any column list, any SELECT.
const MATCH: RegExp[] = [
	/^docker pull postgres(:[\w.-]+)?$/,
	/^docker (container )?run( .*)? (-d|--detach|-[a-z]*d[a-z]*)( .*)? postgres(:[\w.-]+)?$/,
	/^create table (if not exists )?heroes ?\(.+\) ?;?$/,
	/^select .+ from heroes\b.*;?$/,
];

const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

function output(step: number): Line[] {
	switch (step) {
		case 0:
			return [
				{ k: "out", t: "Using default tag: latest" },
				{ k: "out", t: "latest: Pulling from library/postgres" },
				{ k: "out", t: `${hex(12)}: Pull complete` },
				{ k: "out", t: `${hex(12)}: Pull complete` },
				{ k: "out", t: "Status: Downloaded newer image for postgres:latest" },
			];
		case 1:
			return [{ k: "out", t: hex(64) }, { k: "dim", t: "(simulated container up · psql attached)" }];
		case 2:
			return [{ k: "out", t: "CREATE TABLE" }, { k: "dim", t: "(quest data: 3 heroes inserted)" }];
		default:
			return [
				{ k: "out", t: " id | name  | class   |  xp" },
				{ k: "out", t: "----+-------+---------+-----" },
				{ k: "out", t: "  1 | Ada   | wizard  | 900" },
				{ k: "out", t: "  2 | Linus | ranger  | 750" },
				{ k: "out", t: "  3 | Grace | captain | 820" },
				{ k: "out", t: "(3 rows)" },
			];
	}
}

const HELLO: Line[] = [{ k: "dim", t: "Simulated Docker + PostgreSQL. Type help, or tap an objective." }];

export default function QuestTerminal() {
	const [step, setStep] = useState(0); // objectives done
	const [lines, setLines] = useState<Line[]>(HELLO);
	const [cmd, setCmd] = useState("");
	const [auto, setAuto] = useState(true); // false once the visitor has touched it
	const logRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const done = step >= OBJECTIVES.length;
	const prompt = step >= 2 ? "postgres=#" : "$";

	// keep the newest output in view, scrolling only the log (never the page)
	useEffect(() => {
		const el = logRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lines]);

	function run(raw: string, at = step): number {
		const n = norm(raw);
		const echo: Line = { k: "in", t: `${at >= 2 ? "postgres=#" : "$"} ${raw.trim()}` };
		if (!n) return at;
		if (n === "clear") {
			setLines([]);
			return at;
		}
		if (n === "help") {
			setLines((l) => [
				...l,
				echo,
				{ k: "out", t: "Objectives, in order:" },
				...OBJECTIVES.map((o, i) => ({ k: (i < at ? "dim" : "out") as Line["k"], t: `  ${i + 1}. ${o}` })),
				{ k: "dim", t: "Also: clear, reset. Tap an objective to fill it in." },
			]);
			return at;
		}
		if (n === "reset") {
			setLines(HELLO);
			setStep(0);
			return 0;
		}
		const hit = MATCH.findIndex((re) => re.test(n));
		if (hit === -1 || hit > at) {
			const why: Line =
				hit > at
					? hit >= 2 && at < 2
						? { k: "err", t: "psql: error: connection refused. Is the server running?" }
						: hit === 3
							? { k: "err", t: 'ERROR:  relation "heroes" does not exist' }
							: { k: "err", t: "Unable to find image 'postgres:latest' locally. Pull it first." }
					: /^(docker|create|select)\b/.test(n)
						? { k: "err", t: "That's not quite it." }
						: { k: "err", t: `${n.split(" ")[0]}: command not found` };
			setLines((l) => [
				...l,
				echo,
				why,
				{ k: "dim", t: at >= OBJECTIVES.length ? "Quest complete. Type reset to play again." : `Hint: try  ${OBJECTIVES[at]}` },
			]);
			return at;
		}
		if (hit < at) {
			setLines((l) => [...l, echo, { k: "dim", t: "Already done. Next: " + (OBJECTIVES[at] ?? "nothing, quest complete!") }]);
			return at;
		}
		const next = at + 1;
		setLines((l) => [
			...l,
			echo,
			...output(at),
			{ k: "ok", t: `+${XP_EACH} XP · objective ${next}/4` },
			...(next === OBJECTIVES.length ? [{ k: "ok" as const, t: "LEVEL UP! Quest 04 complete." }] : []),
		]);
		setStep(next);
		return next;
	}

	// The first touch stops the auto-play for good and starts the visitor's
	// own run from the beginning.
	function takeOver() {
		if (!auto) return;
		setAuto(false);
		setStep(0);
		setCmd("");
		setLines([...HELLO, { k: "dim", t: "Your turn." }]);
	}

	// ---- auto-play: types each command while the card is on screen ----
	useEffect(() => {
		if (!auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const card = cardRef.current!;
		let visible = false;
		let timer = 0;
		let at = 0;
		let typed = 0;
		const tick = () => {
			if (!visible) return;
			if (at >= FULL.length) {
				// rest on the finished card, then play again
				timer = window.setTimeout(() => {
					at = 0;
					setStep(0);
					setLines(HELLO);
					tick();
				}, 4000);
				return;
			}
			const full = FULL[at];
			if (typed < full.length) {
				typed++;
				setCmd(full.slice(0, typed));
				timer = window.setTimeout(tick, typed === 1 ? 700 : 45);
			} else {
				at = run(full, at);
				typed = 0;
				setCmd("");
				timer = window.setTimeout(tick, 900);
			}
		};
		const io = new IntersectionObserver(([e]) => {
			visible = e.isIntersecting;
			clearTimeout(timer);
			if (visible) tick();
		}, { threshold: 0.4 });
		io.observe(card);
		return () => {
			io.disconnect();
			clearTimeout(timer);
		};
		// run is recreated each render; the loop only needs the first one's setters
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auto]);

	function fill(i: number) {
		takeOver();
		setCmd(FULL[i]);
		inputRef.current?.focus({ preventScroll: true });
	}

	return (
		<div className={`quest${done ? " up" : ""}`} ref={cardRef} style={{ "--p": step / OBJECTIVES.length } as CSSProperties}>
			<div className="quest__head">
				<span>QUEST 04</span>
				<span>LVL {done ? 4 : 3}</span>
			</div>
			<p className="quest__title" id="quest-title">Ship your first database</p>
			<ol className="quest__list" aria-label="Objectives">
				{OBJECTIVES.map((o, i) => (
					<li key={o} className={i < step ? "done" : i === step ? "next" : undefined}>
						<button type="button" onClick={() => fill(i)} aria-label={`${o}${i < step ? ", done" : ""}. Fill in this command`}>
							{o}
						</button>
					</li>
				))}
			</ol>
			<div className="qterm">
				<div className="qterm__log" ref={logRef} role="log" aria-label="Terminal output" tabIndex={0}>
					{lines.map((l, i) => (
						<div key={i} className={`qterm__${l.k}`}>
							{l.t}
						</div>
					))}
				</div>
				<form
					className="qterm__line"
					onSubmit={(e) => {
						e.preventDefault();
						takeOver();
						if (!auto) run(cmd);
						else run(cmd, 0);
						setCmd("");
					}}
				>
					<label htmlFor="qterm-in">{prompt}</label>
					<input
						id="qterm-in"
						ref={inputRef}
						value={cmd}
						onChange={(e) => setCmd(e.target.value)}
						onFocus={takeOver}
						onKeyDown={takeOver}
						autoComplete="off"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="send"
						aria-describedby="qterm-help"
						placeholder={done ? "reset" : "type a command"}
					/>
				</form>
			</div>
			<p id="qterm-help" className="visually-hidden">
				Type a command and press Enter. Type help for the list.
			</p>
			<div className="quest__actions">
				<button
					type="button"
					className="quest__btn"
					onClick={() => {
						takeOver();
						const at = auto ? 0 : step;
						if (at >= FULL.length) run("reset");
						else run(FULL[at], at);
					}}
				>
					{done ? "Play again" : "Run next >"}
				</button>
			</div>
			<div>
				<div className="xp__row">
					<span>XP</span>
					<span>{step * XP_EACH} / 1000</span>
				</div>
				<div className="xp__bar" role="progressbar" aria-label="Quest XP" aria-valuemin={0} aria-valuemax={1000} aria-valuenow={step * XP_EACH}>
					<i></i>
				</div>
			</div>
			<div className="levelup" aria-hidden={!done}>
				LEVEL UP!
			</div>
		</div>
	);
}
