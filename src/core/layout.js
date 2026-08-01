const LAYOUT_STYLE_ID = 'yh-theme-layout';

function cssEscape(value) {
	if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
	return String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function dropStyle() {
	document.getElementById(LAYOUT_STYLE_ID)?.remove();
}

function putStyle(css) {
	let node = document.getElementById(LAYOUT_STYLE_ID);
	if (!node) {
		node = document.createElement('style');
		node.id = LAYOUT_STYLE_ID;
		node.type = 'text/css';
		(document.head || document.documentElement).append(node);
	}
	node.textContent = css;
}

function gridRules(selector, grid) {
	if (!grid) return '';
	const areas = grid.areas.map((row) => `"${row}"`).join(' ');
	return `${selector}{display:grid!important;grid-template-columns:${grid.columns}!important;grid-template-rows:${grid.rows}!important;grid-template-areas:${areas}!important;}`;
}

function layoutCss(themeId, layout) {
	if (!layout.root || !layout.desktop) return '';
	const root = `[data-yh-layout-root="${cssEscape(themeId)}"]`;
	const regions = layout.regions.map((region) =>
		`${root}>[data-yh-layout-region="${cssEscape(region.id)}"]{grid-area:${region.id}!important;min-width:0;}`,
	).join('\n');
	const mobile = layout.mobile
		? `@media (max-width:${layout.mobile.maxWidth}px){${gridRules(root, layout.mobile)}}`
		: '';
	return `${gridRules(root, layout.desktop)}\n${regions}\n${mobile}`;
}

function mountPortals(themeId, portals) {
	if (!portals?.length) return () => {};
	const entries = portals.map((portal) => ({ portal, holder: null, node: null, marker: null }));
	let stopped = false;
	let scheduled = false;

	function restore(entry) {
		if (entry.node) {
			if (entry.marker?.isConnected) entry.marker.replaceWith(entry.node);
			else entry.node.remove();
		}
		entry.marker?.remove();
		entry.holder?.remove();
		entry.holder = null;
		entry.node = null;
		entry.marker = null;
	}

	function portal(entry, source) {
		if (entry.node === source) return;
		restore(entry);
		const holder = document.createElement('div');
		holder.setAttribute('data-yh-layout-portal', `${themeId}:${entry.portal.id}`);
		const marker = document.createComment(`yh-layout-portal:${entry.portal.id}`);
		source.before(marker);
		(document.body || document.documentElement).append(holder);
		holder.append(source);
		entry.holder = holder;
		entry.node = source;
		entry.marker = marker;
	}

	function apply() {
		scheduled = false;
		if (stopped) return;
		for (const entry of entries) {
			if (window.innerWidth < entry.portal.minWidth) {
				restore(entry);
				continue;
			}
			const source = document.querySelector(entry.portal.source);
			if (source && source !== entry.node) portal(entry, source);
		}
	}

	function schedule() {
		if (stopped || scheduled) return;
		scheduled = true;
		queueMicrotask(apply);
	}

	const observer = new MutationObserver(schedule);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	window.addEventListener('resize', schedule);
	apply();

	return () => {
		stopped = true;
		observer.disconnect();
		window.removeEventListener('resize', schedule);
		for (const entry of entries) restore(entry);
	};
}

/**
 * Applies a declarative grid without relocating host-managed DOM. Moving nodes
 * owned by a SPA is brittle; direct children can be assigned grid areas while
 * preserving their identity and event bindings.
 */
export function mountLayout(theme) {
	const layout = theme?.layout;
	if (!layout) return null;

	let root = null;
	let observer = null;
	let rootPrevious = null;
	const regionPrevious = new Map();
	let stopped = false;
	const unmountPortals = mountPortals(theme.id, layout.portals);

	const clear = () => {
		dropStyle();
		if (root && rootPrevious) {
			if (rootPrevious.hadAttribute) root.setAttribute('data-yh-layout-root', rootPrevious.value);
			else root.removeAttribute('data-yh-layout-root');
		}
		for (const [node, previous] of regionPrevious) {
			if (previous.hadAttribute) node.setAttribute('data-yh-layout-region', previous.value);
			else node.removeAttribute('data-yh-layout-region');
		}
		regionPrevious.clear();
		root = null;
		rootPrevious = null;
	};

	const apply = () => {
		if (stopped || root) return Boolean(root);
		const candidate = document.querySelector(layout.root);
		if (!candidate) return false;
		const targets = layout.regions.map((region) => ({ region, node: candidate.querySelector(region.selector) }));
		if (targets.some(({ node }) => !node || node.parentElement !== candidate)) return false;

		root = candidate;
		rootPrevious = {
			hadAttribute: root.hasAttribute('data-yh-layout-root'),
			value: root.getAttribute('data-yh-layout-root'),
		};
		root.setAttribute('data-yh-layout-root', theme.id);
		for (const { region, node } of targets) {
			regionPrevious.set(node, {
				hadAttribute: node.hasAttribute('data-yh-layout-region'),
				value: node.getAttribute('data-yh-layout-region'),
			});
			node.setAttribute('data-yh-layout-region', region.id);
		}
		putStyle(layoutCss(theme.id, layout));
		observer?.disconnect();
		observer = null;
		return true;
	};

	if (layout.root && !apply()) {
		observer = new MutationObserver(apply);
		observer.observe(document.documentElement, { childList: true, subtree: true });
	}

	return () => {
		stopped = true;
		observer?.disconnect();
		clear();
		unmountPortals();
	};
}

export function layoutStyleId() {
	return LAYOUT_STYLE_ID;
}
