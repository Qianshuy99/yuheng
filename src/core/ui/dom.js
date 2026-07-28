// 外壳 UI 的公用 DOM 助手。沿用旧脚本里的 el() 风格，避免 innerHTML 拼字符串
// （外壳要显示主题名、作者名等来自导入包的文本，用 textContent 才不会被注入 HTML）。

export function el(tag, attrs, children) {
	const node = document.createElement(tag);
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			if (value === null || value === undefined || value === false) continue;
			if (key === 'class') node.className = value;
			else if (key === 'text') node.textContent = value;
			else if (key === 'style') node.setAttribute('style', value);
			else if (key.startsWith('on') && typeof value === 'function') {
				node.addEventListener(key.slice(2), value);
			} else node.setAttribute(key, value === true ? '' : String(value));
		}
	}
	for (const child of [].concat(children || [])) {
		if (child === null || child === undefined || child === false) continue;
		node.append(child);
	}
	return node;
}

/** 外壳的所有节点都挂在这个容器里，卸载时一把清掉。 */
export function shellRoot() {
	let root = document.getElementById('yh-shell');
	if (!root) {
		root = el('div', { id: 'yh-shell' });
		(document.body || document.documentElement).append(root);
	}
	return root;
}

export function removeShell() {
	document.getElementById('yh-shell')?.remove();
}
