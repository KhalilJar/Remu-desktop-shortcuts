import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');

function load({ mode = 'advanced', urlMode = null, runtime = 'desktop', platform = 'windows', bridge = true, official = false, next = false,
  settingsRecordingId = null, settingsRecordReady = false } = {}) {
  let plugin;
  const commands = [];
  const slots = [];
  const actions = [];
  const disposed = [];
  const edits = [];
  const observers = [];
  const fixedInputs = [];
  const frames = [];
  const sidebarPanels = ['plugins', 'skill-mcp', 'dsh-market', 'schedules', 'dsh-context']
    .map((id, order) => ({ options: { id, order } }));
  const mainPanels = new Set(sidebarPanels.map((entry) => entry.options.id));
  const slotListeners = new Map();
  const fixedRows = [];
  const panelInfo = { activePanelId: null };
  const selected = { key: 's1' };
  const selectedListeners = new Set();
  const listListeners = new Set();
  const workspaceListeners = new Set();
  const sessionRows = Object.fromEntries(['s1', 's2', 's3'].map((id, index) =>
    [id, { id, origin: 'root', blank: false, updatedAt: 3 - index, retainedBy: { mainView: index === 0 ? 1 : 0 } }]));
  const sessionList = { phase: 'ready', ids: ['s1', 's2', 's3'], byId: sessionRows };
  const workspaceList = { phase: 'ready', archivedSessionIds: [], items: [{ sessionIds: sessionList.ids }] };
  const focusedShell = { editor: { getRootElement() { return {}; } }, focus() { actions.push('focus'); } };
  const sessionCtx = { get(name) { return name === 'conversation' ? { input: { for() { return focusedShell; } } } : undefined; } };
  const scrollAttributes = new Set();
  const scroll = { hasAttribute(name) { return scrollAttributes.has(name); },
    setAttribute(name) { scrollAttributes.add(name); }, removeAttribute(name) { scrollAttributes.delete(name); },
    addEventListener() {}, focus() { actions.push('content-focus'); } };
  const documentListeners = new Map();
  const windowListeners = new Map();
  const captureCalls = [];
  const document = { body: { dataset: mode == null ? {} : { dshDesktopMode: mode } }, documentElement: {},
    activeElement: null,
    hasFocus() { return this.focused !== false; },
    querySelector() { return this.modalOpen ? {} : null; },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    removeEventListener(type, listener) { if (documentListeners.get(type) === listener) documentListeners.delete(type); },
    querySelectorAll() { return [{ dataset: { conversationSession: selected.key }, querySelector() { return scroll; } }]; } };
  const config = { status: 'ready', revision: 'one' };
  const catalog = [];
  const stateUpdates = [];
  // Hooks are keyed by call order within one render, so every registered
  // component gets its own store and its own re-render queue. That keeps a
  // state update from one component out of another component's slot order.
  let hookStore = { values: new Map(), effects: new Map(), refs: new Map() };
  // Each hook kind keeps its own call counter, so a state index stays the
  // n-th useState of a render no matter how many effects or refs sit between.
  let stateIndex = 0;
  let effectIndex = 0;
  let refIndex = 0;
  const react = {
    createElement(type, props, ...children) { return { type, props: props ?? {}, children }; },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
    useState(value) {
      const store = hookStore;
      const index = stateIndex++;
      const overridden = settingsRecordingId !== null && (index === 1 || index === 2);
      const current = overridden ? (index === 1 ? settingsRecordingId : settingsRecordReady)
        : store.values.has(index) ? store.values.get(index) : value;
      store.values.set(index, current);
      return [current, (next) => {
        const resolved = typeof next === 'function' ? next(store.values.get(index)) : next;
        store.values.set(index, resolved);
        stateUpdates.push({ index, next });
        store.schedule?.();
      }];
    },
    useEffect(effect, deps) {
      const store = hookStore;
      const index = effectIndex++;
      const previous = store.effects.get(index);
      const changed = !previous || !deps || !previous.deps || deps.length !== previous.deps.length
        || deps.some((dependency, at) => dependency !== previous.deps[at]);
      if (!changed) return;
      if (typeof previous?.cleanup === 'function') previous.cleanup();
      store.effects.set(index, { deps, cleanup: effect() });
    },
    useRef(value) {
      const store = hookStore;
      const index = refIndex++;
      if (!store.refs.has(index)) store.refs.set(index, { current: value });
      return store.refs.get(index);
    },
  };
  const context = {
    window: { location: { search: urlMode === null ? '' : `?dsh-desktop-mode=${urlMode}`,
      protocol: official ? 'dsh-app:' : 'http:', hostname: official ? 'app' : '127.0.0.1' },
      addEventListener(type, listener) {
        let callbacks = windowListeners.get(type);
        if (!callbacks) { callbacks = new Set(); windowListeners.set(type, callbacks); }
        callbacks.add(listener);
      },
      removeEventListener(type, listener) { windowListeners.get(type)?.delete(listener); },
      __ModuleLoader__: { load(definition) { plugin = definition.factory((name) => {
        assert.equal(name, 'react');
        return react;
      }); } } },
    document,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    dshDesktop: official ? { protocolVersion: 1, shortcuts: { get() {} }, keyboard: { subscribe() {} } }
      : bridge ? { protocolVersion: 1 } : undefined,
    dshDesktopActions: bridge && !official
      ? { invoke(action) { actions.push(action); return Promise.resolve(); } } : undefined,
    desktopNext: next ? { command(command) { actions.push(command); return Promise.resolve(); } } : undefined,
    Date, Set, URLSearchParams,
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    Promise, console, setTimeout, clearTimeout,
  };
  runInNewContext(source, context);
  const ctx = {
    effect(factory) { disposed.push(factory()); },
    locale: { register() { return () => {}; }, bind() { return (key) => key; } },
    shortcuts: {
      runtime, platform,
      register(command) { commands.push(command); return () => commands.splice(commands.indexOf(command), 1); },
      edit(operation, revision) { edits.push({ operation, revision }); return Promise.resolve({ status: 'saved' }); },
      recording(active) { captureCalls.push(active); return Promise.resolve(); },
      describeBinding(binding) { return { binding, issue: null, conflicts: catalog.filter((row) =>
        row.binding?.code === binding.code && row.binding.modifiers.join(',') === binding.modifiers.join(','))
        .map((row) => row.id) }; },
      observeFixedInput(callback) { fixedInputs.push(callback); return () => fixedInputs.splice(fixedInputs.indexOf(callback), 1); },
      fixedCatalog: { getSnapshot() { return fixedRows; } },
      catalog: { subscribe() { return () => {}; }, getSnapshot() { return catalog; } },
      config: { subscribe() { return () => {}; }, getSnapshot() { return config; } },
    },
    layout: { selectPanel(id) { actions.push(id); panelInfo.activePanelId = id; },
      panelInfo: { getSnapshot() { return panelInfo; } } },
    sessions: {
      list: { getSnapshot() { return sessionList; }, subscribe(listener) { listListeners.add(listener); return () => listListeners.delete(listener); } },
      binding(id) { return id === selected.key ? { ctx: sessionCtx } : undefined; },
    },
    uiSession: { adapter: { current: { getSnapshot() { return selected; },
      subscribe(listener) { selectedListeners.add(listener); return () => selectedListeners.delete(listener); } } } },
    uiWorkspace: { openSession(id) {
      if (!sessionRows[id]) throw new Error('unknown session');
      selected.key = id;
      actions.push(`open:${id}`);
      panelInfo.activePanelId = null;
      for (const listener of selectedListeners) listener();
    } },
    workspaces: { list: { getSnapshot() { return workspaceList; },
      subscribe(listener) { workspaceListeners.add(listener); return () => workspaceListeners.delete(listener); } } },
    get(name) { return name === 'conversation' ? { input: { for() { return focusedShell; } } } : undefined; },
    slots: { inject(name, register) {
        assert.ok(name === 'settings.section' || name === 'shell.overlay', name);
        return register();
      },
      register(options, component) {
        const store = { values: new Map(), effects: new Map(), refs: new Map(), props: undefined, queued: false };
        const render = (props) => {
          store.props = props;
          hookStore = store;
          stateIndex = 0;
          effectIndex = 0;
          refIndex = 0;
          return component(props);
        };
        store.schedule = () => {
          if (store.queued) return;
          store.queued = true;
          Promise.resolve().then(() => { store.queued = false; render(store.props); });
        };
        slots.push({ options, component: render });
        return () => slots.pop();
      },
      subscribe(name, listener) {
        let callbacks = slotListeners.get(name);
        if (!callbacks) { callbacks = new Set(); slotListeners.set(name, callbacks); }
        callbacks.add(listener);
        return () => callbacks.delete(listener);
      },
      entriesOfSlot(name) { return name === 'sidebar.panellist' ? sidebarPanels :
        name === 'main' ? [...mainPanels].map((key) => ({ options: { key } })) : []; } },
  };
  plugin.apply(ctx);
  return { commands, slots, actions, disposed, edits, catalog, document, observers, stateUpdates,
    fixedInputs, frames, sidebarPanels, mainPanels, slotListeners, fixedRows, panelInfo,
    selected, selectedListeners, sessionList, sessionRows, listListeners, workspaceList, workspaceListeners,
    scrollAttributes, documentListeners, windowListeners, captureCalls };
}

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...node.children.flatMap(descendants)];
}

