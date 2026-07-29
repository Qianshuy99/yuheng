import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const json = async (file) => JSON.parse(await read(file));
const failures = [];
const check = (condition, message) => {
	if (!condition) failures.push(message);
};

const [{ BRAND }, pkg, distManifest, userscript, docs, readme, pagesWorkflow, catalog] = await Promise.all([
	import(new URL('../src/brand.js', import.meta.url)),
	json('package.json'),
	json('dist/manifest.json'),
	read('dist/yuheng.user.js'),
	read('docs/index.html'),
	read('README.md'),
	read('.github/workflows/pages.yml'),
	json('themes/catalog.json'),
]);

const updateUrl = 'https://qianshuy99.github.io/yuheng/yuheng.user.js';
const versionedFile = `yuheng-${BRAND.version}.user.js`;
const installUrl = `https://qianshuy99.github.io/yuheng/${versionedFile}`;
check(pkg.version === BRAND.version, `package.json=${pkg.version}，品牌版本=${BRAND.version}`);
check(distManifest.version === BRAND.version, `dist manifest=${distManifest.version}，品牌版本=${BRAND.version}`);
check(userscript.includes(`// @version     ${BRAND.version}`), 'userscript @version 未同步');
check(userscript.includes(`// @updateURL   ${updateUrl}`), 'userscript @updateURL 未同步');
check(userscript.includes(`// @downloadURL ${updateUrl}`), 'userscript @downloadURL 未同步');
check(docs.includes(`href="./${versionedFile}"`), '使用文档安装链接未同步');
check(docs.includes(`YuHeng v${BRAND.version} · Dubhe Core`), '使用文档页脚版本未同步');
check(readme.includes(`](${installUrl})`), 'README 安装链接未同步');
check(pagesWorkflow.includes(`cp dist/yuheng.user.js _site/yuheng.user.js`), 'Pages 缺少稳定更新文件');
check(pagesWorkflow.includes(`cp dist/yuheng.user.js _site/${versionedFile}`), 'Pages 缺少版本化安装文件');

for (const entry of catalog.themes || []) {
	check(/^[a-z0-9._-]+\/[a-z0-9._-]+\.theme\.json$/i.test(entry.path || ''), `${entry.id}: path 无效`);
	if (!entry.path) continue;

	const themeFile = path.posix.join('themes', entry.path);
	const themeText = await read(themeFile);
	const theme = JSON.parse(themeText);
	const manifest = await json(path.posix.join(path.posix.dirname(themeFile), 'manifest.json'));
	const bytes = Buffer.from(themeText, 'utf8');
	const sha256 = createHash('sha256').update(bytes).digest('hex');
	const gzip = gzipSync(bytes).length;

	check(theme.id === entry.id, `${entry.id}: 目录与主题包 id 不一致`);
	check(theme.version === entry.version, `${entry.id}: 目录=${entry.version}，主题包=${theme.version}`);
	check(entry.sha256 === sha256, `${entry.id}: 目录 SHA-256 不一致`);
	check(manifest.id === theme.id, `${entry.id}: manifest id 不一致`);
	check(manifest.version === theme.version, `${entry.id}: manifest=${manifest.version}，主题包=${theme.version}`);
	check(manifest.bytes === bytes.length, `${entry.id}: manifest bytes 不一致`);
	check(manifest.gzip === gzip, `${entry.id}: manifest gzip 不一致`);
	check(manifest.sha256 === sha256, `${entry.id}: manifest SHA-256 不一致`);
}

if (failures.length) {
	console.error(failures.map((message) => `FAIL ${message}`).join('\n'));
	process.exit(1);
}

console.log(`发布元数据一致：玉衡 v${BRAND.version}，${catalog.themes?.length || 0} 个官方主题。`);
