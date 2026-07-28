// 构建期常量。preview 构建把 __YH_PREVIEW__ 定成 true，用来放宽 @match：
// 离线样板跑在 file:// 上，任何真实站点的 match 都不会命中。
// 正式构建里它是 false，行为与没有这段代码完全一致。
export const PREVIEW = typeof __YH_PREVIEW__ !== 'undefined' && __YH_PREVIEW__ === true;
