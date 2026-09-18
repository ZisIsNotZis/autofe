// Functions that run *inside* the page. Each one is passed to page.evaluate(),
// so Playwright serializes it: no module-scope references are allowed inside.
// Attribute names used as in-page markers must be kept in sync with the Node-side
// constants below.

export const MARK_ATTR = 'data-af-node';
export const HIDDEN_ATTR = 'data-af-hidden';
export const AF_ATTR_PREFIX = 'data-af-';

// Walks every element in document order and returns one record per *laid-out* element
// together with the decisions that define the cleaned DOM.
//
// One marker attribute is left on the live DOM so the Node side can join DOM ↔ a11y ↔
// nodes.json without relying on browser-assigned ids:
//   data-af-node = stable element id ("e<i>" in document order; retagMarkers() adds "r<i>"
//                  for elements that appear in a re-render after this pass)
//
// Cleaning contract implemented here (single source of truth; extractCleanedDom() only removes
// [data-af-hidden] and then parses the result to derive element paths):
//   - script/style/noscript, ad containers **and their whole subtree**, and subtrees with no
//     layout box (display:none) are marked dropped.
//   - everything else stays, including `visibility:hidden`/`opacity:0` elements that still
//     occupy layout. They are kept on purpose: nodes.json must be resolvable in dom.html
//     (see README "cleaning rules"), and hidden-but-laid-out subtrees (menus, tabs, modals)
//     are exactly the state carriers M1 needs.
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
    el.setAttribute(MARK, `e${i}`);

    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const hasBox = rect.width > 0 && rect.height > 0;
    const displayNone = style.display === 'none';
    const visibilityHidden = style.visibility === 'hidden' || style.visibility === 'collapse';
    const transparent = opacityCleared(el);
    // Laid out (occupies a box in layout) vs painted (actually drawn with content).
    const rendered = hasBox && !displayNone;
    const visible = rendered && !visibilityHidden && !transparent;

    const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    records[i] = {
      element: el,
      hasBox,
      displayNone,
      rendered,
      visible,
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

  // Ad containers are dropped with their whole subtree, so no kept element can be an ad
  // descendant (otherwise its cleanedPath would not resolve in dom.html).
  const adDropped = new Uint8Array(all.length);
  for (let i = 0; i < all.length; i += 1) {
    if (!records[i].dropAsAd) continue;
    adDropped[i] = 1;
    for (const descendant of records[i].element.querySelectorAll('*')) {
      const descendantIndex = indexOf.get(descendant);
      if (descendantIndex !== undefined) adDropped[descendantIndex] = 1;
    }
  }

  // A boxless subtree is dropped only if nothing inside it is laid out either.
  const hasLaidOutDescendant = new Uint8Array(all.length);
  for (let i = 0; i < all.length; i += 1) {
    if (!records[i].rendered) continue;
    let parent = all[i].parentElement;
    while (parent) {
      const parentIndex = indexOf.get(parent);
      if (parentIndex === undefined) break;
      hasLaidOutDescendant[parentIndex] = 1;
      parent = parent.parentElement;
    }
  }

  const nodes = [];
  let droppedFromDom = 0;
  let adExcludedNodes = 0;

  for (let i = 0; i < all.length; i += 1) {
    const record = records[i];
    const shouldDrop =
      record.dropByTag ||
      adDropped[i] === 1 ||
      ((!record.hasBox || record.displayNone) && !record.structuralKeep && hasLaidOutDescendant[i] === 0);

    if (shouldDrop) {
      record.element.setAttribute(HIDDEN, '1');
      droppedFromDom += 1;
      continue;
    }

    // One entry per laid-out element; `visible` distinguishes painted from laid-out-but-hidden.
    // cleanedPath/cleanedIndex are attached after the cleaned DOM is parsed (extractCleanedDom),
    // so they always describe the delivered file rather than the live tree.
    if (record.rendered) {
      if (adDropped[i] === 1) {
        adExcludedNodes += 1;
        continue;
      }
      nodes.push({
        domPath: record.domPath,
        tag: record.tag,
        role: record.role,
        name: record.name,
        text: record.text,
        bbox: record.bbox,
        styles: record.styles,
        visible: record.visible,
        // Internal hints, removed before writing:
        _id: `e${i}`,
        _implicitRole: record.implicitRole,
      });
    }
  }

  return {
    total: all.length,
    rendered: nodes.length,
    droppedFromDom,
    adExcludedNodes,
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

// Resolves once the DOM stops changing (no mutations for quietMs) or after maxMs. Renderers keep
// painting after `load`; capturing before they settle is what produced a mid-load artifact on a
// slow-network run (a docs page captured while its loading bar was still busy).
export function waitForDomQuiescence(quietMs = 800, maxMs = 12000) {
  return new Promise((resolve) => {
    let done = false;
    let quiet = null;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(quiet);
      clearTimeout(hard);
      observer.disconnect();
      resolve(true);
    };
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(finish, quietMs);
    });
    const hard = setTimeout(finish, maxMs);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    quiet = setTimeout(finish, quietMs);
  });
}

