// 样式注入：一个主题对应一个 <style>，卸载时整块移除，不留残余。
// 主题的 vars 单独注入一块 :root 覆写，方便主题包只改变量不写选择器。
import { YHLog } from './log.js';

const STYLE_ID = 'yh-theme-style';
const VARS_ID = 'yh-theme-vars';
const SHELL_ID = 'yh-shell-style';

/** 当前已挂载的主题 id，null = 未挂载。 */
let mountedId = null;
/** 内置主题的 unmount()，卸载时调用来还原它自己加的 DOM/class。 */
let mountedTeardown = null;

function head() {
	return document.head || document.documentElement;
}

function putStyle(id, css) {
	let node = document.getElementById(id);
	if (!node) {
		node = document.createElement('style');
		node.id = id;
		node.type = 'text/css';
		head().append(node);
	}
	node.textContent = css;
	return node;
}

function dropStyle(id) {
	document.getElementById(id)?.remove();
}

/** 外壳自己的样式（悬浮球 / 面板 / Toast…），与主题样式分开，主题切换时不受影响。 */
export function injectShellStyle(css) {
	return putStyle(SHELL_ID, css);
}

function varsBlock(vars) {
	const entries = Object.entries(vars || {}).filter(
		([key, value]) => key.startsWith('--') && typeof value === 'string',
	);
	if (!entries.length) return '';
	const body = entries.map(([key, value]) => `\t${key}:${value};`).join('\n');
	// 用 :root 而不是 html.yh-on，让主题包里的 vars 与 css 同优先级层级，
	// 主题自己的 css 若要更强可以自带 !important。
	return `:root{\n${body}\n}\n`;
}

/**
 * 挂载主题：注入 css / vars，给 <html> 打上 yh-on + yh-theme-<id> 标记，
 * 最后调用内置主题的 mount()。
 */
export function mountTheme(theme, context = {}) {
	if (!theme) return false;
	if (mountedId === theme.id) return true;
	if (mountedId) unmountTheme();

	const root = document.documentElement;
	putStyle(STYLE_ID, typeof theme.css === 'string' ? theme.css : '');
	const vars = varsBlock(theme.vars);
	if (vars) putStyle(VARS_ID, vars);
	else dropStyle(VARS_ID);

	root.classList.add('yh-on');
	root.classList.add(themeClass(theme.id));
	root.setAttribute('data-yh-theme', theme.id);

	mountedId = theme.id;
	mountedTeardown = null;
	if (typeof theme.mount === 'function') {
		try {
			mountedTeardown = theme.mount(context) || null;
		} catch (err) {
			YHLog.error(`主题 ${theme.id} mount 失败：${err && err.message}`);
		}
	}
	YHLog.dubhe(`CSS 注入完成：${theme.id}（${byteLength(theme.css)} 字节）`);
	return true;
}

/** 卸载当前主题，把注入的一切还原。 */
export function unmountTheme() {
	if (!mountedId) return false;
	const root = document.documentElement;
	const teardown = mountedTeardown;
	const id = mountedId;
	// 先清标记再 teardown：主题的 unmount 里可能读 DOM 尺寸，此时应已回到原样式
	mountedId = null;
	mountedTeardown = null;
	dropStyle(STYLE_ID);
	dropStyle(VARS_ID);
	root.classList.remove('yh-on', themeClass(id));
	root.removeAttribute('data-yh-theme');
	if (typeof teardown === 'function') {
		try {
			teardown();
		} catch (err) {
			YHLog.error(`主题 ${id} unmount 失败：${err && err.message}`);
		}
	}
	YHLog.dubhe(`已卸载主题：${id}`);
	return true;
}

export function mountedTheme() {
	return mountedId;
}

/** xp.luna → yh-theme-xp-luna；点号在 class 里不合法。 */
export function themeClass(id) {
	return 'yh-theme-' + String(id).replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function byteLength(text) {
	return typeof text === 'string' ? new TextEncoder().encode(text).length : 0;
}
