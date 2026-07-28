// Dubhe Core 自检：在无头 Chrome 里跑 preview 页面，用注入的断言脚本验证
//   1. 主题挂载后 <style#yh-theme-style> 存在、root class 正确
//   2. 切到「不使用主题」后两个 <style> 与所有 root class / 主题 DOM 都消失
//   3. 再切回来能重新挂上（mount/unmount 幂等）
//   4. host 维度的选择写进了 yh:config.activeByHost
//   5. 校验器拒绝带 JS 的包、@import、超限 CSS
//
// 用法：node scripts/selfcheck.mjs
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const profileDir = path.join(root, '.chrome-profile');

const CANDIDATES = [
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
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

function dumpDom(browser, url) {
	return new Promise((resolve, reject) => {
		const child = spawn(browser, [
			'--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
			'--allow-file-access-from-files', `--user-data-dir=${profileDir}`,
			'--virtual-time-budget=6000', '--dump-dom', url,
		], { stdio: ['ignore', 'pipe', 'ignore'] });
		let out = '';
		child.stdout.on('data', (chunk) => { out += chunk; });
		child.on('error', reject);
		child.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`chrome 退出码 ${code}`))));
	});
}

const browser = await findBrowser();
if (!browser) {
	console.error('找不到 Chrome / Edge，无法自检。');
	process.exit(1);
}

// ?reset 让每次自检都从干净存储开始，否则上一轮写下的 activeByHost 会影响初始状态
const url = pathToFileURL(path.join(root, 'preview', 'selfcheck.html')).href + '?reset';
const dom = await dumpDom(browser, url);
const match = /<pre id="result">([\s\S]*?)<\/pre>/.exec(dom);
if (!match) {
	console.error('自检页面没有产出结果，页面本身可能报错了。');
	process.exit(1);
}

const lines = match[1]
	.replace(/&lt;/g, '<')
	.replace(/&gt;/g, '>')
	.replace(/&amp;/g, '&')
	.trim()
	.split('\n');

let failed = 0;
for (const line of lines) {
	console.log(line);
	if (line.startsWith('FAIL')) failed += 1;
}
console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
