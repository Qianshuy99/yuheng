// 截图回归：用系统里的 Chrome 无头模式给预览样板拍照。
// 靠样板页的 hash 钩子驱动 UI（#start 展开开始菜单、#panel 打开玉衡面板…），
// 所以这里只负责传 URL、等虚拟时间、收文件。
//
// 用法：node scripts/shots.mjs [名字...]    不传参数就拍全部
import { spawn } from 'node:child_process';
import { access, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const outDir = path.join(root, 'preview', 'shots');
/** 无头 Chrome 用的一次性 profile，避免和用户已开的浏览器抢锁。 */
const profileDir = path.join(root, '.chrome-profile');
/** hash 钩子在开机动画结束后才动手，再给面板动画留时间，所以虚拟时间给得比较宽。 */
const VIRTUAL_TIME = 5000;
const VIEWPORT = '1440,900';

const CANDIDATES = [
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
];

const SHOTS = [
	{ name: 'home', page: 'index.html', hash: '' },
	// 开机动画 2.4s 后开始淡出，所以这张要在那之前抢拍
	{ name: 'boot', page: 'index.html', hash: '#boot', time: 1200 },
	{ name: 'start', page: 'index.html', hash: '#start' },
	{ name: 'min', page: 'index.html', hash: '#min' },
	{ name: 'restore', page: 'index.html', hash: '#restore' },
	{ name: 'panel', page: 'index.html', hash: '#panel' },
	{ name: 'session', page: 'index.html', hash: '#session' },
	{ name: 'import', page: 'index.html', hash: '#import' },
	{ name: 'about', page: 'index.html', hash: '#about' },
	{ name: 'site', page: 'index.html', hash: '#site' },
	{ name: 'discussion', page: 'discussion.html', hash: '' },
	// 写作中的回复框：不能被任务栏压住。
	// 注意别在截图里滚页面：无头 Chrome 把 position:fixed 画在 scrollY + top 上，
	// 一滚窗口边框/任务栏就整体下移，截出来的图是假的。滚动相关的断言放 selfcheck。
	{ name: 'composer', page: 'discussion.html', hash: '#composer' },
];

async function findBrowser() {
	for (const candidate of CANDIDATES) {
		try {
			await access(candidate);
			return candidate;
		} catch (err) {
			/* 试下一个 */
		}
	}
	return null;
}

function shoot(browser, url, file, virtualTime = VIRTUAL_TIME) {
	return new Promise((resolve, reject) => {
		const child = spawn(browser, [
			'--headless=new',
			'--disable-gpu',
			'--hide-scrollbars',
			'--no-first-run',
			'--no-default-browser-check',
			'--allow-file-access-from-files',
			// 不给独立 profile 时 Chrome 会因为已有实例占用而以 21 退出
			`--user-data-dir=${profileDir}`,
			`--window-size=${VIEWPORT}`,
			`--virtual-time-budget=${virtualTime}`,
			`--screenshot=${file}`,
			url,
		], { stdio: 'ignore' });
		child.on('error', reject);
		child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`chrome 退出码 ${code}`))));
	});
}

const only = process.argv.slice(2);
const list = only.length ? SHOTS.filter((shot) => only.includes(shot.name)) : SHOTS;
if (!list.length) {
	console.error(`没有匹配的截图名。可用：${SHOTS.map((s) => s.name).join(', ')}`);
	process.exit(1);
}

const browser = await findBrowser();
if (!browser) {
	console.error('找不到 Chrome / Edge，无法截图。装一个或手动打开 preview/index.html。');
	process.exit(1);
}

await mkdir(outDir, { recursive: true });
for (const shot of list) {
	// ?reset 让每张图从干净存储开始，否则上一张点过的开关会漏到下一张
	const url = pathToFileURL(path.join(root, 'preview', shot.page)).href + '?reset' + shot.hash;
	const file = path.join(outDir, `shot-${shot.name}.png`);
	await rm(file, { force: true });
	await shoot(browser, url, file, shot.time);
	const size = (await stat(file)).size;
	console.log(`shot-${shot.name}.png  ${(size / 1024).toFixed(1)} KB`);
}
