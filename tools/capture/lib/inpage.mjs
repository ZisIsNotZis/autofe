// Functions that run *inside* the page. Each one is passed to page.evaluate(),
// so Playwright serializes it: no module-scope references are allowed inside.
// Attribute names used as in-page markers must be kept in sync with the Node-side
// constants below.

export const MARK_ATTR = 'data-af-node';
export const HIDDEN_ATTR = 'data-af-hidden';
export const AF_ATTR_PREFIX = 'data-af-';

// Walks every element in document order, computes the alignment record for the
// visible ones, and tags the live DOM with marker/hidden attributes so the DOM
// serializer and the CDP accessibility mapping can reuse the same element order.
export function analyzeDom() {
  const MAX_TEXT = 1000;
  const NAME_MAX = 200;
  const OPACITY_ANCESTOR_LIMIT = 20;
  const MARK = 'data-af-node';
  const HIDDEN = 'data-af-hidden';
  // Structure/layout tags are kept in the cleaned DOM even without a layout box.
  const STRUCTURAL_KEEP = new Set([
    'html', 'head', 'body', 'title', 'meta', 'link', 'base', 'style',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'col', 'colgroup', 'caption',
    'select', 'option', 'optgroup', 'datalist',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'br', 'hr', 'img', 'picture', 'source', 'video', 'audio', 'track', 'canvas', 'svg',
    'iframe', 'object', 'embed', 'template', 'slot', 'area', 'map', 'param', 'noscript',
    'script', 'form', 'label', 'input', 'textarea', 'fieldset',
  ]);
  const NAME_FROM_CONTENT = new Set([
    'a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'legend', 'summary',
    'caption', 'figcaption', 'option', 'li', 'th', 'td', 'dt', 'dd', 'output', 'p',
    'article', 'section', 'nav', 'header', 'footer', 'aside', 'main', 'span', 'div', 'strong', 'em', 'code', 'pre',
  ]);
  const INPUT_ROLE = {
    text: 'textbox', search: 'searchbox', email: 'textbox', tel: 'textbox', url: 'textbox',
    password: 'textbox', number: 'spinbutton', checkbox: 'checkbox', radio: 'radio',
    range: 'slider', button: 'button', submit: 'button', reset: 'button', image: 'button',
    file: 'button', color: 'button', hidden: 'none',
  };

  // One source of truth for "what leaves the cleaned DOM": dropped nodes are marked here
  // and the serializer only has to remove [data-af-hidden].
  const DROP_TAGS = new Set(['script', 'style', 'noscript']);
  const AD_PATTERN = /(doubleclick|googlesyndication|googlesync|adsystem|adservice|admaster|miaozhen|pos\.baidu|alimama|tanx|cpro|google_ads_iframe)/i;
  function isAdElement(el, tag) {
    if (tag === 'ins' && el.classList.contains('adsbygoogle')) return true;
    if (el.id && (el.id.startsWith('cproIframe') || el.id.startsWith('google_ads_iframe'))) return true;
    if (tag !== 'iframe') return false;
    const haystack = `${el.getAttribute('src') || ''} ${el.id || ''} ${el.getAttribute('name') || ''}`;
    return AD_PATTERN.test(haystack);
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  function implicitRole(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic';
    if (tag === 'button') return 'button';
    if (tag === 'img') return el.getAttribute('alt') === '' ? 'presentation' : 'img';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'input') return INPUT_ROLE[(el.getAttribute('type') || 'text').toLowerCase()] ?? 'textbox';
    if (tag === 'select') return el.hasAttribute('multiple') ? 'listbox' : 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'li') return 'listitem';
    if (tag === 'table') return 'table';
    if (tag === 'tr') return 'row';
    if (tag === 'td') return 'cell';
    if (tag === 'th') return 'columnheader';
    if (tag === 'nav') return 'navigation';
    if (tag === 'main') return 'main';
    if (tag === 'header') return 'banner';
    if (tag === 'footer') return 'contentinfo';
    if (tag === 'aside') return 'complementary';
    if (tag === 'form') return 'form';
    if (tag === 'dialog') return 'dialog';
    if (tag === 'iframe') return 'iframe';
    if (tag === 'svg') return 'graphics-document';
    if (tag === 'p') return 'paragraph';
    if (tag === 'label') return 'label';
    return 'generic';
  }

  function accessibleName(el) {
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((ref) => ref.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text.slice(0, NAME_MAX);
    }
    const ariaLabel = (el.getAttribute('aria-label') || '').trim();
    if (ariaLabel) return ariaLabel.slice(0, NAME_MAX);

    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'area') return (el.getAttribute('alt') || '').trim().slice(0, NAME_MAX);
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        return (el.getAttribute('value') || '').trim().slice(0, NAME_MAX);
      }
      const alt = (el.getAttribute('alt') || '').trim();
      if (alt) return alt.slice(0, NAME_MAX);
      const placeholder = (el.getAttribute('placeholder') || '').trim();
      if (placeholder) return placeholder.slice(0, NAME_MAX);
    }
    if (tag === 'select') {
      const selected = el.selectedOptions?.[0];
      if (selected) return (selected.textContent || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    }
    const explicitRole = el.getAttribute('role');
    if (explicitRole || NAME_FROM_CONTENT.has(tag)) {
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text.slice(0, NAME_MAX);
    }
    return (el.getAttribute('title') || '').trim().slice(0, NAME_MAX);
  }

  function opacityCleared(el) {
    let current = el;
    let depth = 0;
    while (current && current.nodeType === 1 && depth < OPACITY_ANCESTOR_LIMIT) {
      const opacity = Number.parseFloat(getComputedStyle(current).opacity);
      if (Number.isFinite(opacity) && opacity <= 0) return true;
      current = current.parentElement;
      depth += 1;
    }
    return false;
  }

  function domPathOf(el) {
    const segments = [];
    let current = el;
    while (current && current.nodeType === 1) {
      const parent = current.parentElement;
      let index = 0;
      if (parent) {
        const siblings = parent.children;
        for (let i = 0; i < siblings.length; i += 1) {
          if (siblings[i] === current) {
            index = i;
            break;
          }
        }
      }
      segments.push(`${current.tagName.toLowerCase()}${parent ? `[${index}]` : ''}`);
      current = parent;
    }
    return segments.reverse().join('/');
  }

  const all = document.querySelectorAll('*');
  const indexOf = new Map();
  const records = new Array(all.length);
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    indexOf.set(el, i);
    el.setAttribute(MARK, String(i));

    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const hasBox = rect.width > 0 && rect.height > 0;
    const displayNone = style.display === 'none';
    const visibilityHidden = style.visibility === 'hidden' || style.visibility === 'collapse';
    const transparent = opacityCleared(el);
    const visible = hasBox && !displayNone && !visibilityHidden && !transparent;

    const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    records[i] = {
      element: el,
      visible,
      hiddenByStyle: !hasBox || displayNone || visibilityHidden,
      structuralKeep: STRUCTURAL_KEEP.has(el.tagName.toLowerCase()) || el.closest('head') !== null,
      tag: el.tagName.toLowerCase(),
      dropByTag: DROP_TAGS.has(el.tagName.toLowerCase()),
      dropAsAd: isAdElement(el, el.tagName.toLowerCase()),
      domPath: domPathOf(el),
      role: el.getAttribute('role') || null,
      implicitRole: implicitRole(el),
      name: accessibleName(el),
      text: text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text,
      bbox: { x: round2(rect.left + scrollX), y: round2(rect.top + scrollY), w: round2(rect.width), h: round2(rect.height) },
      styles: {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        display: style.display,
        position: style.position,
        opacity: Number.isFinite(Number.parseFloat(style.opacity)) ? round2(Number.parseFloat(style.opacity) * 1000) / 1000 : null,
      },
    };
  }

  // An element is dropped from the cleaned DOM only if it is itself unrendered and
  // has no visible descendant (avoids deleting e.g. a visible child of visibility:hidden).
  const hasVisibleDescendant = new Uint8Array(all.length);
  for (let i = 0; i < all.length; i += 1) {
    if (!records[i].visible) continue;
    let parent = all[i].parentElement;
    while (parent) {
      const parentIndex = indexOf.get(parent);
      if (parentIndex === undefined) break;
      hasVisibleDescendant[parentIndex] = 1;
      parent = parent.parentElement;
    }
  }

  const nodes = [];
  const cleanedIndexByRaw = new Array(all.length).fill(null);
  let droppedFromDom = 0;
  let cleanedElements = 0;
  for (let i = 0; i < all.length; i += 1) {
    const record = records[i];
    const shouldDrop =
      record.dropByTag ||
      record.dropAsAd ||
      (record.hiddenByStyle && !record.structuralKeep && hasVisibleDescendant[i] === 0);
    if (shouldDrop) {
      record.element.setAttribute(HIDDEN, '1');
      droppedFromDom += 1;
    } else {
      cleanedIndexByRaw[i] = cleanedElements;
      cleanedElements += 1;
    }
    if (record.visible) {
      nodes.push({
        domPath: record.domPath,
        tag: record.tag,
        role: record.role,
        name: record.name,
        text: record.text,
        bbox: record.bbox,
        styles: record.styles,
        visible: true,
        // Internal hints, removed before writing:
        _implicitRole: record.implicitRole,
        _index: i,
        _cleanedIndex: cleanedIndexByRaw[i],
      });
    }
  }

  return {
    total: all.length,
    visible: nodes.length,
    droppedFromDom,
    cleanedElements,
    cleanedIndexByRaw,
    nodes,
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      bodyTextLength: document.body ? (document.body.innerText || '').replace(/\s+/g, ' ').trim().length : 0,
    },
  };
}

