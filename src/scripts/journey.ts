/**
 * Homepage scroll journey. For each world it works out a 0–1 progress from
 * scroll and writes it as --p (CSS does the bars, gauge and XP), toggles .on
 * on the active world and its background layer, sets the rail and particle colours, marks
 * the chapter rail, and drives the few
 * text bits CSS can't: quest checklist, drill bit, panel
 * LEDs, terminal lines and the web pipeline cards.
 *
 * The markup is server-rendered in its final state, so without JS (or with
 * reduced motion, where progress is pinned at 1) every world reads complete.
 */

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
// Below this width the worlds stack and are not sticky (see journey.css).
const stacked = matchMedia("(max-width: 900px)");

const chapters = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
const worlds = chapters.filter((el) => el.classList.contains("j-scene"));
const layers = new Map(
	[...document.querySelectorAll<HTMLElement>("[data-layer]")].map((el) => [el.dataset.layer!, el]),
);
const rail = document.querySelector<HTMLElement>(".j-rail");
const railList = rail?.querySelector("ul");
const railLinks = [...document.querySelectorAll<HTMLAnchorElement>("[data-rail]")];

// The dive has its own depth gauge beside the rail: dim the rail while the
// dive fills the screen, so the two don't read as one control.
const dive = document.getElementById("dive");
if (rail && dive) {
	new IntersectionObserver(([e]) => rail.classList.toggle("dim", e.isIntersecting), {
		rootMargin: "-40% 0px -40% 0px",
	}).observe(dive);
}