test('registers eighteen unbound Desktop actions and one dedicated settings page', async () => {
  const { commands, slots, actions, disposed } = load();
  assert.equal(commands.length, 18);
  for (const command of commands) {
    assert.deepEqual(Object.keys(command.defaults), []);
    // Official Desktop validates every dot-separated segment at its IPC boundary.
    assert.match(command.id, /^[a-z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)+$/);
  }
  assert.equal(slots[0].options.id, 'kana-desktop-shortcuts');
  assert.equal(slots[0].options.name, 'settings.section');
  assert.equal(slots[0].component().type, 'section');
  commands[0].resolve({ modal: null }).run();
  commands[1].resolve({ modal: null }).run();
  assert.deepEqual(actions, ['developer', null]);
  for (const off of disposed.reverse()) off();
  assert.equal(commands.length, 0);
  assert.equal(slots.length, 0);
});

test('registers after Desktop mode arrives and keeps all three Desktop modes active', () => {
  const { document, observers, slots, commands, disposed } = load({ mode: null });
  assert.equal(slots.length, 0);
  assert.equal(commands.length, 0);
  document.body.dataset.dshDesktopMode = 'advanced';
  observers[0].callback();
  assert.equal(slots.length, 2);
  assert.equal(commands.length, 18);
  document.body.dataset.dshDesktopMode = 'compatibility';
  observers[0].callback();
  assert.equal(slots.length, 2);
  assert.equal(commands.length, 18);
  document.body.dataset.dshDesktopMode = 'extended';
  observers[0].callback();
  assert.equal(slots.length, 2);
  assert.equal(commands.length, 18);
  document.body.dataset.dshDesktopMode = 'unrecognized';
  observers[0].callback();
  assert.equal(slots.length, 0);
  assert.equal(commands.length, 0);
  for (const off of disposed.reverse()) off();
  assert.equal(observers[0].disconnected, true);
});

test('compatibility mode without a body marker uses trusted preload plus URL mode', () => {
  const compatible = load({ mode: null, urlMode: 'compatibility', runtime: 'web' });
  assert.equal(compatible.slots.length, 2);
  assert.equal(compatible.commands.length, 18);
  compatible.commands[1].resolve({ modal: null }).run();
  assert.deepEqual(compatible.actions, [null]);
  for (const off of compatible.disposed.reverse()) off();
  const browserImpersonator = load({ mode: null, urlMode: 'compatibility', bridge: false, runtime: 'web' });
  // No preload bridge: the URL marker cannot claim Desktop mode, so this is
  // treated as plain Web — served, but without any Desktop capability.
  assert.equal(browserImpersonator.commands.some((command) =>
    command.id === 'kana.shortcuts.devtools'), false);
  assert.equal(browserImpersonator.commands.length, 17);
  for (const off of browserImpersonator.disposed.reverse()) off();
});

test('dedicated page clears and resets only its own action through revision-aware storage', async () => {
  const { slots, catalog, edits } = load();
  catalog.push({ id: 'kana.shortcuts.devtools', label: 'devtools',
    binding: { code: 'KeyD', modifiers: ['control', 'alt'] }, keys: ['Ctrl', '+', 'Alt', '+', 'D'], modified: true });
  const controls = descendants(slots[0].component()).filter((node) => node.type === 'button');
  const clear = controls.find((node) => node.children.includes('clear') && !node.props.disabled);
  const reset = controls.find((node) => node.children.includes('reset') && !node.props.disabled);
  assert.ok(clear);
  assert.ok(reset);
  clear.props.onClick();
  reset.props.onClick();
  assert.deepEqual(edits.map((entry) => ({ ...entry.operation, revision: entry.revision })), [
    { type: 'set', id: 'kana.shortcuts.devtools', binding: null, revision: 'one' },
    { type: 'reset', id: 'kana.shortcuts.devtools', revision: 'one' },
  ]);
});