// JSON-LD (`script[type="application/ld+json"]`) plus best-effort microdata, which is
// the other common schema.org carrier.
export function extractStructuredData() {
  const blocks = [];

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i += 1) {
    const raw = scripts[i].textContent || '';
    try {
      blocks.push({ index: blocks.length, source: 'ld+json', data: JSON.parse(raw) });
    } catch (error) {
      blocks.push({
        index: blocks.length,
        source: 'ld+json',
        parseError: String((error && error.message) || error),
        raw: raw.slice(0, 2000),
      });
    }
  }

  const roots = [...document.querySelectorAll('[itemscope][itemtype]')].filter(
    (el) => !el.parentElement || !el.parentElement.closest('[itemscope][itemtype]'),
  );
  for (const root of roots.slice(0, 50)) {
    const properties = [];
    for (const prop of [...root.querySelectorAll('[itemprop]')].slice(0, 50)) {
      const value = prop.getAttribute('content') ?? prop.getAttribute('href') ?? prop.getAttribute('src') ?? (prop.textContent || '').trim();
      if (!value) continue;
      properties.push({ name: prop.getAttribute('itemprop'), value: String(value).replace(/\s+/g, ' ').slice(0, 500) });
    }
    blocks.push({ index: blocks.length, source: 'microdata', type: root.getAttribute('itemtype'), properties });
  }

  return { blocks };
}

