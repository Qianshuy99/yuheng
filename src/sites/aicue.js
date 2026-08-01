// AICue runs Flarum as a SPA. Themes should consume these semantic markers
// instead of coupling their layout to Flarum's transient wrapper hierarchy.

const ATTR = 'data-yh-aicue-region';
const PAGE_ATTR = 'data-yh-aicue-page';
const ROOT_ATTR = 'data-yh-aicue';

const PAGE_CLASSES = [
	['DiscussionPage', 'discussion'],
	['SearchPage', 'search'],
	['TagsPage', 'tags'],
	['NotificationsPage', 'notifications'],
	['UserPage', 'user'],
	['SettingsPage', 'settings'],
	['FollowingPage', 'following'],
	['FlaggedPostsPage', 'flags'],
	['IndexPage', 'index'],
];

function pageType(content) {
	for (const [className, type] of PAGE_CLASSES) {
		if (content.classList.contains(className) || content.querySelector(`.${className}`)) return type;
	}
	const path = location.pathname;
	if (/^\/d\//.test(path)) return 'discussion';
	if (/^\/search/.test(path)) return 'search';
	if (/^\/tags/.test(path)) return 'tags';
	if (/^\/notifications/.test(path)) return 'notifications';
	if (/^\/u\//.test(path)) return 'user';
	if (/^\/settings/.test(path)) return 'settings';
	return 'index';
}

function first(root, selectors) {
	for (const selector of selectors) {
		const node = root.querySelector(selector);
		if (node) return node;
	}
	return null;
}

/**
 * Marks the stable AICue/Flarum surfaces without moving host-owned nodes.
 * Flarum replaces chunks of DOM on navigation, so the marker pass is repeated
 * after mutations and navigation events. The returned teardown restores every
 * attribute exactly as it was before the theme mounted.
 */
export function mountAicueAdapter() {
	const previous = new Map();
	let stopped = false;
	let scheduled = false;

	function mark(node, attribute, value) {
		if (!node) return;
		let attrs = previous.get(node);
		if (!attrs) {
			attrs = new Map();
			previous.set(node, attrs);
		}
		if (!attrs.has(attribute)) {
			attrs.set(attribute, { had: node.hasAttribute(attribute), value: node.getAttribute(attribute) });
		}
		node.setAttribute(attribute, value);
	}

	function clear() {
		for (const [node, attrs] of previous) {
			for (const [attribute, old] of attrs) {
				if (old.had) node.setAttribute(attribute, old.value);
				else node.removeAttribute(attribute);
			}
		}
		previous.clear();
	}

	function apply() {
		scheduled = false;
		if (stopped) return;
		clear();
		const app = document.querySelector('#app.App, #app');
		const content = app?.querySelector(':scope > .App-content');
		const drawer = app?.querySelector(':scope > #drawer.App-drawer, :scope > #drawer');
		if (!app || !content || !drawer) return;

		const page = first(content, [':scope > #content', '#content']);
		const type = pageType(content);
		const pageNav = first(page || content, [
			'.DiscussionPage-nav', '.IndexPage-nav', '.SearchPage-nav', '.UserPage-nav', '.SettingsPage-nav', '.sideNav',
		]);
		const pageMain = first(page || content, [
			'.DiscussionPage-stream', '.IndexPage-results', '.SearchPage-results', '.Search-results',
			'.NotificationGrid', '.NotificationList', '.UserPage-content', '.SettingsPage-content',
			'.TagsPage', '.NotificationsPage', '.UserPage', '.SettingsPage', '.SearchPage',
		]);
		// AICue currently nests it in App-content; older Flarum builds mount it
		// directly under #app, so accept both without changing either structure.
		const composer = app.querySelector(':scope > .App-content > .App-composer, :scope > .App-composer, .App-content > .App-composer');

		mark(app, ROOT_ATTR, 'flarum');
		mark(app, ATTR, 'app');
		mark(app, PAGE_ATTR, type);
		mark(app.querySelector(':scope > #app-navigation'), ATTR, 'navigation');
		mark(drawer, ATTR, 'drawer');
		mark(drawer.querySelector(':scope > .App-header, .App-header'), ATTR, 'header');
		mark(content, ATTR, 'content');
		mark(page, ATTR, 'page');
		mark(pageNav, ATTR, 'page-nav');
		mark(pageMain, ATTR, 'page-main');
		mark(composer, ATTR, 'composer');
		if (composer) mark(app, 'data-yh-aicue-has-composer', 'true');
	}

	function schedule() {
		if (stopped || scheduled) return;
		scheduled = true;
		queueMicrotask(apply);
	}

	const observer = new MutationObserver(schedule);
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['class', 'id'],
	});
	window.addEventListener('popstate', schedule);
	window.addEventListener('hashchange', schedule);
	apply();

	return () => {
		stopped = true;
		observer.disconnect();
		window.removeEventListener('popstate', schedule);
		window.removeEventListener('hashchange', schedule);
		clear();
	};
}
