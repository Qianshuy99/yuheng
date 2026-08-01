import THEME_CSS from './theme.css';
import { mountAicueAdapter } from '../../sites/aicue.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
	menu: ['M4 12h16', 'M4 6h16', 'M4 18h16'],
	search: ['m21 21-4.35-4.35', 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z'],
	pen: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
	arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
	settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.35 2.35-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51v.1H11.3v-.1a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.35-2.35.06-.06A1.65 1.65 0 0 0 6.46 15a1.65 1.65 0 0 0-1.51-1h-.1v-3.3h.1a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.35-2.35.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51v-.1h3.3v.1a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.35 2.35-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1h.1V14h-.1a1.65 1.65 0 0 0-1.51 1Z'],
};

export const auroraTheme = {
	id: 'aurora.nebula',
	name: 'Aurora Nebula',
	version: '1.0.0',
	author: 'YuHeng',
	description: 'A kinetic deep-space reading surface with a live constellation field and a precise editorial forum layout.',
	match: ['*://aicue.top/*', '*://*.aicue.top/*'],
	runAt: 'start',
	css: THEME_CSS,
	vars: {
		'--aurora-cyan': '#64e7d1',
		'--aurora-coral': '#ff765f',
	},
	settings: [
		{ key: 'motion', type: 'bool', label: 'Live constellation motion', default: true },
		{
			key: 'contrast', type: 'select', label: 'Surface contrast', default: 'deep',
			options: [
				{ value: 'deep', label: 'Deep space' },
				{ value: 'paper', label: 'Night paper' },
			],
		},
	],
	source: 'builtin',
	mount,
	onSetting(key, value) {
		return live?.onSetting(key, value) ?? false;
	},
};

let live = null;

