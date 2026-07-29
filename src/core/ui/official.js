// 固定官方主题库。目录和主题包都来自同一个仓库，包仍须通过本地校验才会安装。
import { el } from './dom.js';
import { dialog } from './dialog.js';
import { toast } from './toast.js';
import { validateTheme } from '../validate.js';
import { BRAND } from '../../brand.js';

const OFFICIAL_ROOT = 'https://raw.githubusercontent.com/Qianshuy99/yuheng/main/themes/';

export const OFFICIAL_CATALOG_URL = officialUrl('catalog.json', BRAND.version);

export function openOfficialCatalog(onAccept) {
	const loading = dialog({
		title: '官方主题库',
		heading: '正在获取主题目录…',
		body: el('p', { text: '目录固定托管在 Qianshuy99/yuheng。' }),
		buttons: [['关闭', null, false]],
	});

	loadCatalog()
		.then((catalog) => {
			loading();
			showCatalog(catalog, onAccept);
		})
		.catch((error) => {
			loading();
			toast(`无法获取官方主题库：${error.message}`, 'error', 5000);
		});
}

async function loadCatalog() {
	const catalog = JSON.parse(await fetchOfficialText('catalog.json', BRAND.version));
	if (!Array.isArray(catalog?.themes)) throw new Error('目录格式无效');
	return catalog.themes.filter(isCatalogEntry);
}

function isCatalogEntry(entry) {
	return entry
		&& typeof entry.id === 'string'
		&& typeof entry.name === 'string'
		&& typeof entry.version === 'string'
		&& typeof entry.path === 'string'
		&& /^[a-z0-9._-]+\/[a-z0-9._-]+\.theme\.json$/i.test(entry.path);
}

function showCatalog(entries, onAccept) {
	const content = entries.length
		? entries.map((entry) => el('div', { class: 'yh-theme' }, [
			el('span', { class: 'yh-theme-info' }, [
				el('span', { class: 'yh-theme-name', text: entry.name }),
				el('span', { class: 'yh-theme-meta', text: `v${entry.version} · ${entry.author || '未署名'}` }),
			]),
			el('button', {
				class: 'yh-theme-del',
				type: 'button',
				title: `安装 ${entry.name}`,
				text: '安装',
				onclick: () => install(entry, onAccept),
			}),
		]))
		: el('p', { text: '官方主题库暂时没有可安装的主题。' });

	dialog({
		title: '官方主题库',
		heading: '从固定仓库安装主题',
		body: content,
		buttons: [['关闭', null, false]],
	});
}

async function install(entry, onAccept) {
	try {
		const text = await fetchOfficialText(entry.path, entry.sha256 || entry.version);
		if (entry.sha256 && await sha256(text) !== entry.sha256.toLowerCase()) {
			throw new Error('主题包校验和不匹配');
		}
		const result = validateTheme(JSON.parse(text));
		if (!result.ok) throw new Error(result.errors.join('；'));
		if (result.theme.id !== entry.id) throw new Error('主题包 id 与目录不一致');
		if (result.theme.version !== entry.version) throw new Error('主题包版本与目录不一致');
		if (onAccept(result.theme) !== false) toast(`${result.theme.name} 已从官方主题库安装`, 'ok');
	} catch (error) {
		toast(`安装失败：${error.message}`, 'error', 5000);
	}
}

function officialUrl(path, cacheKey) {
	return `${OFFICIAL_ROOT}${path}?v=${encodeURIComponent(cacheKey)}`;
}

async function fetchOfficialText(path, cacheKey) {
	try {
		const response = await fetch(officialUrl(path, cacheKey), { cache: 'no-store' });
		if (response.ok) return response.text();
		throw new Error(`HTTP ${response.status}`);
	} catch (error) {
		throw new Error(`官方源不可用（${error.message || '网络请求失败'}）`);
	}
}

async function sha256(text) {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