test('official Desktop registers native-compatible actions, while plain Web registers the shell-free ones', () => {
  const official = load({ mode: null, bridge: false, official: true, runtime: 'desktop' });
  assert.equal(official.commands.length, 14);
  assert.equal(official.commands.some((command) => command.id === 'kana.shortcuts.devtools'), false);
  assert.equal(official.slots[0].component().type, 'section');
  official.commands[0].resolve({ modal: null }).run();
  assert.deepEqual(official.actions, [null]);
  for (const platform of ['windows', 'macos', 'linux']) {
    const browser = load({ mode: null, bridge: false, official: false, runtime: 'web', platform });
    assert.equal(browser.slots[0].options.id, 'kana-desktop-shortcuts');
    // 18 actions minus DevTools, which needs a shell to open a real devtools.
    assert.equal(browser.commands.length, platform === 'windows' ? 17 : 14);
    assert.equal(browser.commands.some((command) => command.id === 'kana.shortcuts.devtools'), false);
    for (const off of browser.disposed.reverse()) off();
  }
  for (const off of official.disposed.reverse()) off();
});

test('DSH NEXT reuses the original DevTools ID through its guarded native command', async () => {
  const next = load({ mode: null, bridge: false, official: true, next: true });
  assert.equal(next.commands.length, 18);
  assert.equal(next.commands[0].id, 'kana.shortcuts.devtools');
  assert.deepEqual(Object.keys(next.commands[0].defaults), []);
  assert.equal(next.commands[0].resolve({ modal: 'settings' }).status, 'blocked');
  assert.equal(next.commands[0].resolve({ modal: null }).status, 'handled');
  await next.commands[0].resolve({ modal: null }).run();
  assert.deepEqual(next.actions.map((action) => action.type), ['devtools']);
  assert.deepEqual(next.edits, []);
  for (const off of next.disposed.reverse()) off();

  const browser = load({ mode: null, bridge: false, next: true, runtime: 'web' });
  // NEXT's native DevTools command needs the shell, so a plain browser keeps
  // the other actions and never gains that row.
  assert.equal(browser.commands.some((command) => command.id === 'kana.shortcuts.devtools'), false);
  assert.equal(browser.commands.length, 17);
  for (const off of browser.disposed.reverse()) off();
});

test('recorder keeps its button through the asynchronous native start and cancels explicitly', () => {
  const environment = { mode: null, bridge: false, official: true, next: true };
  const idle = load(environment);
  const record = descendants(idle.slots[0].component()).find((node) =>
    node.type === 'button' && node.props['aria-label'] === 'record');
  assert.ok(record?.props.ref);
  assert.equal(record.props.onBlur, undefined);
  record.props.onClick();
  assert.deepEqual(idle.stateUpdates.at(-1), { index: 1, next: 'kana.shortcuts.devtools' });
  for (const off of idle.disposed.reverse()) off();

  const starting = load({ ...environment, settingsRecordingId: 'kana.shortcuts.devtools' });
  const recorder = descendants(starting.slots[0].component()).find((node) =>
    node.type === 'button' && node.props['aria-label'] === 'recordingWindows');
  assert.ok(recorder?.props.ref);
  assert.equal(recorder.props.onBlur, undefined);
  assert.equal(recorder.props.disabled, false);
  assert.equal(recorder.children[0], 'preparing');
  recorder.props.onClick();
  assert.deepEqual(starting.stateUpdates.at(-1), { index: 1, next: null });
  for (const off of starting.disposed.reverse()) off();
});

test('mode arriving late does not discard existing action identities', () => {
  const { commands, document, observers, disposed } = load({ mode: null });
  assert.equal(commands.length, 0);
  document.body.dataset.dshDesktopMode = 'compatibility';
  observers[0].callback();
  assert.equal(commands.length, 18);
  assert.deepEqual(Array.from(commands.slice(0, 6), (command) => command.id), [
    'kana.shortcuts.devtools', 'kana.shortcuts.conversation', 'kana.shortcuts.focus-composer',
    'kana.shortcuts.focus-content', 'kana.shortcuts.recent-session', 'kana.shortcuts.previous-session',
  ]);
  for (const off of disposed.reverse()) off();
});

test('official Desktop uses configurable panel actions without community fixed Ctrl+digit', () => {
  const { commands, fixedInputs, actions, disposed } = load({ mode: null, bridge: false, official: true });
  const first = commands.find((command) => command.id === 'kana.shortcuts.panel.digit1');
  assert.equal(first.resolve({ modal: null }).status, 'handled');
  first.resolve({ modal: null }).run();
  let consumed = false;
  fixedInputs[0]({ type: 'keydown', gesture: {
    code: 'Digit1', control: true, alt: false, shift: false, meta: false,
    repeat: false, composing: false, defaultPrevented: false,
  }, context: { region: 'page', modal: null }, consume() { consumed = true; } });
  assert.deepEqual(actions, ['plugins']);
  assert.equal(consumed, false);
  for (const off of disposed.reverse()) off();
});

test('focus action returns to current conversation and calls the owned editor focus', () => {
  const { commands, frames, actions, disposed } = load({ runtime: 'web' });
  const result = commands[2].resolve({ modal: null });
  assert.equal(result.status, 'handled');
  result.run();
  assert.deepEqual(actions, [null]);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(actions, [null, 'focus']);
  for (const off of disposed.reverse()) off();
});

test('pending composer focus does not steal focus after a newer panel navigation', () => {
  const { commands, frames, actions, panelInfo, disposed } = load({ runtime: 'web' });
  commands[2].resolve({ modal: null }).run();
  panelInfo.activePanelId = 'plugins';
  frames.shift()();
  assert.deepEqual(actions, [null]);
  for (const off of disposed.reverse()) off();
});

test('content shortcut moves focus from the composer to the current scroll area without changing session', () => {
  const { commands, frames, actions, scrollAttributes, panelInfo, disposed } = load({ runtime: 'web' });
  assert.deepEqual(Array.from(commands[3].regions), ['page', 'editable']);
  panelInfo.activePanelId = 'plugins';
  const result = commands[3].resolve({ modal: null });
  assert.equal(result.status, 'handled');
  result.run();
  assert.deepEqual(actions, [null]);
  frames.shift()();
  assert.deepEqual(actions, [null, 'content-focus']);
  assert.equal(scrollAttributes.has('tabindex'), true);
  for (const off of disposed.reverse()) off();
});

test('pending content focus cannot steal focus after a different session opens', () => {
  const { commands, frames, actions, selected, selectedListeners, disposed } = load({ runtime: 'web' });
  commands[3].resolve({ modal: null }).run();
  selected.key = 's2';
  for (const listener of selectedListeners) listener();
  frames.shift()();
  assert.deepEqual(actions, [null]);
  for (const off of disposed.reverse()) off();
});