function mount(ctx) {
	const root = document.documentElement;
	const settings = { motion: true, contrast: 'deep', ...(ctx.settings || {}) };
	const nodes = [];
	const listeners = [];
	const unmountAicueAdapter = mountAicueAdapter();
	let frame = 0;
	let resizeObserver = null;
	let pageObserver = null;

	function own(node) {
		nodes.push(node);
		return node;
	}

	function on(target, event, handler, options) {
		target.addEventListener(event, handler, options);
		listeners.push([target, event, handler, options]);
	}

	function applySettings() {
		root.classList.toggle('aurora-still', settings.motion === false);
		root.classList.toggle('aurora-paper', settings.contrast === 'paper');
	}

	function click(selector) {
		document.querySelector(selector)?.click();
	}

	function makeIcon(kind) {
		const svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		for (const d of ICONS[kind] || []) {
			const path = document.createElementNS(SVG_NS, 'path');
			path.setAttribute('d', d);
			svg.append(path);
		}
		return svg;
	}

	function iconButton(kind, label, action) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'aurora-tool';
		button.setAttribute('aria-label', label);
		button.title = label;
		button.append(makeIcon(kind));
		on(button, 'click', action);
		return button;
	}

	function updateReadout() {
		const app = document.querySelector('#app');
		const page = app?.getAttribute('data-yh-aicue-page') || 'index';
		stage.dataset.page = page;
		const count = document.querySelectorAll('.DiscussionListItem, .Post').length;
		stage.querySelector('[data-aurora-count]').textContent = String(count || 0).padStart(2, '0');
		stage.querySelector('[data-aurora-page]').textContent = page.toUpperCase();
	}

	const stage = own(document.createElement('section'));
	stage.className = 'aurora-stage';
	stage.setAttribute('aria-label', 'Aurora navigation layer');
	const canvas = document.createElement('canvas');
	canvas.className = 'aurora-canvas';
	canvas.setAttribute('aria-hidden', 'true');

	const masthead = document.createElement('div');
	masthead.className = 'aurora-masthead';
	masthead.innerHTML = '<div class="aurora-mark"><span></span><span></span><span></span></div><p>YU HENG / CONSTELLATION</p><p class="aurora-clock">LIVE FIELD</p>';

	const rail = document.createElement('nav');
	rail.className = 'aurora-rail';
	rail.setAttribute('aria-label', 'Forum actions');
	rail.append(
		iconButton('menu', 'Open theme controls', () => ctx.openPanel()),
		iconButton('search', 'Search discussions', () => {
			const input = document.querySelector('.Search-input input, input[type=search]');
			input?.focus();
			input?.select?.();
		}),
		iconButton('pen', 'Start a discussion', () => click('.item-newDiscussion button, .item-newDiscussion a')),
	);

	const signal = document.createElement('div');
	signal.className = 'aurora-signal';
	signal.innerHTML = '<span class="aurora-signal-line"></span><p>ARCHIVE DENSITY</p><strong data-aurora-count>00</strong><p data-aurora-page>INDEX</p>';

	const jump = iconButton('arrow', 'Move to discussions', () => {
		document.querySelector('.DiscussionList, .PostStream, [data-yh-aicue-region="page-main"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
	jump.classList.add('aurora-jump');
	stage.append(canvas, masthead, rail, signal, jump);
	(document.body || root).append(stage);

	const field = createField(canvas, stage, () => settings.motion !== false);
	const update = () => updateReadout();
	pageObserver = new MutationObserver(() => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(update);
	});
	pageObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-yh-aicue-page'] });
	resizeObserver = new ResizeObserver(() => field.resize());
	resizeObserver.observe(document.documentElement);
	on(window, 'pointermove', (event) => {
		const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
		const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
		stage.style.setProperty('--aurora-x', x.toFixed(3));
		stage.style.setProperty('--aurora-y', y.toFixed(3));
		field.setPointer(event.clientX, event.clientY);
	}, { passive: true });
	on(document, 'visibilitychange', () => field.setPaused(document.hidden));
	updateReadout();
	applySettings();
	field.start();

	live = {
		onSetting(key, value) {
			settings[key] = value;
			applySettings();
			field.setActive(settings.motion !== false);
			return true;
		},
	};

	return () => {
		live = null;
		cancelAnimationFrame(frame);
		field.stop();
		resizeObserver?.disconnect();
		pageObserver?.disconnect();
		for (const [target, event, handler, options] of listeners) target.removeEventListener(event, handler, options);
		unmountAicueAdapter();
		for (const node of nodes) node.remove();
		root.classList.remove('aurora-still', 'aurora-paper');
	};
}

function createField(canvas, stage, getMotion) {
	const context = canvas.getContext('2d');
	const points = Array.from({ length: 74 }, (_, index) => ({
		x: ((index * 47) % 101) / 100,
		y: ((index * 71 + 29) % 97) / 96,
		depth: 0.25 + ((index * 19) % 75) / 100,
		phase: index * 0.73,
	}));
	let width = 1;
	let height = 1;
	let ratio = 1;
	let animation = 0;
	let running = false;
	let paused = false;
	let pointer = { x: 0, y: 0 };

	function resize() {
		const rect = stage.getBoundingClientRect();
		width = Math.max(1, rect.width);
		height = Math.max(1, rect.height);
		ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.floor(width * ratio);
		canvas.height = Math.floor(height * ratio);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	function draw(time) {
		if (!running) return;
		context.clearRect(0, 0, width, height);
		const motion = getMotion() && !paused;
		const visible = points.map((point) => {
			const drift = motion ? Math.sin(time * 0.00024 + point.phase) * 16 * point.depth : 0;
			return {
				x: point.x * width + drift + (pointer.x - width / 2) * point.depth * 0.022,
				y: point.y * height + Math.cos(time * 0.00018 + point.phase) * 11 * point.depth + (pointer.y - height / 2) * point.depth * 0.018,
				depth: point.depth,
			};
		});
		for (let i = 0; i < visible.length; i += 1) {
			for (let j = i + 1; j < visible.length; j += 1) {
				const a = visible[i];
				const b = visible[j];
				const dx = a.x - b.x;
				const dy = a.y - b.y;
				const dist = Math.hypot(dx, dy);
				if (dist < 100) {
					context.beginPath();
					context.strokeStyle = `rgba(100, 231, 209, ${(1 - dist / 100) * 0.12})`;
					context.lineWidth = 0.65;
					context.moveTo(a.x, a.y);
					context.lineTo(b.x, b.y);
					context.stroke();
				}
			}
		}
		for (const point of visible) {
			context.beginPath();
			context.fillStyle = point.depth > 0.68 ? '#ff765f' : '#d9fff8';
			context.globalAlpha = 0.25 + point.depth * 0.7;
			context.arc(point.x, point.y, 0.7 + point.depth * 1.7, 0, Math.PI * 2);
			context.fill();
		}
		context.globalAlpha = 1;
		animation = requestAnimationFrame(draw);
	}

	return {
		resize,
		setPointer(x, y) { pointer = { x, y }; },
		setPaused(value) { paused = value; },
		setActive() {},
		start() { if (!running) { running = true; resize(); animation = requestAnimationFrame(draw); } },
		stop() { running = false; cancelAnimationFrame(animation); },
	};
}
