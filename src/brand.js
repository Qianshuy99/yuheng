// 玉衡品牌常量 —— 名称 / 版本 / 色板 / 图标的唯一来源。
// 任何地方要写「玉衡」「Dubhe Core」或品牌色，都从这里取，不要硬编码。
import { ICONS } from './gen/icons.js';

/** 现有 logo 是 363×512 的竖构图汉字，缩到 16px 会糊；重做后把这里改成 false。 */
export const LOGO_IS_PLACEHOLDER = false;

export const BRAND = Object.freeze({
	/** 用户可见的产品名 */
	name: '玉衡',
	fullName: '玉衡主题助手',
	nameEn: 'YuHeng',
	/** 引擎名：只出现在控制台、元数据、底部小字 */
	engine: 'Dubhe Core',
	/** 单一版本号：产品与引擎同版本，不再各带一套 */
	version: '1.0.1',
	author: 'Qianshuy99',
	slogan: '玉衡焕新，指尖星辰。',
	/** 北斗第五星（第七星是摇光，方案原文写错了） */
	starLine: '北斗第五星，主平衡与协调。',
	homepage: 'https://github.com/Qianshuy99/yuheng',
	support: 'https://github.com/Qianshuy99/yuheng/issues',
	/** 发布产物的直链：油猴按这个做更新检查，README 的安装按钮也指向它 */
	download: 'https://cdn.jsdelivr.net/gh/Qianshuy99/yuheng@main/dist/yuheng.user.js',
	/** 底部署名，见品牌方案第九章 */
	footer: 'YuHeng v1.0.0 · Dubhe Core',
	menuPrefix: '🌟 玉衡：',
	icons: ICONS,
});

// 色板取自 logo 的青瓷绿（实测主色 ≈ #A8CCC0）。
// 注意：这套色只用于玉衡外壳（悬浮球 / 面板 / Toast / 对话框），
// 主题包内部（例如 XP 的 Luna 蓝）自己一套，两者分工是「管理器 vs 被管理的内容」。
//
// 外壳是浅色的：它要压在各种主题之上（XP Luna 本身就是浅色），深色板子浮在浅色页面上
// 像是另一个应用；面板里的字又多是主题名/作者名这类正文，浅底更好读。
// bgDark / bgPanel 保留下来：控制台日志的底色、以及青瓷渐变上的反白文字还在用。
export const PALETTE = Object.freeze({
	jade: '#A8CCC0',
	jadeDeep: '#7FA79B',
	/** 青瓷绿压深到能当正文/标题色（#A8CCC0 在白底上对比度不够） */
	jadeInk: '#3F6E60',
	bgDark: '#16211F',
	bgPanel: '#1D2B28',
	/** 面板/对话框底色 */
	surface: '#F7FAF9',
	/** 标题栏、页脚、选中行等次级底色 */
	surfaceAlt: '#E8F1EE',
	/** 分隔线与边框 */
	line: '#C6DAD3',
	accent: '#B08A2E',
	text: '#1B2A26',
	textMuted: '#657873',
	ok: '#2F7D4F',
	warn: '#8A6414',
	error: '#B4453A',
	radius: '6px',
});

/** 外壳 UI 的 CSS 变量声明块，注入时拼到 #yh-shell。 */
export const PALETTE_CSS = `
	--yh-jade:${PALETTE.jade};
	--yh-jade-deep:${PALETTE.jadeDeep};
	--yh-jade-ink:${PALETTE.jadeInk};
	--yh-bg-dark:${PALETTE.bgDark};
	--yh-bg-panel:${PALETTE.bgPanel};
	--yh-surface:${PALETTE.surface};
	--yh-surface-alt:${PALETTE.surfaceAlt};
	--yh-line:${PALETTE.line};
	--yh-accent:${PALETTE.accent};
	--yh-text:${PALETTE.text};
	--yh-text-muted:${PALETTE.textMuted};
	--yh-ok:${PALETTE.ok};
	--yh-warn:${PALETTE.warn};
	--yh-error:${PALETTE.error};
	--yh-radius:${PALETTE.radius};
	--yh-font:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;
`;

/** 所有外壳元素统一走这几层 z-index，避免各处各写一个魔数。 */
export const Z = Object.freeze({
	ball: 2147483640,
	panel: 2147483641,
	toast: 2147483646,
	dialog: 2147483643,
	loading: 2147483645,
});