// Rail and particle colours per world: [text, accent, background]. The
// background is for the phone chapter strip.
const THEME: Record<string, [string, string, string]> = {
	intro: ["#e8edf2", "#00e5ff", "#05070a"],
	rov: ["#e6f7ff", "#7fd8f0", "#06263a"],
	school: ["#ede7ff", "#ffd23f", "#120d24"],
	drill: ["#dcebff", "#ff8a3d", "#0b2a4a"],
	iot: ["#a7f3c0", "#a7f3c0", "#020604"],
	web: ["#0f172a", "#0e7490", "#eef2f6"],
	plain: ["#e8edf2", "#00e5ff", "#05070a"],
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function progress(el: HTMLElement): number {
	if (reduced.matches) return 1;
	const r = el.getBoundingClientRect();
	const vh = innerHeight;
	// Sticky world: 0 when it pins, 1 when it unpins.
	if (!stacked.matches) return clamp(-r.top / Math.max(1, r.height - vh));
	// Stacked world (phones): the visual sits below the text, so it is its
	// own scroll that counts: 0 until its top is 70% down the screen (so it
	// is well in view), 1 once its top reaches 25% from the top.
	const v = (visuals.get(el) ?? el).getBoundingClientRect();
	return clamp((vh * 0.7 - v.top) / (vh * 0.45));
}

// each world's animated visual: the stage's first block after the text
const visuals = new Map(
	worlds.map((w) => [w, w.querySelector<HTMLElement>(".j-stick > :not(.j-copy)") ?? w]),
);

// ---- per-world details ----
const q = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
	scope.querySelector<T>(sel);

const quest = q("[data-quest]");
const questItems = quest ? [...quest.querySelectorAll("li")] : [];
const xpEl = q("[data-xp]");
const lvlEl = q("[data-lvl]");

const pipe = q<SVGLineElement>("[data-pipe]");
const bit = q<SVGPathElement>("[data-bit]");
const dim = q<SVGLineElement>("[data-dim]");
const dimEnd = q<SVGLineElement>("[data-dimend]");
const bitDepth = q("[data-bitdepth]");
const panels = [...document.querySelectorAll<HTMLElement>("[data-panel]")];

const deals = [...document.querySelectorAll<HTMLElement>("[data-deal]")];
const STAGES = ["Lead", "Scoping", "Build", "Live"];

const termLines = [...(q("[data-term]")?.children ?? [])].slice(0, -1) as HTMLElement[];

const DETAILS: Record<string, (p: number) => void> = {
	school(p) {
		const done = Math.min(questItems.length, Math.floor(p * 4.4));
		questItems.forEach((li, i) => li.classList.toggle("done", i < done));
		const up = p > 0.92;
		quest?.classList.toggle("up", up);
		if (xpEl) xpEl.textContent = String(Math.round(p * 1000));
		if (lvlEl) lvlEl.textContent = up ? "4" : "3";
	},
	drill(p) {
		const y = 210 + p * 470;
		pipe?.setAttribute("y2", String(y));
		bit?.setAttribute("transform", `translate(0 ${y})`);
		dim?.setAttribute("y2", String(y));
		dimEnd?.setAttribute("y1", String(y));
		dimEnd?.setAttribute("y2", String(y));
		if (bitDepth) bitDepth.textContent = String(Math.round(p * 2400));
		panels.forEach((el, i) => {
			const on = p > [0.12, 0.45, 0.78][i];
			el.classList.toggle("on", on);
			const state = q("[data-state]", el);
			if (state) state.textContent = on ? "ONLINE" : "STANDBY";
		});
	},
	web(p) {
		// staggered: each row starts a little after the one above it
		deals.forEach((el, i) => {
			const s = Math.max(0, Math.min(3, Math.floor(p * 4.8 - i * 0.6)));
			el.style.setProperty("--s", String(s));
			el.classList.toggle("live", s === 3);
			const label = q("[data-stage]", el);
			if (label) label.textContent = STAGES[s];
		});
	},
	iot(p) {
		// the first command and its output are always there, so the
		// terminal never looks empty
		const shown = Math.max(2, Math.ceil(p * termLines.length));
		termLines.forEach((el, i) => (el.hidden = i >= shown));
	},
};

// ---- update loop ----
let active: HTMLElement | null = null;
let queued = false;

function update() {
	queued = false;
	const mid = innerHeight * 0.5;

	for (const w of worlds) {
		const r = w.getBoundingClientRect();
		if (r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
		const p = progress(w);
		w.style.setProperty("--p", p.toFixed(3));
		DETAILS[w.dataset.world!]?.(p);
	}

	let next = chapters[0];
	for (const c of chapters) if (c.getBoundingClientRect().top <= mid) next = c;
	if (next !== active) {
		active?.classList.remove("on");
		next.classList.add("on");
		active = next;
		const world = next.dataset.world!;
		for (const [name, layer] of layers) layer.classList.toggle("on", name === world);
		const [fg, acc, bg] = THEME[world] ?? THEME.plain;
		root.style.setProperty("--j-fg", fg);
		root.style.setProperty("--j-acc", acc);
		root.style.setProperty("--j-bg", bg);
		// the backdrop's particles fade on the light world (journey.css)
		root.dataset.jworld = world;
		const id = next.id;
		// Skills has no rail entry; it belongs with About. A world's notes
		// (#<world>-notes) belong with the world.
		const railId = id === "skills" ? "about" : id.replace(/-notes$/, "");
		for (const a of railLinks) {
			if (a.dataset.rail !== railId) {
				a.removeAttribute("aria-current");
				continue;
			}
			a.setAttribute("aria-current", "true");
			// phones: keep the current chapter in view in the scrolling strip
			if (stacked.matches && railList) {
				const left = a.offsetLeft - (railList.clientWidth - a.offsetWidth) / 2;
				railList.scrollTo({ left, behavior: reduced.matches ? "auto" : "smooth" });
			}
		}
	}
}

const queue = () => {
	if (!queued) {
		queued = true;
		requestAnimationFrame(update);
	}
};

update();
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", queue);
stacked.addEventListener("change", queue);
reduced.addEventListener("change", queue);
document.fonts?.ready.then(queue);

// A module, so its top-level names don't clash with other page scripts.
export {};
