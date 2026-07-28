// 玉衡主面板：品牌方案第二章那套 popup 布局，落到悬浮面板上
// （油猴没有 popup 页，GM_registerMenuCommand 只能给纯文字菜单，塞不了 HTML）。
import { BRAND } from '../../brand.js';
import { el, shellRoot } from './dom.js';
import { emptyState } from './empty.js';

/**
 * @param {object} ctrl 控制器，见 src/app.js
 */
export function createPanel(ctrl) {
	const body = el('div', { class: 'yh-panel-body' });
	const panel = el('div', { class: 'yh-panel' }, [
		el('div', { class: 'yh-panel-header' }, [
			el('img', { class: 'yh-panel-logo', src: BRAND.icons['32'], alt: '' }),
			el('span', { class: 'yh-panel-title', text: BRAND.name }),
			el('span', { class: 'yh-panel-engine', text: 'Dubhe' }),
			el('button', { class: 'yh-panel-close', type: 'button', title: '关闭', text: '×', onclick: () => hide() }),
		]),
		body,
		el('div', { class: 'yh-panel-footer', text: `Skin Engine: ${BRAND.engine} · v${BRAND.version}` }),
	]);
	// 面板内点击不冒泡到 document，避免「点面板本身把面板关掉」
	panel.addEventListener('click', (ev) => ev.stopPropagation());
	shellRoot().append(panel);

	function render() {
		body.textContent = '';
		body.append(...sections(ctrl));
	}

	function show(anchor) {
		render();
		panel.classList.add('yh-open');
		position(panel, anchor);
	}

	function hide() {
		panel.classList.remove('yh-open');
	}

	function toggle(anchor) {
		if (panel.classList.contains('yh-open')) hide();
		else show(anchor);
	}

	const isOpen = () => panel.classList.contains('yh-open');

	return { node: panel, show, hide, toggle, render, isOpen };
}

function sections(ctrl) {
	const out = [];
	const state = ctrl.snapshot();

	out.push(
		el('div', { class: 'yh-section-title', text: '引擎' }),
		switchRow('启用换肤引擎', state.enabled, (value) => ctrl.setEnabled(value)),
		switchRow('显示悬浮控制器', state.ball, (value) => ctrl.setBallVisible(value)),
	);

	out.push(el('div', { class: 'yh-section-title', text: `本站主题 · ${state.host}` }));
	if (!state.candidates.length) {
		out.push(emptyState(state.themes.length ? 'no-match' : 'no-theme', () => ctrl.openImport()));
	} else {
		out.push(
			el('div', { class: 'yh-current' }, [
				el('span', { class: 'yh-current-label', text: '当前主题' }),
				el('strong', { class: 'yh-current-name', text: state.activeName || '未启用' }),
				state.active
					? el('span', { class: 'yh-badge', text: BRAND.name })
					: el('span', { class: 'yh-badge yh-badge--muted', text: '已关闭' }),
			]),
		);
		for (const theme of state.candidates) {
			out.push(themeRow(theme, theme.id === state.active, ctrl));
		}
		out.push(themeRow({ id: '', name: '不使用主题', version: '', author: '' }, state.active === null, ctrl));
	}

	if (state.activeSettings.length) {
		out.push(el('div', { class: 'yh-section-title', text: '主题设置' }));
		for (const setting of state.activeSettings) {
			out.push(settingRow(setting, ctrl));
		}
	}

	out.push(
		el('div', { class: 'yh-section-title', text: 'Dubhe 工具' }),
		el('button', { class: 'yh-btn', type: 'button', onclick: () => ctrl.reload() }, [
			el('span', { text: '🔄' }),
			el('span', { text: '刷新引擎' }),
		]),
		el('button', { class: 'yh-btn', type: 'button', onclick: () => ctrl.openImport() }, [
			el('span', { text: '📦' }),
			el('span', { text: '导入主题' }),
		]),
		el('button', {
			class: 'yh-btn',
			type: 'button',
			disabled: state.active ? null : true,
			onclick: () => ctrl.exportActive(),
		}, [el('span', { text: '📤' }), el('span', { text: '导出当前主题' })]),
		el('button', { class: 'yh-btn', type: 'button', onclick: () => ctrl.openAbout() }, [
			el('span', { text: 'ℹ️' }),
			el('span', { text: `关于${BRAND.name}` }),
		]),
	);

	return out;
}

function switchRow(label, checked, onChange) {
	const input = el('input', { type: 'checkbox', checked: checked ? true : null });
	input.addEventListener('change', () => onChange(input.checked));
	return el('label', { class: 'yh-switch' }, [input, el('span', { text: label })]);
}

function themeRow(theme, isActive, ctrl) {
	const meta = theme.id
		? `v${theme.version || '0.0.0'} · ${theme.author || '未署名'}${theme.source === 'imported' ? ' · 导入' : ''}`
		: '保持网站原样';
	return el('div', {
		class: 'yh-theme' + (isActive ? ' yh-active' : ''),
		onclick: () => ctrl.activate(theme.id),
	}, [
		el('span', { class: 'yh-theme-mark', text: isActive ? '●' : '○' }),
		el('span', { class: 'yh-theme-info' }, [
			el('span', { class: 'yh-theme-name', text: theme.name || theme.id }),
			el('span', { class: 'yh-theme-meta', text: meta }),
		]),
		theme.source === 'imported'
			? el('button', {
				class: 'yh-theme-del',
				type: 'button',
				title: '删除此主题',
				text: '🗑',
				onclick: (ev) => {
					ev.stopPropagation();
					ctrl.removeTheme(theme.id);
				},
			})
			: null,
	]);
}

function settingRow(setting, ctrl) {
	if (setting.type === 'bool') {
		return switchRow(setting.label, setting.value !== false, (value) => ctrl.setThemeSetting(setting.key, value));
	}
	if (setting.type === 'select') {
		const select = el('select', { style: 'flex:1 1 auto;min-width:0;' },
			(setting.options || []).map((option) =>
				el('option', { value: option.value, text: option.label, selected: option.value === setting.value ? true : null })));
		select.addEventListener('change', () => ctrl.setThemeSetting(setting.key, select.value));
		return el('label', { class: 'yh-switch' }, [el('span', { text: setting.label }), select]);
	}
	const input = el('input', { type: 'text', value: setting.value || '', style: 'flex:1 1 auto;min-width:0;' });
	input.addEventListener('change', () => ctrl.setThemeSetting(setting.key, input.value));
	return el('label', { class: 'yh-switch' }, [el('span', { text: setting.label }), input]);
}

/** 面板贴着悬浮球摆，并按视口翻转，避免跑出屏幕。 */
function position(panel, anchor) {
	const rect = anchor?.getBoundingClientRect();
	const size = panel.getBoundingClientRect();
	const gap = 10;
	let left;
	let top;
	if (rect) {
		// 球在右半屏就把面板放左边，反之放右边
		const preferLeft = rect.left > window.innerWidth / 2;
		left = preferLeft ? rect.left - size.width - gap : rect.right + gap;
		top = rect.top;
	} else {
		left = window.innerWidth - size.width - 24;
		top = 80;
	}
	left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - size.width - 8));
	top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - size.height - 8));
	panel.style.left = `${Math.round(left)}px`;
	panel.style.top = `${Math.round(top)}px`;
}
