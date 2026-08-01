// 预览用的 GM_* 桩。真机上油猴注入这些函数，离线预览里没有，
// 所以这里用 localStorage 顶上，并把 GM_registerMenuCommand 注册的项渲染成
// 右上角一个小面板，好验证菜单文案（🌟 玉衡：…）。
//
// 必须在 skin.js 之前加载：脚本里用 typeof GM_getValue 判断后端。
(function () {
	const PREFIX = 'gmmock:';

	window.GM_getValue = function (key, fallback) {
		try {
			const raw = localStorage.getItem(PREFIX + key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch (err) {
			return fallback;
		}
	};

	window.GM_setValue = function (key, value) {
		try {
			localStorage.setItem(PREFIX + key, JSON.stringify(value));
		} catch (err) {
			/* 预览里忽略配额错误 */
		}
	};

	window.GM_deleteValue = function (key) {
		localStorage.removeItem(PREFIX + key);
	};

	const commands = [];
	window.GM_registerMenuCommand = function (label, handler) {
		commands.push({ label, handler });
		render();
		return commands.length;
	};

	let box = null;
	let list = null;
	function render() {
		if (!box) {
			box = document.createElement('div');
			box.id = 'gm-mock-menu';
			box.style.cssText = [
				'position:fixed', 'bottom:42px', 'left:8px', 'z-index:2147483647',
				'font:12px/1.5 system-ui,sans-serif', 'background:#1b1b1b', 'color:#eee',
				'border:1px solid #444', 'border-radius:6px', 'padding:4px',
				'box-shadow:0 6px 20px rgba(0,0,0,.4)',
			].join(';');
			// 默认收起，免得盖住主题的菜单栏；hover 展开
			const title = document.createElement('button');
			title.type = 'button';
			title.textContent = '脚本菜单';
			title.style.cssText = 'background:transparent;color:inherit;border:0;font:inherit;cursor:pointer;padding:2px 6px;';
			list = document.createElement('div');
			list.style.display = 'none';
			title.addEventListener('click', () => {
				list.style.display = list.style.display === 'none' ? 'block' : 'none';
			});
			box.addEventListener('mouseenter', () => { list.style.display = 'block'; });
			box.append(title, list);
			(document.body || document.documentElement).append(box);
		}
		for (const item of commands) {
			if (item.node) continue;
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = item.label;
			button.style.cssText = [
				'display:block', 'width:100%', 'text-align:left', 'background:transparent',
				'color:inherit', 'border:0', 'padding:4px 6px', 'border-radius:4px',
				'cursor:pointer', 'font:inherit', 'white-space:nowrap',
			].join(';');
			button.addEventListener('mouseenter', () => { button.style.background = '#333'; });
			button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
			button.addEventListener('click', () => item.handler());
			item.node = button;
			list.append(button);
		}
	}

	// body 可能还不存在（document-start 语义），补一次
	if (!document.body) {
		document.addEventListener('DOMContentLoaded', () => commands.length && render(), { once: true });
	}

	// 预览重置入口：?reset 清掉 mock 存储，回到首次安装状态
	if (location.search.includes('reset')) {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith(PREFIX) || key.startsWith('xpw:')) localStorage.removeItem(key);
		}
	}

	// 截图时开机动画会盖满整屏，别的 UI 都看不见，所以默认关掉，只有 #boot 那张开。
	// 这是在脚本读配置之前写入，所以等价于「用户上次就是这么设的」。
	{
		const config = window.GM_getValue('yh:config', null) || {};
		const themeSettings = config.themeSettings || {};
		themeSettings['xp.luna'] = { ...(themeSettings['xp.luna'] || {}), boot: location.hash === '#boot' };
		window.GM_setValue('yh:config', { ...config, themeSettings });
	}
})();
