/**
 * Sets up the Node.js global environment to simulate the browser.
 *
 * The UESP engine (esoEditBuild.js) was written to run in the browser and uses:
 *   - window.* — for global variables and functions
 *   - document.getElementById / $ — to read/write DOM values
 *   - navigator — agent check
 *
 * This layer creates controlled mocks of these objects BEFORE loading
 * the UESP script, so that:
 *   1. The script starts without errors (chainable jQuery mock)
 *   2. Our code can inject input values (race, class, level, etc.)
 *      via setDomValue() before calling the calculation
 *   3. The engine reads these values normally via $("#elementId").val()
 */

/** Stores the values jQuery will "read" as if they were HTML fields */
const domValueStore = new Map<string, string>();

/** Stores mock element HTML attributes (e.g. unlocked="50" on CP2 nodes) */
const domAttrStore = new Map<string, Map<string, string>>();

/** Stores mock element textContent (e.g. "Current bonus: 1500" on CP2 nodes) */
const domTextStore = new Map<string, string>();

/** Sets a mock element's value (equivalent to filling in an HTML field) */
export function setDomValue(id: string, value: string): void {
  domValueStore.set(id, value);
}

/** Sets a mock element's HTML attribute */
export function setDomAttr(id: string, attr: string, value: string): void {
  if (!domAttrStore.has(id)) domAttrStore.set(id, new Map());
  domAttrStore.get(id)!.set(attr, value);
}

/** Sets a mock element's textContent */
export function setDomTextContent(id: string, text: string): void {
  domTextStore.set(id, text);
}

/** Resets all mock DOM values */
export function resetDomValues(): void {
  domValueStore.clear();
  domAttrStore.clear();
  domTextStore.clear();
}

// ---------------------------------------------------------------------------
// jQuery ($) mock
// The engine uses: $("#id").val(), .prop("checked"), .find(), .children(),
// .text(), .html(), .each(), .on(), .length
// We need .length >= 1 so UpdateEsoComputedStat does not return
// early on the check: if (element.length == 0) return false;
// ---------------------------------------------------------------------------

