import '/node_modules/vite/dist/client/env.mjs';

// set :host styles to make playwright detect the element as visible
const template = /*html*/ `
<style>
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.backdrop {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
  --monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;
}

.window {
  font-family: var(--monospace);
  line-height: 1.5;
  width: 800px;
  color: #d8d8d8;
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: #181818;
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
  direction: ltr;
  text-align: left;
}

pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}

pre::-webkit-scrollbar {
  display: none;
}

.message {
  line-height: 1.3;
  font-weight: 600;
  white-space: pre-wrap;
}

.message-body {
  color: var(--red);
}

.plugin {
  color: var(--purple);
}

.file {
  color: var(--cyan);
  margin-bottom: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--yellow);
}

.stack {
  font-size: 13px;
  color: var(--dim);
}

.tip {
  display: none;
}

code {
  font-size: 13px;
  font-family: var(--monospace);
  color: var(--yellow);
}

.file-link {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class="backdrop">
  <div class="window">
    <pre class="message"><span class="plugin"></span><span class="message-body"></span></pre>
    <pre class="file"></pre>
    <pre class="frame"></pre>
    <pre class="stack"></pre>
    <div class="tip">
      Click outside or fix the code to dismiss.<br>
      You can also disable this overlay by setting
      <code>server.hmr.overlay</code> to <code>false</code> in <code>vite.config.js.</code>
    </div>
  </div>
</div>
`;
const fileRE = /(?:[a-zA-Z]:\\|\/).*?:\d+:\d+/g;
const codeframeRE = /^(?:>?\s+\d+\s+\|.*|\s+\|\s*\^.*)\r?\n/gm;
// Allow `ErrorOverlay` to extend `HTMLElement` even in environments where
// `HTMLElement` was not originally defined.
const { HTMLElement = class {
} } = globalThis;
class ErrorOverlay extends HTMLElement {
    constructor(err) {
        var _a;
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = template;
        codeframeRE.lastIndex = 0;
        const hasFrame = err.frame && codeframeRE.test(err.frame);
        const message = hasFrame
            ? err.message.replace(codeframeRE, '')
            : err.message;
        if (err.plugin) {
            this.text('.plugin', `[plugin:${err.plugin}] `);
        }
        this.text('.message-body', message.trim());
        const [file] = (((_a = err.loc) === null || _a === void 0 ? void 0 : _a.file) || err.id || 'unknown file').split(`?`);
        if (err.loc) {
            this.text('.file', `${file}:${err.loc.line}:${err.loc.column}`, true);
        }
        else if (err.id) {
            this.text('.file', file);
        }
        if (hasFrame) {
            this.text('.frame', err.frame.trim());
        }
        this.text('.stack', err.stack, true);
        this.root.querySelector('.window').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        this.addEventListener('click', () => {
            this.close();
        });
    }
    text(selector, text, linkFiles = false) {
        const el = this.root.querySelector(selector);
        if (!linkFiles) {
            el.textContent = text;
        }
        else {
            let curIndex = 0;
            let match;
            while ((match = fileRE.exec(text))) {
                const { 0: file, index } = match;
                if (index != null) {
                    const frag = text.slice(curIndex, index);
                    el.appendChild(document.createTextNode(frag));
                    const link = document.createElement('a');
                    link.textContent = file;
                    link.className = 'file-link';
                    link.onclick = () => {
                        fetch('/__open-in-editor?file=' + encodeURIComponent(file));
                    };
                    el.appendChild(link);
                    curIndex += frag.length + file.length;
                }
            }
        }
    }
    close() {
        var _a;
        (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this);
    }
}
const overlayId = 'vite-error-overlay';
const { customElements } = globalThis; // Ensure `customElements` is defined before the next line.
if (customElements && !customElements.get(overlayId)) {
    customElements.define(overlayId, ErrorOverlay);
}

