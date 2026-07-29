// 控制器：把 store / registry / injector 和外壳 UI 缝在一起。
// 面板与主题包都只通过这里改状态，避免两边各自写 store 导致不一致。
import { BRAND } from './brand.js';
import { YHLog } from './core/log.js';
import { loadConfig, saveConfig, loadThemes, saveThemes, store } from './core/store.js';
import { register, unregister, getTheme, allThemes, candidates, resolveActive } from './core/registry.js';
import { mountTheme, unmountTheme, mountedTheme, injectShellStyle } from './core/injector.js';
import { SHELL_CSS } from './core/ui/shell-css.js';
import { removeShell } from './core/ui/dom.js';
import { createBall } from './core/ui/ball.js';
import { createPanel } from './core/ui/panel.js';
import { toast } from './core/ui/toast.js';
import { showLoading } from './core/ui/loading.js';
import { dialog, alertDialog, confirmDialog, aboutDialog } from './core/ui/dialog.js';
import { openImportDialog, openExportDialog } from './core/ui/import.js';
import { validateTheme } from './core/validate.js';
import { xpTheme, XP_LEGACY_KEYS } from './themes/xp/index.js';

/** 内置主题。导入包在 boot() 里追加注册，所以内置的排在候选列表前面。 */
const BUILTIN = [xpTheme];

export function createApp() {
	const config = loadConfig();
	let ball = null;
	let panel = null;
	/** 外壳 UI 是否已建好；早退时不建 */
	let shellReady = false;

	migrateLegacy(config);

	/* ---------- 主题注册 ---------- */
	for (const theme of BUILTIN) register(theme);
	for (const pack of loadThemes()) {
		const result = validateTheme(pack);
		if (!result.ok) {
			YHLog.warn(`已存储的主题包 ${pack?.id || '(无 id)'} 校验失败，已跳过`);
			continue;
		}
		// 早期版本没拦内置 id 重名，存量数据里可能有；这里兜一道，别让导入包顶掉内置主题
		if (BUILTIN.some((builtin) => builtin.id === result.theme.id)) {
			YHLog.warn(`已存储的主题包 ${result.theme.id} 与内置主题同名，已跳过`);
			continue;
		}
		register({ ...result.theme, source: 'imported' });
	}

	const host = location.hostname;

	/* ---------- 主题应用 ---------- */
	function themeSettings(id) {
		const theme = getTheme(id);
		const defaults = {};
		for (const setting of theme?.settings || []) defaults[setting.key] = setting.default;
		return { ...defaults, ...(config.themeSettings[id] || {}) };
	}

	function themeContext(theme) {
		return {
			settings: themeSettings(theme.id),
			setSetting: (key, value) => writeThemeSetting(theme.id, key, value),
			toast,
			alert: alertDialog,
			confirm: confirmDialog,
			dialog,
			openPanel: () => panel?.show(ball),
			openAbout: aboutDialog,
			/** 主题里的「关闭本主题」= 本站切到「不使用主题」 */
			disableTheme: () => activate(''),
			log: YHLog,
		};
	}

	function apply({ silent } = {}) {
		const theme = resolveActive(config, location.href, host);
		const current = mountedTheme();
		if (!theme) {
			if (current) unmountTheme();
			panel?.render();
			return null;
		}
		if (current === theme.id) return theme;
		if (!silent) showLoading(theme.name);
		mountTheme(theme, themeContext(theme));
		panel?.render();
		return theme;
	}

	function writeThemeSetting(id, key, value) {
		config.themeSettings[id] = { ...(config.themeSettings[id] || {}), [key]: value };
		saveConfig(config);
	}

	/* ---------- 外壳 ---------- */
	function buildShell() {
		if (shellReady) return;
		shellReady = true;
		injectShellStyle(SHELL_CSS);
		panel = createPanel(ctrl);
		if (config.ball) mountBall();
	}

	function mountBall() {
		if (ball) return;
		ball = createBall({
			position: config.ballPos,
			onClick: () => panel?.toggle(ball),
			onMove: (pos) => {
				config.ballPos = pos;
				saveConfig(config);
			},
		});
	}

	function unmountBall() {
		ball?.remove();
		ball = null;
	}

	/* ---------- 面板 / 菜单调用的控制器 API ---------- */
	function activate(id) {
		config.activeByHost[host] = id || '';
		saveConfig(config);
		const theme = apply();
		toast(theme ? `已切换到 ${theme.name}` : '已关闭本站主题', 'ok');
	}

	const ctrl = {
		snapshot() {
			const list = candidates(location.href);
			const activeId = mountedTheme();
			const active = activeId ? getTheme(activeId) : null;
			const values = activeId ? themeSettings(activeId) : {};
			return {
				enabled: config.enabled,
				ball: config.ball,
				host,
				themes: allThemes(),
				candidates: list,
				active: activeId,
				activeName: active?.name || '',
				activeSettings: (active?.settings || []).map((setting) => ({
					...setting,
					value: values[setting.key],
				})),
			};
		},

		setEnabled(value) {
			config.enabled = Boolean(value);
			saveConfig(config);
			apply();
			toast(config.enabled ? '换肤引擎已启用' : '换肤引擎已停用', config.enabled ? 'ok' : 'warn');
		},

		setBallVisible(value) {
			config.ball = Boolean(value);
			saveConfig(config);
			if (config.ball) mountBall();
			else unmountBall();
			panel?.render();
			if (!config.ball) toast(`悬浮控制器已隐藏，可从油猴菜单「${BRAND.name}」重新打开`, 'info', 5000);
		},

		activate,

		setThemeSetting(key, value) {
			const id = mountedTheme();
			if (!id) return;
			writeThemeSetting(id, key, value);
			const theme = getTheme(id);
			// 主题能就地生效就不重挂，避免闪屏和滚动位置丢失
			const handled = theme?.onSetting?.(key, value) === true;
			if (!handled) {
				unmountTheme();
				apply({ silent: true });
			}
			panel?.render();
		},

		removeTheme(id) {
			const theme = getTheme(id);
			if (!theme || theme.source !== 'imported') return;
			confirmDialog({
				title: '删除主题',
				heading: `要删除「${theme.name}」吗？`,
				body: '删除后需要重新导入主题包才能使用。',
				confirmText: '删除',
				danger: true,
				onConfirm: () => {
					if (mountedTheme() === id) unmountTheme();
					unregister(id);
					saveThemes(loadThemes().filter((pack) => pack.id !== id));
					for (const key of Object.keys(config.activeByHost)) {
						if (config.activeByHost[key] === id) delete config.activeByHost[key];
					}
					delete config.themeSettings[id];
					saveConfig(config);
					apply({ silent: true });
					panel?.render();
					toast(`${theme.name} 已删除`, 'ok');
				},
			});
		},

		reload() {
			const id = mountedTheme();
			if (id) unmountTheme();
			apply();
			panel?.render();
			toast('引擎已刷新', 'ok');
		},

		openImport() {
			openImportDialog((theme) => {
				// 内置 id 不许被覆盖：导入包每次启动都在内置之后注册，一旦重名就会永久
				// 顶掉内置主题（而且顺带变成可删除项）。改 id 是导入方的事，引擎只负责拒绝。
				if (BUILTIN.some((builtin) => builtin.id === theme.id)) {
					toast(`id「${theme.id}」是内置主题，请改一个 id 再导入`, 'error', 5000);
					return false;
				}
				const packs = loadThemes().filter((pack) => pack.id !== theme.id);
				packs.push(theme);
				if (!saveThemes(packs)) {
					toast('保存失败，可能是存储空间不足', 'error');
					return false;
				}
				const wasMounted = mountedTheme() === theme.id;
				register({ ...theme, source: 'imported' });
				// 覆盖的是当前挂着的主题：先卸掉，否则 mountTheme 认为 id 没变会直接跳过
				if (wasMounted) {
					unmountTheme();
					apply({ silent: true });
					panel?.render();
				} else if (candidates(location.href).some((item) => item.id === theme.id)) {
					// 本站命中就直接切过去，省一步手动选择
					activate(theme.id);
				} else {
					panel?.render();
				}
				return true;
			});
		},

		exportActive() {
			const id = mountedTheme();
			const theme = id ? getTheme(id) : null;
			if (!theme) {
				toast('当前没有启用的主题', 'warn');
				return;
			}
			openExportDialog(theme);
		},

		openAbout: aboutDialog,

		openPanel() {
			buildShell();
			panel?.show(ball);
		},

		togglePanel() {
			buildShell();
			panel?.toggle(ball);
		},

		/** 油猴菜单「本站开关」 */
		toggleHere() {
			const off = config.activeByHost[host] === '';
			activate(off ? undefined : '');
		},

		hasCandidateHere() {
			return candidates(location.href).length > 0;
		},

		destroy() {
			unmountTheme();
			unmountBall();
			// 面板在 document 上挂了「点外面 / Esc 关闭」，得让它自己摘掉
			panel?.destroy();
			removeShell();
			shellReady = false;
			panel = null;
		},
	};

	/* ---------- 启动 ---------- */
	function boot() {
		const theme = apply({ silent: true });
		YHLog.banner(theme?.name);
		YHLog.dubhe(`存储后端：${store.backend}`);
		const start = () => buildShell();
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
		else start();
	}

	return { ctrl, boot, config };
}

