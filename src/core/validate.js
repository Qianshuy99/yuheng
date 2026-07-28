// 导入包校验与清洗。
//
// 安全边界：引擎绝不 eval 用户内容，导入包只收 CSS —— 带 JS 的主题包等于给脚本
// 开一个任意代码执行入口，v1 不做。CSS 本身拿不到页面数据，但仍有两类问题要处理：
//   1) 能绕过我们限制的构造：@import（引入任意远端样式，绕开体积与来源检查）、
//      javascript: / data:text/html URL、IE 的 expression()、-moz-binding。这些直接拒。
//   2) url() 指向站外域名：不阻止，但列出来让用户知道「该主题会向 X 发起请求，
//      可被用于记录你的访问」——外链请求是一个真实可观测的信道。
import { compileMatch } from './registry.js';

export const LIMITS = Object.freeze({
	/** 单包 CSS 上限。壁纸 data URI 内联进来大概 75 KB，512 KB 留足余量。 */
	maxCssBytes: 512 * 1024,
	/** vars 的总体积上限。壁纸这类资源常常放在变量里（url("data:…")），所以要给得够宽。 */
	maxVarsBytes: 512 * 1024,
	maxMatchPatterns: 40,
	maxVars: 200,
	maxSettings: 40,
});

const BANNED = [
	{ re: /@import\b/i, reason: '包含 @import（可引入任意远端样式，绕过体积与来源限制）' },
	{ re: /expression\s*\(/i, reason: '包含 expression()（旧 IE 的 CSS 表达式，可执行脚本）' },
	{ re: /-moz-binding\s*:/i, reason: '包含 -moz-binding（可绑定 XBL 脚本）' },
	{ re: /\bbehavior\s*:\s*url/i, reason: '包含 behavior:url()（旧 IE 的脚本行为绑定）' },
	{ re: /javascript\s*:/i, reason: '包含 javascript: URL' },
	{ re: /data:\s*text\/html/i, reason: '包含 data:text/html URL（可承载脚本）' },
];

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function byteLength(text) {
	return new TextEncoder().encode(text).length;
}

function str(value, max) {
	if (typeof value !== 'string') return '';
	return value.trim().slice(0, max);
}

/** 抽出 css 里所有 url(...) 的目标，用于列外链域名。 */
export function extractUrls(css) {
	const out = [];
	const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
	let match;
	while ((match = re.exec(css)) !== null) out.push(match[2].trim());
	return out;
}

/**
 * css 里引用的站外域名列表（去重）。data: 与相对路径不算外链。
 * 这不是拦截项，只是导入对话框要展示的提示信息。
 */
export function externalHosts(css, selfHost = location.hostname) {
	const hosts = new Set();
	for (const raw of extractUrls(css)) {
		if (/^data:/i.test(raw) || /^#/.test(raw)) continue;
		let url = raw;
		if (url.startsWith('//')) url = 'https:' + url;
		if (!/^https?:\/\//i.test(url)) continue;
		try {
			const host = new URL(url).hostname;
			if (host && host !== selfHost) hosts.add(host);
		} catch (err) {
			/* 拼不出 URL 的忽略 */
		}
	}
	return [...hosts];
}

/**
 * 校验并清洗一个导入包。
 * @returns {{ok: true, theme: object, warnings: string[], hosts: string[]}
 *          | {ok: false, errors: string[]}}
 */
export function validateTheme(input) {
	const errors = [];
	const warnings = [];

	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return { ok: false, errors: ['主题包必须是一个 JSON 对象'] };
	}

	const id = str(input.id, 64);
	if (!id) errors.push('缺少 id');
	else if (!ID_RE.test(id)) errors.push('id 只能是字母、数字与 . _ -，且不超过 64 字符');

	const css = typeof input.css === 'string' ? input.css : '';
	if (!css.trim()) errors.push('缺少 css（v1 只支持纯 CSS 主题包）');
	const cssBytes = byteLength(css);
	if (cssBytes > LIMITS.maxCssBytes) {
		errors.push(`css 体积 ${(cssBytes / 1024).toFixed(0)} KB 超过上限 ${LIMITS.maxCssBytes / 1024} KB`);
	}
	for (const { re, reason } of BANNED) {
		if (re.test(css)) errors.push(reason);
	}

	// 带 JS 的包直接拒，不静默丢弃 —— 用户得知道为什么这个包装不上
	for (const key of ['mount', 'unmount', 'script', 'js', 'code']) {
		if (input[key] !== undefined) {
			errors.push(`包含 ${key} 字段：导入的主题不允许携带 JavaScript`);
		}
	}

	const patterns = Array.isArray(input.match) ? input.match : [];
	if (!patterns.length) errors.push('缺少 match（至少一条 @match 风格的模式）');
	if (patterns.length > LIMITS.maxMatchPatterns) {
		errors.push(`match 条目超过 ${LIMITS.maxMatchPatterns} 条`);
	}
	const cleanMatch = [];
	for (const pattern of patterns.slice(0, LIMITS.maxMatchPatterns)) {
		if (compileMatch(pattern)) cleanMatch.push(pattern);
		else warnings.push(`忽略无法解析的 match：${String(pattern).slice(0, 80)}`);
	}
	if (!cleanMatch.length && !errors.length) errors.push('match 里没有任何可用模式');

	if (errors.length) return { ok: false, errors };

	const theme = {
		id,
		name: str(input.name, 60) || id,
		version: str(input.version, 20) || '0.0.0',
		author: str(input.author, 40) || '未署名',
		description: str(input.description, 200),
		match: cleanMatch,
		runAt: input.runAt === 'idle' ? 'idle' : 'start',
		css,
		vars: cleanVars(input.vars, warnings),
		settings: cleanSettings(input.settings, warnings),
		/** 标记来源，面板里区分内置与导入，导入包才可删 */
		source: 'imported',
		importedAt: new Date().toISOString(),
	};

	return { ok: true, theme, warnings, hosts: externalHosts(css) };
}

function cleanVars(vars, warnings) {
	if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return {};
	const out = {};
	let count = 0;
	let bytes = 0;
	for (const [key, value] of Object.entries(vars)) {
		if (count >= LIMITS.maxVars) {
			warnings.push(`vars 超过 ${LIMITS.maxVars} 条，多余的已丢弃`);
			break;
		}
		if (!/^--[a-zA-Z0-9_-]+$/.test(key)) {
			warnings.push(`忽略非法 CSS 变量名：${String(key).slice(0, 40)}`);
			continue;
		}
		if (typeof value !== 'string') continue;
		// 变量值会原样进 :root，同样不能带这些构造；`}` 会提前闭合规则块，等于任意 CSS 注入
		if (BANNED.some(({ re }) => re.test(value)) || value.includes('}')) {
			warnings.push(`忽略含危险内容的变量：${key}`);
			continue;
		}
		// 壁纸这类资源就是靠变量里的 data URI 传的，所以不能按长度截断（截断会得到坏图），
		// 只在总量超限时整条丢掉。
		const size = byteLength(value);
		if (bytes + size > LIMITS.maxVarsBytes) {
			warnings.push(`vars 总体积超过 ${LIMITS.maxVarsBytes / 1024} KB，已丢弃 ${key}`);
			continue;
		}
		out[key] = value;
		bytes += size;
		count += 1;
	}
	return out;
}

const SETTING_TYPES = new Set(['bool', 'select', 'text']);

function cleanSettings(settings, warnings) {
	if (!Array.isArray(settings)) return [];
	const out = [];
	for (const item of settings.slice(0, LIMITS.maxSettings)) {
		if (!item || typeof item !== 'object') continue;
		const key = str(item.key, 40);
		if (!/^[a-zA-Z0-9_]+$/.test(key)) {
			warnings.push(`忽略非法设置项 key：${String(item.key).slice(0, 40)}`);
			continue;
		}
		const type = SETTING_TYPES.has(item.type) ? item.type : 'bool';
		const setting = {
			key,
			type,
			label: str(item.label, 60) || key,
			default: type === 'bool' ? item.default !== false : str(item.default, 60),
		};
		if (type === 'select') {
			setting.options = (Array.isArray(item.options) ? item.options : [])
				.slice(0, 20)
				.map((option) => ({
					value: str(option?.value, 40),
					label: str(option?.label, 60) || str(option?.value, 40),
				}))
				.filter((option) => option.value);
			if (!setting.options.length) continue;
		}
		out.push(setting);
	}
	return out;
}

/** 导出：把内置或导入主题转成可分发的纯数据包（去掉函数与内部字段）。 */
export function serializeTheme(theme) {
	return {
		id: theme.id,
		name: theme.name,
		version: theme.version,
		author: theme.author,
		description: theme.description || '',
		match: [...(theme.match || [])],
		runAt: theme.runAt || 'start',
		css: typeof theme.css === 'string' ? theme.css : '',
		vars: { ...(theme.vars || {}) },
		settings: (theme.settings || []).map((item) => ({ ...item })),
	};
}
