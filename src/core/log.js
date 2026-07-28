// 控制台日志：品牌方案第三章。banner 只打一次（@match *://*/* 下每页都打会很吵，
// 而且 iframe 里也会跑，所以用模块级标志 + @noframes 双保险）。
import { BRAND, PALETTE } from '../brand.js';

const TAG = `color:${PALETTE.jade};font-weight:bold;`;
const STYLE = {
	brand: `background:${PALETTE.jade};color:${PALETTE.bgDark};padding:3px 8px;border-radius:3px;font-weight:bold;font-size:13px;`,
	engine: `color:${PALETTE.accent};font-weight:bold;`,
	dim: `color:${PALETTE.textMuted};font-style:italic;`,
	ok: `color:${PALETTE.ok};`,
	warn: `color:${PALETTE.warn};`,
	error: `color:${PALETTE.error};font-weight:bold;`,
};

let bannerShown = false;

export const YHLog = {
	banner(themeName) {
		if (bannerShown) return;
		bannerShown = true;
		console.log(
			`%c🌟 ${BRAND.fullName} %c已激活\n%c引擎：${BRAND.engine} v${BRAND.version}\n%c${BRAND.starLine}%c`,
			STYLE.brand,
			STYLE.ok,
			STYLE.engine,
			STYLE.dim,
			'',
		);
		if (themeName) YHLog.ok(`当前主题：${themeName}`);
	},
	info(msg) {
		console.log(`%c[${BRAND.nameEn}]%c ${msg}`, TAG, 'color:inherit;');
	},
	ok(msg) {
		console.log(`%c[${BRAND.nameEn}]%c ✅ ${msg}`, TAG, STYLE.ok);
	},
	warn(msg) {
		console.warn(`%c[${BRAND.nameEn}]%c ⚠️ ${msg}`, TAG, STYLE.warn);
	},
	error(msg) {
		console.error(`%c[${BRAND.nameEn}]%c ❌ ${msg}`, TAG, STYLE.error);
	},
	dubhe(msg) {
		console.log(`%c[${BRAND.engine}]%c ${msg}`, STYLE.engine, `color:${PALETTE.textMuted};`);
	},
};