/**
 * 旧版 XP 脚本的 xpw:* localStorage → 新 schema，只做一次。
 * 旧脚本是单站点的，所以只迁移到当前 host 上；迁移完删掉旧键，避免下次又跑一遍。
 */
function migrateLegacy(config) {
	const enabled = store.getLocal(XP_LEGACY_KEYS.enabled, undefined);
	if (enabled === undefined) return;
	const host = location.hostname;
	if (config.activeByHost[host] === undefined) {
		config.activeByHost[host] = enabled === false ? '' : xpTheme.id;
	}
	const old = {
		boot: store.getLocal(XP_LEGACY_KEYS.boot, undefined),
		wallpaper: store.getLocal(XP_LEGACY_KEYS.wallpaper, undefined),
		maximized: store.getLocal(XP_LEGACY_KEYS.maximized, undefined),
	};
	const migrated = {};
	for (const [key, value] of Object.entries(old)) {
		if (value !== undefined) migrated[key] = value;
	}
	config.themeSettings[xpTheme.id] = { ...migrated, ...(config.themeSettings[xpTheme.id] || {}) };
	saveConfig(config);
	for (const key of Object.values(XP_LEGACY_KEYS)) store.removeLocal(key);
	YHLog.info('已迁移旧版 XP 皮肤设置（xpw:*）到玉衡配置。');
}
