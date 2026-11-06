// Desktop-only shortcut commands and a dedicated Settings section.
// The built-in shortcuts service owns dispatch, conflict checks, recording pause and persistence.
window.__ModuleLoader__.load({
  id: 'kana-desktop-shortcuts',
  factory: (require) => ({
    name: 'kana-desktop-shortcuts',
    inject: ['locale', 'slots', 'shortcuts', 'layout', 'sessions', 'uiSession', 'uiWorkspace', 'workspaces'],
    apply(ctx) {
      const React = require('react');
      const ns = 'kana-desktop-shortcuts';
      const ids = [
        'kana.shortcuts.devtools', 'kana.shortcuts.conversation', 'kana.shortcuts.focus-composer',
        'kana.shortcuts.focus-content', 'kana.shortcuts.recent-session', 'kana.shortcuts.previous-session',
      ];
      const colors = {
        text: 'var(--dsw-alias-label-primary)', secondary: 'var(--dsw-alias-label-secondary)',
        surface: 'var(--dsw-alias-bg-layer-2)', border: 'var(--dsw-alias-border-l1)',
        accent: 'var(--dsw-alias-brand-primary)', error: 'var(--dsw-alias-state-error-primary)',
      };
      const dictionaries = {
        zh: {
          title: '自定义快捷键', introduction: '仅在 DSH Desktop 增强模式的主界面获得焦点时生效。选择动作，录制组合键。',
          devtools: '开发者工具', conversation: '返回会话', focus: '返回会话并聚焦输入框',
          content: '聚焦会话内容（方向键滚动）', recent: '速切最近会话（连按轮换）',
          previous: '返回上一个会话（往返切换）', choose: '选择动作',
          panelKeys: '功能页速切', panelHelp: 'Ctrl+1～8 按左侧功能页顺序切换；Ctrl+9 打开最后一个功能页。若键位被其他动作占用则不接管。',
          panelTaken: '已被其他快捷键占用', panelNone: '暂无可切换的功能页',
          sessionHelp: '会话速切可连按轮换：短时间内连续按键会经过更多会话；“上一个会话”在最近访问的两个会话间往返。需先至少访问两个会话。系统 Alt+Tab 不会被接管。',
          record: '＋ 录制快捷键', recording: '请按 Ctrl + Alt/Shift + 字母或数字；Esc 取消',
          preparing: '正在准备录制…', empty: '尚未设置', clear: '移除', reset: '恢复默认',
          saved: '已保存快捷键', cleared: '快捷键已移除', cancelled: '已取消录制',
          invalid: '请按 Ctrl + Alt/Shift + 字母或数字；不会改动 Enter。',
          conflict: '此组合键已被占用：{commands}', invalidBinding: '此组合键不可用。',
          notReady: '快捷键配置尚未就绪，请稍后再试。',
          unreadable: '快捷键配置不可读取；请检查当前界面的本地存储 dsh.keybindings.v1。',
          stale: '配置已改变，请核对当前键位后重试。',
          failed: '无法保存快捷键；原有配置未改变。',
          unsupported: '仅支持 Windows 版 DSH Desktop 增强模式。',
        },
        en: {
          title: 'Custom shortcuts', introduction: 'Active only while the main DSH Desktop enhanced-mode page has focus. Select an action and record a shortcut.',
          devtools: 'Developer Tools', conversation: 'Return to conversation', focus: 'Return and focus message input',
          content: 'Focus conversation content (arrow-key scrolling)', recent: 'Cycle recent conversations',
          previous: 'Return to previous conversation (toggle)', choose: 'Choose an action',
          panelKeys: 'Quick panel switch', panelHelp: 'Ctrl+1–8 follow the left panel order; Ctrl+9 opens the last panel. Existing bindings take priority.',
          panelTaken: 'Used by another shortcut', panelNone: 'No panels available',
          sessionHelp: 'Press the recent-conversation shortcut repeatedly to cycle within a short interval. Previous conversation toggles between the two most recently visited. Visit two conversations first. System Alt+Tab is unchanged.',
          record: '＋ Record shortcut', recording: 'Press Ctrl + Alt/Shift + letter or digit; Esc cancels',
          preparing: 'Preparing recorder…', empty: 'Not assigned', clear: 'Remove', reset: 'Restore default',
          saved: 'Shortcut saved', cleared: 'Shortcut removed', cancelled: 'Recording cancelled',
          invalid: 'Use Ctrl + Alt/Shift + a letter or digit; Enter is unaffected.',
          conflict: 'Already assigned to: {commands}', invalidBinding: 'This shortcut cannot be used.',
          notReady: 'Shortcut preferences are not ready yet. Try again later.',
          unreadable: 'Shortcut preferences cannot be read. Check this page’s localStorage entry dsh.keybindings.v1.',
          stale: 'Preferences changed. Review the current binding and retry.',
          failed: 'Could not save shortcut; the previous binding remains.',
          unsupported: 'Only Windows DSH Desktop enhanced mode is supported.',
        },
      };
      ctx.effect(() => ctx.locale.register(ns, dictionaries), 'kana shortcuts: locale');
      const t = ctx.locale.bind(ns);
      const desktopReady = () => ctx.shortcuts.platform === 'windows' &&
        document.body?.dataset.dshDesktopMode === 'advanced' &&
        globalThis.dshDesktop?.protocolVersion === 1 &&
        typeof globalThis.dshDesktopActions?.invoke === 'function';

      // This Desktop build exposes its keyboard service as web:windows. Its DOM
      // dispatcher and localStorage own shortcuts; the bridge gates this app only.
      // Unbound by default; no built-in binding or Enter behavior is modified.
      const currentSessionId = () => ctx.uiSession.adapter.current.getSnapshot().key;
      const currentSession = () => ctx.sessions.list.getSnapshot().byId[currentSessionId()];
      // Match the sidebar's ordinary visible Sessions; never open an archive,
      // subagent child, stale local fallback, or another unstarted blank draft.
      const visibleSessionIds = () => {
        const list = ctx.sessions.list.getSnapshot();
        const workspaces = ctx.workspaces.list.getSnapshot();
        if (list.phase !== 'ready' || workspaces.phase !== 'ready') return [];
        const archived = new Set(workspaces.archivedSessionIds);
        return list.ids.filter((id) => {
          const row = list.byId[id];
          return row && row.origin !== 'subagent' && !archived.has(id) &&
            (!row.blank || id === currentSessionId());
        });
      };
      let recentIds = [];
      let observedId;
      let cycle = null;
      const syncRecent = () => {
        const allowed = new Set(visibleSessionIds());
        recentIds = recentIds.filter((id) => allowed.has(id));
        if (cycle && cycle.ids.some((id) => !allowed.has(id))) cycle = null;
        const id = currentSessionId();
        if (id === observedId && (!id || recentIds.includes(id))) return;
        if (id && allowed.has(id)) {
          recentIds = [id, ...recentIds.filter((other) => other !== id)];
          if (cycle && cycle.expected !== id) cycle = null;
        } else cycle = null;
        observedId = id;
      };
      ctx.effect(() => {
        const offCurrent = ctx.uiSession.adapter.current.subscribe(syncRecent);
        const offList = ctx.sessions.list.subscribe(syncRecent);
        const offWorkspaces = ctx.workspaces.list.subscribe(syncRecent);
        syncRecent();
        return () => { offWorkspaces(); offList(); offCurrent(); cycle = null; recentIds = []; };
      }, 'kana shortcuts: recent conversation history');
      const openVisibleSession = (id) => {
        if (!visibleSessionIds().includes(id)) return false;
        try { ctx.uiWorkspace.openSession(id); return true; }
        catch (error) {
          console.error('kana-desktop-shortcuts: session navigation failed', error);
          return false;
        }
      };
      const cycleRecentSession = () => {
        syncRecent();
        const current = currentSessionId();
        const visible = visibleSessionIds();
        if (!current || !visible.includes(current) || visible.length < 2) return;
        const now = Date.now();
        if (!cycle || now - cycle.at > 1800 || cycle.expected !== current) {
          const ids = [...new Set([current, ...recentIds, ...visible])].filter((id) => visible.includes(id));
          cycle = { ids, index: 0, expected: current, at: now };
        }
        cycle.index = (cycle.index + 1) % cycle.ids.length;
        cycle.expected = cycle.ids[cycle.index];
        cycle.at = now;
        if (!openVisibleSession(cycle.expected)) cycle = null;
      };
      const openPreviousSession = () => {
        syncRecent();
        const current = currentSessionId();
        const previous = recentIds.find((id) => id !== current);
        cycle = null;
        if (current && previous) openVisibleSession(previous);
      };
      const pendingFrames = new Set();
      let focusEpoch = 0;
      ctx.effect(() => () => {
        focusEpoch++;
        for (const frame of pendingFrames) cancelAnimationFrame(frame);
        pendingFrames.clear();
      }, 'kana shortcuts: pending focus');
      const deferFocus = (sessionId, focusTarget) => {
        const epoch = ++focusEpoch;
        ctx.layout.selectPanel(null);
        const attempt = (remaining) => {
          if (epoch !== focusEpoch || !desktopReady() || !document.hasFocus() || currentSessionId() !== sessionId) return;
          const panelInfo = ctx.layout.panelInfo?.getSnapshot();
          if (panelInfo && panelInfo.activePanelId !== null) return;
          if (focusTarget()) return;
          if (remaining > 0) {
            const frame = requestAnimationFrame(() => { pendingFrames.delete(frame); attempt(remaining - 1); });
            pendingFrames.add(frame);
          }
        };
        const frame = requestAnimationFrame(() => { pendingFrames.delete(frame); attempt(8); });
        pendingFrames.add(frame);
      };
      const focusCurrentComposer = () => {
        const sessionId = currentSessionId();
        if (!sessionId) return;
        deferFocus(sessionId, () => {
          const binding = ctx.sessions.binding(sessionId);
          const shell = binding?.ctx.get('conversation')?.input.for(binding.ctx);
          if (!shell?.editor.getRootElement()) return false;
          shell.focus();
          return true;
        });
      };
      const focusCurrentContent = () => {
        const sessionId = currentSessionId();
        if (!sessionId) return;
        deferFocus(sessionId, () => {
          const root = [...document.querySelectorAll('[data-conversation-content][data-conversation-region="chat"]')]
            .find((node) => node.dataset.conversationSession === sessionId);
          const scroll = root?.querySelector(':scope > [data-conversation-scroll]');
          if (!scroll) return false;
          if (!scroll.hasAttribute('tabindex')) {
            scroll.setAttribute('tabindex', '-1');
            scroll.addEventListener('blur', () => scroll.removeAttribute('tabindex'), { once: true });
          }
          scroll.focus({ preventScroll: true });
          return true;
        });
      };
      const commands = [
        { id: ids[0], key: 'devtools', run: () => Promise.resolve(globalThis.dshDesktopActions.invoke('developer'))
          .catch((error) => console.error('kana-desktop-shortcuts: developer action failed', error)) },
        { id: ids[1], key: 'conversation', run: () => ctx.layout.selectPanel('conversation') },
        { id: ids[2], key: 'focus', run: focusCurrentComposer,
          available: () => Boolean(currentSession()) && Boolean(ctx.get('conversation')) },
        { id: ids[3], key: 'content', run: focusCurrentContent,
          regions: ['page', 'editable'], available: () => Boolean(currentSession()) },
        { id: ids[4], key: 'recent', run: cycleRecentSession, regions: ['page', 'editable'],
          available: () => visibleSessionIds().length > 1 && Boolean(currentSession()) },
        { id: ids[5], key: 'previous', run: openPreviousSession, regions: ['page', 'editable'],
          available: () => { syncRecent(); return recentIds.some((id) => id !== currentSessionId()); } },
      ];
      // Lexical handles Ctrl+Shift+Z (redo) before the shortcuts service's
      // window-bubble listener. Route only our explicitly assigned new actions
      // in the editable capture phase; leave every other key to its owner.
      ctx.effect(() => {
        const onEditableKey = (event) => {
          if (!desktopReady() || !document.hasFocus() || event.defaultPrevented || event.repeat ||
              event.isComposing || event.getModifierState?.('AltGraph') ||
              document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"]') ||
              !event.target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
          if (ctx.shortcuts.config.getSnapshot().status !== 'ready') return;
          const modifiers = [
            event.ctrlKey && 'control', event.altKey && 'alt', event.shiftKey && 'shift', event.metaKey && 'meta',
          ].filter(Boolean);
          for (const command of commands.slice(3)) {
            const binding = ctx.shortcuts.catalog.getSnapshot().find((row) => row.id === command.id)?.binding;
            if (!binding || binding.secondCode || binding.code !== event.code ||
                binding.modifiers?.length !== modifiers.length ||
                !modifiers.every((modifier) => binding.modifiers.includes(modifier))) continue;
            try {
              const description = ctx.shortcuts.describeBinding(binding);
              if (description.issue !== null || description.conflicts.some((id) => id !== command.id) ||
                  (command.available && !command.available())) return;
              event.preventDefault();
              event.stopPropagation();
              command.run();
            } catch (error) {
              console.error('kana-desktop-shortcuts: editable shortcut failed', error);
            }
            return;
          }
        };
        document.addEventListener('keydown', onEditableKey, true);
        return () => document.removeEventListener('keydown', onEditableKey, true);
      }, 'kana shortcuts: editable capture');
      const registerCommands = () => {
        const disposers = [];
        try {
          for (const command of commands) disposers.push(ctx.shortcuts.register({
            id: command.id, label: () => t(command.key), aliases: [command.key],
            defaults: {}, regions: command.regions ?? ['page'], modals: [],
            resolve: ({ modal }) => !desktopReady() || !document.hasFocus() || modal !== null ||
              (command.available && !command.available())
              ? { status: 'blocked', reason: 'focus-modal-or-session' }
              : { status: 'handled', run: command.run },
          }));
          return () => { for (const dispose of disposers.reverse()) dispose(); };
        } catch (error) {
          for (const dispose of disposers.reverse()) dispose();
          throw error;
        }
      };

      let panelRows = [];
      const panelListeners = new Set();
      const panelSnapshot = () => panelRows;
      const panelSubscribe = (listener) => { panelListeners.add(listener); return () => panelListeners.delete(listener); };
      const syncPanels = () => {
        const mainIds = new Set(ctx.slots.entriesOfSlot('main').map((entry) => entry.options.key));
        const next = ctx.slots.entriesOfSlot('sidebar.panellist')
          .map(({ options }) => ({ id: options.id, order: options.order ?? 0,
            label: typeof options.label === 'function' ? options.label() : options.label ?? options.id }))
          .filter((panel) => mainIds.has(panel.id))
          .sort((a, b) => a.order - b.order);
        if (next.length === panelRows.length && next.every((panel, index) =>
          panel.id === panelRows[index].id && panel.label === panelRows[index].label)) return;
        panelRows = next;
        for (const listener of panelListeners) listener();
      };
      const occupied = (code) => {
        const matches = (binding) => binding && binding.modifiers?.length === 1 &&
          binding.modifiers[0] === 'control' && (binding.code === code || binding.secondCode === code);
        return ctx.shortcuts.catalog.getSnapshot().some((row) => matches(row.binding)) ||
          ctx.shortcuts.fixedCatalog.getSnapshot().some((row) => row.bindings.some(matches));
      };
      const panelForDigit = (digit) => digit === 9 ? panelRows.at(-1) : panelRows[digit - 1];
      ctx.effect(() => {
        const offPanels = ctx.slots.subscribe('sidebar.panellist', syncPanels);
        const offMain = ctx.slots.subscribe('main', syncPanels);
        syncPanels();
        const offInput = ctx.shortcuts.observeFixedInput((input) => {
          if (input.type !== 'keydown' || !desktopReady() || !document.hasFocus()) return;
          const { gesture, context } = input;
          if (!/^Digit[1-9]$/.test(gesture.code) || !gesture.control || gesture.alt || gesture.shift || gesture.meta ||
              gesture.repeat || gesture.composing || gesture.defaultPrevented || context.modal !== null ||
              context.region === 'terminal' || occupied(gesture.code)) return;
          const panel = panelForDigit(Number(gesture.code.slice(-1)));
          if (!panel || !ctx.slots.entriesOfSlot('main').some((entry) => entry.options.key === panel.id)) return;
          input.consume();
          ctx.layout.selectPanel(panel.id);
        });
        return () => { offInput(); offMain(); offPanels(); panelRows = []; panelListeners.clear(); };
      }, 'kana shortcuts: panel number navigation');

      function KeyboardSettings() {
        const catalog = React.useSyncExternalStore(
          (notify) => ctx.shortcuts.catalog.subscribe(notify),
          () => ctx.shortcuts.catalog.getSnapshot(),
        );
        const config = React.useSyncExternalStore(
          (notify) => ctx.shortcuts.config.subscribe(notify),
          () => ctx.shortcuts.config.getSnapshot(),
        );
        const panels = React.useSyncExternalStore(panelSubscribe, panelSnapshot);
        const [selected, setSelected] = React.useState(ids[0]);
        const [recordingId, setRecordingId] = React.useState(null);
        const [recordReady, setRecordReady] = React.useState(false);
        const [busy, setBusy] = React.useState(false);
        const [message, setMessage] = React.useState('');
        const recorder = React.useRef(null);
        const valid = desktopReady();
        const available = valid && config.status === 'ready' && !busy;
        const rows = commands.map((command) => ({ ...command, row: catalog.find((row) => row.id === command.id) }));
        const labelFor = (id) => catalog.find((row) => row.id === id)?.label ?? id;
        const failureText = (result) => {
          if (result.status === 'unreadable') return t('unreadable');
          if (result.status === 'stale') return t('stale');
          if (result.status === 'not-ready') return t('notReady');
          if (result.status === 'conflict') return result.issue
            ? t('invalidBinding')
            : t('conflict', { commands: (result.conflicts ?? []).map(labelFor).join(', ') });
          return t('failed');
        };
        const save = async (operation) => {
          if (!desktopReady() || config.status !== 'ready' || busy) return;
          setBusy(true);
          try {
            const result = await ctx.shortcuts.edit(operation, config.revision);
            setMessage(result.status === 'saved'
              ? t(operation.type === 'set' && operation.binding === null ? 'cleared' : 'saved')
              : failureText(result));
          } catch (error) {
            console.error('kana-desktop-shortcuts: preference save failed', error);
            setMessage(t('failed'));
          } finally {
            setBusy(false);
          }
        };
        React.useEffect(() => {
          if (recordingId === null) return undefined;
          let disposed = false;
          let pending = null;
          setRecordReady(false);
          const down = (event) => {
            if (document.activeElement !== recorder.current || event.isComposing || event.getModifierState?.('AltGraph')) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.repeat) return;
            if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
              setMessage(t('cancelled'));
              setRecordingId(null);
              return;
            }
            if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(event.code)) return;
            if (!/^Key[A-Z]$|^Digit[0-9]$/.test(event.code) ||
                !event.ctrlKey || !(event.altKey || event.shiftKey) || event.metaKey) {
              pending = null;
              setMessage(t('invalid'));
              return;
            }
            pending = { code: event.code, modifiers: [
              'control', ...(event.altKey ? ['alt'] : []), ...(event.shiftKey ? ['shift'] : []),
            ] };
          };
          const up = (event) => {
            if (document.activeElement !== recorder.current) return;
            event.preventDefault();
            event.stopPropagation();
            if (pending === null || pending.code !== event.code) return;
            const candidate = pending;
            pending = null;
            try {
              const description = ctx.shortcuts.describeBinding(candidate);
              const conflicts = description.conflicts.filter((id) => id !== recordingId);
              if (description.issue !== null || conflicts.length) {
                setMessage(description.issue !== null ? t('invalidBinding') :
                  t('conflict', { commands: conflicts.map(labelFor).join(', ') }));
                return;
              }
              setRecordingId(null);
              void save({ type: 'set', id: recordingId, binding: description.binding });
            } catch (error) {
              console.error('kana-desktop-shortcuts: invalid binding', error);
              setMessage(t('invalidBinding'));
            }
          };
          Promise.resolve(ctx.shortcuts.recording(true)).then(() => {
            if (disposed) { void ctx.shortcuts.recording(false).catch(() => {}); return; }
            document.addEventListener('keydown', down, true);
            document.addEventListener('keyup', up, true);
            setRecordReady(true);
          }, (error) => {
            if (!disposed) {
              console.error('kana-desktop-shortcuts: recorder unavailable', error);
              setMessage(t('failed'));
              setRecordingId(null);
            }
          });
          return () => {
            disposed = true;
            document.removeEventListener('keydown', down, true);
            document.removeEventListener('keyup', up, true);
            void ctx.shortcuts.recording(false).catch(() => {});
          };
        }, [recordingId]);
        React.useEffect(() => {
          if (recordingId !== null && recordReady) recorder.current?.focus();
        }, [recordingId, recordReady]);
        if (!valid) return React.createElement('div', { role: 'status', style: { padding: '20px 24px', color: colors.text } },
          React.createElement('p', null, t('unsupported')),
          React.createElement('code', { style: { fontSize: 12, color: colors.secondary } },
            `runtime=${String(ctx.shortcuts.runtime)} platform=${String(ctx.shortcuts.platform)} ` +
            `mode=${String(document.body?.dataset.dshDesktopMode)} ` +
            `protocol=${String(globalThis.dshDesktop?.protocolVersion)} ` +
            `action=${typeof globalThis.dshDesktopActions?.invoke}`));
        const button = (label, onClick, disabled = false) => React.createElement('button', {
          type: 'button', onClick, disabled,
          style: { font: 'inherit', padding: '7px 12px', borderRadius: 8,
            color: colors.text, background: colors.surface, border: `1px solid ${colors.border}`,
            cursor: disabled ? 'not-allowed' : 'pointer' },
        }, label);
        return React.createElement('section', {
          'aria-label': t('title'), style: { color: colors.text, padding: '20px 24px', maxWidth: 760 },
        },
        React.createElement('h2', { style: { margin: '0 0 8px', fontSize: 20 } }, t('title')),
        React.createElement('p', { style: { color: colors.secondary, margin: '0 0 20px' } }, t('introduction')),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 } },
          React.createElement('label', { htmlFor: 'kana-shortcut-action' }, t('choose')),
          React.createElement('select', { id: 'kana-shortcut-action', value: selected,
            onChange: (event) => setSelected(event.target.value), disabled: recordingId !== null,
            style: { font: 'inherit', color: colors.text, background: colors.surface,
              border: `1px solid ${colors.border}`, borderRadius: 8, padding: '7px 12px' },
          }, commands.map((command) => React.createElement('option', { key: command.id, value: command.id }, t(command.key)))),
          recordingId === null ? button(t('record'), () => {
            if (!available) return;
            setMessage('');
            setRecordReady(false);
            setRecordingId(selected);
          }, !available) : React.createElement('button', {
            ref: recorder, type: 'button', 'aria-label': t('recording'),
            onBlur: () => setRecordingId(null),
            disabled: !recordReady,
            style: { font: 'inherit', color: colors.accent, background: colors.surface,
              border: `1px solid ${colors.accent}`, borderRadius: 8, padding: '7px 12px' },
          }, t(recordReady ? 'recording' : 'preparing'))),
        config.status !== 'ready' && React.createElement('p', { role: 'alert' },
          t(config.status === 'unreadable' ? 'unreadable' : 'notReady')),
        React.createElement('div', null, rows.map(({ id, key, row }) => React.createElement('div', {
          key: id, style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            borderTop: `1px solid ${colors.border}`, padding: '14px 0' },
        }, React.createElement('span', { style: { minWidth: 150 } }, t(key)),
        React.createElement('kbd', { style: { flex: 1, color: colors.secondary } }, row?.keys?.length ? row.keys.join(' ') : t('empty')),
        button(t('clear'), () => void save({ type: 'set', id, binding: null }), !available || recordingId !== null || !row?.binding),
        button(t('reset'), () => void save({ type: 'reset', id }), !available || recordingId !== null || !row?.modified)))),
        React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } }, t('sessionHelp')),
        React.createElement('h3', { style: { margin: '24px 0 8px', fontSize: 16 } }, t('panelKeys')),
        React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } }, t('panelHelp')),
        panels.length === 0 ? React.createElement('p', null, t('panelNone')) :
          React.createElement('ul', { style: { paddingLeft: 20, lineHeight: 1.9 } },
            panels.slice(0, 8).map((panel, index) => React.createElement('li', { key: panel.id },
              `Ctrl + ${index + 1} — ${panel.label}`,
              occupied(`Digit${index + 1}`) ? ` (${t('panelTaken')})` : '')),
            panels.length > 1 && React.createElement('li', { key: 'last' },
              `Ctrl + 9 — ${panels.at(-1).label}`,
              occupied('Digit9') ? ` (${t('panelTaken')})` : '')),
        message && React.createElement('p', { role: 'status', style: { color: colors.error } }, message));
      }
      ctx.effect(() => {
        let disposeSlot;
        let disposeCommands;
        const sync = () => {
          const active = document.body?.dataset.dshDesktopMode === 'advanced' &&
            globalThis.dshDesktop?.protocolVersion === 1;
          if (active && !disposeSlot) {
            disposeSlot = ctx.slots.inject('settings.section', () => ctx.slots.register({
              name: 'settings.section', id: 'kana-desktop-shortcuts', order: 22,
              label: () => t('title'),
            }, KeyboardSettings));
          } else if (!active && disposeSlot) {
            disposeSlot();
            disposeSlot = undefined;
          }
          if (active && desktopReady() && !disposeCommands) disposeCommands = registerCommands();
          else if ((!active || !desktopReady()) && disposeCommands) {
            disposeCommands();
            disposeCommands = undefined;
          }
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-dsh-desktop-mode'], childList: true, subtree: true,
        });
        return () => { observer.disconnect(); disposeCommands?.(); disposeSlot?.(); };
      }, 'kana shortcuts: Desktop settings and commands');
    },
  }),
});
