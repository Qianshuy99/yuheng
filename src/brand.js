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
	version: '1.0.0',
	author: 'xiyan',
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
export const PALETTE = Object.freeze({
	jade: '#A8CCC0',
	jadeDeep: '#7FA79B',
	bgDark: '#16211F',
	bgPanel: '#1D2B28',
	accent: '#E8D9A0',
	text: '#E4EAE7',
	textMuted: '#8A9793',
	ok: '#8FD8A8',
	warn: '#E8C07A',
	error: '#E58E80',
	radius: '6px',
});

/** 外壳 UI 的 CSS 变量声明块，注入时拼到 :root。 */
export const PALETTE_CSS = `
	--yh-jade:${PALETTE.jade};
	--yh-jade-deep:${PALETTE.jadeDeep};
	--yh-bg-dark:${PALETTE.bgDark};
	--yh-bg-panel:${PALETTE.bgPanel};
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
