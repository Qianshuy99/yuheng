// Windows XP Luna 主题包（内置）。
// CSS 在 theme.css，这里只放 DOM 部分：窗口 chrome、任务栏、开始菜单、桌面、开机动画。
//
// mount(ctx) 返回一个 teardown 函数交给 injector；卸载时 injector 先移掉 <style> 与
// html.yh-theme-xp-luna，再调 teardown 移掉本主题加的 DOM 与 root class。
// 所有靠 CSS 改的东西（body padding、--header-height）随 <style> 一起消失，不用手动还原。
import THEME_CSS from './theme.css';
import { BLISS } from './wallpaper.js';
import { mountAicueAdapter } from '../../sites/aicue.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WALLPAPERS = [
	{ value: 'bliss', label: 'Bliss 草原' },
	{ value: 'luna', label: 'Luna 深蓝' },
	{ value: 'plain', label: '经典纯色' },
];

/** 站点自带的悬浮「切换站点」胶囊被主题藏了（它压在任务栏上），这里补等价入口。 */
const SITES = [
	{ host: 'www.aicue.top', name: '国内站' },
	{ host: 'flarum.aicue.top', name: '海外站' },
];

export const xpTheme = {
	id: 'xp.luna',
	name: 'Windows XP',
	version: '1.0.0',
	author: 'Qianshuy99',
	description: '把 Flarum 论坛变成 Windows XP Luna 风格：窗口标题栏、任务栏与开始菜单、经典控件与滚动条。',
	match: ['*://aicue.top/*', '*://*.aicue.top/*'],
	runAt: 'start',
	css: THEME_CSS,
	vars: { '--xp-bliss': `url("${BLISS}")` },
	settings: [
		{ key: 'boot', type: 'bool', label: '开机动画', default: true },
		{ key: 'maximized', type: 'bool', label: '窗口最大化', default: true },
		{ key: 'wallpaper', type: 'select', label: '壁纸', default: 'bliss', options: WALLPAPERS },
	],
	layout: {
		root: '#app',
		regions: [
			{ id: 'header', selector: ':scope > #drawer' },
			{ id: 'content', selector: ':scope > .App-content' },
		],
		desktop: {
			columns: 'minmax(0, 1fr)',
			rows: 'auto minmax(0, 1fr)',
			areas: ['header', 'content'],
		},
		mobile: {
			maxWidth: 760,
			columns: 'minmax(0, 1fr)',
			rows: 'auto minmax(0, 1fr)',
			areas: ['header', 'content'],
		},
	},
	source: 'builtin',
	mount,
	/** 设置项在面板里改动后由 app 调用；返回 true 表示已就地生效，无需重载。 */
	onSetting(key, value) {
		return live?.onSetting(key, value) ?? false;
	},
};

/** 当前挂载实例，供 onSetting 使用。 */
let live = null;

