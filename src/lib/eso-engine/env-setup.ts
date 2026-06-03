/**
 * Configura o ambiente global do Node.js para simular o browser.
 *
 * O motor da UESP (esoEditBuild.js) foi escrito para rodar no browser e usa:
 *   - window.* — para variáveis e funções globais
 *   - document.getElementById / $ — para ler/escrever valores do DOM
 *   - navigator — verificação de agente
 *
 * Esta camada cria mocks controlados desses objetos ANTES de carregar
 * o script da UESP, de forma que:
 *   1. O script inicia sem erros (jQuery mock chainável)
 *   2. Nosso código pode injetar valores de entrada (race, class, level, etc.)
 *      via setDomValue() antes de chamar o cálculo
 *   3. O motor lê esses valores normalmente via $("#elementId").val()
 */

/** Armazena os valores que o jQuery vai "ler" como se fossem campos HTML */
export const domValueStore = new Map<string, string>();

/** Armazena atributos HTML de elementos mock (ex: unlocked="50" nos nodes CP2) */
export const domAttrStore = new Map<string, Map<string, string>>();

/** Armazena o textContent de elementos mock (ex: "Current bonus: 1500" nos nodes CP2) */
export const domTextStore = new Map<string, string>();

/** Define o valor de um elemento mock (equivale a preencher um campo HTML) */
export function setDomValue(id: string, value: string): void {
  domValueStore.set(id, value);
}

/** Define um atributo HTML de um elemento mock */
export function setDomAttr(id: string, attr: string, value: string): void {
  if (!domAttrStore.has(id)) domAttrStore.set(id, new Map());
  domAttrStore.get(id)!.set(attr, value);
}

/** Define o textContent de um elemento mock */
export function setDomTextContent(id: string, text: string): void {
  domTextStore.set(id, text);
}

/** Lê o valor de um elemento mock */
export function getDomValue(id: string): string {
  return domValueStore.get(id) ?? '';
}

/** Reseta todos os valores do DOM mock */
export function resetDomValues(): void {
  domValueStore.clear();
  domAttrStore.clear();
  domTextStore.clear();
}

// ---------------------------------------------------------------------------
// Mock do jQuery ($)
// O motor usa: $("#id").val(), .prop("checked"), .find(), .children(),
// .text(), .html(), .each(), .on(), .length
// Precisamos que .length >= 1 para que UpdateEsoComputedStat não retorne
// prematuramente no check: if (element.length == 0) return false;
// ---------------------------------------------------------------------------

function createChainMock(id?: string): any {
  // Proxy que retorna `chain` para qualquer método desconhecido, evitando "not a function"
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && prop !== 'then') {
        // Retorna função encadeável genérica para qualquer método jQuery desconhecido
        return (..._args: any[]) => new Proxy(chain, handler);
      }
      return undefined;
    },
  };

  const chain: any = {
    length: 1, // CRÍTICO: deve ser >= 1 para o motor não abortar o cálculo
    val: (v?: string) => {
      if (v !== undefined) {
        if (id) domValueStore.set(id, String(v));
        return chain;
      }
      return id ? (domValueStore.get(id) ?? '') : '';
    },
    prop: (name: string, v?: any) => {
      if (v !== undefined) return chain;
      // checkbox — retorna false por padrão (PvP, Stealth, etc. desabilitados)
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
    // Acesso por índice (computeElements[i])
    0: null,
    // $(document).ready(fn) — executa fn imediatamente em Node.js
    ready: (fn: Function) => {
      try {
        fn();
      } catch (_) {
      }
      return chain;
    },
  };
  return new Proxy(chain, handler);
}
function createJQueryMock() {
  const $ = function (selectorOrEl: any, _ctx?: any): any {
    if (typeof selectorOrEl !== 'string') return createChainMock();
    // Extrai o ID do seletor "#meuId"
    const idMatch = selectorOrEl.match(/^#([\w-]+)$/);
    return createChainMock(idMatch ? idMatch[1] : undefined);
  } as any;

  // Utilitários estáticos do jQuery usados pelo motor
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
  $.when = (..._args: any[]) => ({done: () => ({})});
  $.parseJSON = JSON.parse;

  return $;
}

// ---------------------------------------------------------------------------
// Mock do document
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
// Configuração principal — chamar UMA VEZ antes de carregar o script da UESP
// ---------------------------------------------------------------------------
export function setupNodeEnvironment(): void {
  // navigator — propriedade read-only no Node 18+, precisa de defineProperty
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

  // jQuery mock — o motor acessa via window.$ e também via $ diretamente
  const jq = createJQueryMock();
  (global as any).$ = jq;
  (global as any).jQuery = jq;

  // document mock
  (global as any).document = createDocumentMock();

  // console.time/timeEnd — usados pelo motor para profiling (no-ops aqui)
  if (!console.time) (console as any).time = () => {
  };
  if (!console.timeEnd) (console as any).timeEnd = () => {
  };

  // setTimeout síncrono — o motor usa setTimeout(..., 100) para atualização assíncrona.
  // Substituímos por execução síncrona imediata para uso em servidor.
  (global as any).setTimeout = (fn: Function, _delay?: number) => {
    fn();
    return 0;
  };
  (global as any).clearTimeout = () => {};
  (global as any).setInterval = (_fn: Function, _d?: number) => 0;
  (global as any).clearInterval = () => {};

  // window: usamos um Proxy que redireciona leituras/escritas para global.
  // Isso evita quebrar internos do Node.js com "global.window = global".
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
