// 空状态：品牌方案第七章。背景水印用真 logo（128 档），不用 emoji。
import { BRAND } from '../../brand.js';
import { el } from './dom.js';

const PRESETS = {
	'no-theme': {
		icon: '🌌',
		title: '玉衡尚未寻得星辰',
		desc: '这个站点还没有可用主题，导入一个试试',
		button: '导入主题',
	},
	'no-match': {
		icon: '🔭',
		title: 'Dubhe Core 未匹配到主题',
		desc: '已装主题的 match 都不覆盖当前站点',
		button: '导入主题',
	},
	error: {
		icon: '🌑',
		title: '星轨偏移，加载失败',
		desc: '请刷新页面或检查主题包',
		button: '重试',
	},
};

/**
 * 渲染空状态节点。
 * @param {string} type PRESETS 的键
 * @param {(() => void) | null} onAction 按钮回调；不传就不显示按钮
 */
export function emptyState(type = 'no-theme', onAction = null) {
	const cfg = PRESETS[type] || PRESETS['no-theme'];
	return el('div', { class: 'yh-empty' }, [
		el('img', { class: 'yh-empty-watermark', src: BRAND.icons['128'], alt: '' }),
		el('div', { class: 'yh-empty-icon', text: cfg.icon }),
		el('div', { class: 'yh-empty-title', text: cfg.title }),
		el('div', { class: 'yh-empty-desc', text: cfg.desc }),
		onAction
			? el('button', { class: 'yh-btn yh-btn--primary', type: 'button', text: cfg.button, onclick: onAction })
			: null,
		el('div', { class: 'yh-empty-footer', text: `Powered by ${BRAND.engine}` }),
	]);
}