test('editable capture handles user-bound Ctrl+Shift+Z before editor redo, but not a modal', () => {
  const { catalog, document, documentListeners, frames, actions, disposed } = load({ runtime: 'web' });
  catalog.push({ id: 'kana.shortcuts.focus-content',
    binding: { code: 'KeyZ', modifiers: ['control', 'shift'] } });
  let prevented = 0;
  let stopped = 0;
  const event = { code: 'KeyZ', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false,
    target: { closest() { return {}; } }, preventDefault() { prevented++; }, stopPropagation() { stopped++; } };
  const capture = documentListeners.get('keydown');
  capture(event);
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.deepEqual(actions, [null]);
  frames.shift()();
  assert.deepEqual(actions, [null, 'content-focus']);
  document.modalOpen = true;
  capture(event);
  assert.equal(prevented, 1);
  for (const off of disposed.reverse()) off();
  assert.equal(documentListeners.has('keydown'), false);
});

test('native Desktop never double-dispatches editable shortcuts through the Web capture path', () => {
  const { catalog, documentListeners, actions, disposed } = load({ mode: null, bridge: false, official: true });
  catalog.push({ id: 'kana.shortcuts.focus-content',
    binding: { code: 'KeyZ', modifiers: ['control', 'shift'] } });
  let prevented = false;
  documentListeners.get('keydown')({ code: 'KeyZ', ctrlKey: true, shiftKey: true,
    altKey: false, metaKey: false, target: { closest() { return {}; } },
    preventDefault() { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, false);
  assert.deepEqual(actions, []);
  for (const off of disposed.reverse()) off();
});

test('editable capture leaves unbound and conflicted shortcuts untouched', () => {
  const { catalog, documentListeners, actions, disposed } = load({ runtime: 'web' });
  let prevented = false;
  const event = { code: 'KeyN', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false,
    target: { closest() { return {}; } }, preventDefault() { prevented = true; }, stopPropagation() {} };
  const capture = documentListeners.get('keydown');
  capture(event);
  catalog.push({ id: 'kana.shortcuts.previous-session', binding: { code: 'KeyN', modifiers: ['control', 'shift'] } },
    { id: 'another-plugin', binding: { code: 'KeyN', modifiers: ['control', 'shift'] } });
  capture(event);
  assert.equal(prevented, false);
  assert.deepEqual(actions, []);
  for (const off of disposed.reverse()) off();
});

test('quick session shortcut cycles recent then remaining visible conversations', () => {
  const { commands, actions, selected, selectedListeners, disposed } = load({ runtime: 'web' });
  // Two manually visited sessions build a genuine MRU history.
  selected.key = 's2';
  for (const listener of selectedListeners) listener();
  selected.key = 's1';
  for (const listener of selectedListeners) listener();
  const switcher = commands[4].resolve({ modal: null });
  assert.equal(switcher.status, 'handled');
  switcher.run();
  switcher.run();
  assert.deepEqual(actions, ['open:s2', 'open:s3']);
  for (const off of disposed.reverse()) off();
});

test('previous session toggles only previously visited sessions, never a guessed recent edit', () => {
  const { commands, actions, selected, selectedListeners, disposed } = load({ runtime: 'web' });
  assert.equal(commands[5].resolve({ modal: null }).status, 'blocked');
  selected.key = 's2';
  for (const listener of selectedListeners) listener();
  const previous = commands[5].resolve({ modal: null });
  assert.equal(previous.status, 'handled');
  previous.run();
  previous.run();
  assert.deepEqual(actions, ['open:s1', 'open:s2']);
  for (const off of disposed.reverse()) off();
});

test('session shortcuts reject archived, subagent and modal targets', () => {
  const { commands, actions, sessionRows, workspaceList, workspaceListeners, disposed } = load({ runtime: 'web' });
  sessionRows.s2.origin = 'subagent';
  workspaceList.archivedSessionIds.push('s3');
  for (const listener of workspaceListeners) listener();
  assert.equal(commands[4].resolve({ modal: null }).status, 'blocked');
  assert.equal(commands[5].resolve({ modal: null }).status, 'blocked');
  assert.equal(commands[3].resolve({ modal: 'settings' }).status, 'blocked');
  assert.deepEqual(actions, []);
  for (const off of disposed.reverse()) off();
});

test('Ctrl+digits navigate visible panels without overriding an existing binding', () => {
  const { fixedInputs, actions, catalog, document, disposed } = load({ runtime: 'web' });
  const send = (digit, modal = null) => {
    let consumed = false;
    fixedInputs[0]({ type: 'keydown', gesture: {
      code: `Digit${digit}`, control: true, alt: false, shift: false, meta: false,
      repeat: false, composing: false, defaultPrevented: false,
    }, context: { region: 'page', modal }, consume() { consumed = true; } });
    return consumed;
  };
  assert.equal(send(1), true);
  assert.equal(send(9), true);
  assert.deepEqual(actions, ['plugins', 'dsh-context']);
  catalog.push({ id: 'other', binding: { code: 'Digit2', modifiers: ['control'] } });
  assert.equal(send(2), false);
  assert.equal(send(3, 'settings'), false);
  document.focused = false;
  assert.equal(send(4), false);
  assert.deepEqual(actions, ['plugins', 'dsh-context']);
  for (const off of disposed.reverse()) off();
  assert.equal(fixedInputs.length, 0);
});

test('panel order follows live slots and fixed conflicts are not consumed', () => {
  const { fixedInputs, actions, sidebarPanels, mainPanels, slotListeners, fixedRows, disposed } = load({ runtime: 'web' });
  sidebarPanels.unshift({ options: { id: 'new-panel', order: -10, label: 'New Panel' } });
  mainPanels.add('new-panel');
  for (const listener of slotListeners.get('sidebar.panellist')) listener();
  const send = (digit) => {
    let consumed = false;
    fixedInputs[0]({ type: 'keydown', gesture: {
      code: `Digit${digit}`, control: true, alt: false, shift: false, meta: false,
      repeat: false, composing: false, defaultPrevented: false,
    }, context: { region: 'page', modal: null }, consume() { consumed = true; } });
    return consumed;
  };
  assert.equal(send(1), true);
  assert.deepEqual(actions, ['new-panel']);
  fixedRows.push({ bindings: [{ code: 'Digit2', modifiers: ['control'] }] });
  assert.equal(send(2), false);
  mainPanels.delete('new-panel');
  assert.equal(send(1), false);
  for (const off of disposed.reverse()) off();
});

test('never invokes in an unknown mode, in a modal, or while unfocused', () => {
  // A Desktop shell whose mode is unrecognised stays inactive; a plain browser
  // is not a Desktop shell in an unknown mode, so it is handled separately.
  for (const config of [{ mode: 'unknown' }, { mode: null, bridge: true }]) {
    const unsupported = load(config);
    assert.equal(unsupported.commands.length, 0);
    assert.equal(unsupported.slots.length, 0);
    for (const off of unsupported.disposed.reverse()) off();
  }
  const { commands, actions, document } = load({ runtime: 'web' });
  assert.equal(commands[0].resolve({ modal: 'settings' }).status, 'blocked');
  document.focused = false;
  assert.equal(commands[0].resolve({ modal: null }).status, 'blocked');
  assert.deepEqual(actions, []);
});

const nextWindows = { mode: null, bridge: false, official: true, next: true };

function visitBoard(environment, ids) {
  for (const id of ids) {
    environment.selected.key = id;
    for (const listener of environment.selectedListeners) listener();
  }
}

const boardCommand = (environment, suffix = '') =>
  environment.commands.find((command) => command.id === `kana.shortcuts.session-board${suffix}`);

const overlaySlot = (environment) => environment.slots.find((slot) => slot.options.name === 'shell.overlay');

const boardNode = (environment) => descendants(overlaySlot(environment).component())
  .find((node) => typeof node.props?.['data-kana-session-board'] === 'string');

// A closed board may still leave a diagnostic hint node behind, so tests ask
// whether the board itself is on screen instead of whether a node exists.
const boardOpen = (environment) => ['transient', 'pinned']
  .includes(boardNode(environment)?.props?.['data-kana-session-board']);

const fireWindow = (environment, type, event) => {
  for (const listener of environment.windowListeners.get(type) ?? []) listener(event);
};

const keyEvent = (event) => ({ altKey: false, ctrlKey: false, shiftKey: false, metaKey: false,
  repeat: false, preventDefault() {}, stopPropagation() {}, ...event });

// Drains every pending microtask, including the ones a chain of awaited edits
// schedules, without relying on timers inside the sandboxed renderer.
const flush = () => new Promise((resolve) => setImmediate(resolve));

const cardsOf = (node) => descendants(node).filter((child) => child.props?.role === 'option');

test('session board is offered on the community and NEXT Windows shells and on plain Web Windows', () => {
  // Plain Web has no window menu to swallow the Alt release, so the board needs
  // no capture there; it is offered whenever the platform reports Windows.
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  assert.equal(web.commands.some((command) => command.id === 'kana.shortcuts.session-board'), true);
  web.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(web, ['s2', 's1']);
  web.actions.length = 0;
  assert.equal(web.captureCalls.length, 0);
  // The gesture is read from this document: DSH's Web runtime never dispatches
  // an Alt-only binding, and a browser has nothing to capture it away from.
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  // The same press may still reach the command, which must not step twice.
  const duplicate = boardCommand(web).resolve({ modal: null });
  assert.equal(duplicate.status, 'handled');
  duplicate.run();
  // Releasing the base key is "move", not "commit", while Alt is still held.
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.deepEqual(web.actions, []);
  fireWindow(web, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(web.actions, ['open:s2']);
  for (const off of web.disposed.reverse()) off();

  // A browser on another platform cannot promise an observable Alt release.
  const notWindows = load({ mode: null, bridge: false, official: false, runtime: 'web', platform: 'linux' });
  assert.equal(notWindows.commands.some((command) => command.id === 'kana.shortcuts.session-board'), false);
  for (const off of notWindows.disposed.reverse()) off();

  // The community shell reports runtime "web" but runs the same main-process
  // capture as NEXT (recording + setIgnoreMenuShortcuts), so it hosts the board.
  const community = load({ bridge: true, mode: 'advanced', runtime: 'web' });
  assert.equal(community.commands.some((command) => command.id === 'kana.shortcuts.session-board'), true);
  visitBoard(community, ['s2', 's1']);
  const communityOpen = boardCommand(community);
  assert.equal(communityOpen.resolve({ modal: null }).status, 'handled');
  communityOpen.resolve({ modal: null }).run();
  assert.equal(boardNode(community).props['data-kana-session-board'], 'transient');
  for (const off of community.disposed.reverse()) off();

  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's1']);
  environment.actions.length = 0;
  const open = boardCommand(environment);
  assert.equal(open.resolve({ modal: null }).status, 'handled');
  open.resolve({ modal: null }).run();
  const node = boardNode(environment);
  assert.equal(node.props['data-kana-session-board'], 'transient');
  assert.equal(cardsOf(node).length, 2);
  assert.deepEqual(environment.actions, []);
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(environment.actions, ['open:s2']);
  // The release is consumed once; a stale second keyup must not navigate again.
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(environment.actions, ['open:s2']);
  assert.equal(boardOpen(environment), false);
  for (const off of environment.disposed.reverse()) off();
});

test('a browser whose menu clears altKey still reads the gesture, and commits without the Alt release', async () => {
  // Windows hands a bare Alt press to the window menu, so the key that follows
  // can arrive with the modifier already cleared. The Alt press we did observe
  // still marks the start of the gesture.
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  web.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(web, ['s2', 's3', 's1']);
  web.actions.length = 0;
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: false }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  // A cleared modifier must not be read as "the gesture is over".
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: false }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyQ', key: 'q', altKey: false }));
  assert.deepEqual(web.actions, []);
  fireWindow(web, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(web.actions, ['open:s2']);
  for (const off of web.disposed.reverse()) off();

  // Alt still held when the base key comes up: that is the end of one tap, not
  // the end of the gesture. Nothing commits on a short timer there — the board
  // waits for the modifier release, so tapping Q again keeps moving instead of
  // switching early.
  const held = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  held.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(held, ['s2', 's3', 's1']);
  held.actions.length = 0;
  const selectedIndex = () => {
    const options = descendants(overlaySlot(held).component())
      .filter((node) => node.props?.role === 'option');
    return options.findIndex((node) => node.props['aria-selected'] === true);
  };
  fireWindow(held, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(held, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  fireWindow(held, 'keyup', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  const firstStep = selectedIndex();
  assert.notEqual(firstStep, -1);
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.deepEqual(held.actions, []);
  assert.equal(boardOpen(held), true);
  assert.equal(selectedIndex(), firstStep);
  // A second tap while Alt is still down is one more step, not a commit.
  fireWindow(held, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  fireWindow(held, 'keyup', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.deepEqual(held.actions, []);
  assert.equal(boardOpen(held), true);
  assert.notEqual(selectedIndex(), firstStep);
  // Only letting go of Alt commits.
  { const opts = descendants(overlaySlot(held).component()).filter((n) => n.props?.role === 'option');
    console.log('DEBUG sel', opts.findIndex((n) => n.props['aria-selected'] === true), 'of', opts.length); }
  fireWindow(held, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.equal(held.actions.length, 1);
  assert.equal(boardOpen(held), false);
  for (const off of held.disposed.reverse()) off();
});

test('a browser can swap Ctrl in for the Alt the system menu stole, and it still commits on release', () => {
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  web.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(web, ['s2', 's1']);
  web.actions.length = 0;
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'ControlLeft', key: 'Control', altKey: true, ctrlKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true, ctrlKey: true }));
  // Ctrl+Alt is a stand-in for the stolen bare Alt, not a request to pin.
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  fireWindow(web, 'keyup', keyEvent({ code: 'ControlLeft', key: 'Control' }));
  assert.deepEqual(web.actions, ['open:s2']);
  assert.equal(boardOpen(web), false);
  for (const off of web.disposed.reverse()) off();
});

const selectedAt = (environment) => cardsOf(boardNode(environment))
  .findIndex((card) => card.props['aria-selected'] === true);

test('Shift steps an open browser board backwards instead of pinning it', () => {
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  web.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(web, ['s2', 's3', 's1']);
  web.actions.length = 0;
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  const opened = selectedAt(web);
  assert.notEqual(opened, -1);
  // The Ctrl+Alt stand-in is what a user reaches for after the browser stole
  // Alt, so adding Shift there has to step back — it used to freeze the board
  // in pinned mode instead.
  fireWindow(web, 'keydown', keyEvent({ code: 'ControlLeft', key: 'Control', altKey: true, ctrlKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'ShiftLeft', key: 'Shift', altKey: true, ctrlKey: true, shiftKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true, ctrlKey: true, shiftKey: true }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  assert.notEqual(selectedAt(web), opened);
  for (const off of web.disposed.reverse()) off();
});

test('a pinned browser board opens deliberately and then steps with a plain key', () => {
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  web.catalog.push({ id: 'kana.shortcuts.session-board',
    binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(web, ['s2', 's3', 's1']);
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'ControlLeft', key: 'Control', altKey: true, ctrlKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'ShiftLeft', key: 'Shift', altKey: true, ctrlKey: true, shiftKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true, ctrlKey: true, shiftKey: true }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'pinned');
  const opened = selectedAt(web);
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyQ', key: 'q' }));
  fireWindow(web, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  // A pinned board waits for the user, so the bare key steps and Shift reverses
  // even with no modifier held — otherwise it felt stuck until Ctrl+Alt was held.
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q' }));
  assert.notEqual(selectedAt(web), opened);
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', shiftKey: true }));
  assert.equal(selectedAt(web), opened);
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyQ', key: 'q' }));
  fireWindow(web, 'keydown', keyEvent({ code: 'Enter', key: 'Enter' }));
  assert.equal(boardOpen(web), false);
  for (const off of web.disposed.reverse()) off();
});

test('the open board holds the desktop keyboard capture and moves itself', async () => {
  const environment = load(nextWindows);
  environment.catalog.push({ id: 'kana.shortcuts.session-board', binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  // The window menu keeps the Alt release to itself, so the board asks the
  // desktop bridge to stop honouring menu mnemonics while it is open.
  assert.deepEqual(environment.captureCalls, [true]);
  await Promise.resolve();
  // With the capture held the native dispatcher stays quiet: the recorded base
  // key steps forward and Shift reverses it.
  fireWindow(environment, 'keydown', keyEvent({ code: 'KeyQ', altKey: true }));
  assert.deepEqual(cardsOf(boardNode(environment)).map((card) => card.props['aria-selected']),
    [false, false, true]);
  fireWindow(environment, 'keydown', keyEvent({ code: 'KeyQ', altKey: true, shiftKey: true }));
  assert.deepEqual(environment.actions, []);
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(environment.actions, ['open:s3']);
  assert.deepEqual(environment.captureCalls, [true, false]);
  for (const off of environment.disposed.reverse()) off();
});

test('a fast tap switches like Alt+Tab even before the capture lands', async () => {
  const environment = load(nextWindows);
  environment.catalog.push({ id: 'kana.shortcuts.session-board', binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  // Alt+Q released at once: the Alt release never reaches the document, but the
  // base key's own release still does, so the tap commits to the last session.
  fireWindow(environment, 'keyup', keyEvent({ code: 'KeyQ', key: 'q' }));
  assert.deepEqual(environment.actions, ['open:s3']);
  assert.equal(boardOpen(environment), false);
  await Promise.resolve();
  // The late confirmation is handed straight back instead of leaving the window
  // in recording mode.
  assert.deepEqual(environment.captureCalls, [true, false]);
  for (const off of environment.disposed.reverse()) off();
});

test('the switcher is a rectangle that grows wider then wraps into rows', () => {
  const panelOf = (environment) => descendants(overlaySlot(environment).component())
    .find((node) => node.props?.role === 'listbox');

  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's3']);
  boardCommand(environment).resolve({ modal: null }).run();
  const narrow = panelOf(environment);
  // Three candidates: a single row, shaped to the count instead of a fixed strip.
  assert.equal(narrow.props.style.gridTemplateColumns, 'repeat(3, 190px)');
  assert.equal(narrow.props.style.maxHeight, 124);
  assert.equal(narrow.props.style.overflowY, 'hidden');
  for (const off of environment.disposed.reverse()) off();

  const wide = load(nextWindows);
  for (const [index, id] of ['s4', 's5', 's6', 's7', 's8', 's9'].entries()) {
    wide.sessionRows[id] = { id, origin: 'root', blank: false, updatedAt: index };
    wide.sessionList.ids.push(id);
    wide.sessionList.byId[id] = wide.sessionRows[id];
  }
  wide.workspaceList.items[0].sessionIds = wide.sessionList.ids;
  visitBoard(wide, ['s2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']);
  boardCommand(wide).resolve({ modal: null }).run();
  const grid = panelOf(wide);
  // Nine candidates: the row stops at five cards and the rest wrap underneath.
  assert.equal(grid.props.style.gridTemplateColumns, 'repeat(5, 190px)');
  assert.equal(grid.props.style.maxHeight, 228);
  assert.equal(cardsOf(grid).length, 9);
  for (const off of wide.disposed.reverse()) off();
});

test('a tap whose release arrives before the board opens still switches', () => {
  const environment = load(nextWindows);
  environment.catalog.push({ id: 'kana.shortcuts.session-board', binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  // The native dispatcher is slower than the fingers: both keys are already up
  // by the time this document is told the base key was pressed.
  fireWindow(environment, 'keydown', keyEvent({ code: 'KeyQ', altKey: true }));
  fireWindow(environment, 'keyup', keyEvent({ code: 'KeyQ', key: 'q' }));
  boardCommand(environment).resolve({ modal: null }).run();
  // No board is opened - nobody could close it - the switch happens directly.
  assert.equal(boardOpen(environment), false);
  assert.deepEqual(environment.actions, ['open:s3']);
  for (const off of environment.disposed.reverse()) off();
});

test('the main-process shell, which hides the base keydown, still reads a finished tap', () => {
  const environment = load(nextWindows);
  environment.catalog.push({ id: 'kana.shortcuts.session-board', binding: { code: 'KeyQ', modifiers: ['alt'] } });
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  // DSH NEXT resolves the shortcut in the main process, which preventDefaults
  // the matched keydown: this document never sees the press. Only the Alt
  // release reaches the page, and the command lands milliseconds later.
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  boardCommand(environment).resolve({ modal: null }).run();
  assert.equal(boardOpen(environment), false);
  assert.deepEqual(environment.actions, ['open:s3']);
  // The gesture is consumed, so a deliberate second press opens the board.
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  assert.equal(boardOpen(environment), true);
  for (const off of environment.disposed.reverse()) off();
});

test('session board cycles every card, including the conversation the user is in', () => {
  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  // "Previous session" is the first stop; one step back from there reaches the
  // conversation already open, so committing must not reload it.
  assert.equal(boardCommand(environment, '-back').resolve({ modal: null }).status, 'handled');
  boardCommand(environment, '-back').resolve({ modal: null }).run();
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltRight', key: 'Alt' }));
  assert.deepEqual(environment.actions, []);

  // Two steps back wrap past the current conversation onto the oldest one, which
  // is what lets a long enough run come back to where the user started.
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  boardCommand(environment, '-back').resolve({ modal: null }).run();
  boardCommand(environment, '-back').resolve({ modal: null }).run();
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltRight', key: 'Alt' }));
  assert.deepEqual(environment.actions, ['open:s2']);

  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  assert.equal(boardNode(environment).props['data-kana-session-board'], 'transient');
  fireWindow(environment, 'keydown', keyEvent({ code: 'Escape' }));
  assert.equal(boardOpen(environment), false);
  assert.deepEqual(environment.actions, []);
  for (const off of environment.disposed.reverse()) off();
});

test('pinned board outlives the Alt release and opens only on Enter', () => {
  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's3', 's1']);
  environment.actions.length = 0;
  boardCommand(environment, '-pin').resolve({ modal: null }).run();
  assert.equal(boardNode(environment).props['data-kana-session-board'], 'pinned');
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(environment.actions, []);
  assert.equal(boardNode(environment).props['data-kana-session-board'], 'pinned');
  fireWindow(environment, 'keydown', keyEvent({ code: 'ArrowRight' }));
  fireWindow(environment, 'keydown', keyEvent({ code: 'Enter' }));
  assert.deepEqual(environment.actions, ['open:s2']);

  // Pressing the combination again cancels the pinned board without opening.
  environment.actions.length = 0;
  boardCommand(environment, '-pin').resolve({ modal: null }).run();
  boardCommand(environment, '-pin').resolve({ modal: null }).run();
  assert.equal(boardOpen(environment), false);
  assert.deepEqual(environment.actions, []);
  for (const off of environment.disposed.reverse()) off();
});

test('the current conversation anchors the board and cannot be dropped', () => {
  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's3']);
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  const node = boardNode(environment);
  assert.equal(cardsOf(node).length, 3);

  const markers = (cards) => cards.map((card) => {
    const footer = card.children.at(-1);
    const badge = footer.children[0];
    return { badge: badge?.children?.[0] ?? null, hasRemove: footer.children[1] != null };
  });

  // Exactly one card is the current conversation, and it carries no remove control.
  const before = markers(cardsOf(node));
  assert.equal(before.filter((card) => !card.hasRemove).length, 1);
  assert.equal(before[0].hasRemove, false);
  assert.equal(before.slice(1).every((card) => card.hasRemove), true);

  // Delete only ever targets the highlighted candidate, never the anchor.
  fireWindow(environment, 'keydown', keyEvent({ code: 'Delete', altKey: true }));
  const after = markers(cardsOf(boardNode(environment)));
  assert.equal(after.length, 2);
  assert.equal(after[0].hasRemove, false);
  assert.equal(after.filter((card) => !card.hasRemove).length, 1);
  assert.deepEqual(environment.actions, []);
  for (const off of environment.disposed.reverse()) off();
});

test('Delete drops a candidate without archiving it, and revisiting restores it', () => {
  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's1']);
  environment.actions.length = 0;
  boardCommand(environment).resolve({ modal: null }).run();
  fireWindow(environment, 'keydown', keyEvent({ code: 'Delete', altKey: true }));
  // Only the current conversation is left, so the board closes with a hint and
  // the real conversation list is untouched.
  assert.equal(boardNode(environment).props['data-kana-session-board'], 'hint');
  assert.deepEqual(environment.sessionList.ids, ['s1', 's2', 's3']);
  assert.deepEqual(environment.actions, []);

  visitBoard(environment, ['s2']);
  boardCommand(environment).resolve({ modal: null }).run();
  assert.equal(cardsOf(boardNode(environment)).length, 2);
  for (const off of environment.disposed.reverse()) off();
});

test('board does not guess a conversation when fewer than two were visited', () => {
  const environment = load(nextWindows);
  environment.actions.length = 0;
  assert.equal(boardCommand(environment).resolve({ modal: null }).status, 'handled');
  boardCommand(environment).resolve({ modal: null }).run();
  const node = boardNode(environment);
  assert.equal(node.props['data-kana-session-board'], 'hint');
  assert.equal(node.children[0], 'boardNone');
  assert.deepEqual(environment.actions, []);
  for (const off of environment.disposed.reverse()) off();
});

test('board refuses to open from an embedded frame, where the release is unobservable', () => {
  const environment = load(nextWindows);
  visitBoard(environment, ['s2', 's1']);
  environment.actions.length = 0;
  assert.equal(boardCommand(environment).resolve({ modal: null, source: 'iframe' }).status, 'handled');
  assert.equal(boardNode(environment).props['data-kana-session-board'], 'hint');
  fireWindow(environment, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(environment.actions, []);
  for (const off of environment.disposed.reverse()) off();
});

test('board recorder takes an Alt-only combination and saves all three derivatives', async () => {
  const environment = load(nextWindows);
  const record = descendants(environment.slots[0].component())
    .find((node) => node.type === 'button' && node.props['aria-label'] === 'boardRecord');
  assert.ok(record);
  record.props.onClick();
  assert.deepEqual(environment.stateUpdates.at(-1), { index: 5, next: true });
  await flush();
  const down = environment.documentListeners.get('keydown');
  const up = environment.documentListeners.get('keyup');
  assert.ok(down && up);

  // The ordinary recorder's Ctrl+Alt constraint still applies here: reject it.
  down(keyEvent({ code: 'KeyK', altKey: true, ctrlKey: true }));
  assert.equal(environment.stateUpdates.at(-1).index, 8);
  up(keyEvent({ code: 'KeyK', altKey: true, ctrlKey: true }));
  assert.deepEqual(environment.edits, []);

  down(keyEvent({ code: 'KeyK', altKey: true }));
  up(keyEvent({ code: 'KeyK', altKey: true }));
  await flush();
  // The renderer runs in its own VM realm, so compare the serialized operations
  // instead of relying on cross-realm prototype identity.
  assert.deepEqual(environment.edits.map((entry) => JSON.stringify(entry.operation)), [
    JSON.stringify({ type: 'set', id: 'kana.shortcuts.session-board', binding: { code: 'KeyK', modifiers: ['alt'] } }),
    JSON.stringify({ type: 'set', id: 'kana.shortcuts.session-board-back', binding: { code: 'KeyK', modifiers: ['alt', 'shift'] } }),
    JSON.stringify({ type: 'set', id: 'kana.shortcuts.session-board-pin', binding: { code: 'KeyK', modifiers: ['control', 'alt'] } }),
  ]);
  for (const off of environment.disposed.reverse()) off();
});

test('board binding save writes nothing when a derived combination is taken', async () => {
  const environment = load(nextWindows);
  environment.catalog.push({ id: 'other.action', label: 'other',
    binding: { code: 'KeyK', modifiers: ['control', 'alt'] }, keys: ['Ctrl', '+', 'Alt', '+', 'K'], modified: true });
  const record = descendants(environment.slots[0].component())
    .find((node) => node.type === 'button' && node.props['aria-label'] === 'boardRecord');
  record.props.onClick();
  await flush();
  environment.documentListeners.get('keydown')(keyEvent({ code: 'KeyK', altKey: true }));
  environment.documentListeners.get('keyup')(keyEvent({ code: 'KeyK', altKey: true }));
  await flush();
  assert.deepEqual(environment.edits, []);
  // The conflict is reported through the dedicated board status line.
  assert.equal(environment.stateUpdates.some((update) => update.index === 8), true);
  for (const off of environment.disposed.reverse()) off();
});

test('a browser opens the board with a bare Alt+Q although DSH cannot store that row', () => {
  // bindingIssue() answers "unsupported-browser" for an Alt-only combination on
  // the Web runtime, so the base row can never be persisted there. The gesture
  // is read from this document, and the letter defaults to Q.
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  assert.equal(web.catalog.length, 0);
  visitBoard(web, ['s2', 's1']);
  web.actions.length = 0;
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.deepEqual(web.actions, []);
  fireWindow(web, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(web.actions, ['open:s2']);
  for (const off of web.disposed.reverse()) off();
});

test('a browser derives the bare Alt gesture from the one board row it can store', () => {
  // Only the Ctrl+Alt variant is savable on Web; the letter it carries is what
  // the bare Alt gesture must use, so a re-recorded Alt+W reaches the board.
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  web.catalog.push({ id: 'kana.shortcuts.session-board-pin',
    binding: { code: 'KeyW', modifiers: ['control', 'alt'] } });
  visitBoard(web, ['s2', 's1']);
  web.actions.length = 0;
  fireWindow(web, 'keydown', keyEvent({ code: 'AltLeft', key: 'Alt', altKey: true }));
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyQ', key: 'q', altKey: true }));
  assert.equal(boardOpen(web), false);
  fireWindow(web, 'keydown', keyEvent({ code: 'KeyW', key: 'w', altKey: true }));
  assert.equal(boardNode(web).props['data-kana-session-board'], 'transient');
  fireWindow(web, 'keyup', keyEvent({ code: 'KeyW', key: 'w', altKey: true }));
  fireWindow(web, 'keyup', keyEvent({ code: 'AltLeft', key: 'Alt' }));
  assert.deepEqual(web.actions, ['open:s2']);
  for (const off of web.disposed.reverse()) off();
});

test('a browser board recorder saves only the variant the Web runtime accepts', async () => {
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  assert.equal(descendants(web.slots[0].component())
    .find((node) => node.props?.['data-kana-board-settings'] !== undefined)
    .props['data-kana-board-settings'], '');
  const record = descendants(web.slots[0].component())
    .find((node) => node.type === 'button' && node.props['aria-label'] === 'boardRecord');
  record.props.onClick();
  await flush();
  web.documentListeners.get('keydown')(keyEvent({ code: 'KeyK', altKey: true }));
  web.documentListeners.get('keyup')(keyEvent({ code: 'KeyK', altKey: true }));
  await flush();
  // Writing the Alt-only rows would be refused by DSH and fail the whole save,
  // so the browser stores the derived Ctrl+Alt row and keeps the rest local.
  assert.deepEqual(web.edits.map((entry) => JSON.stringify(entry.operation)), [
    JSON.stringify({ type: 'set', id: 'kana.shortcuts.session-board-pin',
      binding: { code: 'KeyK', modifiers: ['control', 'alt'] } }),
  ]);
  for (const off of web.disposed.reverse()) off();
});

test('board settings stay out of the ordinary action list', () => {
  // Plain Web hosts the board too, so its settings page carries the Alt-only
  // recorder as well.
  const web = load({ mode: null, bridge: false, official: false, runtime: 'web' });
  assert.equal(descendants(web.slots[0].component())
    .some((node) => node.props?.['data-kana-board-settings'] !== undefined), true);
  for (const off of web.disposed.reverse()) off();

  // Community Desktop hosts the board too, so it shows the board settings.
  const community = load({ bridge: true, mode: 'advanced', runtime: 'web' });
  assert.equal(descendants(community.slots[0].component())
    .some((node) => node.props?.['data-kana-board-settings'] !== undefined), true);
  for (const off of community.disposed.reverse()) off();

  const environment = load(nextWindows);
  const settings = environment.slots[0].component();
  assert.equal(descendants(settings).some((node) => node.props?.['data-kana-board-settings'] !== undefined), true);
  const select = descendants(settings).find((node) => node.type === 'select');
  // createElement receives the mapped options as a single child array.
  assert.equal(select.children[0].length, 15);
  assert.equal(select.children[0].some((option) => option.children[0] === 'board'), false);
  for (const off of environment.disposed.reverse()) off();
});
