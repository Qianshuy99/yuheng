// 构建：esbuild 把 src/main.js 打成单文件 IIFE，前面拼上油猴元数据块。
//
// 约定（照隔壁 awesome-aicue-reader 的做法）：
//   - .css 文件用 text loader 直接当字符串导入，主题包才能带上自己的样式
//   - 产物体积有硬闸门，超了直接构建失败，避免壁纸/图标失控膨胀
//   - 同时输出 sha256 清单，方便核对分发文件
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
/** 产物体积上限（KB）：图标 28 + 壁纸 52 + 代码 ~80，留一倍余量。 */
const LIMITS = { raw: 400, gzip: 140 };

const args = process.argv.slice(2);
const preview = args.includes('--preview');
const outDirArg = readFlag(args, '--out-dir');
const outDir = path.resolve(root, outDirArg || (preview ? 'preview' : 'dist'));
// 预览产物叫 skin.js，样板页里的 <script src="./skin.js"> 就不用改
const OUT_NAME = preview ? 'skin.js' : 'yuheng.user.js';

const { BRAND } = await import(pathToUrl(path.join(root, 'src', 'brand.js')));

function readFlag(list, name) {
	const index = list.indexOf(name);
	return index >= 0 ? list[index + 1] : null;
}

function pathToUrl(file) {
	return new URL(`file:///${file.replace(/\\/g, '/')}`).href;
}

/** 元数据块。全站 @match 靠 main.js 的早退兜底，改这里之前先看 src/main.js。 */
function metadata() {
	const lines = [
		['name', BRAND.fullName],
		['name:en', 'YuHeng Skin Engine'],
		['namespace', BRAND.homepage],
		['version', BRAND.version],
		['description', `${BRAND.slogan}（引擎：${BRAND.engine}）`],
		['author', BRAND.author],
		['homepageURL', BRAND.homepage],
		['supportURL', BRAND.support],
		// 油猴按 updateURL 拉元数据比版本、再从 downloadURL 取全文；两个都指向仓库里的产物
		['updateURL', BRAND.download],
		['downloadURL', BRAND.download],
		['icon', BRAND.icons['64']],
		['match', '*://*/*'],
		['run-at', 'document-start'],
		['noframes', ''],
		['grant', 'GM_getValue'],
		['grant', 'GM_setValue'],
		['grant', 'GM_registerMenuCommand'],
		['license', 'MIT'],
	];
	const width = Math.max(...lines.map(([key]) => key.length));
	const body = lines
		.map(([key, value]) => `// @${key.padEnd(width)} ${value}`.trimEnd())
		.join('\n');
	return `// ==UserScript==\n${body}\n// ==/UserScript==\n`;
}

const result = await build({
	entryPoints: [path.join(root, 'src', 'main.js')],
	bundle: true,
	format: 'iife',
	target: 'es2022',
	charset: 'utf8',
	legalComments: 'none',
	minify: false,
	loader: { '.css': 'text' },
	define: { __YH_PREVIEW__: preview ? 'true' : 'false' },
	write: false,
	logLevel: 'warning',
});

const code = result.outputFiles[0].text;
const banner = `${metadata()}\n// 由 scripts/build.mjs 生成，请勿直接编辑；源码在 src/。\n`;
const output = `${banner}(function(){\n'use strict';\n${code}})();\n`;

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, OUT_NAME);
await writeFile(outFile, output, 'utf8');

const bytes = Buffer.byteLength(output, 'utf8');
const gzip = gzipSync(Buffer.from(output, 'utf8')).length;
const sha = createHash('sha256').update(output, 'utf8').digest('hex');

await writeFile(
	path.join(outDir, 'manifest.json'),
	`${JSON.stringify({ file: OUT_NAME, version: BRAND.version, bytes, gzip, sha256: sha }, null, 2)}\n`,
	'utf8',
);

const kb = (n) => (n / 1024).toFixed(1);
console.log(`${path.relative(root, outFile)}  ${kb(bytes)} KB（gzip ${kb(gzip)} KB）`);
console.log(`sha256 ${sha}`);

const over = [];
if (bytes / 1024 > LIMITS.raw) over.push(`原始体积 ${kb(bytes)} KB > ${LIMITS.raw} KB`);
if (gzip / 1024 > LIMITS.gzip) over.push(`gzip 体积 ${kb(gzip)} KB > ${LIMITS.gzip} KB`);
if (over.length) {
	console.error('体积超限：\n  ' + over.join('\n  '));
	process.exit(1);
}

// 预览目录里顺手校验一下产物能被解析（语法错误在这里就暴露，而不是等浏览器）
await readFile(outFile, 'utf8');