function createChainMock(id?: string): any {
  // Proxy returning `chain` for any unknown method, avoiding "not a function"
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && prop !== 'then') {
        // Return a generic chainable function for any unknown jQuery method
        return (..._args: any[]) => new Proxy(chain, handler);
      }
      return undefined;
    },
  };

  const chain: any = {
    length: 1, // CRITICAL: must be >= 1 so the engine does not abort the calculation
    val: (v?: string) => {
      if (v !== undefined) {
        if (id) domValueStore.set(id, String(v));
        return chain;
      }
      return id ? (domValueStore.get(id) ?? '') : '';
    },
    prop: (name: string, v?: any) => {
      if (v !== undefined) return chain;
      // checkbox — returns false by default (PvP, Stealth, etc. disabled)
      if (name === 'checked') {
        return id ? domValueStore.get(id) === 'true' : false;
      }
      return id ? (domValueStore.get(id) ?? '') : '';
    },
    attr: (name: string, v?: any) => {
      if (v !== undefined) return chain;
      return id ? (domAttrStore.get(id)?.get(name) ?? '') : '';
    },
    data: (key: string, v?: any) => {
      if (v !== undefined) return chain;
      return '';
    },
    html: (v?: string) => {
      return v !== undefined ? chain : '';
    },
    text: (v?: string) => {
      if (v !== undefined) return chain;
      return id ? (domTextStore.get(id) ?? '') : '';
    },
    find: (_sel: string) => createChainMock(),
    children: (_sel?: string) => createChainMock(),
    parent: () => createChainMock(),
    prev: () => createChainMock(id ? id + '_prev' : undefined),
    closest: (_sel: string) => createChainMock(),
    filter: (_sel: string) => createChainMock(),
    each: (_fn: Function) => chain,
    on: (_evt: string, _fn: Function) => chain,
    off: (_evt: string) => chain,
    trigger: (_evt: string) => chain,
    addClass: (_cls: string) => chain,
    removeClass: (_cls: string) => chain,
    toggleClass: (_cls: string, _v?: boolean) => chain,
    hasClass: (_cls: string) => false,
    show: () => chain,
    hide: () => chain,
    append: (_v: any) => chain,
    prepend: (_v: any) => chain,
    empty: () => chain,
    remove: () => chain,
    css: (_k: string, _v?: any) => (typeof _v !== 'undefined' ? chain : ''),
    width: (_v?: any) => (_v !== undefined ? chain : 0),
    height: (_v?: any) => (_v !== undefined ? chain : 0),
    scrollTop: (_v?: any) => (_v !== undefined ? chain : 0),
    focus: () => chain,
    blur: () => chain,
    click: () => chain,
    submit: () => chain,
    is: (_sel: string) => false,
    not: (_sel: string) => chain,
    eq: (_i: number) => createChainMock(),
    first: () => createChainMock(),
    last: () => createChainMock(),
    get: (_i?: number) => null,
    index: () => -1,
    serialize: () => '',
    serializeArray: () => [],
    // Index access (computeElements[i])
    0: null,
    // $(document).ready(fn) — runs fn immediately in Node.js
    ready: (fn: Function) => {
      try {
        fn();
      } catch (_) {}
      return chain;
    },
  };
  return new Proxy(chain, handler);
}
function createJQueryMock() {
  const $ = function (selectorOrEl: any, _ctx?: any): any {
    if (typeof selectorOrEl !== 'string') return createChainMock();
    // Extract the ID from the "#myId" selector
    const idMatch = selectorOrEl.match(/^#([\w-]+)$/);
    return createChainMock(idMatch ? idMatch[1] : undefined);
  } as any;

  // Static jQuery utilities used by the engine
  $.isEmptyObject = (obj: any) => obj == null || Object.keys(obj).length === 0;
  $.isArray = Array.isArray;
  $.isFunction = (v: any) => typeof v === 'function';
  $.isPlainObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
  $.each = (obj: any, fn: Function) => {
    if (Array.isArray(obj)) obj.forEach((v: any, i: number) => fn(i, v));
    else if (obj) Object.keys(obj).forEach((k) => fn(k, obj[k]));
  };
  $.extend = (...args: any[]) => Object.assign({}, ...args);
  $.noop = () => {};
  $.trim = (s: string) => (s || '').trim();
  $.type = (v: any) => typeof v;
  $.fn = {};
  $.ajax = () => ({ done: () => ({ fail: () => ({}) }) });
  $.getJSON = () => ({ done: () => ({ fail: () => ({}) }) });
  $.Deferred = () => ({ resolve: () => {}, reject: () => {}, promise: () => ({}) });
  $.when = (..._args: any[]) => ({ done: () => ({}) });
  $.parseJSON = JSON.parse;

  return $;
}

// ---------------------------------------------------------------------------
// document mock
// ---------------------------------------------------------------------------
function createDocumentMock() {
  return {
    getElementById: (id: string) => ({
      value: domValueStore.get(id) ?? '',
      checked: domValueStore.get(id) === 'true',
      textContent: '',
      innerHTML: '',
      style: {},
    }),
    querySelector: (_sel: string) => null,
    querySelectorAll: (_sel: string) => [],
    createElement: (_tag: string) => ({
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild: () => {}, style: {}, innerHTML: '' },
    head: { appendChild: () => {} },
    readyState: 'complete',
    title: '',
    URL: 'http://localhost/',
    location: { href: 'http://localhost/', hostname: 'localhost', protocol: 'http:' },
    cookie: '',
  };
}

// ---------------------------------------------------------------------------
// Main setup — call ONCE before loading the UESP script
// ---------------------------------------------------------------------------
export function setupNodeEnvironment(): void {
  // navigator — read-only property on Node 18+, needs defineProperty
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (Node.js ESO Engine)', language: 'en-US', onLine: true },
    configurable: true,
    writable: true,
  });

  // location
  (global as any).location = {
    href: 'http://localhost/',
    hostname: 'localhost',
    protocol: 'http:',
  };

  // jQuery mock — the engine accesses it via window.$ and also via $ directly
  const jq = createJQueryMock();
  (global as any).$ = jq;
  (global as any).jQuery = jq;

  // document mock
  (global as any).document = createDocumentMock();

  // console.time/timeEnd — used by the engine for profiling (no-ops here)
  if (!console.time) (console as any).time = () => {};
  if (!console.timeEnd) (console as any).timeEnd = () => {};

  // window: we use a Proxy redirecting reads/writes to global.
  // This avoids breaking Node.js internals with "global.window = global".
  if (!(global as any).window) {
    (global as any).window = new Proxy(global, {
      get(target, prop) {
        return (target as any)[prop];
      },
      set(target, prop, value) {
        (target as any)[prop] = value;
        return true;
      },
    });
  }
}
