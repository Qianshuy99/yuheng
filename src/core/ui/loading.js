// 换肤过渡遮罩：品牌方案第六章的「玉衡正在织补皮肤…」。
import { el, shellRoot } from './dom.js';

const STAR_COUNT = 7; // 北斗七星

/**
 * 显示 Loading 遮罩。
 * @returns {() => void} 手动关闭；不调用的话 duration 后自动淡出。
 */
export function showLoading(themeName, duration = 1200) {
	const overlay = el('div', { class: 'yh-loading' }, [
		el('div', { class: 'yh-loading-box' }, [
			el(
				'div',
				{ class: 'yh-stars' },
				Array.from({ length: STAR_COUNT }, (_, i) =>
					el('span', { class: 'yh-star', style: `--i:${i}` }),
				),
			),
			el('div', { class: 'yh-loading-text', text: '玉衡正在织补皮肤…' }),
			el('div', { class: 'yh-loading-sub', text: `Applying: ${themeName || 'none'}` }),
		]),
	]);
	shellRoot().append(overlay);

	let closed = false;
	const close = () => {
		if (closed) return;
		closed = true;
		overlay.classList.add('yh-fade-out');
		setTimeout(() => overlay.remove(), 420);
	};
	if (duration > 0) setTimeout(close, duration);
	return close;
}
