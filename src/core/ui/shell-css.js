// 外壳样式（悬浮球 / 面板 / Toast / 空状态 / 对话框）。
// 全部收在 #yh-shell 作用域下，不影响目标页面；变量来自 brand.js 的青瓷绿色板。
//
// 面板是浅色的：外壳要压在各种主题（XP 是浅色 Luna）之上，深色板子在浅色页面上
// 显得像另一个应用；而且面板里的文字大多是主题名/作者名这类正文，浅底更好读。
import { PALETTE_CSS, Z } from '../../brand.js';

export const SHELL_CSS = `
#yh-shell{${PALETTE_CSS}}
#yh-shell,#yh-shell *{box-sizing:border-box;}
#yh-shell button{font-family:var(--yh-font);}

/* ============ 悬浮球 ============
 * 点开面板时球「变成」面板：球缩小淡出（yh-morphed），面板从球心放大出来。
 * 所以球开着面板时不可点，关面板走 × / 点外面 / Esc，见 panel.js。
 */
#yh-shell .yh-ball{
	position:fixed;top:50%;right:0;width:40px;height:40px;
	display:flex;align-items:center;justify-content:center;
	border:0;padding:0;cursor:grab;
	z-index:${Z.ball};
	background:linear-gradient(135deg,var(--yh-jade),var(--yh-jade-deep));
	border-radius:50% 0 0 50%;
	box-shadow:-2px 0 10px rgba(0,0,0,.35);
	transition:transform .2s,box-shadow .2s,opacity .18s;
	touch-action:none;
}
#yh-shell .yh-ball:hover{transform:scale(1.08);box-shadow:-2px 0 14px rgba(94,140,126,.5);}
#yh-shell .yh-ball.yh-dragging{cursor:grabbing;transform:scale(1.02);transition:none;}
#yh-shell .yh-ball.yh-free{border-radius:50%;}
#yh-shell .yh-ball.yh-morphed{opacity:0;transform:scale(.34);pointer-events:none;}
#yh-shell .yh-ball img{width:24px;height:24px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3));}

/* ============ 面板 ============ */
#yh-shell .yh-panel{
	position:fixed;width:280px;max-height:min(460px,80vh);
	display:none;flex-direction:column;overflow:hidden;
	z-index:${Z.panel};
	background:var(--yh-surface);color:var(--yh-text);
	border:1px solid var(--yh-line);border-radius:10px;
	font:13px/1.5 var(--yh-font);
	box-shadow:0 10px 32px rgba(27,42,38,.22);
	/* 由 panel.js 按悬浮球圆心写入，缺省就从自身中心展开 */
	transform-origin:var(--yh-origin-x,50%) var(--yh-origin-y,50%);
}
#yh-shell .yh-panel.yh-open{display:flex;}
/* display 与动画分成两个 class：先 display:flex 才能量出尺寸、算出球心，
 * origin 写好之后再挂动画，否则第一帧会从错误的原点缩放。 */
#yh-shell .yh-panel.yh-morph-in{animation:yh-panel-morph .2s cubic-bezier(.18,.9,.28,1);}
#yh-shell .yh-panel.yh-morph-out{animation:yh-panel-morph .16s ease-in reverse;}
@keyframes yh-panel-morph{from{opacity:0;transform:scale(.12);}to{opacity:1;transform:scale(1);}}
#yh-shell .yh-panel-header{
	display:flex;align-items:center;gap:6px;padding:10px 12px;flex:0 0 auto;
	background:linear-gradient(135deg,var(--yh-surface-alt),#DCEAE5);
	border-bottom:1px solid var(--yh-line);
}
#yh-shell .yh-panel-logo{width:20px;height:20px;object-fit:contain;}
#yh-shell .yh-panel-title{font-weight:700;font-size:14px;flex:1 1 auto;color:var(--yh-jade-ink);}
#yh-shell .yh-panel-engine{
	font-size:9px;color:var(--yh-accent);background:rgba(176,138,46,.12);
	padding:1px 5px;border-radius:2px;letter-spacing:.3px;
}
#yh-shell .yh-panel-close{
	background:none;border:0;color:var(--yh-text-muted);font-size:18px;line-height:1;
	cursor:pointer;padding:0 2px;
}
#yh-shell .yh-panel-close:hover{color:var(--yh-text);}
#yh-shell .yh-panel-body{flex:1 1 auto;overflow-y:auto;padding:10px 12px;}
#yh-shell .yh-panel-footer{
	flex:0 0 auto;text-align:center;padding:6px;font-size:9px;
	color:var(--yh-text-muted);border-top:1px solid var(--yh-line);
	background:var(--yh-surface-alt);
	font-family:Consolas,monospace;
}

/* 分区标题 */
#yh-shell .yh-section-title{
	font-size:11px;color:var(--yh-jade-ink);letter-spacing:1px;
	margin:10px 0 6px;padding-bottom:4px;
	border-bottom:1px dashed var(--yh-line);
}
#yh-shell .yh-section-title:first-child{margin-top:0;}

/* 开关行 */
#yh-shell .yh-switch{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;}
#yh-shell .yh-switch input{accent-color:var(--yh-jade-deep);width:14px;height:14px;margin:0;cursor:pointer;}
#yh-shell .yh-switch select,#yh-shell .yh-switch input[type=text]{
	background:#fff;color:var(--yh-text);
	border:1px solid var(--yh-line);border-radius:4px;padding:3px 6px;
	font:12px/1.4 var(--yh-font);
}

/* 当前主题 */
#yh-shell .yh-current{
	display:flex;align-items:center;gap:6px;flex-wrap:wrap;
	padding:8px 10px;margin-bottom:4px;
	background:var(--yh-surface-alt);border:1px solid var(--yh-line);
	border-radius:var(--yh-radius);
}
#yh-shell .yh-current-label{font-size:11px;color:var(--yh-text-muted);}
#yh-shell .yh-current-name{font-weight:700;color:var(--yh-jade-ink);}
#yh-shell .yh-badge{
	display:inline-block;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;
	background:linear-gradient(135deg,var(--yh-jade-deep),#5E8C7E);color:#fff;
}
#yh-shell .yh-badge--muted{background:#D3DEDA;color:var(--yh-text-muted);}
/* 主题条目 */
#yh-shell .yh-theme{
	display:flex;align-items:center;gap:8px;padding:7px 8px;margin:3px 0;
	border:1px solid transparent;border-radius:var(--yh-radius);cursor:pointer;
	background:#fff;
}
#yh-shell .yh-theme:hover{background:var(--yh-surface-alt);border-color:var(--yh-line);}
#yh-shell .yh-theme.yh-active{border-color:var(--yh-jade-deep);background:#E4F0EB;}
#yh-shell .yh-theme-info{flex:1 1 auto;min-width:0;}
#yh-shell .yh-theme-name{
	display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--yh-text);
}
#yh-shell .yh-theme-meta{display:block;font-size:10px;color:var(--yh-text-muted);}
#yh-shell .yh-theme-mark{flex:0 0 auto;color:var(--yh-jade-deep);font-size:12px;width:14px;text-align:center;}
#yh-shell .yh-theme-del{
	flex:0 0 auto;border:0;background:none;color:var(--yh-text-muted);
	cursor:pointer;font-size:13px;padding:0 2px;
}
#yh-shell .yh-theme-del:hover{color:var(--yh-error);}

/* 按钮 */
#yh-shell .yh-btn{
	display:flex;align-items:center;gap:8px;width:100%;
	padding:8px 12px;margin:4px 0;
	background:#fff;border:1px solid var(--yh-line);
	border-radius:var(--yh-radius);color:var(--yh-text);
	cursor:pointer;text-align:left;font:13px/1.4 var(--yh-font);
	transition:background .18s,border-color .18s;
}
#yh-shell .yh-btn:hover{background:var(--yh-surface-alt);border-color:var(--yh-jade-deep);}
#yh-shell .yh-btn:disabled{opacity:.5;cursor:default;}
#yh-shell .yh-btn:disabled:hover{background:#fff;border-color:var(--yh-line);}
#yh-shell .yh-btn--primary{
	justify-content:center;
	background:linear-gradient(135deg,var(--yh-jade-deep),#5E8C7E);
	border-color:transparent;color:#fff;font-weight:700;
}
#yh-shell .yh-btn--primary:hover{filter:brightness(1.06);background:linear-gradient(135deg,var(--yh-jade-deep),#5E8C7E);}
#yh-shell .yh-btn--danger:hover{border-color:var(--yh-error);color:var(--yh-error);background:rgba(180,69,58,.08);}

/* ============ 空状态 ============ */
#yh-shell .yh-empty{position:relative;text-align:center;padding:32px 16px;overflow:hidden;}
#yh-shell .yh-empty-watermark{
	position:absolute;top:50%;left:50%;width:120px;height:120px;
	transform:translate(-50%,-50%);opacity:.08;pointer-events:none;
}
#yh-shell .yh-empty-icon{font-size:40px;margin-bottom:10px;position:relative;}
#yh-shell .yh-empty-title{font-size:14px;color:var(--yh-jade-ink);font-weight:700;position:relative;}
#yh-shell .yh-empty-desc{font-size:12px;color:var(--yh-text-muted);margin:6px 0 14px;position:relative;}
#yh-shell .yh-empty .yh-btn{position:relative;width:auto;display:inline-flex;}
#yh-shell .yh-empty-footer{
	font-size:9px;color:var(--yh-text-muted);margin-top:18px;position:relative;
	font-family:Consolas,monospace;
}
/* ============ Toast ============
 * Toast 直接浮在页面上，没有面板做底，浅底 + 深字在深色主题上也认得出来。 */
#yh-shell .yh-toast-wrap{
	position:fixed;bottom:24px;right:24px;z-index:${Z.toast};
	display:flex;flex-direction:column;align-items:flex-end;gap:8px;
	pointer-events:none;
}
#yh-shell .yh-toast{
	display:flex;align-items:center;gap:8px;padding:10px 16px;
	background:rgba(247,250,249,.98);border:1px solid var(--yh-line);
	border-left:3px solid var(--yh-jade-deep);
	border-radius:8px;color:var(--yh-text);font:13px/1.4 var(--yh-font);
	max-width:min(380px,72vw);
	transform:translateX(120%);transition:transform .3s ease,opacity .3s ease;
	box-shadow:0 6px 22px rgba(27,42,38,.28);
	pointer-events:auto;
}
#yh-shell .yh-toast.yh-toast-show{transform:none;}
#yh-shell .yh-toast.yh-toast-hide{opacity:0;transform:translateX(40%);}
#yh-shell .yh-toast-msg{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;}
#yh-shell .yh-toast-brand{
	flex:0 0 auto;font-size:8px;color:var(--yh-text-muted);
	padding-left:6px;border-left:1px solid var(--yh-line);
	font-family:Consolas,monospace;
}
#yh-shell .yh-toast--ok{border-left-color:var(--yh-ok);}
#yh-shell .yh-toast--warn{border-left-color:var(--yh-warn);}
#yh-shell .yh-toast--error{border-left-color:var(--yh-error);}

/* ============ Loading ============
 * 只有这里保持深色：换肤瞬间要把页面整片盖住，浅色蒙层挡不住底下的闪动。 */
#yh-shell .yh-loading{
	position:fixed;inset:0;z-index:${Z.loading};
	display:flex;align-items:center;justify-content:center;
	background:rgba(10,20,18,.72);backdrop-filter:blur(4px);
	transition:opacity .4s;font-family:var(--yh-font);
}
#yh-shell .yh-loading.yh-fade-out{opacity:0;}
#yh-shell .yh-loading-box{text-align:center;}
#yh-shell .yh-stars{display:flex;gap:8px;justify-content:center;margin-bottom:16px;}
#yh-shell .yh-star{
	width:10px;height:10px;border-radius:50%;background:var(--yh-jade);
	animation:yh-twinkle 1.4s infinite;animation-delay:calc(var(--i) * .2s);
}
@keyframes yh-twinkle{
	0%,100%{opacity:.2;transform:scale(.8);}
	50%{opacity:1;transform:scale(1.2);box-shadow:0 0 8px var(--yh-jade);}
}
#yh-shell .yh-loading-text{color:#fff;font-size:15px;font-weight:700;margin-bottom:4px;}
#yh-shell .yh-loading-sub{color:#A8B8B3;font-size:11px;font-family:Consolas,monospace;}
/* ============ 对话框 ============ */
#yh-shell .yh-dlg-mask{
	position:fixed;inset:0;z-index:${Z.dialog};
	display:grid;place-items:center;padding:20px;
	background:rgba(10,20,18,.45);font:13px/1.6 var(--yh-font);
}
#yh-shell .yh-dlg{
	width:min(460px,100%);max-height:86vh;display:flex;flex-direction:column;overflow:hidden;
	background:var(--yh-surface);color:var(--yh-text);
	border:1px solid var(--yh-line);border-radius:10px;
	box-shadow:0 18px 48px rgba(10,20,18,.4);
}
#yh-shell .yh-dlg-head{
	display:flex;align-items:center;gap:8px;padding:10px 14px;flex:0 0 auto;
	background:linear-gradient(135deg,var(--yh-surface-alt),#DCEAE5);
	border-bottom:1px solid var(--yh-line);
}
#yh-shell .yh-dlg-head img{width:20px;height:20px;object-fit:contain;}
#yh-shell .yh-dlg-head span{flex:1 1 auto;font-weight:700;color:var(--yh-jade-ink);}
#yh-shell .yh-dlg-body{flex:1 1 auto;overflow-y:auto;padding:14px;}
#yh-shell .yh-dlg-body p{margin:0 0 8px;}
#yh-shell .yh-dlg-body p:last-child{margin-bottom:0;}
#yh-shell .yh-dlg-heading{font-size:14px;font-weight:700;color:var(--yh-jade-ink);margin:0 0 8px;}
#yh-shell .yh-dlg-note{
	margin-top:10px;padding:8px 10px;border-radius:var(--yh-radius);
	background:rgba(176,138,46,.1);border:1px solid rgba(176,138,46,.4);
	color:var(--yh-warn);font-size:12px;
}
#yh-shell .yh-dlg-note ul{margin:4px 0 0;padding-left:18px;}
#yh-shell .yh-dlg-err{
	margin-top:10px;padding:8px 10px;border-radius:var(--yh-radius);
	background:rgba(180,69,58,.08);border:1px solid rgba(180,69,58,.4);
	color:var(--yh-error);font-size:12px;
}
#yh-shell .yh-dlg-err ul{margin:4px 0 0;padding-left:18px;}
#yh-shell .yh-dlg-foot{
	flex:0 0 auto;display:flex;justify-content:flex-end;gap:8px;padding:12px 14px;
	border-top:1px solid var(--yh-line);background:var(--yh-surface-alt);
}
#yh-shell .yh-dlg-foot .yh-btn{width:auto;min-width:84px;justify-content:center;margin:0;}
#yh-shell .yh-dlg textarea{
	width:100%;min-height:150px;resize:vertical;
	background:#fff;color:var(--yh-text);
	border:1px solid var(--yh-line);border-radius:var(--yh-radius);
	padding:8px;font:12px/1.5 Consolas,monospace;
}
#yh-shell .yh-dlg textarea:focus{outline:none;border-color:var(--yh-jade-deep);}
#yh-shell .yh-drop{
	margin-top:8px;padding:14px;text-align:center;font-size:12px;
	color:var(--yh-text-muted);border:1px dashed var(--yh-line);
	border-radius:var(--yh-radius);
}
#yh-shell .yh-drop.yh-drop-over{border-color:var(--yh-jade-deep);color:var(--yh-jade-ink);background:var(--yh-surface-alt);}
#yh-shell .yh-kv{display:flex;gap:8px;font-size:12px;padding:2px 0;}
#yh-shell .yh-kv b{flex:0 0 68px;color:var(--yh-text-muted);font-weight:400;}
#yh-shell .yh-kv span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;}

@media (max-width:600px){
	#yh-shell .yh-panel{width:min(280px,calc(100vw - 24px));}
}
@media (prefers-reduced-motion:reduce){
	#yh-shell .yh-panel.yh-morph-in,#yh-shell .yh-panel.yh-morph-out,#yh-shell .yh-star{animation-duration:.01s;}
	#yh-shell .yh-ball,#yh-shell .yh-toast{transition-duration:.01s;}
}
`;
