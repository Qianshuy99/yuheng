// 入口：@run-at document-start 跑到这里。
//
// 早退是 @match *://*/* 能被接受的前提：GM_getValue 在油猴里是同步的，所以这里
// 先读一次配置 + 一次主题列表，用 match 模式判断本站有没有主题；没有就只注册
// 油猴菜单（纯文字，不碰 DOM、不注入 CSS、不建外壳），整站开销就是两次读取。
import { BRAND } from './brand.js';
import { YHLog } from './core/log.js';
import { loadConfig, loadThemes } from './core/store.js';
import { themeMatches } from './core/registry.js';
import { createApp } from './app.js';
import { xpTheme } from './themes/xp/index.js';
import { auroraTheme } from './themes/aurora/index.js';

const hasMenu = typeof GM_registerMenuCommand === 'function';

/** 只看 match 模式，不做包校验：早退路径上要尽量便宜。 */
function quickHasCandidate(packs) {
	const url = location.href;
	if (themeMatches(xpTheme, url) || themeMatches(auroraTheme, url)) return true;
	return packs.some((pack) => themeMatches(pack, url));
}

/** 首次需要面板时才真正建控制器（早退路径上省掉注册与校验）。 */
let app = null;
function ensureApp() {
	if (!app) app = createApp();
	return app;
}

function registerMenus(getCtrl) {
	if (!hasMenu) return;
	const p = BRAND.menuPrefix;
	GM_registerMenuCommand(`${p}打开主题面板`, () => getCtrl().openPanel());
	GM_registerMenuCommand(`${p}本站主题开关`, () => getCtrl().toggleHere());
	GM_registerMenuCommand(`${p}导入主题包`, () => {
		const ctrl = getCtrl();
		ctrl.openPanel();
		ctrl.openImport();
	});
	GM_registerMenuCommand(`${p}关于`, () => getCtrl().openAbout());
}

function main() {
	const config = loadConfig();
	const packs = loadThemes();

	if (!config.enabled) {
		registerMenus(() => ensureApp().ctrl);
		return;
	}
	if (!quickHasCandidate(packs)) {
		// 本站没有可用主题：完全不介入页面，只留菜单入口供导入 / 查看
		registerMenus(() => ensureApp().ctrl);
		return;
	}

	const instance = ensureApp();
	registerMenus(() => instance.ctrl);
	instance.boot();
}

try {
	main();
} catch (err) {
	YHLog.error(`启动失败：${(err && err.message) || err}`);
}
