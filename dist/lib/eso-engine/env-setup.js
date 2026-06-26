"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDomValue = setDomValue;
exports.setDomAttr = setDomAttr;
exports.setDomTextContent = setDomTextContent;
exports.resetDomValues = resetDomValues;
exports.setupNodeEnvironment = setupNodeEnvironment;
/** Armazena os valores que o jQuery vai "ler" como se fossem campos HTML */
const domValueStore = new Map();
/** Armazena atributos HTML de elementos mock (ex: unlocked="50" nos nodes CP2) */
const domAttrStore = new Map();
/** Armazena o textContent de elementos mock (ex: "Current bonus: 1500" nos nodes CP2) */
const domTextStore = new Map();
/** Define o valor de um elemento mock (equivale a preencher um campo HTML) */
function setDomValue(id, value) {
    domValueStore.set(id, value);
}
/** Define um atributo HTML de um elemento mock */
function setDomAttr(id, attr, value) {
    if (!domAttrStore.has(id))
        domAttrStore.set(id, new Map());
    domAttrStore.get(id).set(attr, value);
}
/** Define o textContent de um elemento mock */
function setDomTextContent(id, text) {
    domTextStore.set(id, text);
}
/** Reseta todos os valores do DOM mock */
function resetDomValues() {
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
function createChainMock(id) {
    // Proxy que retorna `chain` para qualquer método desconhecido, evitando "not a function"
    const handler = {
        get(target, prop) {
            if (prop in target)
                return target[prop];
            if (typeof prop === 'string' && prop !== 'then') {
                // Retorna função encadeável genérica para qualquer método jQuery desconhecido
                return (..._args) => new Proxy(chain, handler);
            }
            return undefined;
        },
    };
    const chain = {
        length: 1, // CRÍTICO: deve ser >= 1 para o motor não abortar o cálculo
        val: (v) => {
            if (v !== undefined) {
                if (id)
                    domValueStore.set(id, String(v));
                return chain;
            }
            return id ? (domValueStore.get(id) ?? '') : '';
        },
        prop: (name, v) => {
            if (v !== undefined)
                return chain;
            // checkbox — retorna false por padrão (PvP, Stealth, etc. desabilitados)
            if (name === 'checked') {
                return id ? domValueStore.get(id) === 'true' : false;
            }
            return id ? (domValueStore.get(id) ?? '') : '';
        },
        attr: (name, v) => {
            if (v !== undefined)
                return chain;
            return id ? (domAttrStore.get(id)?.get(name) ?? '') : '';
        },
        data: (key, v) => {
            if (v !== undefined)
                return chain;
            return '';
        },
        html: (v) => {
            return v !== undefined ? chain : '';
        },
        text: (v) => {
            if (v !== undefined)
                return chain;
            return id ? (domTextStore.get(id) ?? '') : '';
        },
        find: (_sel) => createChainMock(),
        children: (_sel) => createChainMock(),
        parent: () => createChainMock(),
        prev: () => createChainMock(id ? id + '_prev' : undefined),
        closest: (_sel) => createChainMock(),
        filter: (_sel) => createChainMock(),
        each: (_fn) => chain,
        on: (_evt, _fn) => chain,
        off: (_evt) => chain,
        trigger: (_evt) => chain,
        addClass: (_cls) => chain,
        removeClass: (_cls) => chain,
        toggleClass: (_cls, _v) => chain,
        hasClass: (_cls) => false,
        show: () => chain,
        hide: () => chain,
        append: (_v) => chain,
        prepend: (_v) => chain,
        empty: () => chain,
        remove: () => chain,
        css: (_k, _v) => (typeof _v !== 'undefined' ? chain : ''),
        width: (_v) => (_v !== undefined ? chain : 0),
        height: (_v) => (_v !== undefined ? chain : 0),
        scrollTop: (_v) => (_v !== undefined ? chain : 0),
        focus: () => chain,
        blur: () => chain,
        click: () => chain,
        submit: () => chain,
        is: (_sel) => false,
        not: (_sel) => chain,
        eq: (_i) => createChainMock(),
        first: () => createChainMock(),
        last: () => createChainMock(),
        get: (_i) => null,
        index: () => -1,
        serialize: () => '',
        serializeArray: () => [],
        // Acesso por índice (computeElements[i])
        0: null,
        // $(document).ready(fn) — executa fn imediatamente em Node.js
        ready: (fn) => {
            try {
                fn();
            }
            catch (_) { }
            return chain;
        },
    };
    return new Proxy(chain, handler);
}
function createJQueryMock() {
    const $ = function (selectorOrEl, _ctx) {
        if (typeof selectorOrEl !== 'string')
            return createChainMock();
        // Extrai o ID do seletor "#meuId"
        const idMatch = selectorOrEl.match(/^#([\w-]+)$/);
        return createChainMock(idMatch ? idMatch[1] : undefined);
    };
    // Utilitários estáticos do jQuery usados pelo motor
    $.isEmptyObject = (obj) => obj == null || Object.keys(obj).length === 0;
    $.isArray = Array.isArray;
    $.isFunction = (v) => typeof v === 'function';
    $.isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    $.each = (obj, fn) => {
        if (Array.isArray(obj))
            obj.forEach((v, i) => fn(i, v));
        else if (obj)
            Object.keys(obj).forEach((k) => fn(k, obj[k]));
    };
    $.extend = (...args) => Object.assign({}, ...args);
    $.noop = () => { };
    $.trim = (s) => (s || '').trim();
    $.type = (v) => typeof v;
    $.fn = {};
    $.ajax = () => ({ done: () => ({ fail: () => ({}) }) });
    $.getJSON = () => ({ done: () => ({ fail: () => ({}) }) });
    $.Deferred = () => ({ resolve: () => { }, reject: () => { }, promise: () => ({}) });
    $.when = (..._args) => ({ done: () => ({}) });
    $.parseJSON = JSON.parse;
    return $;
}
// ---------------------------------------------------------------------------
// Mock do document
// ---------------------------------------------------------------------------
function createDocumentMock() {
    return {
        getElementById: (id) => ({
            value: domValueStore.get(id) ?? '',
            checked: domValueStore.get(id) === 'true',
            textContent: '',
            innerHTML: '',
            style: {},
        }),
        querySelector: (_sel) => null,
        querySelectorAll: (_sel) => [],
        createElement: (_tag) => ({
            style: {},
            setAttribute: () => { },
            appendChild: () => { },
        }),
        addEventListener: () => { },
        removeEventListener: () => { },
        body: { appendChild: () => { }, style: {}, innerHTML: '' },
        head: { appendChild: () => { } },
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
function setupNodeEnvironment() {
    // navigator — propriedade read-only no Node 18+, precisa de defineProperty
    Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Node.js ESO Engine)', language: 'en-US', onLine: true },
        configurable: true,
        writable: true,
    });
    // location
    global.location = {
        href: 'http://localhost/',
        hostname: 'localhost',
        protocol: 'http:',
    };
    // jQuery mock — o motor acessa via window.$ e também via $ diretamente
    const jq = createJQueryMock();
    global.$ = jq;
    global.jQuery = jq;
    // document mock
    global.document = createDocumentMock();
    // console.time/timeEnd — usados pelo motor para profiling (no-ops aqui)
    if (!console.time)
        console.time = () => { };
    if (!console.timeEnd)
        console.timeEnd = () => { };
    // setTimeout síncrono — o motor usa setTimeout(..., 100) para atualização assíncrona.
    // Substituímos por execução síncrona imediata para uso em servidor.
    global.setTimeout = (fn, _delay) => {
        fn();
        return 0;
    };
    global.clearTimeout = () => { };
    global.setInterval = (_fn, _d) => 0;
    global.clearInterval = () => { };
    // window: usamos um Proxy que redireciona leituras/escritas para global.
    // Isso evita quebrar internos do Node.js com "global.window = global".
    if (!global.window) {
        global.window = new Proxy(global, {
            get(target, prop) {
                return target[prop];
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            },
        });
    }
}
//# sourceMappingURL=env-setup.js.map