console.debug('[astro] connecting...');
const importMetaUrl = new URL(import.meta.url);
// use server configuration, then fallback to inference
const serverHost = "127.0.0.1:3000/";
const socketProtocol = null || (location.protocol === 'https:' ? 'wss' : 'ws');
const hmrPort = null;
const socketHost = `${null || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}${"/"}`;
const directSocketHost = "127.0.0.1:3000/";
const base = "/" || '/';
const messageBuffer = [];
let socket;
try {
    let fallback;
    // only use fallback when port is inferred to prevent confusion
    if (!hmrPort) {
        fallback = () => {
            // fallback to connecting directly to the hmr server
            // for servers which does not support proxying websocket
            socket = setupWebSocket(socketProtocol, directSocketHost, () => {
                const currentScriptHostURL = new URL(import.meta.url);
                const currentScriptHost = currentScriptHostURL.host +
                    currentScriptHostURL.pathname.replace(/@vite\/client$/, '');
                console.error('[astro] failed to connect to websocket.\n' +
                    'your current setup:\n' +
                    `  (browser) ${currentScriptHost} <--[HTTP]--> ${serverHost} (server)\n` +
                    `  (browser) ${socketHost} <--[WebSocket (failing)]--> ${directSocketHost} (server)\n` +
                    'Check out your Vite / network configuration and https://vitejs.dev/config/server-options.html#server-hmr .');
            });
            socket.addEventListener('open', () => {
                console.info('[astro] Direct websocket connection fallback. Check out https://vitejs.dev/config/server-options.html#server-hmr to remove the previous connection error.');
            }, { once: true });
        };
    }
    socket = setupWebSocket(socketProtocol, socketHost, fallback);
}
catch (error) {
    console.error(`[astro] failed to connect to websocket (${error}). `);
}
function setupWebSocket(protocol, hostAndPath, onCloseWithoutOpen) {
    const socket = new WebSocket(`${protocol}://${hostAndPath}`, 'vite-hmr');
    let isOpened = false;
    socket.addEventListener('open', () => {
        isOpened = true;
    }, { once: true });
    // Listen for messages
    socket.addEventListener('message', async ({ data }) => {
        handleMessage(JSON.parse(data));
    });
    // ping server
    socket.addEventListener('close', async ({ wasClean }) => {
        if (wasClean)
            return;
        if (!isOpened && onCloseWithoutOpen) {
            onCloseWithoutOpen();
            return;
        }
        console.log(`[astro] server connection lost. polling for restart...`);
        await waitForSuccessfulPing(protocol, hostAndPath);
        location.reload();
    });
    return socket;
}
function warnFailedFetch(err, path) {
    if (!err.message.match('fetch')) {
        console.error(err);
    }
    console.error(`[hmr] Failed to reload ${path}. ` +
        `This could be due to syntax errors or importing non-existent ` +
        `modules. (see errors above)`);
}
function cleanUrl(pathname) {
    const url = new URL(pathname, location.toString());
    url.searchParams.delete('direct');
    return url.pathname + url.search;
}
let isFirstUpdate = true;
const outdatedLinkTags = new WeakSet();
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.debug(`[astro] connected.`);
            sendMessageBuffer();
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => {
                if (socket.readyState === socket.OPEN) {
                    socket.send('{"type":"ping"}');
                }
            }, 30000);
            break;
        case 'update':
            notifyListeners('vite:beforeUpdate', payload);
            // if this is the first update and there's already an error overlay, it
            // means the page opened with existing server compile error and the whole
            // module script failed to load (since one of the nested imports is 500).
            // in this case a normal update won't work and a full reload is needed.
            if (isFirstUpdate && hasErrorOverlay()) {
                window.location.reload();
                return;
            }
            else {
                clearErrorOverlay();
                isFirstUpdate = false;
            }
            payload.updates.forEach((update) => {
                if (update.type === 'js-update') {
                    queueUpdate(fetchUpdate(update));
                }
                else {
                    // css-update
                    // this is only sent when a css file referenced with <link> is updated
                    const { path, timestamp } = update;
                    const searchUrl = cleanUrl(path);
                    // can't use querySelector with `[href*=]` here since the link may be
                    // using relative paths so we need to use link.href to grab the full
                    // URL for the include check.
                    const el = Array.from(document.querySelectorAll('link')).find((e) => !outdatedLinkTags.has(e) && cleanUrl(e.href).includes(searchUrl));
                    if (el) {
                        const newPath = `${base}${searchUrl.slice(1)}${searchUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
                        // rather than swapping the href on the existing tag, we will
                        // create a new link tag. Once the new stylesheet has loaded we
                        // will remove the existing link tag. This removes a Flash Of
                        // Unstyled Content that can occur when swapping out the tag href
                        // directly, as the new stylesheet has not yet been loaded.
                        const newLinkTag = el.cloneNode();
                        newLinkTag.href = new URL(newPath, el.href).href;
                        const removeOldEl = () => el.remove();
                        newLinkTag.addEventListener('load', removeOldEl);
                        newLinkTag.addEventListener('error', removeOldEl);
                        outdatedLinkTags.add(el);
                        el.after(newLinkTag);
                    }
                    console.debug(`[astro] css hot updated: ${searchUrl}`);
                }
            });
            break;
        case 'custom': {
            notifyListeners(payload.event, payload.data);
            break;
        }
        case 'full-reload':
            notifyListeners('vite:beforeFullReload', payload);
            if (payload.path && payload.path.endsWith('.html')) {
                // if html file is edited, only reload the page if the browser is
                // currently on that page.
                const pagePath = decodeURI(location.pathname);
                const payloadPath = base + payload.path.slice(1);
                if (pagePath === payloadPath ||
                    payload.path === '/index.html' ||
                    (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)) {
                    location.reload();
                }
                return;
            }
            else {
                location.reload();
            }
            break;
        case 'prune':
            notifyListeners('vite:beforePrune', payload);
            // After an HMR update, some modules are no longer imported on the page
            // but they may have left behind side effects that need to be cleaned up
            // (.e.g style injections)
            // TODO Trigger their dispose callbacks.
            payload.paths.forEach((path) => {
                const fn = pruneMap.get(path);
                if (fn) {
                    fn(dataMap.get(path));
                }
            });
            break;
        case 'error': {
            notifyListeners('vite:error', payload);
            const err = payload.err;
            if (enableOverlay) {
                createErrorOverlay(err);
            }
            else {
                console.error(`[astro] Internal Server Error\n${err.message}\n${err.stack}`);
            }
            break;
        }
        default: {
            const check = payload;
            return check;
        }
    }
}
function notifyListeners(event, data) {
    const cbs = customListenersMap.get(event);
    if (cbs) {
        cbs.forEach((cb) => cb(data));
    }
}
const enableOverlay = true;
function createErrorOverlay(err) {
    if (!enableOverlay)
        return;
    clearErrorOverlay();
    document.body.appendChild(new ErrorOverlay(err));
}
function clearErrorOverlay() {
    document
        .querySelectorAll(overlayId)
        .forEach((n) => n.close());
}
function hasErrorOverlay() {
    return document.querySelectorAll(overlayId).length;
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
    queued.push(p);
    if (!pending) {
        pending = true;
        await Promise.resolve();
        pending = false;
        const loading = [...queued];
        queued = [];
        (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
}
async function waitForSuccessfulPing(socketProtocol, hostAndPath, ms = 1000) {
    const pingHostProtocol = socketProtocol === 'wss' ? 'https' : 'http';
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            // A fetch on a websocket URL will return a successful promise with status 400,
            // but will reject a networking error.
            // When running on middleware mode, it returns status 426, and an cors error happens if mode is not no-cors
            await fetch(`${pingHostProtocol}://${hostAndPath}`, {
                mode: 'no-cors'
            });
            break;
        }
        catch (e) {
            // wait ms before attempting to ping again
            await new Promise((resolve) => setTimeout(resolve, ms));
        }
    }
}
const sheetsMap = new Map();
function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    {
        if (style && !(style instanceof HTMLStyleElement)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.innerHTML = content;
            document.head.appendChild(style);
        }
        else {
            style.innerHTML = content;
        }
    }
    sheetsMap.set(id, style);
}
function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        if (style instanceof CSSStyleSheet) {
            // @ts-expect-error: using experimental API
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
        }
        else {
            document.head.removeChild(style);
        }
        sheetsMap.delete(id);
    }
}
async function fetchUpdate({ path, acceptedPath, timestamp, explicitImportRequired }) {
    const mod = hotModulesMap.get(path);
    if (!mod) {
        // In a code-splitting project,
        // it is common that the hot-updating module is not loaded yet.
        // https://github.com/vitejs/vite/issues/721
        return;
    }
    const moduleMap = new Map();
    const isSelfUpdate = path === acceptedPath;
    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => deps.includes(acceptedPath));
    if (isSelfUpdate || qualifiedCallbacks.length > 0) {
        const dep = acceptedPath;
        const disposer = disposeMap.get(dep);
        if (disposer)
            await disposer(dataMap.get(dep));
        const [path, query] = dep.split(`?`);
        try {
            const newMod = await import(
            /* @vite-ignore */
            base +
                path.slice(1) +
                `?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${query ? `&${query}` : ''}`);
            moduleMap.set(dep, newMod);
        }
        catch (e) {
            warnFailedFetch(e, dep);
        }
    }
    return () => {
        for (const { deps, fn } of qualifiedCallbacks) {
            fn(deps.map((dep) => moduleMap.get(dep)));
        }
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        console.debug(`[astro] hot updated: ${loggedPath}`);
    };
}
function sendMessageBuffer() {
    if (socket.readyState === 1) {
        messageBuffer.forEach((msg) => socket.send(msg));
        messageBuffer.length = 0;
    }
}
const hotModulesMap = new Map();
const disposeMap = new Map();
const pruneMap = new Map();
const dataMap = new Map();
const customListenersMap = new Map();
const ctxToListenersMap = new Map();
function createHotContext(ownerPath) {
    if (!dataMap.has(ownerPath)) {
        dataMap.set(ownerPath, {});
    }
    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }
    // clear stale custom event listeners
    const staleListeners = ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
        for (const [event, staleFns] of staleListeners) {
            const listeners = customListenersMap.get(event);
            if (listeners) {
                customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
            }
        }
    }
    const newListeners = new Map();
    ctxToListenersMap.set(ownerPath, newListeners);
    function acceptDeps(deps, callback = () => { }) {
        const mod = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: []
        };
        mod.callbacks.push({
            deps,
            fn: callback
        });
        hotModulesMap.set(ownerPath, mod);
    }
    const hot = {
        get data() {
            return dataMap.get(ownerPath);
        },
        accept(deps, callback) {
            if (typeof deps === 'function' || !deps) {
                // self-accept: hot.accept(() => {})
                acceptDeps([ownerPath], ([mod]) => deps && deps(mod));
            }
            else if (typeof deps === 'string') {
                // explicit deps
                acceptDeps([deps], ([mod]) => callback && callback(mod));
            }
            else if (Array.isArray(deps)) {
                acceptDeps(deps, callback);
            }
            else {
                throw new Error(`invalid hot.accept() usage.`);
            }
        },
        // export names (first arg) are irrelevant on the client side, they're
        // extracted in the server for propagation
        acceptExports(_, callback) {
            acceptDeps([ownerPath], callback && (([mod]) => callback(mod)));
        },
        dispose(cb) {
            disposeMap.set(ownerPath, cb);
        },
        // @ts-expect-error untyped
        prune(cb) {
            pruneMap.set(ownerPath, cb);
        },
        // TODO
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        decline() { },
        invalidate() {
            // TODO should tell the server to re-perform hmr propagation
            // from this module as root
            location.reload();
        },
        // custom events
        on(event, cb) {
            const addToMap = (map) => {
                const existing = map.get(event) || [];
                existing.push(cb);
                map.set(event, existing);
            };
            addToMap(customListenersMap);
            addToMap(newListeners);
        },
        send(event, data) {
            messageBuffer.push(JSON.stringify({ type: 'custom', event, data }));
            sendMessageBuffer();
        }
    };
    return hot;
}
/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    // skip urls that won't be handled by vite
    if (!url.startsWith('.') && !url.startsWith('/')) {
        return url;
    }
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    const { search, hash } = new URL(url, 'http://vitejs.dev');
    return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''}`;
}

export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
//# sourceMappingURL=client.mjs.map

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50Lm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NsaWVudC9vdmVybGF5LnRzIiwiLi4vLi4vc3JjL2NsaWVudC9jbGllbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQgfSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuXG4vLyBzZXQgOmhvc3Qgc3R5bGVzIHRvIG1ha2UgcGxheXdyaWdodCBkZXRlY3QgdGhlIGVsZW1lbnQgYXMgdmlzaWJsZVxuY29uc3QgdGVtcGxhdGUgPSAvKmh0bWwqLyBgXG48c3R5bGU+XG46aG9zdCB7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xufVxuXG4uYmFja2Ryb3Age1xuICBwb3NpdGlvbjogZml4ZWQ7XG4gIHotaW5kZXg6IDk5OTk5O1xuICB0b3A6IDA7XG4gIGxlZnQ6IDA7XG4gIHdpZHRoOiAxMDAlO1xuICBoZWlnaHQ6IDEwMCU7XG4gIG92ZXJmbG93LXk6IHNjcm9sbDtcbiAgbWFyZ2luOiAwO1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuNjYpO1xuICAtLW1vbm9zcGFjZTogJ1NGTW9uby1SZWd1bGFyJywgQ29uc29sYXMsXG4gICAgICAgICAgICAgICdMaWJlcmF0aW9uIE1vbm8nLCBNZW5sbywgQ291cmllciwgbW9ub3NwYWNlO1xuICAtLXJlZDogI2ZmNTU1NTtcbiAgLS15ZWxsb3c6ICNlMmFhNTM7XG4gIC0tcHVycGxlOiAjY2ZhNGZmO1xuICAtLWN5YW46ICMyZGQ5ZGE7XG4gIC0tZGltOiAjYzljOWM5O1xufVxuXG4ud2luZG93IHtcbiAgZm9udC1mYW1pbHk6IHZhcigtLW1vbm9zcGFjZSk7XG4gIGxpbmUtaGVpZ2h0OiAxLjU7XG4gIHdpZHRoOiA4MDBweDtcbiAgY29sb3I6ICNkOGQ4ZDg7XG4gIG1hcmdpbjogMzBweCBhdXRvO1xuICBwYWRkaW5nOiAyNXB4IDQwcHg7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYmFja2dyb3VuZDogIzE4MTgxODtcbiAgYm9yZGVyLXJhZGl1czogNnB4IDZweCA4cHggOHB4O1xuICBib3gtc2hhZG93OiAwIDE5cHggMzhweCByZ2JhKDAsMCwwLDAuMzApLCAwIDE1cHggMTJweCByZ2JhKDAsMCwwLDAuMjIpO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBib3JkZXItdG9wOiA4cHggc29saWQgdmFyKC0tcmVkKTtcbiAgZGlyZWN0aW9uOiBsdHI7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG59XG5cbnByZSB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBmb250LXNpemU6IDE2cHg7XG4gIG1hcmdpbi10b3A6IDA7XG4gIG1hcmdpbi1ib3R0b206IDFlbTtcbiAgb3ZlcmZsb3cteDogc2Nyb2xsO1xuICBzY3JvbGxiYXItd2lkdGg6IG5vbmU7XG59XG5cbnByZTo6LXdlYmtpdC1zY3JvbGxiYXIge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4ubWVzc2FnZSB7XG4gIGxpbmUtaGVpZ2h0OiAxLjM7XG4gIGZvbnQtd2VpZ2h0OiA2MDA7XG4gIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcbn1cblxuLm1lc3NhZ2UtYm9keSB7XG4gIGNvbG9yOiB2YXIoLS1yZWQpO1xufVxuXG4ucGx1Z2luIHtcbiAgY29sb3I6IHZhcigtLXB1cnBsZSk7XG59XG5cbi5maWxlIHtcbiAgY29sb3I6IHZhcigtLWN5YW4pO1xuICBtYXJnaW4tYm90dG9tOiAwO1xuICB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XG4gIHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcbn1cblxuLmZyYW1lIHtcbiAgY29sb3I6IHZhcigtLXllbGxvdyk7XG59XG5cbi5zdGFjayB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgY29sb3I6IHZhcigtLWRpbSk7XG59XG5cbi50aXAge1xuICBmb250LXNpemU6IDEzcHg7XG4gIGNvbG9yOiAjOTk5O1xuICBib3JkZXItdG9wOiAxcHggZG90dGVkICM5OTk7XG4gIHBhZGRpbmctdG9wOiAxM3B4O1xufVxuXG5jb2RlIHtcbiAgZm9udC1zaXplOiAxM3B4O1xuICBmb250LWZhbWlseTogdmFyKC0tbW9ub3NwYWNlKTtcbiAgY29sb3I6IHZhcigtLXllbGxvdyk7XG59XG5cbi5maWxlLWxpbmsge1xuICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgY3Vyc29yOiBwb2ludGVyO1xufVxuPC9zdHlsZT5cbjxkaXYgY2xhc3M9XCJiYWNrZHJvcFwiPlxuICA8ZGl2IGNsYXNzPVwid2luZG93XCI+XG4gICAgPHByZSBjbGFzcz1cIm1lc3NhZ2VcIj48c3BhbiBjbGFzcz1cInBsdWdpblwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cIm1lc3NhZ2UtYm9keVwiPjwvc3Bhbj48L3ByZT5cbiAgICA8cHJlIGNsYXNzPVwiZmlsZVwiPjwvcHJlPlxuICAgIDxwcmUgY2xhc3M9XCJmcmFtZVwiPjwvcHJlPlxuICAgIDxwcmUgY2xhc3M9XCJzdGFja1wiPjwvcHJlPlxuICAgIDxkaXYgY2xhc3M9XCJ0aXBcIj5cbiAgICAgIENsaWNrIG91dHNpZGUgb3IgZml4IHRoZSBjb2RlIHRvIGRpc21pc3MuPGJyPlxuICAgICAgWW91IGNhbiBhbHNvIGRpc2FibGUgdGhpcyBvdmVybGF5IGJ5IHNldHRpbmdcbiAgICAgIDxjb2RlPnNlcnZlci5obXIub3ZlcmxheTwvY29kZT4gdG8gPGNvZGU+ZmFsc2U8L2NvZGU+IGluIDxjb2RlPnZpdGUuY29uZmlnLmpzLjwvY29kZT5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2Rpdj5cbmBcblxuY29uc3QgZmlsZVJFID0gLyg/OlthLXpBLVpdOlxcXFx8XFwvKS4qPzpcXGQrOlxcZCsvZ1xuY29uc3QgY29kZWZyYW1lUkUgPSAvXig/Oj4/XFxzK1xcZCtcXHMrXFx8Lip8XFxzK1xcfFxccypcXF4uKilcXHI/XFxuL2dtXG5cbi8vIEFsbG93IGBFcnJvck92ZXJsYXlgIHRvIGV4dGVuZCBgSFRNTEVsZW1lbnRgIGV2ZW4gaW4gZW52aXJvbm1lbnRzIHdoZXJlXG4vLyBgSFRNTEVsZW1lbnRgIHdhcyBub3Qgb3JpZ2luYWxseSBkZWZpbmVkLlxuY29uc3QgeyBIVE1MRWxlbWVudCA9IGNsYXNzIHt9IGFzIHR5cGVvZiBnbG9iYWxUaGlzLkhUTUxFbGVtZW50IH0gPSBnbG9iYWxUaGlzXG5leHBvcnQgY2xhc3MgRXJyb3JPdmVybGF5IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICByb290OiBTaGFkb3dSb290XG5cbiAgY29uc3RydWN0b3IoZXJyOiBFcnJvclBheWxvYWRbJ2VyciddKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucm9vdCA9IHRoaXMuYXR0YWNoU2hhZG93KHsgbW9kZTogJ29wZW4nIH0pXG4gICAgdGhpcy5yb290LmlubmVySFRNTCA9IHRlbXBsYXRlXG5cbiAgICBjb2RlZnJhbWVSRS5sYXN0SW5kZXggPSAwXG4gICAgY29uc3QgaGFzRnJhbWUgPSBlcnIuZnJhbWUgJiYgY29kZWZyYW1lUkUudGVzdChlcnIuZnJhbWUpXG4gICAgY29uc3QgbWVzc2FnZSA9IGhhc0ZyYW1lXG4gICAgICA/IGVyci5tZXNzYWdlLnJlcGxhY2UoY29kZWZyYW1lUkUsICcnKVxuICAgICAgOiBlcnIubWVzc2FnZVxuICAgIGlmIChlcnIucGx1Z2luKSB7XG4gICAgICB0aGlzLnRleHQoJy5wbHVnaW4nLCBgW3BsdWdpbjoke2Vyci5wbHVnaW59XSBgKVxuICAgIH1cbiAgICB0aGlzLnRleHQoJy5tZXNzYWdlLWJvZHknLCBtZXNzYWdlLnRyaW0oKSlcblxuICAgIGNvbnN0IFtmaWxlXSA9IChlcnIubG9jPy5maWxlIHx8IGVyci5pZCB8fCAndW5rbm93biBmaWxlJykuc3BsaXQoYD9gKVxuICAgIGlmIChlcnIubG9jKSB7XG4gICAgICB0aGlzLnRleHQoJy5maWxlJywgYCR7ZmlsZX06JHtlcnIubG9jLmxpbmV9OiR7ZXJyLmxvYy5jb2x1bW59YCwgdHJ1ZSlcbiAgICB9IGVsc2UgaWYgKGVyci5pZCkge1xuICAgICAgdGhpcy50ZXh0KCcuZmlsZScsIGZpbGUpXG4gICAgfVxuXG4gICAgaWYgKGhhc0ZyYW1lKSB7XG4gICAgICB0aGlzLnRleHQoJy5mcmFtZScsIGVyci5mcmFtZSEudHJpbSgpKVxuICAgIH1cbiAgICB0aGlzLnRleHQoJy5zdGFjaycsIGVyci5zdGFjaywgdHJ1ZSlcblxuICAgIHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yKCcud2luZG93JykhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICB9KVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmNsb3NlKClcbiAgICB9KVxuICB9XG5cbiAgdGV4dChzZWxlY3Rvcjogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGxpbmtGaWxlcyA9IGZhbHNlKTogdm9pZCB7XG4gICAgY29uc3QgZWwgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcihzZWxlY3RvcikhXG4gICAgaWYgKCFsaW5rRmlsZXMpIHtcbiAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dFxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgY3VySW5kZXggPSAwXG4gICAgICBsZXQgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGxcbiAgICAgIHdoaWxlICgobWF0Y2ggPSBmaWxlUkUuZXhlYyh0ZXh0KSkpIHtcbiAgICAgICAgY29uc3QgeyAwOiBmaWxlLCBpbmRleCB9ID0gbWF0Y2hcbiAgICAgICAgaWYgKGluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBmcmFnID0gdGV4dC5zbGljZShjdXJJbmRleCwgaW5kZXgpXG4gICAgICAgICAgZWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZnJhZykpXG4gICAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgICAgICAgIGxpbmsudGV4dENvbnRlbnQgPSBmaWxlXG4gICAgICAgICAgbGluay5jbGFzc05hbWUgPSAnZmlsZS1saW5rJ1xuICAgICAgICAgIGxpbmsub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIGZldGNoKCcvX19vcGVuLWluLWVkaXRvcj9maWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQoZmlsZSkpXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGxpbmspXG4gICAgICAgICAgY3VySW5kZXggKz0gZnJhZy5sZW5ndGggKyBmaWxlLmxlbmd0aFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5wYXJlbnROb2RlPy5yZW1vdmVDaGlsZCh0aGlzKVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBvdmVybGF5SWQgPSAndml0ZS1lcnJvci1vdmVybGF5J1xuY29uc3QgeyBjdXN0b21FbGVtZW50cyB9ID0gZ2xvYmFsVGhpcyAvLyBFbnN1cmUgYGN1c3RvbUVsZW1lbnRzYCBpcyBkZWZpbmVkIGJlZm9yZSB0aGUgbmV4dCBsaW5lLlxuaWYgKGN1c3RvbUVsZW1lbnRzICYmICFjdXN0b21FbGVtZW50cy5nZXQob3ZlcmxheUlkKSkge1xuICBjdXN0b21FbGVtZW50cy5kZWZpbmUob3ZlcmxheUlkLCBFcnJvck92ZXJsYXkpXG59XG4iLCJpbXBvcnQgdHlwZSB7IEVycm9yUGF5bG9hZCwgSE1SUGF5bG9hZCwgVXBkYXRlIH0gZnJvbSAndHlwZXMvaG1yUGF5bG9hZCdcbmltcG9ydCB0eXBlIHsgTW9kdWxlTmFtZXNwYWNlLCBWaXRlSG90Q29udGV4dCB9IGZyb20gJ3R5cGVzL2hvdCdcbmltcG9ydCB0eXBlIHsgSW5mZXJDdXN0b21FdmVudFBheWxvYWQgfSBmcm9tICd0eXBlcy9jdXN0b21FdmVudCdcbmltcG9ydCB7IEVycm9yT3ZlcmxheSwgb3ZlcmxheUlkIH0gZnJvbSAnLi9vdmVybGF5J1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vZGUvbm8tbWlzc2luZy1pbXBvcnRcbmltcG9ydCAnQHZpdGUvZW52J1xuXG4vLyBpbmplY3RlZCBieSB0aGUgaG1yIHBsdWdpbiB3aGVuIHNlcnZlZFxuZGVjbGFyZSBjb25zdCBfX0JBU0VfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fU0VSVkVSX0hPU1RfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX1BST1RPQ09MX186IHN0cmluZyB8IG51bGxcbmRlY2xhcmUgY29uc3QgX19ITVJfSE9TVE5BTUVfXzogc3RyaW5nIHwgbnVsbFxuZGVjbGFyZSBjb25zdCBfX0hNUl9QT1JUX186IG51bWJlciB8IG51bGxcbmRlY2xhcmUgY29uc3QgX19ITVJfRElSRUNUX1RBUkdFVF9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfQkFTRV9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfVElNRU9VVF9fOiBudW1iZXJcbmRlY2xhcmUgY29uc3QgX19ITVJfRU5BQkxFX09WRVJMQVlfXzogYm9vbGVhblxuXG5jb25zb2xlLmRlYnVnKCdbdml0ZV0gY29ubmVjdGluZy4uLicpXG5cbmNvbnN0IGltcG9ydE1ldGFVcmwgPSBuZXcgVVJMKGltcG9ydC5tZXRhLnVybClcblxuLy8gdXNlIHNlcnZlciBjb25maWd1cmF0aW9uLCB0aGVuIGZhbGxiYWNrIHRvIGluZmVyZW5jZVxuY29uc3Qgc2VydmVySG9zdCA9IF9fU0VSVkVSX0hPU1RfX1xuY29uc3Qgc29ja2V0UHJvdG9jb2wgPVxuICBfX0hNUl9QUk9UT0NPTF9fIHx8IChsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnd3NzJyA6ICd3cycpXG5jb25zdCBobXJQb3J0ID0gX19ITVJfUE9SVF9fXG5jb25zdCBzb2NrZXRIb3N0ID0gYCR7X19ITVJfSE9TVE5BTUVfXyB8fCBpbXBvcnRNZXRhVXJsLmhvc3RuYW1lfToke1xuICBobXJQb3J0IHx8IGltcG9ydE1ldGFVcmwucG9ydFxufSR7X19ITVJfQkFTRV9ffWBcbmNvbnN0IGRpcmVjdFNvY2tldEhvc3QgPSBfX0hNUl9ESVJFQ1RfVEFSR0VUX19cbmNvbnN0IGJhc2UgPSBfX0JBU0VfXyB8fCAnLydcbmNvbnN0IG1lc3NhZ2VCdWZmZXI6IHN0cmluZ1tdID0gW11cblxubGV0IHNvY2tldDogV2ViU29ja2V0XG50cnkge1xuICBsZXQgZmFsbGJhY2s6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZFxuICAvLyBvbmx5IHVzZSBmYWxsYmFjayB3aGVuIHBvcnQgaXMgaW5mZXJyZWQgdG8gcHJldmVudCBjb25mdXNpb25cbiAgaWYgKCFobXJQb3J0KSB7XG4gICAgZmFsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAvLyBmYWxsYmFjayB0byBjb25uZWN0aW5nIGRpcmVjdGx5IHRvIHRoZSBobXIgc2VydmVyXG4gICAgICAvLyBmb3Igc2VydmVycyB3aGljaCBkb2VzIG5vdCBzdXBwb3J0IHByb3h5aW5nIHdlYnNvY2tldFxuICAgICAgc29ja2V0ID0gc2V0dXBXZWJTb2NrZXQoc29ja2V0UHJvdG9jb2wsIGRpcmVjdFNvY2tldEhvc3QsICgpID0+IHtcbiAgICAgICAgY29uc3QgY3VycmVudFNjcmlwdEhvc3RVUkwgPSBuZXcgVVJMKGltcG9ydC5tZXRhLnVybClcbiAgICAgICAgY29uc3QgY3VycmVudFNjcmlwdEhvc3QgPVxuICAgICAgICAgIGN1cnJlbnRTY3JpcHRIb3N0VVJMLmhvc3QgK1xuICAgICAgICAgIGN1cnJlbnRTY3JpcHRIb3N0VVJMLnBhdGhuYW1lLnJlcGxhY2UoL0B2aXRlXFwvY2xpZW50JC8sICcnKVxuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICdbdml0ZV0gZmFpbGVkIHRvIGNvbm5lY3QgdG8gd2Vic29ja2V0LlxcbicgK1xuICAgICAgICAgICAgJ3lvdXIgY3VycmVudCBzZXR1cDpcXG4nICtcbiAgICAgICAgICAgIGAgIChicm93c2VyKSAke2N1cnJlbnRTY3JpcHRIb3N0fSA8LS1bSFRUUF0tLT4gJHtzZXJ2ZXJIb3N0fSAoc2VydmVyKVxcbmAgK1xuICAgICAgICAgICAgYCAgKGJyb3dzZXIpICR7c29ja2V0SG9zdH0gPC0tW1dlYlNvY2tldCAoZmFpbGluZyldLS0+ICR7ZGlyZWN0U29ja2V0SG9zdH0gKHNlcnZlcilcXG5gICtcbiAgICAgICAgICAgICdDaGVjayBvdXQgeW91ciBWaXRlIC8gbmV0d29yayBjb25maWd1cmF0aW9uIGFuZCBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL3NlcnZlci1vcHRpb25zLmh0bWwjc2VydmVyLWhtciAuJ1xuICAgICAgICApXG4gICAgICB9KVxuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICdvcGVuJyxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICAgICdbdml0ZV0gRGlyZWN0IHdlYnNvY2tldCBjb25uZWN0aW9uIGZhbGxiYWNrLiBDaGVjayBvdXQgaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9zZXJ2ZXItb3B0aW9ucy5odG1sI3NlcnZlci1obXIgdG8gcmVtb3ZlIHRoZSBwcmV2aW91cyBjb25uZWN0aW9uIGVycm9yLidcbiAgICAgICAgICApXG4gICAgICAgIH0sXG4gICAgICAgIHsgb25jZTogdHJ1ZSB9XG4gICAgICApXG4gICAgfVxuICB9XG5cbiAgc29ja2V0ID0gc2V0dXBXZWJTb2NrZXQoc29ja2V0UHJvdG9jb2wsIHNvY2tldEhvc3QsIGZhbGxiYWNrKVxufSBjYXRjaCAoZXJyb3IpIHtcbiAgY29uc29sZS5lcnJvcihgW3ZpdGVdIGZhaWxlZCB0byBjb25uZWN0IHRvIHdlYnNvY2tldCAoJHtlcnJvcn0pLiBgKVxufVxuXG5mdW5jdGlvbiBzZXR1cFdlYlNvY2tldChcbiAgcHJvdG9jb2w6IHN0cmluZyxcbiAgaG9zdEFuZFBhdGg6IHN0cmluZyxcbiAgb25DbG9zZVdpdGhvdXRPcGVuPzogKCkgPT4gdm9pZFxuKSB7XG4gIGNvbnN0IHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoYCR7cHJvdG9jb2x9Oi8vJHtob3N0QW5kUGF0aH1gLCAndml0ZS1obXInKVxuICBsZXQgaXNPcGVuZWQgPSBmYWxzZVxuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFxuICAgICdvcGVuJyxcbiAgICAoKSA9PiB7XG4gICAgICBpc09wZW5lZCA9IHRydWVcbiAgICB9LFxuICAgIHsgb25jZTogdHJ1ZSB9XG4gIClcblxuICAvLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgaGFuZGxlTWVzc2FnZShKU09OLnBhcnNlKGRhdGEpKVxuICB9KVxuXG4gIC8vIHBpbmcgc2VydmVyXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGFzeW5jICh7IHdhc0NsZWFuIH0pID0+IHtcbiAgICBpZiAod2FzQ2xlYW4pIHJldHVyblxuXG4gICAgaWYgKCFpc09wZW5lZCAmJiBvbkNsb3NlV2l0aG91dE9wZW4pIHtcbiAgICAgIG9uQ2xvc2VXaXRob3V0T3BlbigpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW3ZpdGVdIHNlcnZlciBjb25uZWN0aW9uIGxvc3QuIHBvbGxpbmcgZm9yIHJlc3RhcnQuLi5gKVxuICAgIGF3YWl0IHdhaXRGb3JTdWNjZXNzZnVsUGluZyhwcm90b2NvbCwgaG9zdEFuZFBhdGgpXG4gICAgbG9jYXRpb24ucmVsb2FkKClcbiAgfSlcblxuICByZXR1cm4gc29ja2V0XG59XG5cbmZ1bmN0aW9uIHdhcm5GYWlsZWRGZXRjaChlcnI6IEVycm9yLCBwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICBpZiAoIWVyci5tZXNzYWdlLm1hdGNoKCdmZXRjaCcpKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpXG4gIH1cbiAgY29uc29sZS5lcnJvcihcbiAgICBgW2htcl0gRmFpbGVkIHRvIHJlbG9hZCAke3BhdGh9LiBgICtcbiAgICAgIGBUaGlzIGNvdWxkIGJlIGR1ZSB0byBzeW50YXggZXJyb3JzIG9yIGltcG9ydGluZyBub24tZXhpc3RlbnQgYCArXG4gICAgICBgbW9kdWxlcy4gKHNlZSBlcnJvcnMgYWJvdmUpYFxuICApXG59XG5cbmZ1bmN0aW9uIGNsZWFuVXJsKHBhdGhuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGhuYW1lLCBsb2NhdGlvbi50b1N0cmluZygpKVxuICB1cmwuc2VhcmNoUGFyYW1zLmRlbGV0ZSgnZGlyZWN0JylcbiAgcmV0dXJuIHVybC5wYXRobmFtZSArIHVybC5zZWFyY2hcbn1cblxubGV0IGlzRmlyc3RVcGRhdGUgPSB0cnVlXG5jb25zdCBvdXRkYXRlZExpbmtUYWdzID0gbmV3IFdlYWtTZXQ8SFRNTExpbmtFbGVtZW50PigpXG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1lc3NhZ2UocGF5bG9hZDogSE1SUGF5bG9hZCkge1xuICBzd2l0Y2ggKHBheWxvYWQudHlwZSkge1xuICAgIGNhc2UgJ2Nvbm5lY3RlZCc6XG4gICAgICBjb25zb2xlLmRlYnVnKGBbdml0ZV0gY29ubmVjdGVkLmApXG4gICAgICBzZW5kTWVzc2FnZUJ1ZmZlcigpXG4gICAgICAvLyBwcm94eShuZ2lueCwgZG9ja2VyKSBobXIgd3MgbWF5YmUgY2F1c2VkIHRpbWVvdXQsXG4gICAgICAvLyBzbyBzZW5kIHBpbmcgcGFja2FnZSBsZXQgd3Mga2VlcCBhbGl2ZS5cbiAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHNvY2tldC5yZWFkeVN0YXRlID09PSBzb2NrZXQuT1BFTikge1xuICAgICAgICAgIHNvY2tldC5zZW5kKCd7XCJ0eXBlXCI6XCJwaW5nXCJ9JylcbiAgICAgICAgfVxuICAgICAgfSwgX19ITVJfVElNRU9VVF9fKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgbm90aWZ5TGlzdGVuZXJzKCd2aXRlOmJlZm9yZVVwZGF0ZScsIHBheWxvYWQpXG4gICAgICAvLyBpZiB0aGlzIGlzIHRoZSBmaXJzdCB1cGRhdGUgYW5kIHRoZXJlJ3MgYWxyZWFkeSBhbiBlcnJvciBvdmVybGF5LCBpdFxuICAgICAgLy8gbWVhbnMgdGhlIHBhZ2Ugb3BlbmVkIHdpdGggZXhpc3Rpbmcgc2VydmVyIGNvbXBpbGUgZXJyb3IgYW5kIHRoZSB3aG9sZVxuICAgICAgLy8gbW9kdWxlIHNjcmlwdCBmYWlsZWQgdG8gbG9hZCAoc2luY2Ugb25lIG9mIHRoZSBuZXN0ZWQgaW1wb3J0cyBpcyA1MDApLlxuICAgICAgLy8gaW4gdGhpcyBjYXNlIGEgbm9ybWFsIHVwZGF0ZSB3b24ndCB3b3JrIGFuZCBhIGZ1bGwgcmVsb2FkIGlzIG5lZWRlZC5cbiAgICAgIGlmIChpc0ZpcnN0VXBkYXRlICYmIGhhc0Vycm9yT3ZlcmxheSgpKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgICByZXR1cm5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsZWFyRXJyb3JPdmVybGF5KClcbiAgICAgICAgaXNGaXJzdFVwZGF0ZSA9IGZhbHNlXG4gICAgICB9XG4gICAgICBwYXlsb2FkLnVwZGF0ZXMuZm9yRWFjaCgodXBkYXRlKSA9PiB7XG4gICAgICAgIGlmICh1cGRhdGUudHlwZSA9PT0gJ2pzLXVwZGF0ZScpIHtcbiAgICAgICAgICBxdWV1ZVVwZGF0ZShmZXRjaFVwZGF0ZSh1cGRhdGUpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGNzcy11cGRhdGVcbiAgICAgICAgICAvLyB0aGlzIGlzIG9ubHkgc2VudCB3aGVuIGEgY3NzIGZpbGUgcmVmZXJlbmNlZCB3aXRoIDxsaW5rPiBpcyB1cGRhdGVkXG4gICAgICAgICAgY29uc3QgeyBwYXRoLCB0aW1lc3RhbXAgfSA9IHVwZGF0ZVxuICAgICAgICAgIGNvbnN0IHNlYXJjaFVybCA9IGNsZWFuVXJsKHBhdGgpXG4gICAgICAgICAgLy8gY2FuJ3QgdXNlIHF1ZXJ5U2VsZWN0b3Igd2l0aCBgW2hyZWYqPV1gIGhlcmUgc2luY2UgdGhlIGxpbmsgbWF5IGJlXG4gICAgICAgICAgLy8gdXNpbmcgcmVsYXRpdmUgcGF0aHMgc28gd2UgbmVlZCB0byB1c2UgbGluay5ocmVmIHRvIGdyYWIgdGhlIGZ1bGxcbiAgICAgICAgICAvLyBVUkwgZm9yIHRoZSBpbmNsdWRlIGNoZWNrLlxuICAgICAgICAgIGNvbnN0IGVsID0gQXJyYXkuZnJvbShcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTExpbmtFbGVtZW50PignbGluaycpXG4gICAgICAgICAgKS5maW5kKFxuICAgICAgICAgICAgKGUpID0+XG4gICAgICAgICAgICAgICFvdXRkYXRlZExpbmtUYWdzLmhhcyhlKSAmJiBjbGVhblVybChlLmhyZWYpLmluY2x1ZGVzKHNlYXJjaFVybClcbiAgICAgICAgICApXG4gICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdQYXRoID0gYCR7YmFzZX0ke3NlYXJjaFVybC5zbGljZSgxKX0ke1xuICAgICAgICAgICAgICBzZWFyY2hVcmwuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/J1xuICAgICAgICAgICAgfXQ9JHt0aW1lc3RhbXB9YFxuXG4gICAgICAgICAgICAvLyByYXRoZXIgdGhhbiBzd2FwcGluZyB0aGUgaHJlZiBvbiB0aGUgZXhpc3RpbmcgdGFnLCB3ZSB3aWxsXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgbGluayB0YWcuIE9uY2UgdGhlIG5ldyBzdHlsZXNoZWV0IGhhcyBsb2FkZWQgd2VcbiAgICAgICAgICAgIC8vIHdpbGwgcmVtb3ZlIHRoZSBleGlzdGluZyBsaW5rIHRhZy4gVGhpcyByZW1vdmVzIGEgRmxhc2ggT2ZcbiAgICAgICAgICAgIC8vIFVuc3R5bGVkIENvbnRlbnQgdGhhdCBjYW4gb2NjdXIgd2hlbiBzd2FwcGluZyBvdXQgdGhlIHRhZyBocmVmXG4gICAgICAgICAgICAvLyBkaXJlY3RseSwgYXMgdGhlIG5ldyBzdHlsZXNoZWV0IGhhcyBub3QgeWV0IGJlZW4gbG9hZGVkLlxuICAgICAgICAgICAgY29uc3QgbmV3TGlua1RhZyA9IGVsLmNsb25lTm9kZSgpIGFzIEhUTUxMaW5rRWxlbWVudFxuICAgICAgICAgICAgbmV3TGlua1RhZy5ocmVmID0gbmV3IFVSTChuZXdQYXRoLCBlbC5ocmVmKS5ocmVmXG4gICAgICAgICAgICBjb25zdCByZW1vdmVPbGRFbCA9ICgpID0+IGVsLnJlbW92ZSgpXG4gICAgICAgICAgICBuZXdMaW5rVGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCByZW1vdmVPbGRFbClcbiAgICAgICAgICAgIG5ld0xpbmtUYWcuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCByZW1vdmVPbGRFbClcbiAgICAgICAgICAgIG91dGRhdGVkTGlua1RhZ3MuYWRkKGVsKVxuICAgICAgICAgICAgZWwuYWZ0ZXIobmV3TGlua1RhZylcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW3ZpdGVdIGNzcyBob3QgdXBkYXRlZDogJHtzZWFyY2hVcmx9YClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnY3VzdG9tJzoge1xuICAgICAgbm90aWZ5TGlzdGVuZXJzKHBheWxvYWQuZXZlbnQsIHBheWxvYWQuZGF0YSlcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGNhc2UgJ2Z1bGwtcmVsb2FkJzpcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTpiZWZvcmVGdWxsUmVsb2FkJywgcGF5bG9hZClcbiAgICAgIGlmIChwYXlsb2FkLnBhdGggJiYgcGF5bG9hZC5wYXRoLmVuZHNXaXRoKCcuaHRtbCcpKSB7XG4gICAgICAgIC8vIGlmIGh0bWwgZmlsZSBpcyBlZGl0ZWQsIG9ubHkgcmVsb2FkIHRoZSBwYWdlIGlmIHRoZSBicm93c2VyIGlzXG4gICAgICAgIC8vIGN1cnJlbnRseSBvbiB0aGF0IHBhZ2UuXG4gICAgICAgIGNvbnN0IHBhZ2VQYXRoID0gZGVjb2RlVVJJKGxvY2F0aW9uLnBhdGhuYW1lKVxuICAgICAgICBjb25zdCBwYXlsb2FkUGF0aCA9IGJhc2UgKyBwYXlsb2FkLnBhdGguc2xpY2UoMSlcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHBhZ2VQYXRoID09PSBwYXlsb2FkUGF0aCB8fFxuICAgICAgICAgIHBheWxvYWQucGF0aCA9PT0gJy9pbmRleC5odG1sJyB8fFxuICAgICAgICAgIChwYWdlUGF0aC5lbmRzV2l0aCgnLycpICYmIHBhZ2VQYXRoICsgJ2luZGV4Lmh0bWwnID09PSBwYXlsb2FkUGF0aClcbiAgICAgICAgKSB7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2F0aW9uLnJlbG9hZCgpXG4gICAgICB9XG4gICAgICBicmVha1xuICAgIGNhc2UgJ3BydW5lJzpcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTpiZWZvcmVQcnVuZScsIHBheWxvYWQpXG4gICAgICAvLyBBZnRlciBhbiBITVIgdXBkYXRlLCBzb21lIG1vZHVsZXMgYXJlIG5vIGxvbmdlciBpbXBvcnRlZCBvbiB0aGUgcGFnZVxuICAgICAgLy8gYnV0IHRoZXkgbWF5IGhhdmUgbGVmdCBiZWhpbmQgc2lkZSBlZmZlY3RzIHRoYXQgbmVlZCB0byBiZSBjbGVhbmVkIHVwXG4gICAgICAvLyAoLmUuZyBzdHlsZSBpbmplY3Rpb25zKVxuICAgICAgLy8gVE9ETyBUcmlnZ2VyIHRoZWlyIGRpc3Bvc2UgY2FsbGJhY2tzLlxuICAgICAgcGF5bG9hZC5wYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IGZuID0gcHJ1bmVNYXAuZ2V0KHBhdGgpXG4gICAgICAgIGlmIChmbikge1xuICAgICAgICAgIGZuKGRhdGFNYXAuZ2V0KHBhdGgpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdlcnJvcic6IHtcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTplcnJvcicsIHBheWxvYWQpXG4gICAgICBjb25zdCBlcnIgPSBwYXlsb2FkLmVyclxuICAgICAgaWYgKGVuYWJsZU92ZXJsYXkpIHtcbiAgICAgICAgY3JlYXRlRXJyb3JPdmVybGF5KGVycilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgYFt2aXRlXSBJbnRlcm5hbCBTZXJ2ZXIgRXJyb3JcXG4ke2Vyci5tZXNzYWdlfVxcbiR7ZXJyLnN0YWNrfWBcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICB9XG4gICAgZGVmYXVsdDoge1xuICAgICAgY29uc3QgY2hlY2s6IG5ldmVyID0gcGF5bG9hZFxuICAgICAgcmV0dXJuIGNoZWNrXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVyczxUIGV4dGVuZHMgc3RyaW5nPihcbiAgZXZlbnQ6IFQsXG4gIGRhdGE6IEluZmVyQ3VzdG9tRXZlbnRQYXlsb2FkPFQ+XG4pOiB2b2lkXG5mdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnMoZXZlbnQ6IHN0cmluZywgZGF0YTogYW55KTogdm9pZCB7XG4gIGNvbnN0IGNicyA9IGN1c3RvbUxpc3RlbmVyc01hcC5nZXQoZXZlbnQpXG4gIGlmIChjYnMpIHtcbiAgICBjYnMuZm9yRWFjaCgoY2IpID0+IGNiKGRhdGEpKVxuICB9XG59XG5cbmNvbnN0IGVuYWJsZU92ZXJsYXkgPSBfX0hNUl9FTkFCTEVfT1ZFUkxBWV9fXG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yT3ZlcmxheShlcnI6IEVycm9yUGF5bG9hZFsnZXJyJ10pIHtcbiAgaWYgKCFlbmFibGVPdmVybGF5KSByZXR1cm5cbiAgY2xlYXJFcnJvck92ZXJsYXkoKVxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5ldyBFcnJvck92ZXJsYXkoZXJyKSlcbn1cblxuZnVuY3Rpb24gY2xlYXJFcnJvck92ZXJsYXkoKSB7XG4gIGRvY3VtZW50XG4gICAgLnF1ZXJ5U2VsZWN0b3JBbGwob3ZlcmxheUlkKVxuICAgIC5mb3JFYWNoKChuKSA9PiAobiBhcyBFcnJvck92ZXJsYXkpLmNsb3NlKCkpXG59XG5cbmZ1bmN0aW9uIGhhc0Vycm9yT3ZlcmxheSgpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwob3ZlcmxheUlkKS5sZW5ndGhcbn1cblxubGV0IHBlbmRpbmcgPSBmYWxzZVxubGV0IHF1ZXVlZDogUHJvbWlzZTwoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ+W10gPSBbXVxuXG4vKipcbiAqIGJ1ZmZlciBtdWx0aXBsZSBob3QgdXBkYXRlcyB0cmlnZ2VyZWQgYnkgdGhlIHNhbWUgc3JjIGNoYW5nZVxuICogc28gdGhhdCB0aGV5IGFyZSBpbnZva2VkIGluIHRoZSBzYW1lIG9yZGVyIHRoZXkgd2VyZSBzZW50LlxuICogKG90aGVyd2lzZSB0aGUgb3JkZXIgbWF5IGJlIGluY29uc2lzdGVudCBiZWNhdXNlIG9mIHRoZSBodHRwIHJlcXVlc3Qgcm91bmQgdHJpcClcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcXVldWVVcGRhdGUocDogUHJvbWlzZTwoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ+KSB7XG4gIHF1ZXVlZC5wdXNoKHApXG4gIGlmICghcGVuZGluZykge1xuICAgIHBlbmRpbmcgPSB0cnVlXG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKClcbiAgICBwZW5kaW5nID0gZmFsc2VcbiAgICBjb25zdCBsb2FkaW5nID0gWy4uLnF1ZXVlZF1cbiAgICBxdWV1ZWQgPSBbXVxuICAgIDsoYXdhaXQgUHJvbWlzZS5hbGwobG9hZGluZykpLmZvckVhY2goKGZuKSA9PiBmbiAmJiBmbigpKVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JTdWNjZXNzZnVsUGluZyhcbiAgc29ja2V0UHJvdG9jb2w6IHN0cmluZyxcbiAgaG9zdEFuZFBhdGg6IHN0cmluZyxcbiAgbXMgPSAxMDAwXG4pIHtcbiAgY29uc3QgcGluZ0hvc3RQcm90b2NvbCA9IHNvY2tldFByb3RvY29sID09PSAnd3NzJyA/ICdodHRwcycgOiAnaHR0cCdcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc3RhbnQtY29uZGl0aW9uXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEEgZmV0Y2ggb24gYSB3ZWJzb2NrZXQgVVJMIHdpbGwgcmV0dXJuIGEgc3VjY2Vzc2Z1bCBwcm9taXNlIHdpdGggc3RhdHVzIDQwMCxcbiAgICAgIC8vIGJ1dCB3aWxsIHJlamVjdCBhIG5ldHdvcmtpbmcgZXJyb3IuXG4gICAgICAvLyBXaGVuIHJ1bm5pbmcgb24gbWlkZGxld2FyZSBtb2RlLCBpdCByZXR1cm5zIHN0YXR1cyA0MjYsIGFuZCBhbiBjb3JzIGVycm9yIGhhcHBlbnMgaWYgbW9kZSBpcyBub3Qgbm8tY29yc1xuICAgICAgYXdhaXQgZmV0Y2goYCR7cGluZ0hvc3RQcm90b2NvbH06Ly8ke2hvc3RBbmRQYXRofWAsIHtcbiAgICAgICAgbW9kZTogJ25vLWNvcnMnXG4gICAgICB9KVxuICAgICAgYnJlYWtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB3YWl0IG1zIGJlZm9yZSBhdHRlbXB0aW5nIHRvIHBpbmcgYWdhaW5cbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSlcbiAgICB9XG4gIH1cbn1cblxuLy8gaHR0cHM6Ly93aWNnLmdpdGh1Yi5pby9jb25zdHJ1Y3Qtc3R5bGVzaGVldHNcbmNvbnN0IHN1cHBvcnRzQ29uc3RydWN0ZWRTaGVldCA9ICgoKSA9PiB7XG4gIC8vIFRPRE86IHJlLWVuYWJsZSB0aGlzIHRyeSBibG9jayBvbmNlIENocm9tZSBmaXhlcyB0aGUgcGVyZm9ybWFuY2Ugb2ZcbiAgLy8gcnVsZSBpbnNlcnRpb24gaW4gcmVhbGx5IGJpZyBzdHlsZXNoZWV0c1xuICAvLyB0cnkge1xuICAvLyAgIG5ldyBDU1NTdHlsZVNoZWV0KClcbiAgLy8gICByZXR1cm4gdHJ1ZVxuICAvLyB9IGNhdGNoIChlKSB7fVxuICByZXR1cm4gZmFsc2Vcbn0pKClcblxuY29uc3Qgc2hlZXRzTWFwID0gbmV3IE1hcDxcbiAgc3RyaW5nLFxuICBIVE1MU3R5bGVFbGVtZW50IHwgQ1NTU3R5bGVTaGVldCB8IHVuZGVmaW5lZFxuPigpXG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTdHlsZShpZDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiB2b2lkIHtcbiAgbGV0IHN0eWxlID0gc2hlZXRzTWFwLmdldChpZClcbiAgaWYgKHN1cHBvcnRzQ29uc3RydWN0ZWRTaGVldCAmJiAhY29udGVudC5pbmNsdWRlcygnQGltcG9ydCcpKSB7XG4gICAgaWYgKHN0eWxlICYmICEoc3R5bGUgaW5zdGFuY2VvZiBDU1NTdHlsZVNoZWV0KSkge1xuICAgICAgcmVtb3ZlU3R5bGUoaWQpXG4gICAgICBzdHlsZSA9IHVuZGVmaW5lZFxuICAgIH1cblxuICAgIGlmICghc3R5bGUpIHtcbiAgICAgIHN0eWxlID0gbmV3IENTU1N0eWxlU2hlZXQoKVxuICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvcjogdXNpbmcgZXhwZXJpbWVudGFsIEFQSVxuICAgICAgc3R5bGUucmVwbGFjZVN5bmMoY29udGVudClcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IHVzaW5nIGV4cGVyaW1lbnRhbCBBUElcbiAgICAgIGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cyA9IFsuLi5kb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMsIHN0eWxlXVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB1c2luZyBleHBlcmltZW50YWwgQVBJXG4gICAgICBzdHlsZS5yZXBsYWNlU3luYyhjb250ZW50KVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoc3R5bGUgJiYgIShzdHlsZSBpbnN0YW5jZW9mIEhUTUxTdHlsZUVsZW1lbnQpKSB7XG4gICAgICByZW1vdmVTdHlsZShpZClcbiAgICAgIHN0eWxlID0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgaWYgKCFzdHlsZSkge1xuICAgICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpXG4gICAgICBzdHlsZS5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9jc3MnKVxuICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY29udGVudFxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSlcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY29udGVudFxuICAgIH1cbiAgfVxuICBzaGVldHNNYXAuc2V0KGlkLCBzdHlsZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVN0eWxlKGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3Qgc3R5bGUgPSBzaGVldHNNYXAuZ2V0KGlkKVxuICBpZiAoc3R5bGUpIHtcbiAgICBpZiAoc3R5bGUgaW5zdGFuY2VvZiBDU1NTdHlsZVNoZWV0KSB7XG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB1c2luZyBleHBlcmltZW50YWwgQVBJXG4gICAgICBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMgPSBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMuZmlsdGVyKFxuICAgICAgICAoczogQ1NTU3R5bGVTaGVldCkgPT4gcyAhPT0gc3R5bGVcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuaGVhZC5yZW1vdmVDaGlsZChzdHlsZSlcbiAgICB9XG4gICAgc2hlZXRzTWFwLmRlbGV0ZShpZClcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFVwZGF0ZSh7XG4gIHBhdGgsXG4gIGFjY2VwdGVkUGF0aCxcbiAgdGltZXN0YW1wLFxuICBleHBsaWNpdEltcG9ydFJlcXVpcmVkXG59OiBVcGRhdGUpIHtcbiAgY29uc3QgbW9kID0gaG90TW9kdWxlc01hcC5nZXQocGF0aClcbiAgaWYgKCFtb2QpIHtcbiAgICAvLyBJbiBhIGNvZGUtc3BsaXR0aW5nIHByb2plY3QsXG4gICAgLy8gaXQgaXMgY29tbW9uIHRoYXQgdGhlIGhvdC11cGRhdGluZyBtb2R1bGUgaXMgbm90IGxvYWRlZCB5ZXQuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3ZpdGVqcy92aXRlL2lzc3Vlcy83MjFcbiAgICByZXR1cm5cbiAgfVxuXG4gIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNb2R1bGVOYW1lc3BhY2U+KClcbiAgY29uc3QgaXNTZWxmVXBkYXRlID0gcGF0aCA9PT0gYWNjZXB0ZWRQYXRoXG5cbiAgLy8gZGV0ZXJtaW5lIHRoZSBxdWFsaWZpZWQgY2FsbGJhY2tzIGJlZm9yZSB3ZSByZS1pbXBvcnQgdGhlIG1vZHVsZXNcbiAgY29uc3QgcXVhbGlmaWVkQ2FsbGJhY2tzID0gbW9kLmNhbGxiYWNrcy5maWx0ZXIoKHsgZGVwcyB9KSA9PlxuICAgIGRlcHMuaW5jbHVkZXMoYWNjZXB0ZWRQYXRoKVxuICApXG5cbiAgaWYgKGlzU2VsZlVwZGF0ZSB8fCBxdWFsaWZpZWRDYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRlcCA9IGFjY2VwdGVkUGF0aFxuICAgIGNvbnN0IGRpc3Bvc2VyID0gZGlzcG9zZU1hcC5nZXQoZGVwKVxuICAgIGlmIChkaXNwb3NlcikgYXdhaXQgZGlzcG9zZXIoZGF0YU1hcC5nZXQoZGVwKSlcbiAgICBjb25zdCBbcGF0aCwgcXVlcnldID0gZGVwLnNwbGl0KGA/YClcbiAgICB0cnkge1xuICAgICAgY29uc3QgbmV3TW9kOiBNb2R1bGVOYW1lc3BhY2UgPSBhd2FpdCBpbXBvcnQoXG4gICAgICAgIC8qIEB2aXRlLWlnbm9yZSAqL1xuICAgICAgICBiYXNlICtcbiAgICAgICAgICBwYXRoLnNsaWNlKDEpICtcbiAgICAgICAgICBgPyR7ZXhwbGljaXRJbXBvcnRSZXF1aXJlZCA/ICdpbXBvcnQmJyA6ICcnfXQ9JHt0aW1lc3RhbXB9JHtcbiAgICAgICAgICAgIHF1ZXJ5ID8gYCYke3F1ZXJ5fWAgOiAnJ1xuICAgICAgICAgIH1gXG4gICAgICApXG4gICAgICBtb2R1bGVNYXAuc2V0KGRlcCwgbmV3TW9kKVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHdhcm5GYWlsZWRGZXRjaChlLCBkZXApXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IHsgZGVwcywgZm4gfSBvZiBxdWFsaWZpZWRDYWxsYmFja3MpIHtcbiAgICAgIGZuKGRlcHMubWFwKChkZXApID0+IG1vZHVsZU1hcC5nZXQoZGVwKSkpXG4gICAgfVxuICAgIGNvbnN0IGxvZ2dlZFBhdGggPSBpc1NlbGZVcGRhdGUgPyBwYXRoIDogYCR7YWNjZXB0ZWRQYXRofSB2aWEgJHtwYXRofWBcbiAgICBjb25zb2xlLmRlYnVnKGBbdml0ZV0gaG90IHVwZGF0ZWQ6ICR7bG9nZ2VkUGF0aH1gKVxuICB9XG59XG5cbmZ1bmN0aW9uIHNlbmRNZXNzYWdlQnVmZmVyKCkge1xuICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgPT09IDEpIHtcbiAgICBtZXNzYWdlQnVmZmVyLmZvckVhY2goKG1zZykgPT4gc29ja2V0LnNlbmQobXNnKSlcbiAgICBtZXNzYWdlQnVmZmVyLmxlbmd0aCA9IDBcbiAgfVxufVxuXG5pbnRlcmZhY2UgSG90TW9kdWxlIHtcbiAgaWQ6IHN0cmluZ1xuICBjYWxsYmFja3M6IEhvdENhbGxiYWNrW11cbn1cblxuaW50ZXJmYWNlIEhvdENhbGxiYWNrIHtcbiAgLy8gdGhlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGZldGNoYWJsZSBwYXRoc1xuICBkZXBzOiBzdHJpbmdbXVxuICBmbjogKG1vZHVsZXM6IEFycmF5PE1vZHVsZU5hbWVzcGFjZSB8IHVuZGVmaW5lZD4pID0+IHZvaWRcbn1cblxudHlwZSBDdXN0b21MaXN0ZW5lcnNNYXAgPSBNYXA8c3RyaW5nLCAoKGRhdGE6IGFueSkgPT4gdm9pZClbXT5cblxuY29uc3QgaG90TW9kdWxlc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBIb3RNb2R1bGU+KClcbmNvbnN0IGRpc3Bvc2VNYXAgPSBuZXcgTWFwPHN0cmluZywgKGRhdGE6IGFueSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4+KClcbmNvbnN0IHBydW5lTWFwID0gbmV3IE1hcDxzdHJpbmcsIChkYXRhOiBhbnkpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+PigpXG5jb25zdCBkYXRhTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKVxuY29uc3QgY3VzdG9tTGlzdGVuZXJzTWFwOiBDdXN0b21MaXN0ZW5lcnNNYXAgPSBuZXcgTWFwKClcbmNvbnN0IGN0eFRvTGlzdGVuZXJzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEN1c3RvbUxpc3RlbmVyc01hcD4oKVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSG90Q29udGV4dChvd25lclBhdGg6IHN0cmluZyk6IFZpdGVIb3RDb250ZXh0IHtcbiAgaWYgKCFkYXRhTWFwLmhhcyhvd25lclBhdGgpKSB7XG4gICAgZGF0YU1hcC5zZXQob3duZXJQYXRoLCB7fSlcbiAgfVxuXG4gIC8vIHdoZW4gYSBmaWxlIGlzIGhvdCB1cGRhdGVkLCBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWRcbiAgLy8gY2xlYXIgaXRzIHN0YWxlIGNhbGxiYWNrc1xuICBjb25zdCBtb2QgPSBob3RNb2R1bGVzTWFwLmdldChvd25lclBhdGgpXG4gIGlmIChtb2QpIHtcbiAgICBtb2QuY2FsbGJhY2tzID0gW11cbiAgfVxuXG4gIC8vIGNsZWFyIHN0YWxlIGN1c3RvbSBldmVudCBsaXN0ZW5lcnNcbiAgY29uc3Qgc3RhbGVMaXN0ZW5lcnMgPSBjdHhUb0xpc3RlbmVyc01hcC5nZXQob3duZXJQYXRoKVxuICBpZiAoc3RhbGVMaXN0ZW5lcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtldmVudCwgc3RhbGVGbnNdIG9mIHN0YWxlTGlzdGVuZXJzKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcnMgPSBjdXN0b21MaXN0ZW5lcnNNYXAuZ2V0KGV2ZW50KVxuICAgICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgICBjdXN0b21MaXN0ZW5lcnNNYXAuc2V0KFxuICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgIGxpc3RlbmVycy5maWx0ZXIoKGwpID0+ICFzdGFsZUZucy5pbmNsdWRlcyhsKSlcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IG5ld0xpc3RlbmVyczogQ3VzdG9tTGlzdGVuZXJzTWFwID0gbmV3IE1hcCgpXG4gIGN0eFRvTGlzdGVuZXJzTWFwLnNldChvd25lclBhdGgsIG5ld0xpc3RlbmVycylcblxuICBmdW5jdGlvbiBhY2NlcHREZXBzKGRlcHM6IHN0cmluZ1tdLCBjYWxsYmFjazogSG90Q2FsbGJhY2tbJ2ZuJ10gPSAoKSA9PiB7fSkge1xuICAgIGNvbnN0IG1vZDogSG90TW9kdWxlID0gaG90TW9kdWxlc01hcC5nZXQob3duZXJQYXRoKSB8fCB7XG4gICAgICBpZDogb3duZXJQYXRoLFxuICAgICAgY2FsbGJhY2tzOiBbXVxuICAgIH1cbiAgICBtb2QuY2FsbGJhY2tzLnB1c2goe1xuICAgICAgZGVwcyxcbiAgICAgIGZuOiBjYWxsYmFja1xuICAgIH0pXG4gICAgaG90TW9kdWxlc01hcC5zZXQob3duZXJQYXRoLCBtb2QpXG4gIH1cblxuICBjb25zdCBob3Q6IFZpdGVIb3RDb250ZXh0ID0ge1xuICAgIGdldCBkYXRhKCkge1xuICAgICAgcmV0dXJuIGRhdGFNYXAuZ2V0KG93bmVyUGF0aClcbiAgICB9LFxuXG4gICAgYWNjZXB0KGRlcHM/OiBhbnksIGNhbGxiYWNrPzogYW55KSB7XG4gICAgICBpZiAodHlwZW9mIGRlcHMgPT09ICdmdW5jdGlvbicgfHwgIWRlcHMpIHtcbiAgICAgICAgLy8gc2VsZi1hY2NlcHQ6IGhvdC5hY2NlcHQoKCkgPT4ge30pXG4gICAgICAgIGFjY2VwdERlcHMoW293bmVyUGF0aF0sIChbbW9kXSkgPT4gZGVwcyAmJiBkZXBzKG1vZCkpXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZXBzID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBleHBsaWNpdCBkZXBzXG4gICAgICAgIGFjY2VwdERlcHMoW2RlcHNdLCAoW21vZF0pID0+IGNhbGxiYWNrICYmIGNhbGxiYWNrKG1vZCkpXG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZGVwcykpIHtcbiAgICAgICAgYWNjZXB0RGVwcyhkZXBzLCBjYWxsYmFjaylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBob3QuYWNjZXB0KCkgdXNhZ2UuYClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gZXhwb3J0IG5hbWVzIChmaXJzdCBhcmcpIGFyZSBpcnJlbGV2YW50IG9uIHRoZSBjbGllbnQgc2lkZSwgdGhleSdyZVxuICAgIC8vIGV4dHJhY3RlZCBpbiB0aGUgc2VydmVyIGZvciBwcm9wYWdhdGlvblxuICAgIGFjY2VwdEV4cG9ydHMoXzogc3RyaW5nIHwgcmVhZG9ubHkgc3RyaW5nW10sIGNhbGxiYWNrPzogYW55KSB7XG4gICAgICBhY2NlcHREZXBzKFtvd25lclBhdGhdLCBjYWxsYmFjayAmJiAoKFttb2RdKSA9PiBjYWxsYmFjayhtb2QpKSlcbiAgICB9LFxuXG4gICAgZGlzcG9zZShjYikge1xuICAgICAgZGlzcG9zZU1hcC5zZXQob3duZXJQYXRoLCBjYilcbiAgICB9LFxuXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciB1bnR5cGVkXG4gICAgcHJ1bmUoY2I6IChkYXRhOiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIHBydW5lTWFwLnNldChvd25lclBhdGgsIGNiKVxuICAgIH0sXG5cbiAgICAvLyBUT0RPXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvblxuICAgIGRlY2xpbmUoKSB7fSxcblxuICAgIGludmFsaWRhdGUoKSB7XG4gICAgICAvLyBUT0RPIHNob3VsZCB0ZWxsIHRoZSBzZXJ2ZXIgdG8gcmUtcGVyZm9ybSBobXIgcHJvcGFnYXRpb25cbiAgICAgIC8vIGZyb20gdGhpcyBtb2R1bGUgYXMgcm9vdFxuICAgICAgbG9jYXRpb24ucmVsb2FkKClcbiAgICB9LFxuXG4gICAgLy8gY3VzdG9tIGV2ZW50c1xuICAgIG9uKGV2ZW50LCBjYikge1xuICAgICAgY29uc3QgYWRkVG9NYXAgPSAobWFwOiBNYXA8c3RyaW5nLCBhbnlbXT4pID0+IHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBtYXAuZ2V0KGV2ZW50KSB8fCBbXVxuICAgICAgICBleGlzdGluZy5wdXNoKGNiKVxuICAgICAgICBtYXAuc2V0KGV2ZW50LCBleGlzdGluZylcbiAgICAgIH1cbiAgICAgIGFkZFRvTWFwKGN1c3RvbUxpc3RlbmVyc01hcClcbiAgICAgIGFkZFRvTWFwKG5ld0xpc3RlbmVycylcbiAgICB9LFxuXG4gICAgc2VuZChldmVudCwgZGF0YSkge1xuICAgICAgbWVzc2FnZUJ1ZmZlci5wdXNoKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2N1c3RvbScsIGV2ZW50LCBkYXRhIH0pKVxuICAgICAgc2VuZE1lc3NhZ2VCdWZmZXIoKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBob3Rcbn1cblxuLyoqXG4gKiB1cmxzIGhlcmUgYXJlIGR5bmFtaWMgaW1wb3J0KCkgdXJscyB0aGF0IGNvdWxkbid0IGJlIHN0YXRpY2FsbHkgYW5hbHl6ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluamVjdFF1ZXJ5KHVybDogc3RyaW5nLCBxdWVyeVRvSW5qZWN0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBza2lwIHVybHMgdGhhdCB3b24ndCBiZSBoYW5kbGVkIGJ5IHZpdGVcbiAgaWYgKCF1cmwuc3RhcnRzV2l0aCgnLicpICYmICF1cmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgcmV0dXJuIHVybFxuICB9XG5cbiAgLy8gY2FuJ3QgdXNlIHBhdGhuYW1lIGZyb20gVVJMIHNpbmNlIGl0IG1heSBiZSByZWxhdGl2ZSBsaWtlIC4uL1xuICBjb25zdCBwYXRobmFtZSA9IHVybC5yZXBsYWNlKC8jLiokLywgJycpLnJlcGxhY2UoL1xcPy4qJC8sICcnKVxuICBjb25zdCB7IHNlYXJjaCwgaGFzaCB9ID0gbmV3IFVSTCh1cmwsICdodHRwOi8vdml0ZWpzLmRldicpXG5cbiAgcmV0dXJuIGAke3BhdGhuYW1lfT8ke3F1ZXJ5VG9JbmplY3R9JHtzZWFyY2ggPyBgJmAgKyBzZWFyY2guc2xpY2UoMSkgOiAnJ30ke1xuICAgIGhhc2ggfHwgJydcbiAgfWBcbn1cblxuZXhwb3J0IHsgRXJyb3JPdmVybGF5IH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBO0FBQ0EsTUFBTSxRQUFRLFlBQVksQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBd0h6QixDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUE7QUFDL0MsTUFBTSxXQUFXLEdBQUcsMENBQTBDLENBQUE7QUFFOUQ7QUFDQTtBQUNBLE1BQU0sRUFBRSxXQUFXLEdBQUcsTUFBQTtDQUF5QyxFQUFFLEdBQUcsVUFBVSxDQUFBO0FBQ3hFLE1BQU8sWUFBYSxTQUFRLFdBQVcsQ0FBQTtBQUczQyxJQUFBLFdBQUEsQ0FBWSxHQUF3QixFQUFBOztBQUNsQyxRQUFBLEtBQUssRUFBRSxDQUFBO0FBQ1AsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtBQUMvQyxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtBQUU5QixRQUFBLFdBQVcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO0FBQ3pCLFFBQUEsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxXQUFXLENBQUMs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