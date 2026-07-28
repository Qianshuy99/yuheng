// 玉衡对话框：关于 / 确认 / 导入。目标页面可能自带 Modal，所以这里自绘一套，
// 不复用站点组件，也不用原生 confirm（会被浏览器拦或阻塞）。
import { BRAND, LOGO_IS_PLACEHOLDER } from '../../brand.js';
import { el, shellRoot } from './dom.js';

/**
 * @param {object} options
 * @param {string} options.title 标题栏文字
 * @param {string} [options.heading] 正文首行加粗标题
 * @param {Array<string|Node>} [options.body] 正文，字符串按段落渲染
 * @param {Array<[string, (() => void)|null, boolean]>} [options.buttons] [文字, 回调, 是否主按钮]
 * @returns {() => void} 关闭函数
 */
export function dialog({ title, heading, body, buttons, onClose }) {
	const mask = el('div', { class: 'yh-dlg-mask' });
	let closed = false;
	const close = () => {
		if (closed) return;
		closed = true;
		mask.remove();
		document.removeEventListener('keydown', onKey, true);
		onClose?.();
	};
	const onKey = (ev) => {
		if (ev.key === 'Escape') {
			ev.stopPropagation();
			close();
		}
	};

	const foot = el('div', { class: 'yh-dlg-foot' });
	for (const [label, handler, isPrimary] of buttons || [['确定', null, true]]) {
		foot.append(
			el('button', {
				class: 'yh-btn' + (isPrimary ? ' yh-btn--primary' : ''),
				type: 'button',
				text: label,
				onclick: () => {
					// 回调返回 true 表示「保持打开」（例如导入校验失败要留在原对话框）
					if (handler?.() === true) return;
					close();
				},
			}),
		);
	}

	const bodyNode = el(
		'div',
		{ class: 'yh-dlg-body' },
		[
			heading ? el('div', { class: 'yh-dlg-heading', text: heading }) : null,
			...[].concat(body || []).map((line) => (typeof line === 'string' ? el('p', { text: line }) : line)),
		].filter(Boolean),
	);

	mask.append(
		el('div', { class: 'yh-dlg' }, [
			el('div', { class: 'yh-dlg-head' }, [
				el('img', { src: BRAND.icons['32'], alt: '' }),
				el('span', { text: title || BRAND.fullName }),
				el('button', { class: 'yh-panel-close', type: 'button', title: '关闭', text: '×', onclick: close }),
			]),
			bodyNode,
			foot,
		]),
	);
	mask.addEventListener('click', (ev) => {
		if (ev.target === mask) close();
	});
	document.addEventListener('keydown', onKey, true);
	shellRoot().append(mask);
	return close;
}

export function alertDialog(message, title) {
	return dialog({ title: title || BRAND.fullName, body: message });
}

export function confirmDialog({ title, heading, body, confirmText = '确定', onConfirm, danger }) {
	return dialog({
		title,
		heading,
		body,
		buttons: [
			[confirmText, onConfirm, !danger],
			['取消', null, false],
		],
	});
}

export function aboutDialog() {
	return dialog({
		title: `关于 ${BRAND.fullName}`,
		heading: `${BRAND.fullName} v${BRAND.version}`,
		body: [
			el('div', { class: 'yh-kv' }, [el('b', { text: '引擎' }), el('span', { text: `${BRAND.engine} v${BRAND.version}` })]),
			el('div', { class: 'yh-kv' }, [el('b', { text: '作者' }), el('span', { text: BRAND.author })]),
			el('div', { class: 'yh-kv' }, [el('b', { text: '主页' }), el('span', { text: BRAND.homepage })]),
			el('p', { text: BRAND.slogan }),
			el('p', { text: BRAND.starLine }),
			el('p', { text: '玉衡只改外观，不读取也不改动页面数据与网络请求。导入的主题包只允许纯 CSS，不执行任何 JavaScript。' }),
			LOGO_IS_PLACEHOLDER
				? el('div', { class: 'yh-dlg-note', text: '当前 logo 为临时占位图，后续会替换为正式版。' })
				: null,
			el('div', { class: 'yh-empty-footer', text: BRAND.footer }),
		].filter(Boolean),
	});
}
