// 悬浮球：可拖拽，点击开面板。
//
// 方案原文的 bug：mousedown 之后 mouseup 必然触发一次 click，所以「拖完就误开面板」。
// 修法是记录按下点，只有位移小于阈值才算点击；同时用 pointer 事件 + setPointerCapture，
// 拖到 iframe 或页面外也不会丢 move 事件。
import { BRAND } from '../../brand.js';
import { el, shellRoot } from './dom.js';

/** 小于这个位移（像素）算点击，大于算拖拽。手指抖动一般在 3px 内。 */
const CLICK_THRESHOLD = 5;
const EDGE_MARGIN = 4;

/**
 * @param {object} options
 * @param {() => void} options.onClick 点击（非拖拽）时调用
 * @param {{x:number,y:number}|null} options.position 上次保存的位置
 * @param {(pos:{x:number,y:number}) => void} options.onMove 拖拽结束后保存位置
 */
export function createBall({ onClick, position, onMove }) {
	const ball = el('button', {
		class: 'yh-ball',
		type: 'button',
		title: `${BRAND.fullName} — 点击打开面板，拖拽可移动`,
		'aria-label': BRAND.fullName,
	}, [el('img', { src: BRAND.icons['32'], alt: '' })]);

	if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
		applyPosition(ball, position.x, position.y);
	}

	let startX = 0;
	let startY = 0;
	let originX = 0;
	let originY = 0;
	let moved = false;
	let dragging = false;

	ball.addEventListener('pointerdown', (ev) => {
		if (ev.button !== 0) return;
		const rect = ball.getBoundingClientRect();
		startX = ev.clientX;
		startY = ev.clientY;
		originX = rect.left;
		originY = rect.top;
		moved = false;
		dragging = true;
		ball.setPointerCapture(ev.pointerId);
		ball.classList.add('yh-dragging');
	});

	ball.addEventListener('pointermove', (ev) => {
		if (!dragging) return;
		const dx = ev.clientX - startX;
		const dy = ev.clientY - startY;
		if (!moved && Math.hypot(dx, dy) < CLICK_THRESHOLD) return;
		moved = true;
		applyPosition(ball, clampX(originX + dx, ball), clampY(originY + dy, ball));
	});

	const finish = (ev) => {
		if (!dragging) return;
		dragging = false;
		ball.classList.remove('yh-dragging');
		if (ball.hasPointerCapture?.(ev.pointerId)) ball.releasePointerCapture(ev.pointerId);
		if (moved) {
			const rect = ball.getBoundingClientRect();
			onMove?.({ x: Math.round(rect.left), y: Math.round(rect.top) });
		}
	};
	ball.addEventListener('pointerup', finish);
	ball.addEventListener('pointercancel', finish);

	// click 在 pointerup 之后触发，此时 moved 已经确定；拖过就吞掉这次 click
	ball.addEventListener('click', (ev) => {
		if (moved) {
			ev.preventDefault();
			ev.stopPropagation();
			return;
		}
		onClick?.();
	});

	shellRoot().append(ball);
	return ball;
}

function applyPosition(ball, x, y) {
	// 一旦手动摆过位置，就脱离 CSS 的「贴右边半圆」形态，改成整圆自由定位
	ball.classList.add('yh-free');
	ball.style.left = `${x}px`;
	ball.style.top = `${y}px`;
	ball.style.right = 'auto';
}

function clampX(x, ball) {
	const max = window.innerWidth - ball.offsetWidth - EDGE_MARGIN;
	return Math.min(Math.max(EDGE_MARGIN, x), Math.max(EDGE_MARGIN, max));
}

function clampY(y, ball) {
	const max = window.innerHeight - ball.offsetHeight - EDGE_MARGIN;
	return Math.min(Math.max(EDGE_MARGIN, y), Math.max(EDGE_MARGIN, max));
}