// Serialized DOM after render, with script/style/noscript, ad iframes and tracking
// attributes stripped. Returns the `outerHTML` of the cleaned root.
export function serializeCleanedDom() {
  // analyzeDom() already decided what leaves the DOM (scripts/styles/noscript, ad containers,
  // unrendered subtrees) and marked it with data-af-hidden.
  const DROP_SELECTOR = '[data-af-hidden]';
  // `data-*` analytics/tracking carriers and inline event handlers.
  const TRACK_ATTR = /^(?:on[a-z]+|data-(?:spm|track|tracking|analytics|ga|gtm|click|report|stat|stats|bi|log|logs|event|events|beacon|utm)[-_a-z0-9]*)$/i;

  const clone = document.documentElement.cloneNode(true);
  for (const el of clone.querySelectorAll(DROP_SELECTOR)) el.remove();

  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of el.getAttributeNames()) {
      if (TRACK_ATTR.test(name) || name.startsWith('data-af-')) el.removeAttribute(name);
    }
  }

  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const comment of comments) comment.remove();

  return clone.outerHTML;
}

// Removes the in-page markers again (belt-and-braces; the serializer also strips them).
export function clearMarkers() {
  for (const el of document.querySelectorAll('[data-af-node], [data-af-hidden]')) {
    el.removeAttribute('data-af-node');
    el.removeAttribute('data-af-hidden');
  }
  return true;
}
