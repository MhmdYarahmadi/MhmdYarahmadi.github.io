/**
 * The Drilling Simulation world's demo console (SceneDrill.astro). Until the
 * visitor touches a control, journey.ts drives the rig from scroll. The first
 * touch sets data-manual on the scene, and from then on this loop drills:
 * rate of penetration = weight on bit × rotary speed, divided by the
 * stratum's hardness. With the mud pump off the bit heats up; left too long,
 * the pipe sticks. A made-up model for the demo, not the real simulator's.
 */

const scene = document.getElementById("drilling")!;
const q = <T extends Element = HTMLElement>(sel: string) => scene.querySelector<T>(sel)!;

const wob = q<HTMLInputElement>("[data-wob]");
const rpm = q<HTMLInputElement>("[data-rpm]");
const pump = q<HTMLButtonElement>("[data-pump]");
const reset = q<HTMLButtonElement>("[data-reset]");
const out = {
	wob: q("[data-wob-out]"),
	rpm: q("[data-rpm-out]"),
	pump: q("[data-pump-out]"),
	rop: q("[data-rop]"),
	temp: q("[data-temp]"),
	stratum: q("[data-stratum]"),
	msg: q("[data-msg]"),
	depth: q("[data-bitdepth]"),
};
const rig = q<SVGSVGElement>("[data-rig]");
const sig = q("[data-sig]");
const pipe = q<SVGLineElement>("[data-pipe]");
const bit = q<SVGPathElement>("[data-bit]");
const dim = q<SVGLineElement>("[data-dim]");
const dimEnd = q<SVGLineElement>("[data-dimend]");

const TD = 2400; // the diagram's bottom, in metres
// [bottom in m, name, hardness]: the diagram's three bands
const STRATA: [number, string, number][] = [
	[613, "1 · soft", 1],
	[1328, "2 · firm", 1.8],
	[TD, "3 · hard", 3],
];
// 1 real second = 2 simulated hours, so a stratum takes seconds, not days
const SIM_HOURS_PER_S = 2;
const COOL = 45;

let depth = 0;
let temp = COOL;
let hot = 0; // seconds spent above the stuck-pipe limit
let stuck = false;
let manual = false;
let visible = false;
let raf = 0;
let last = 0;

const stratumAt = (d: number) => STRATA.find(([bottom]) => d < bottom) ?? STRATA[STRATA.length - 1];

function draw() {
	const y = String(210 + (depth / TD) * 470);
	pipe.setAttribute("y2", y);
	bit.setAttribute("transform", `translate(0 ${y})`);
	dim.setAttribute("y2", y);
	dimEnd.setAttribute("y1", y);
	dimEnd.setAttribute("y2", y);
	out.depth.textContent = String(Math.round(depth));
}

function step(dt: number) {
	const w = Number(wob.value);
	const r = Number(rpm.value);
	const on = pump.getAttribute("aria-pressed") === "true";
	const turning = w > 0 && r > 0 && !stuck && depth < TD;
	const [, name, hard] = stratumAt(depth);
	const shaky = w > 24 && r > 140;

	// rate of penetration, m/h; heavy weight at high speed bounces the bit
	const rop = turning ? ((w * r * 0.02) / hard) * (shaky ? 0.6 : 1) : 0;
	depth = Math.min(TD, depth + rop * SIM_HOURS_PER_S * dt);

	// the mud carries the heat (and the cuttings) away; without it the bit cooks
	const target = turning ? COOL + w * r * (on ? 0.004 : 0.03) + (on ? 0 : 40) : COOL;
	temp += (target - temp) * Math.min(1, dt * 0.6);
	hot = temp > 150 ? hot + dt : 0;
	if (hot > 1.5) stuck = true;

	out.rop.textContent = `${rop.toFixed(rop < 10 ? 1 : 0)} m/h`;
	out.temp.textContent = `${Math.round(temp)} °C`;
	out.stratum.textContent = name;

	let msg = "Drilling.";
	let level = "";
	if (stuck) {
		msg = "STUCK PIPE: no circulation, cuttings packed around the bit. Reset to try again.";
		level = "alarm";
	} else if (depth >= TD) msg = "Target depth reached. Reset to drill again.";
	else if (!on && temp > 100) {
		msg = "BIT OVERHEATING: the mud pump is off. Turn it on, fast.";
		level = "warn";
	} else if (shaky) {
		msg = "VIBRATION: too much weight at this speed. Ease off.";
		level = "warn";
	} else if (!turning) msg = w === 0 ? "No weight on the bit." : "The string isn't turning.";
	else if (!on) msg = "Mud pump off: the bit is heating up.";
	if (out.msg.textContent !== msg) out.msg.textContent = msg;
	scene.dataset.alarm = level;
	rig.classList.toggle("flowing", on && turning);
	draw();
}

function loop(now: number) {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	step(dt);
	raf = visible ? requestAnimationFrame(loop) : 0;
}

function run() {
	if (!manual || !visible || raf) return;
	last = performance.now();
	raf = requestAnimationFrame(loop);
}

// the signal path lights up node by node, as each input travels to the sim
function send() {
	sig.classList.remove("tx");
	void sig.offsetWidth;
	sig.classList.add("tx");
}

function takeOver() {
	if (manual) return;
	manual = true;
	scene.dataset.manual = "1";
	depth = Number(out.depth.textContent) || 0;
	// reduced motion (or a full scroll) leaves the bit at the bottom
	if (depth >= TD - 10) depth = 0;
	for (const el of scene.querySelectorAll<HTMLElement>("[data-panel]")) {
		el.classList.add("on");
		el.querySelector("[data-state]")!.textContent = "ONLINE";
	}
	run();
}

function input() {
	takeOver();
	out.wob.textContent = `${wob.value} t`;
	out.rpm.textContent = `${rpm.value} rpm`;
	send();
}

wob.addEventListener("input", input);
rpm.addEventListener("input", input);
pump.addEventListener("click", () => {
	const on = pump.getAttribute("aria-pressed") !== "true";
	pump.setAttribute("aria-pressed", String(on));
	out.pump.textContent = on ? "ON" : "OFF";
	input();
});
reset.addEventListener("click", () => {
	takeOver();
	depth = 0;
	temp = COOL;
	hot = 0;
	stuck = false;
	wob.value = "10";
	rpm.value = "60";
	pump.setAttribute("aria-pressed", "true");
	out.pump.textContent = "ON";
	input();
	step(0);
});

new IntersectionObserver(([e]) => {
	visible = e.isIntersecting;
	run();
}).observe(scene);

export {};