// Adds markers to elements that did not exist when analyzeDom() ran (a page re-rendering
// between that pass and DOM.getDocument would otherwise silently lose their AX join).
// Existing markers are preserved, so ids stay consistent with the analysis payload.
export function retagMarkers() {
  let added = 0;
  for (const el of document.querySelectorAll('*')) {
    if (!el.hasAttribute('data-af-node')) {
      el.setAttribute('data-af-node', `r${added}`);
      added += 1;
    }
  }
  return added;
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

// Serialized, cleaned DOM — and the authoritative source of element paths.
//
// The live DOM can contain markup the HTML parser repairs (nested <a>, blocks inside inline
// elements, elements outside <body>), so a path computed from the live tree may not resolve in
// a re-parsed file. This function therefore: clones the cleaned tree *with* the data-af-node
// markers, parses that serialization back with DOMParser (the same parser class a consumer
// would use), and walks the parsed tree to produce the paths. Stripping markers/tracking
// attributes and comments afterwards cannot change element structure, so every returned path
// resolves in the returned HTML by construction.
//
// Returns { html, indexById, pathById, elementsInDom, duplicates, unmarkedElements }.
// `wantedPathIds` limits the (bulky) path output to the elements nodes.json will reference.
export function extractCleanedDom(wantedPathIds) {
  const wanted = new Set(wantedPathIds ?? []);
  const TRACK_ATTR = /^(?:on[a-z]+|data-(?:spm|track|tracking|analytics|ga|gtm|click|report|stat|stats|bi|log|logs|event|events|beacon|utm)[-_a-z0-9]*)$/i;

  const clone = document.documentElement.cloneNode(true);
  for (const el of clone.querySelectorAll('[data-af-hidden]')) el.remove();

  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${clone.outerHTML}`, 'text/html');
  const root = parsed.documentElement;

  const indexById = {};
  const pathById = {};
  let elementsInDom = 0;
  let duplicates = 0;
  let unmarkedElements = 0;

  const walk = (el, path) => {
    const id = el.getAttribute('data-af-node');
    if (id === null) {
      unmarkedElements += 1;
    } else if (indexById[id] === undefined) {
      indexById[id] = elementsInDom;
      if (wanted.has(id)) pathById[id] = path;
    } else {
      duplicates += 1;
    }
    elementsInDom += 1;
    const children = el.children;
    for (let k = 0; k < children.length; k += 1) {
      walk(children[k], `${path}/${children[k].tagName.toLowerCase()}[${k}]`);
    }
  };
  walk(root, 'html');

  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const name of el.getAttributeNames()) {
      if (TRACK_ATTR.test(name) || name.startsWith('data-af-')) el.removeAttribute(name);
    }
  }

  const walker = parsed.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const comment of comments) comment.remove();

  return { html: root.outerHTML, indexById, pathById, elementsInDom, duplicates, unmarkedElements };
}

// Removes the in-page markers again (belt-and-braces; the serializer also strips them).
export function clearMarkers() {
  for (const el of document.querySelectorAll('[data-af-node], [data-af-hidden]')) {
    el.removeAttribute('data-af-node');
    el.removeAttribute('data-af-hidden');
  }
  return true;
}
