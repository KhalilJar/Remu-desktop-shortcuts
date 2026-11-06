import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');

function load({ mode = 'advanced', urlMode = null, runtime = 'desktop', platform = 'windows', bridge = true, official = false } = {}) {
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
  const document = { body: { dataset: mode == null ? {} : { dshDesktopMode: mode } }, documentElement: {},
    hasFocus() { return this.focused !== false; },
    querySelector() { return this.modalOpen ? {} : null; },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    removeEventListener(type, listener) { if (documentListeners.get(type) === listener) documentListeners.delete(type); },
    querySelectorAll() { return [{ dataset: { conversationSession: selected.key }, querySelector() { return scroll; } }]; } };
  const config = { status: 'ready', revision: 'one' };
  const catalog = [];
  const react = {
    createElement(type, props, ...children) { return { type, props: props ?? {}, children }; },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
    useState(value) { return [value, () => {}]; },
    useEffect() {},
    useRef(value) { return { current: value }; },
  };
  const context = {
    window: { location: { search: urlMode === null ? '' : `?dsh-desktop-mode=${urlMode}`,
      protocol: official ? 'dsh-app:' : 'http:', hostname: official ? 'app' : '127.0.0.1' },
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
    Date, Set, URLSearchParams,
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    Promise, console,
  };
  runInNewContext(source, context);
  const ctx = {
    effect(factory) { disposed.push(factory()); },
    locale: { register() { return () => {}; }, bind() { return (key) => key; } },
    shortcuts: {
      runtime, platform,
      register(command) { commands.push(command); return () => commands.splice(commands.indexOf(command), 1); },
      edit(operation, revision) { edits.push({ operation, revision }); return Promise.resolve({ status: 'saved' }); },
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
    slots: { inject(name, register) { assert.equal(name, 'settings.section'); return register(); },
      register(options, component) { slots.push({ options, component }); return () => slots.pop(); },
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
  return { commands, slots, actions, disposed, edits, catalog, document, observers,
    fixedInputs, frames, sidebarPanels, mainPanels, slotListeners, fixedRows, panelInfo,
    selected, selectedListeners, sessionList, sessionRows, listListeners, workspaceList, workspaceListeners,
    scrollAttributes, documentListeners };
}

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...node.children.flatMap(descendants)];
}

test('registers fifteen unbound Desktop actions and one dedicated settings page', async () => {
  const { commands, slots, actions, disposed } = load();
  assert.equal(commands.length, 15);
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
  assert.equal(slots.length, 1);
  assert.equal(commands.length, 15);
  document.body.dataset.dshDesktopMode = 'compatibility';
  observers[0].callback();
  assert.equal(slots.length, 1);
  assert.equal(commands.length, 15);
  document.body.dataset.dshDesktopMode = 'extended';
  observers[0].callback();
  assert.equal(slots.length, 1);
  assert.equal(commands.length, 15);
  document.body.dataset.dshDesktopMode = 'unrecognized';
  observers[0].callback();
  assert.equal(slots.length, 0);
  assert.equal(commands.length, 0);
  for (const off of disposed.reverse()) off();
  assert.equal(observers[0].disconnected, true);
});

test('compatibility mode without a body marker uses trusted preload plus URL mode', () => {
  const compatible = load({ mode: null, urlMode: 'compatibility', runtime: 'web' });
  assert.equal(compatible.slots.length, 1);
  assert.equal(compatible.commands.length, 15);
  compatible.commands[1].resolve({ modal: null }).run();
  assert.deepEqual(compatible.actions, [null]);
  for (const off of compatible.disposed.reverse()) off();
  const browserImpersonator = load({ mode: null, urlMode: 'compatibility', bridge: false, runtime: 'web' });
  assert.equal(browserImpersonator.slots.length, 0);
  assert.equal(browserImpersonator.commands.length, 0);
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

test('official Desktop registers native-compatible actions, while plain Web stays inactive', () => {
  const official = load({ mode: null, bridge: false, official: true, runtime: 'desktop' });
  assert.equal(official.commands.length, 14);
  assert.equal(official.commands.some((command) => command.id === 'kana.shortcuts.devtools'), false);
  assert.equal(official.slots[0].component().type, 'section');
  official.commands[0].resolve({ modal: null }).run();
  assert.deepEqual(official.actions, [null]);
  for (const platform of ['windows', 'macos', 'linux']) {
    const browser = load({ mode: null, bridge: false, official: false, runtime: 'web', platform });
    assert.equal(browser.commands.length, 0);
    assert.equal(browser.slots.length, 0);
    for (const off of browser.disposed.reverse()) off();
  }
  for (const off of official.disposed.reverse()) off();
});

test('mode arriving late does not discard existing action identities', () => {
  const { commands, document, observers, disposed } = load({ mode: null });
  assert.equal(commands.length, 0);
  document.body.dataset.dshDesktopMode = 'compatibility';
  observers[0].callback();
  assert.equal(commands.length, 15);
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
  for (const config of [{ mode: 'unknown' }, { mode: 'compatibility', bridge: false },
    { mode: null, bridge: true }, { mode: null, bridge: false }]) {
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
