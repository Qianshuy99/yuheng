// 导入 / 导出对话框。
// 导入分两步：先校验（validate.js），把危险构造直接拒掉；通过后再展示一次确认页，
// 列出主题信息与「会向哪些站外域名发请求」，用户点确认才真正写入。
import { el } from './dom.js';
import { validateTheme, serializeTheme } from '../validate.js';
import { dialog } from './dialog.js';
import { toast } from './toast.js';

/**
 * @param {(theme: object) => boolean} onAccept 返回 false 表示写入失败
 */
export function openImportDialog(onAccept) {
	const textarea = el('textarea', {
		placeholder: '把主题包 JSON 粘贴到这里，或把 .json 文件拖进下面的区域',
		spellcheck: 'false',
	});
	const drop = el('div', { class: 'yh-drop', text: '或将 .json 文件拖放到此处' });
	const errorBox = el('div', { style: 'display:none;' });

	drop.addEventListener('dragover', (ev) => {
		ev.preventDefault();
		drop.classList.add('yh-drop-over');
	});
	drop.addEventListener('dragleave', () => drop.classList.remove('yh-drop-over'));
	drop.addEventListener('drop', (ev) => {
		ev.preventDefault();
		drop.classList.remove('yh-drop-over');
		const file = ev.dataTransfer?.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			textarea.value = String(reader.result || '');
			drop.textContent = `已读入 ${file.name}`;
		};
		reader.onerror = () => toast('文件读取失败', 'error');
		reader.readAsText(file);
	});

	const close = dialog({
		title: '导入主题',
		heading: '玉衡只接受纯 CSS 主题包',
		body: [
			el('p', { text: '包内不允许携带 JavaScript；@import、expression()、javascript: 等构造会被拒绝。' }),
			textarea,
			drop,
			errorBox,
		],
		buttons: [
			['校验并导入', () => {
				const result = parseAndValidate(textarea.value);
				if (!result.ok) {
					showErrors(errorBox, result.errors);
					return true; // 留在当前对话框，让用户改
				}
				close();
				confirmImport(result, onAccept);
				return false;
			}, true],
			['取消', null, false],
		],
	});
	return close;
}

function parseAndValidate(text) {
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		return { ok: false, errors: [`JSON 解析失败：${err.message}`] };
	}
	return validateTheme(parsed);
}

function showErrors(box, errors) {
	box.textContent = '';
	box.style.display = '';
	box.append(
		el('div', { class: 'yh-dlg-err' }, [
			el('div', { text: '这个主题包不能导入：' }),
			el('ul', {}, errors.map((line) => el('li', { text: line }))),
		]),
	);
}

function confirmImport({ theme, warnings, hosts }, onAccept) {
	const body = [
		el('div', { class: 'yh-kv' }, [el('b', { text: '名称' }), el('span', { text: theme.name })]),
		el('div', { class: 'yh-kv' }, [el('b', { text: 'ID' }), el('span', { text: theme.id })]),
		el('div', { class: 'yh-kv' }, [el('b', { text: '版本' }), el('span', { text: `v${theme.version}` })]),
		el('div', { class: 'yh-kv' }, [el('b', { text: '作者' }), el('span', { text: theme.author })]),
		el('div', { class: 'yh-kv' }, [el('b', { text: '匹配' }), el('span', { text: theme.match.join('\n') })]),
		el('div', { class: 'yh-kv' }, [
			el('b', { text: '体积' }),
			el('span', { text: `${(new TextEncoder().encode(theme.css).length / 1024).toFixed(1)} KB CSS` }),
		]),
	];

	if (theme.description) body.push(el('p', { text: theme.description }));

	// CSS 拿不到页面数据，但 url() 外链请求是一个真实的可观测信道：
	// 对方服务器能看到你什么时候打开了哪个站。不阻止，但必须让用户知道。
	if (hosts.length) {
		body.push(
			el('div', { class: 'yh-dlg-note' }, [
				el('div', { text: '该主题会向以下站外域名发起请求，可被用于记录你的访问：' }),
				el('ul', {}, hosts.map((host) => el('li', { text: host }))),
			]),
		);
	}
	if (warnings.length) {
		body.push(
			el('div', { class: 'yh-dlg-note' }, [
				el('div', { text: '导入时做了这些清理：' }),
				el('ul', {}, warnings.map((line) => el('li', { text: line }))),
			]),
		);
	}

	dialog({
		title: '确认导入主题',
		heading: `导入「${theme.name}」？`,
		body,
		buttons: [
			['导入', () => {
				if (onAccept(theme) !== false) toast(`${theme.name} 已导入`, 'ok');
			}, true],
			['取消', null, false],
		],
	});
}

/** 导出：直接给出 JSON 供复制 / 下载。剪贴板可能没权限，所以文本框始终可见。 */
export function openExportDialog(theme) {
	const json = JSON.stringify(serializeTheme(theme), null, 2);
	const textarea = el('textarea', { spellcheck: 'false', style: 'min-height:200px;' });
	textarea.value = json;

	dialog({
		title: '导出主题',
		heading: `${theme.name} v${theme.version || '0.0.0'}`,
		body: [
			el('p', { text: '下面是可分发的主题包 JSON（纯 CSS，壁纸等资源已内联为 data URI）。' }),
			textarea,
		],
		buttons: [
			['下载 .json', () => download(`${theme.id}.json`, json), true],
			['复制', () => {
				navigator.clipboard?.writeText(json).then(
					() => toast('已复制到剪贴板', 'ok'),
					() => toast('复制失败，请手动选中文本框内容', 'warn'),
				);
				return true; // 复制后留在对话框，方便手动兜底
			}, false],
			['关闭', null, false],
		],
	});
}

function download(filename, text) {
	const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
	const link = el('a', { href: url, download: filename });
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
