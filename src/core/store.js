// 存储层：优先 GM_getValue/GM_setValue（跨站点共享，油猴里是同步的，
// 所以 document-start 能立刻读到配置并决定是否早退），拿不到 GM_* 时退回 localStorage。
// localStorage 在隐私模式 / 禁用 cookie 时会抛错，全部包一层，失败就用默认值。

const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

export const STORE_KEY = Object.freeze({
	/** { enabled, ball, activeByHost: { host: themeId }, themeSettings: { themeId: {...} } } */
	config: 'yh:config',
	/** 导入的主题包数组，包体积大且改动少，和 config 分开存，避免互相拖累 */
	themes: 'yh:themes',
});

function readRaw(key) {
	if (hasGM) {
		try {
			const value = GM_getValue(key, undefined);
			if (value !== undefined) return value;
		} catch (err) {
			/* 落到 localStorage */
		}
	}
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? undefined : JSON.parse(raw);
	} catch (err) {
		return undefined;
	}
}

function writeRaw(key, value) {
	if (hasGM) {
		try {
			GM_setValue(key, value);
			return true;
		} catch (err) {
			/* 落到 localStorage */
		}
	}
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (err) {
		return false;
	}
}

export const store = {
	backend: hasGM ? 'GM' : 'localStorage',

	get(key, fallback) {
		const value = readRaw(key);
		return value === undefined ? fallback : value;
	},

	set(key, value) {
		return writeRaw(key, value);
	},

	/** 直接读本页 localStorage，用于迁移旧版 xpw:* 键 */
	getLocal(key, fallback) {
		try {
			const raw = localStorage.getItem(key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch (err) {
			return fallback;
		}
	},

	removeLocal(key) {
		try {
			localStorage.removeItem(key);
		} catch (err) {
			/* 忽略 */
		}
	},
};

export const DEFAULT_CONFIG = Object.freeze({
	enabled: true,
	/** 悬浮球是否显示；关掉后只能从油猴菜单进面板 */
	ball: true,
	/** 悬浮球位置，null = 用 CSS 默认（右侧居中） */
	ballPos: null,
	/** host → themeId，空串表示该站点显式关闭 */
	activeByHost: {},
	/** themeId → { settingKey: value } */
	themeSettings: {},
});

export function loadConfig() {
	const raw = store.get(STORE_KEY.config, null);
	if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
	return {
		...DEFAULT_CONFIG,
		...raw,
		activeByHost: { ...(raw.activeByHost || {}) },
		themeSettings: { ...(raw.themeSettings || {}) },
	};
}

export function saveConfig(config) {
	return store.set(STORE_KEY.config, config);
}

export function loadThemes() {
	const raw = store.get(STORE_KEY.themes, null);
	return Array.isArray(raw) ? raw : [];
}

export function saveThemes(themes) {
	return store.set(STORE_KEY.themes, themes);
}
