// 主题注册表：内置主题 + 导入包统一成同一个契约，按 host 决定当前激活的是哪个。
//
// 主题契约（CSS-only 包就是这个对象的 JSON 序列化，内置主题多了 mount/unmount）：
//   { id, name, version, author, match: ['*://*.aicue.top/*'], runAt: 'start'|'idle',
//     css, vars: {'--x': '#fff'}, settings: [{key,type,label,default}] }
import { YHLog } from './log.js';
import { PREVIEW } from './env.js';

/** id → theme */
const registry = new Map();

/**
 * 把 userscript 风格的 @match 模式编译成正则。
 * 支持 scheme://host/path 三段，scheme 与 host 允许 *，host 允许 *.example.com，path 允许 *。
 * 解析失败返回 null（调用方当作永不匹配），不抛错——导入包里可能有任意字符串。
 */
export function compileMatch(pattern) {
	if (typeof pattern !== 'string') return null;
	if (pattern === '<all_urls>') return /^https?:/;
	const parsed = /^(\*|https?|file|ftp):\/\/([^/]*)(\/.*)$/.exec(pattern);
	if (!parsed) return null;
	const [, scheme, host, path] = parsed;

	const schemeRe = scheme === '*' ? 'https?' : scheme;
	let hostRe;
	if (host === '*') hostRe = '[^/]+';
	else if (host.startsWith('*.')) hostRe = `(?:[^/]+\\.)?${escapeRe(host.slice(2))}`;
	else hostRe = escapeRe(host);
	const pathRe = path.split('*').map(escapeRe).join('.*');

	try {
		return new RegExp(`^${schemeRe}://${hostRe}${pathRe}$`);
	} catch (err) {
		return null;
	}
}

function escapeRe(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 主题的 match 是否命中某个 URL。 */
export function themeMatches(theme, url) {
	// 离线预览（file://）没有真实域名，直接放行，否则样板页什么主题都看不到
	if (PREVIEW) return true;
	const patterns = Array.isArray(theme?.match) ? theme.match : [];
	return patterns.some((pattern) => {
		const re = compileMatch(pattern);
		return Boolean(re && re.test(url));
	});
}

export function register(theme) {
	if (!theme?.id) {
		YHLog.warn('忽略缺少 id 的主题');
		return false;
	}
	if (registry.has(theme.id)) YHLog.warn(`主题 ${theme.id} 被重复注册，后者覆盖前者`);
	registry.set(theme.id, theme);
	return true;
}

export function unregister(id) {
	return registry.delete(id);
}

export function getTheme(id) {
	return registry.get(id) || null;
}

export function allThemes() {
	return [...registry.values()];
}

/** 命中当前 URL 的主题，按注册顺序（内置先注册，所以排在导入包前面）。 */
export function candidates(url = location.href) {
	return allThemes().filter((theme) => themeMatches(theme, url));
}

/**
 * 解析当前该激活哪个主题。
 * 优先用户为该 host 显式选择的（空串 = 显式关闭），否则取第一个命中的候选。
 */
export function resolveActive(config, url = location.href, host = location.hostname) {
	if (!config.enabled) return null;
	const list = candidates(url);
	if (!list.length) return null;

	const picked = config.activeByHost?.[host];
	if (picked === '') return null;
	if (picked) {
		const theme = list.find((item) => item.id === picked);
		if (theme) return theme;
		// 用户选的主题被删了或不再匹配，回落到默认候选
		YHLog.warn(`${host} 选定的主题 ${picked} 不可用，改用默认候选`);
	}
	return list[0];
}

/** document-start 早退判断：本站有没有任何主题可用。只读注册表，不碰 DOM。 */
export function hasCandidate(url = location.href) {
	return candidates(url).length > 0;
}

export function clearRegistry() {
	registry.clear();
}
