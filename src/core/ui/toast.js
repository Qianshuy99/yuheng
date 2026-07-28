// Toast：右下角堆叠，3 秒自动消失。
import { BRAND } from '../../brand.js';
import { el, shellRoot } from './dom.js';

const ICONS = { info: 'ℹ️', ok: '✅', warn: '⚠️', error: '❌' };

let wrap = null;

function container() {
	if (!wrap || !wrap.isConnected) {
		wrap = el('div', { class: 'yh-toast-wrap' });
		shellRoot().append(wrap);
	}
	return wrap;
}

export function toast(message, type = 'info', duration = 3000) {
	const node = el('div', { class: `yh-toast yh-toast--${type}` }, [
		el('span', { class: 'yh-toast-icon', text: ICONS[type] || ICONS.info }),
		el('span', { class: 'yh-toast-msg', text: String(message) }),
		el('span', { class: 'yh-toast-brand', text: `by ${BRAND.engine}` }),
	]);
	container().append(node);
	requestAnimationFrame(() => node.classList.add('yh-toast-show'));

	const close = () => {
		node.classList.add('yh-toast-hide');
		setTimeout(() => node.remove(), 320);
	};
	const timer = setTimeout(close, duration);
	node.addEventListener('click', () => {
		clearTimeout(timer);
		close();
	});
	return close;
}