function mount(ctx) {
	const root = document.documentElement;
	const unmountAicueAdapter = mountAicueAdapter();
	const settings = { boot: true, maximized: true, wallpaper: 'bliss', ...(ctx.settings || {}) };
	/** 本主题创建的所有节点，teardown 时一把清掉 */
	const nodes = [];
	/** [target, type, handler, options] */
	const listeners = [];
	const timers = [];

	function own(node) {
		nodes.push(node);
		return node;
	}

	function on(target, type, handler, options) {
		target.addEventListener(type, handler, options);
		listeners.push([target, type, handler, options]);
	}

	function applyRootClasses() {
		root.classList.toggle('xp-max', settings.maximized !== false);
		for (const { value } of WALLPAPERS) {
			root.classList.toggle('xp-wall-' + value, settings.wallpaper === value);
		}
	}

	function save(key, value) {
		settings[key] = value;
		ctx.setSetting?.(key, value);
	}

	/* ---------- 窗口状态 ---------- */
	function setMaximized(value) {
		save('maximized', value);
		applyRootClasses();
		syncTaskButton();
		refreshMaxGlyph();
	}

	function setMinimized(value) {
		root.classList.toggle('xp-min', value);
		syncTaskButton();
	}

	const isMinimized = () => root.classList.contains('xp-min');

	function setWallpaper(value) {
		save('wallpaper', value);
		applyRootClasses();
	}

	function toggleBoot() {
		save('boot', !settings.boot);
		ctx.toast(`开机动画已${settings.boot ? '开启' : '关闭'}，下次刷新生效。`, 'info');
	}

	/* ---------- 开机动画 ---------- */
	function showBoot() {
		root.classList.add('xp-booting');
		const boot = own(el('div', { class: 'xp-boot' }, [
			el('div', { class: 'xp-boot-logo' }, [
				el('div', { class: 'xp-boot-flag' }),
				el('div', { class: 'xp-boot-word' }, [
					document.createTextNode('Windows '),
					el('b', { text: 'XP' }),
					el('small', { text: 'YuHeng Edition' }),
				]),
			]),
			el('div', { class: 'xp-boot-bar' }),
			el('div', { class: 'xp-boot-hint', text: '正在启动论坛…' }),
		]));
		const done = () => {
			boot.remove();
			root.classList.remove('xp-booting');
		};
		boot.addEventListener('animationend', (ev) => {
			if (ev.animationName === 'xp-boot-out') done();
		});
		// 动画事件没触发时的兜底（reduced-motion 或后台标签页节流）
		timers.push(setTimeout(done, 4200));
		boot.addEventListener('click', done);
		(document.body || root).append(boot);
	}
	/* ---------- 菜单定义 ---------- */
	// 每次打开时重新构造，勾选标记才能反映当前状态。
	function menus() {
		const view = [
			['论坛首页', () => go('/')],
			['全部讨论', () => go('/all')],
			['标签', () => go('/tags')],
		];
		if (knownSite()) view.push(['-'], ['切换站点…', switchSite]);
		view.push(
			['-'],
			['最小化', () => setMinimized(true)],
			[settings.maximized ? '向下还原' : '最大化', () => setMaximized(!settings.maximized)],
		);
		return {
			文件: [
				['新建讨论', () => clickSelector('.item-newDiscussion button, .item-newDiscussion a')],
				['刷新', () => location.reload()],
				['-'],
				['关闭窗口', closeWindow],
			],
			查看: view,
			工具: [
				['搜索…', () => focusSelector('.Search-input input, .Header-secondary input[type=search]')],
				['通知', () => clickSelector('.NotificationsDropdown > button, .NotificationsDropdown .Dropdown-toggle')],
				['-'],
				...WALLPAPERS.map(({ value, label }) => [
					`壁纸：${label}${tick(settings.wallpaper === value)}`,
					() => setWallpaper(value),
				]),
			],
			帮助: [
				['玉衡主题面板…', () => ctx.openPanel()],
				['关于…', () => ctx.openAbout()],
				['开机动画' + tick(settings.boot), toggleBoot],
				['-'],
				['关闭 XP 主题', () => ctx.disableTheme()],
			],
		};
	}

	const tick = (on) => (on ? '　✓' : '');

	function go(path) {
		location.href = location.origin + path;
	}

	function clickSelector(selector) {
		document.querySelector(selector)?.click();
	}

	function focusSelector(selector) {
		const node = document.querySelector(selector);
		if (!node) return;
		node.focus();
		node.select?.();
	}

	function knownSite() {
		const here = location.hostname === 'aicue.top' ? 'www.aicue.top' : location.hostname;
		return SITES.some((site) => site.host === here);
	}

	function switchSite() {
		const here = location.hostname === 'aicue.top' ? 'www.aicue.top' : location.hostname;
		const other = SITES.find((site) => site.host !== here) || SITES[1];
		const mine = SITES.find((site) => site.host === here);
		ctx.confirm({
			title: '切换站点',
			heading: `要切换到${other.name}吗？`,
			body: [
				'当前：' + (mine ? `${mine.name}（${mine.host}）` : here || '本地预览'),
				`目标：${other.name}（${other.host}）`,
				'当前页面路径会一并带过去。',
			],
			confirmText: '切换',
			onConfirm: () => {
				location.href = `https://${other.host}${location.pathname}${location.search}${location.hash}`;
			},
		});
	}

	function closeWindow() {
		ctx.confirm({
			title: '关闭窗口',
			heading: '要关闭这扇窗口吗？',
			body: '这会最小化窗口到任务栏（浏览器不允许脚本直接关闭标签页）。',
			confirmText: '最小化',
			onConfirm: () => setMinimized(true),
		});
	}

	function shutdown() {
		ctx.dialog({
			title: '关闭计算机',
			heading: '要注销并离开论坛吗？',
			body: '「注销」会退出当前账号，「关闭」仅最小化窗口。',
			buttons: [
				['注销', () => clickSelector('#header-secondary .SessionDropdown a[href*="logout"], a[href*="/logout"]'), true],
				['关闭', () => setMinimized(true), false],
				['取消', null, false],
			],
		});
	}
	/* ---------- 窗口 chrome（标题栏 + 菜单栏） ---------- */
	let titleTextNode = null;
	let maxButton = null;

	function documentTitle() {
		const siteName = document.querySelector('.Header-title')?.textContent?.trim() || location.hostname;
		const raw = (document.title || siteName).trim();
		return raw || siteName;
	}

	function syncTitle() {
		const title = documentTitle();
		if (titleTextNode) titleTextNode.textContent = title;
		const label = document.querySelector('#xp-task-label');
		if (label) label.textContent = title;
	}

	function refreshMaxGlyph() {
		if (!maxButton) return;
		maxButton.textContent = '';
		maxButton.append(glyph(settings.maximized ? 'restore' : 'max'));
	}

	function buildChrome() {
		const logo = document.querySelector('.Header-logo');
		const icon = el('img', {
			class: 'xp-titlebar-icon',
			src: logo?.getAttribute('src') || location.origin + '/favicon.ico',
			alt: '',
		});
		titleTextNode = el('div', { class: 'xp-titlebar-text', text: documentTitle() });

		maxButton = el('button', {
			class: 'xp-tbtn', type: 'button', title: '最大化 / 向下还原',
			onclick: () => setMaximized(!settings.maximized),
		}, [glyph(settings.maximized ? 'restore' : 'max')]);

		const titlebar = el('div', { class: 'xp-titlebar' }, [
			icon,
			titleTextNode,
			el('div', { class: 'xp-titlebar-buttons' }, [
				el('button', { class: 'xp-tbtn', type: 'button', title: '最小化', onclick: () => setMinimized(true) }, [glyph('min')]),
				maxButton,
				el('button', { class: 'xp-tbtn xp-tbtn--close', type: 'button', title: '关闭', onclick: closeWindow }, [glyph('close')]),
			]),
		]);
		// 双击标题栏 = 最大化切换，和 XP 一致
		titlebar.addEventListener('dblclick', (ev) => {
			if (ev.target.closest('.xp-tbtn')) return;
			setMaximized(!settings.maximized);
		});

		const menubar = el('div', { class: 'xp-menubar' });
		for (const name of Object.keys(menus())) {
			menubar.append(el('button', {
				class: 'xp-menubar-item', type: 'button', text: name,
				onclick: (ev) => {
					ev.stopPropagation();
					const rect = ev.currentTarget.getBoundingClientRect();
					openContextMenu(menus()[name], rect.left, rect.bottom);
				},
			}));
		}
		menubar.append(el('div', { class: 'xp-menubar-spacer' }));
		menubar.append(el('div', { class: 'xp-menubar-clock', text: '玉衡' }));

		const chrome = own(el('div', { class: 'xp-chrome' }, [titlebar, menubar]));
		document.body.append(chrome);
	}

	/* ---------- 右键 / 下拉菜单 ---------- */
	let ctxMenu = null;

	function closeContextMenu() {
		ctxMenu?.remove();
		ctxMenu = null;
	}

	function openContextMenu(items, x, y) {
		closeContextMenu();
		const menu = own(el('div', { class: 'xp-ctx xp-open' }));
		for (const [label, handler] of items) {
			if (label === '-') {
				menu.append(el('div', { class: 'xp-mi-sep' }));
				continue;
			}
			menu.append(el('button', {
				class: 'xp-mi', type: 'button', text: label,
				onclick: () => {
					closeContextMenu();
					handler?.();
				},
			}));
		}
		document.body.append(menu);
		// 贴边翻转，避免菜单跑出视口
		const rect = menu.getBoundingClientRect();
		const taskbar = parseInt(getComputedStyle(root).getPropertyValue('--xp-taskbar-h'), 10) || 34;
		const left = Math.min(x, window.innerWidth - rect.width - 4);
		const maxTop = window.innerHeight - rect.height - taskbar - 4;
		menu.style.left = Math.max(2, left) + 'px';
		menu.style.top = Math.min(y, Math.max(4, maxTop)) + 'px';
		ctxMenu = menu;
		return menu;
	}
	/* ---------- 任务栏 ---------- */
	function buildTaskbar() {
		const start = el('button', { class: 'xp-start', type: 'button', id: 'xp-start' }, [
			el('span', { class: 'xp-start-flag' }),
			document.createTextNode('开始'),
		]);
		start.addEventListener('click', (ev) => {
			ev.stopPropagation();
			toggleStartMenu();
		});

		const taskBtn = el('button', {
			class: 'xp-task xp-active', type: 'button', id: 'xp-task',
			onclick: () => setMinimized(!isMinimized()),
		}, [
			el('span', { class: 'xp-mi-icon', text: '■' }),
			el('span', { class: 'xp-task-label', id: 'xp-task-label', text: documentTitle() }),
		]);

		const clock = el('span', { class: 'xp-clock', text: formatTime() });
		const tray = el('div', { class: 'xp-tray' }, [
			el('span', {
				class: 'xp-tray-icon', title: '通知', text: '✉',
				onclick: () => clickSelector('.NotificationsDropdown > button, .NotificationsDropdown .Dropdown-toggle'),
			}),
			el('span', { class: 'xp-tray-icon', title: '玉衡主题面板', text: '⚙', onclick: () => ctx.openPanel() }),
			clock,
		]);

		own(el('div', { class: 'xp-taskbar' }, [start, el('div', { class: 'xp-tasks' }, [taskBtn]), tray]));
		document.body.append(nodes[nodes.length - 1]);

		const timer = setInterval(() => {
			clock.textContent = formatTime();
		}, 15000);
		timers.push(timer);
	}

	function formatTime() {
		return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
	}

	function syncTaskButton() {
		document.querySelector('#xp-task')?.classList.toggle('xp-active', !isMinimized());
	}

	/* ---------- 开始菜单 ---------- */
	let startMenu = null;

	function currentUser() {
		const link = document.querySelector('#header-secondary .SessionDropdown .Dropdown-toggle, .SessionDropdown .Dropdown-toggle');
		const name = link?.querySelector('.username, .Button-label')?.textContent?.trim();
		const avatar = link?.querySelector('.Avatar img')?.getAttribute('src') || null;
		return { name: name || '访客', avatar, loggedIn: Boolean(link) };
	}

	function buildStartMenu() {
		const user = currentUser();
		const head = el('div', { class: 'xp-startmenu-head' }, [
			user.avatar
				? el('img', { src: user.avatar, alt: '' })
				: el('div', { class: 'xp-startmenu-avatar', text: user.name.slice(0, 1).toUpperCase() }),
			el('span', { text: user.name }),
		]);

		const left = el('div', { class: 'xp-startmenu-col' }, [
			el('div', { class: 'xp-startmenu-title', text: '论坛' }),
			mi('🏠', '首页', () => go('/')),
			mi('📄', '全部讨论', () => go('/all')),
			mi('🏷', '标签', () => go('/tags')),
			mi('✎', '新建讨论', () => clickSelector('.item-newDiscussion button, .item-newDiscussion a')),
			el('div', { class: 'xp-mi-sep' }),
			mi('🔍', '搜索', () => focusSelector('.Search-input input, .Header-secondary input[type=search]')),
			mi('✉', '通知', () => clickSelector('.NotificationsDropdown > button, .NotificationsDropdown .Dropdown-toggle')),
			knownSite() ? mi('🌐', '切换站点', switchSite) : null,
		].filter(Boolean));

		const right = el('div', { class: 'xp-startmenu-col xp-startmenu-col--right' }, [
			el('div', { class: 'xp-startmenu-title', text: '主题' }),
			mi('🖼', '更换壁纸', (ev) => {
				const rect = ev.currentTarget.getBoundingClientRect();
				closeStartMenu();
				openContextMenu(menus().工具.slice(-WALLPAPERS.length), rect.right - 40, rect.top);
			}),
			mi('🗗', settings.maximized ? '向下还原' : '最大化窗口', () => setMaximized(!settings.maximized)),
			mi('🗕', '最小化窗口', () => setMinimized(true)),
			el('div', { class: 'xp-mi-sep' }),
			mi('⏱', '开机动画' + tick(settings.boot), toggleBoot),
			mi('🌟', '玉衡主题面板', () => ctx.openPanel()),
			mi('ℹ', '关于', () => ctx.openAbout()),
			mi('✖', '关闭 XP 主题', () => ctx.disableTheme()),
		]);

		const menu = own(el('div', { class: 'xp-startmenu' }, [
			head,
			el('div', { class: 'xp-startmenu-body' }, [left, right]),
			el('div', { class: 'xp-startmenu-foot' }, [mi('⏻', '关闭计算机', shutdown)]),
		]));
		menu.addEventListener('click', (ev) => ev.stopPropagation());
		document.body.append(menu);
		return menu;
	}

	function mi(icon, label, handler) {
		return el('button', {
			class: 'xp-mi', type: 'button',
			onclick: (ev) => {
				if (!handler) return;
				const keepOpen = handler(ev);
				if (!keepOpen) closeStartMenu();
			},
		}, [el('span', { class: 'xp-mi-icon', text: icon }), el('span', { text: label })]);
	}

	function toggleStartMenu() {
		if (startMenu?.classList.contains('xp-open')) {
			closeStartMenu();
			return;
		}
		// 用户信息可能登录后才出现，每次重建保证是最新的
		startMenu?.remove();
		startMenu = buildStartMenu();
		startMenu.classList.add('xp-open');
		document.querySelector('#xp-start')?.classList.add('xp-open');
	}

	function closeStartMenu() {
		startMenu?.classList.remove('xp-open');
		document.querySelector('#xp-start')?.classList.remove('xp-open');
	}

	/* ---------- 桌面图标（最小化后可见） ---------- */
	function buildDesktop() {
		const icons = [
			['🖥', '我的论坛', () => setMinimized(false)],
			['📄', '全部讨论', () => go('/all')],
			['🏷', '标签', () => go('/tags')],
			['🗑', '回收站', () => ctx.alert('回收站是空的。')],
		];
		const desktop = own(el('div', { class: 'xp-desktop' },
			icons.map(([glyphText, label, handler]) => el('button', {
				class: 'xp-dicon', type: 'button', ondblclick: handler,
				onclick: (ev) => ev.currentTarget.focus(),
			}, [
				el('span', { class: 'xp-dicon-glyph', text: glyphText }),
				el('span', { text: label }),
			]))));
		document.body.append(desktop);
	}
	/* ---------- 全局交互 ---------- */
	function bindGlobal() {
		on(document, 'click', () => {
			closeStartMenu();
			closeContextMenu();
		});

		on(document, 'keydown', (ev) => {
			if (ev.key === 'Escape') {
				closeStartMenu();
				closeContextMenu();
			}
			// Ctrl+Alt+X：一键开关本站主题（沿用旧脚本的快捷键）
			if (ev.ctrlKey && ev.altKey && (ev.key === 'x' || ev.key === 'X')) {
				ev.preventDefault();
				ctx.disableTheme();
			}
		});

		// 桌面空白处右键 → XP 桌面菜单
		on(document, 'contextmenu', (ev) => {
			const onChrome = ev.target.closest(
				'#app, .xp-chrome, .xp-taskbar, .xp-startmenu, .Modal, .Composer, #yh-shell',
			);
			if (onChrome) return;
			ev.preventDefault();
			openContextMenu([
				['刷新(E)', () => location.reload()],
				['-'],
				...WALLPAPERS.map(({ value, label }) => [`壁纸：${label}${tick(settings.wallpaper === value)}`, () => setWallpaper(value)]),
				['-'],
				['玉衡主题面板…', () => ctx.openPanel()],
				['属性(R)', () => ctx.openAbout()],
			], ev.clientX, ev.clientY);
		});

		// Flarum 是 SPA，标题随路由变化，同步到标题栏与任务栏按钮
		const titleNode = document.querySelector('title');
		if (titleNode) {
			const observer = new MutationObserver(syncTitle);
			observer.observe(titleNode, { childList: true });
			titleObserver = observer;
		}
		on(window, 'popstate', () => timers.push(setTimeout(syncTitle, 60)));
	}

	let titleObserver = null;

	/* ---------- 启动 ---------- */
	applyRootClasses();
	if (settings.boot) showBoot();

	const start = () => {
		buildDesktop();
		buildChrome();
		buildTaskbar();
		bindGlobal();
		syncTitle();
	};
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, { once: true });
		listeners.push([document, 'DOMContentLoaded', start, { once: true }]);
	} else {
		start();
	}

	live = {
		onSetting(key, value) {
			settings[key] = value;
			if (key === 'wallpaper' || key === 'maximized') {
				applyRootClasses();
				refreshMaxGlyph();
				syncTaskButton();
				return true;
			}
			// boot 只影响下次加载，就地无事可做，但也不需要重载
			return true;
		},
	};

	return function teardown() {
		live = null;
		for (const [target, type, handler, options] of listeners) {
			target.removeEventListener(type, handler, options);
		}
		for (const timer of timers) {
			clearTimeout(timer);
			clearInterval(timer);
		}
		titleObserver?.disconnect();
		unmountAicueAdapter();
		for (const node of nodes) node.remove();
		root.classList.remove('xp-max', 'xp-min', 'xp-booting', ...WALLPAPERS.map((w) => 'xp-wall-' + w.value));
	};
}

/* ---------- 小工具 ---------- */
function el(tag, attrs, children) {
	const node = document.createElement(tag);
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			if (value === null || value === undefined || value === false) continue;
			if (key === 'class') node.className = value;
			else if (key === 'text') node.textContent = value;
			else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
			else node.setAttribute(key, value === true ? '' : String(value));
		}
	}
	for (const child of [].concat(children || [])) {
		if (child === null || child === undefined || child === false) continue;
		node.append(child);
	}
	return node;
}

/** 标题栏按钮里的最小化 / 还原 / 关闭图形，纯 SVG，不依赖字体。 */
function glyph(kind) {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('viewBox', '0 0 10 10');
	const path = document.createElementNS(SVG_NS, 'path');
	path.setAttribute('d', {
		min: 'M1 8h8',
		max: 'M1.5 1.5h7v7h-7z',
		restore: 'M1 4h5v5H1zM4 1h5v5',
		close: 'M1 1l8 8M9 1l-8 8',
	}[kind]);
	svg.append(path);
	return svg;
}

/** 旧版 xpw:* localStorage → 新 schema 的一次性迁移。 */
export const XP_LEGACY_KEYS = Object.freeze({
	enabled: 'xpw:enabled',
	boot: 'xpw:boot',
	wallpaper: 'xpw:wallpaper',
	maximized: 'xpw:maximized',
});
