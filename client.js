// Desktop-content shortcuts and a dedicated DSH Settings section.
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
      // One user-recorded base combination and its two derived companions.
      const boardIds = [
        'kana.shortcuts.session-board', 'kana.shortcuts.session-board-back',
        'kana.shortcuts.session-board-pin',
      ];
      // Sessions the user removed from this launch's board candidates. The
      // current session is never removed here, and revisiting a removed session
      // puts it back (syncRecent clears the entry once it becomes current).
      const boardRemovedIds = new Set();
      const colors = {
        text: 'var(--dsw-alias-label-primary)', secondary: 'var(--dsw-alias-label-secondary)',
        surface: 'var(--dsw-alias-bg-layer-2)', border: 'var(--dsw-alias-border-l1)',
        accent: 'var(--dsw-alias-brand-primary)', error: 'var(--dsw-alias-state-error-primary)',
      };
      const dictionaries = {
        zh: {
          title: '自定义快捷键', introduction: '仅在 DSH Desktop 内容页获得焦点时生效。按当前环境录制组合键；不抢占系统级快捷键。',
          devtools: '开发者工具', conversation: '返回会话', focus: '返回会话并聚焦输入框',
          content: '聚焦会话内容（方向键滚动）', recent: '速切最近会话（连按轮换）',
          previous: '返回上一个会话（往返切换）', choose: '选择动作',
          panelKeys: '功能页速切', panelAction: '切换到功能页 {digit}',
          panelHelpDesktop: '社区 Stable Windows Desktop 可用 Ctrl+1～8 按左侧功能页顺序切换、Ctrl+9 打开最后一页；也可以单独录制键位。冲突时不接管。',
          panelHelpOfficial: '官方 Desktop 与 DSH NEXT 请为“切换到功能页”动作分别录制键位；固定 Ctrl+数字只在有旧桥的社区 Stable Windows Desktop 启用。',
          noDevtools: '此动作只在有受控开发者工具桥的 Desktop 中显示；其他 Desktop 请用应用菜单。',
          panelTaken: '已被其他快捷键占用', panelNone: '暂无可切换的功能页',
          sessionHelp: '会话速切可连按轮换：短时间内连续按键会经过更多会话；“上一个会话”在最近访问的两个会话间往返。需先至少访问两个会话。系统 Alt+Tab 不会被接管。',
          board: '会话轮切板', boardBack: '会话轮切板（反向）', boardPin: '会话轮切板（固定模式）',
          boardSection: '会话轮切板（DSH NEXT / Windows）',
          boardHelp: '录一次 Alt + 普通键（例如 Alt+Q）。插件据此派生 Shift+Alt+Q 反向移动与 Ctrl+Alt+Q 固定模式；三者任一被占用就不保存，原键位保持不变。按住 Alt 连按基础键移动高亮，松开 Alt 才切换；Esc 取消。',
          boardRecord: '＋ 录制轮切键',
          boardRecording: '请按住 Alt 再按一个普通键（如 Alt+Q）；再点按钮或 Esc 取消',
          boardInvalid: '轮切键必须只带 Alt：请按住 Alt，再按一个普通键。',
          boardTitle: '会话轮切板', boardCurrent: '当前',
          boardUntitled: '未命名会话', boardNoWorkspace: '未分组',
          boardRemove: '从本次候选移除',
          boardTransientHint: '按住 Alt 连按切换 · 松开 Alt 打开高亮会话 · Esc 取消 · Delete 移除',
          boardPinnedHint: 'Enter 或点击打开 · 方向键移动 · Esc 取消 · Delete 移除',
          boardNone: '本次启动还没有可轮切的会话：请先访问至少两个会话。',
          boardFocus: '当前焦点在内嵌网页里，无法确认 Alt 松开；请先点回会话内容再按。',
          boardGone: '高亮的会话已不可用，已取消切换。',
          record: '＋ 录制快捷键', recordingWindows: '请按 Ctrl + Alt/Shift + 字母或数字；再点按钮或 Esc 取消',
          recordingMac: '请按 Command + Option/Shift + 字母或数字；再点按钮或 Esc 取消',
          recordingLinux: '可尝试 Ctrl+/、Ctrl+Shift+, 或 Ctrl+Shift+.；再点按钮或 Esc 取消',
          preparing: '正在准备录制…', empty: '尚未设置', clear: '移除', reset: '恢复默认',
          saved: '已保存快捷键', cleared: '快捷键已移除', cancelled: '已取消录制',
          invalid: '此环境不支持该组合；请按录制提示选择，不会改动 Enter。',
          conflict: '此组合键已被占用：{commands}', invalidBinding: '此组合键不可用。',
          notReady: '快捷键配置尚未就绪，请稍后再试。',
          unreadable: 'DSH 快捷键服务无法读取配置；请检查当前环境的快捷键适配器、插件动作 ID 和存储。不要清空已有键位。',
          stale: '配置已改变，请核对当前键位后重试。',
          failed: '无法保存快捷键；原有配置未改变。',
          unsupported: '仅支持官方或社区 DSH Desktop 内容页；普通 DSH Web 暂不启用。',
        },
        en: {
          title: 'Custom shortcuts', introduction: 'Active only while the DSH Desktop content page has focus. Record keys supported here; system shortcuts take priority.',
          devtools: 'Developer Tools', conversation: 'Return to conversation', focus: 'Return and focus message input',
          content: 'Focus conversation content (arrow-key scrolling)', recent: 'Cycle recent conversations',
          previous: 'Return to previous conversation (toggle)', choose: 'Choose an action',
          panelKeys: 'Quick panel switch', panelAction: 'Open function panel {digit}',
          panelHelpDesktop: 'On community Stable Windows Desktop, Ctrl+1–8 follow the left panel order and Ctrl+9 opens the last panel. You can also record separate shortcuts. Existing bindings take priority.',
          panelHelpOfficial: 'On official Desktop or DSH NEXT, record a separate shortcut for each function panel. Fixed Ctrl+digits needs the older community Stable Windows bridge.',
          noDevtools: 'This action requires a supported Desktop developer bridge; use the application menu elsewhere.',
          panelTaken: 'Used by another shortcut', panelNone: 'No panels available',
          sessionHelp: 'Press the recent-conversation shortcut repeatedly to cycle within a short interval. Previous conversation toggles between the two most recently visited. Visit two conversations first. System Alt+Tab is unchanged.',
          board: 'Session board', boardBack: 'Session board (backwards)', boardPin: 'Session board (pinned)',
          boardSection: 'Session board (DSH NEXT / Windows)',
          boardHelp: 'Record Alt + an ordinary key once (for example Alt+Q). Shift+Alt+Q moves backwards and Ctrl+Alt+Q pins the board; if any of the three is taken, nothing is saved. Hold Alt and tap the base key to move, release Alt to switch; Esc cancels.',
          boardRecord: '＋ Record board key',
          boardRecording: 'Hold Alt and press an ordinary key (for example Alt+Q); click again or Esc to cancel',
          boardInvalid: 'The board key must use Alt only: hold Alt and press an ordinary key.',
          boardTitle: 'Session board', boardCurrent: 'Current',
          boardUntitled: 'Untitled conversation', boardNoWorkspace: 'No workspace',
          boardRemove: 'Remove from this launch',
          boardTransientHint: 'Hold Alt and tap to move · release Alt to open · Esc cancels · Delete removes',
          boardPinnedHint: 'Enter or click to open · arrow keys move · Esc cancels · Delete removes',
          boardNone: 'No conversations to switch between in this launch: visit at least two first.',
          boardFocus: 'Focus is inside an embedded page, so the Alt release cannot be observed; click back into the conversation first.',
          boardGone: 'The highlighted conversation is no longer available; nothing was opened.',
          record: '＋ Record shortcut', recordingWindows: 'Press Ctrl + Alt/Shift + letter or digit; click again or Esc to cancel',
          recordingMac: 'Press Command + Option/Shift + letter or digit; click again or Esc to cancel',
          recordingLinux: 'Try Ctrl+/, Ctrl+Shift+, or Ctrl+Shift+.; click again or Esc to cancel',
          preparing: 'Preparing recorder…', empty: 'Not assigned', clear: 'Remove', reset: 'Restore default',
          saved: 'Shortcut saved', cleared: 'Shortcut removed', cancelled: 'Recording cancelled',
          invalid: 'This combination is not supported here. Use the recorder hint; Enter is unaffected.',
          conflict: 'Already assigned to: {commands}', invalidBinding: 'This shortcut cannot be used.',
          notReady: 'Shortcut preferences are not ready yet. Try again later.',
          unreadable: 'DSH cannot read shortcut preferences. Check the current shortcut adapter, plugin command IDs and storage; do not clear existing bindings.',
          stale: 'Preferences changed. Review the current binding and retry.',
          failed: 'Could not save shortcut; the previous binding remains.',
          unsupported: 'Only official or community DSH Desktop content pages are supported; plain DSH Web is not enabled yet.',
        },
      };
      ctx.effect(() => ctx.locale.register(ns, dictionaries), 'kana shortcuts: locale');
      const t = ctx.locale.bind(ns);
      const desktopModes = ['compatibility', 'extended', 'advanced'];
      const bridgeReady = () => globalThis.dshDesktop?.protocolVersion === 1 &&
        typeof globalThis.dshDesktopActions?.invoke === 'function';
      const officialReady = () => globalThis.dshDesktop?.protocolVersion === 1 &&
        typeof globalThis.dshDesktop?.shortcuts?.get === 'function' &&
        typeof globalThis.dshDesktop?.keyboard?.subscribe === 'function' &&
        window.location.protocol === 'dsh-app:' && window.location.hostname === 'app';
      const urlMode = () => new URLSearchParams(window.location.search).get('dsh-desktop-mode');
      const desktopMode = () => {
        const marked = document.body?.dataset.dshDesktopMode;
        if (marked !== undefined) return marked;
        // Compatibility keeps the upstream root and never writes the body mode
        // marker. Only accept its URL marker when Electron's preload bridge is
        // present; a normal browser cannot impersonate a Desktop content view.
        return bridgeReady() && urlMode() === 'compatibility' ? 'compatibility' : undefined;
      };
      const desktopReady = () => bridgeReady() && desktopModes.includes(desktopMode());
      const nextDeveloperReady = () => officialReady() && typeof globalThis.desktopNext?.command === 'function';
      const devtoolsReady = () => desktopReady() || nextDeveloperReady();
      const pageReady = () => officialReady() || desktopReady();
      const fixedPanelAvailable = () => desktopReady() && ctx.shortcuts.platform === 'windows';
      // The board commits on the Alt keyup, which is only observable when the
      // main document has focus. That combination is verified on DSH NEXT
      // Windows only, so every other runtime keeps the old actions untouched.
      const switcherReady = () => nextDeveloperReady() && ctx.shortcuts.runtime === 'desktop' &&
        ctx.shortcuts.platform === 'windows';

      // DSH owns keyboard dispatch, conflict checks and storage. Keep original
      // action IDs so each runtime's saved preferences remain untouched.
      // Official Desktop and DSH NEXT use native adapters; community Stable 2.0.18
      // identified as web:windows with its own renderer storage partition.
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
        // Revisiting a session that the board dropped puts it back in the
        // candidate list; re-rendering the same page never does.
        if (id) boardRemovedIds.delete(id);
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
      // ── Session board ──────────────────────────────────────────────────
      // NEXT Windows only. The native bridge forwards keydown and never the
      // release, so a transient board can commit only while this document still
      // receives the Alt keyup: the main process lets modifier keyup through and
      // the board keeps the main frame focused. A trigger that came from an
      // embedded frame cannot observe the release, so the board refuses to open
      // instead of guessing with a timer.
      // Shape limits of the switcher rectangle: five cards per row, three rows
      // on screen before the list starts scrolling vertically.
      const boardMaxColumns = 5;
      const boardMaxRows = 3;
      const boardCardHeight = 92;
      const board = {
        mode: null, ids: [], index: 0, hint: '', hintTimer: null,
        snapshot: { mode: null, index: 0, cards: [], hint: '' },
        listeners: new Set(), detach: null, previousFocus: null,
        // Capture states: `pending` while the bridge confirms the request,
        // `active` once the window menu really stopped eating the Alt release.
        capturePending: false, captureActive: false,
      };
      // The native dispatcher reaches this document through an IPC round trip, so
      // a fast tap can finish releasing both keys before the board is created.
      // The dispatcher consumes the base key's own release, but the Alt release
      // still reaches the page, so both are recorded for the whole session and the
      // board can tell that the tap already finished.
      const keyWatch = { baseUpAt: 0, altUpAt: 0, lastBaseDownAt: 0 };
      const tapAlreadyReleased = () => {
        if (keyWatch.lastBaseDownAt === 0) return false;
        const upAt = Math.max(keyWatch.baseUpAt, keyWatch.altUpAt);
        return upAt > 0 && upAt >= keyWatch.lastBaseDownAt && Date.now() - upAt <= 500;
      };
      const boardSubscribe = (listener) => {
        board.listeners.add(listener);
        return () => { board.listeners.delete(listener); };
      };
      const boardSnapshot = () => board.snapshot;
      const baseName = (path) => String(path ?? '').replace(/[/\\]+$/u, '').split(/[/\\]/u).pop() ?? '';
      const boardCards = (ids) => {
        const list = ctx.sessions.list.getSnapshot();
        const groups = ctx.workspaces.list.getSnapshot().items ?? [];
        const current = currentSessionId();
        return ids.map((id) => {
          const row = list.byId[id];
          const group = groups.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(id));
          const path = group?.path ?? row?.cwd ?? '';
          return {
            id,
            title: row?.title?.trim() || t('boardUntitled'),
            workspace: group?.title?.trim() || baseName(path) || t('boardNoWorkspace'),
            current: id === current,
          };
        });
      };
      const publishBoard = () => {
        board.snapshot = board.mode === null
          ? { mode: null, index: 0, cards: [], hint: board.hint }
          : { mode: board.mode, index: board.index, cards: boardCards(board.ids), hint: board.hint };
        for (const listener of [...board.listeners]) listener();
      };
      const boardHint = (message) => {
        board.hint = message;
        publishBoard();
        // The vm-based tests have no timers; a lingering hint is harmless there.
        if (typeof setTimeout !== 'function') return;
        if (board.hintTimer !== null) clearTimeout(board.hintTimer);
        board.hintTimer = setTimeout(() => {
          board.hintTimer = null;
          board.hint = '';
          publishBoard();
        }, 2200);
      };
      const boardCandidates = () => {
        syncRecent();
        const current = currentSessionId();
        const visible = new Set(visibleSessionIds());
        if (!current || !visible.has(current)) return [];
        const merged = [current, ...recentIds];
        return merged.filter((id, index) => merged.indexOf(id) === index && visible.has(id) &&
          (id === current || !boardRemovedIds.has(id)));
      };
      const moveBoard = (delta) => {
        if (board.mode === null) return;
        // The ring covers every card, including the conversation the user is in
        // right now, so a long enough run brings them back like Alt+Tab does.
        const total = board.ids.length;
        if (total < 2) return;
        board.index = ((board.index + delta) % total + total) % total;
        publishBoard();
      };
      const commitBoard = () => {
        if (board.mode === null) return;
        const target = board.ids[board.index] ?? null;
        closeBoard(false);
        if (!target || target === currentSessionId()) return;
        if (!openVisibleSession(target)) boardHint(t('boardGone'));
      };
      const closeBoard = (restoreFocus) => {
        if (board.mode === null) return;
        board.mode = null;
        board.ids = [];
        board.index = 0;
        if (board.detach) board.detach();
        board.detach = null;
        stopBoardCapture();
        publishBoard();
        const previous = board.previousFocus;
        board.previousFocus = null;
        if (!restoreFocus || previous === null || previous?.isConnected === false) return;
        if (typeof previous.focus !== 'function') return;
        try { previous.focus(); }
        catch (error) { console.error('kana-desktop-shortcuts: board focus restore failed', error); }
      };
      const removeBoardTarget = (id) => {
        if (board.mode === null || typeof id !== 'string') return;
        // The current conversation anchors the board: it is the first card and
        // never joins the ring, so it cannot be dropped from this interaction.
        if (id === currentSessionId()) return;
        const at = board.ids.indexOf(id);
        if (at === -1) return;
        boardRemovedIds.add(id);
        const ids = board.ids.filter((other) => other !== id);
        if (ids.length < 2) {
          board.ids = ids;
          board.index = 0;
          closeBoard(false);
          boardHint(t('boardNone'));
          return;
        }
        let index = at < board.index ? board.index - 1 : board.index;
        board.ids = ids;
        board.index = Math.min(Math.max(index, 0), ids.length - 1);
        publishBoard();
      };
      // The base combination is read back from the shortcut catalog so the board
      // never hard-codes a key the user may have re-recorded.
      const boardBaseBinding = () => {
        try {
          return ctx.shortcuts.catalog.getSnapshot()
            .find((row) => row.id === boardIds[0])?.binding ?? null;
        } catch (error) {
          console.error('kana-desktop-shortcuts: board binding read failed', error);
          return null;
        }
      };
      // While the board is open the window must stop treating keys as menu
      // mnemonics. Otherwise Windows keeps the Alt release inside the menu bar,
      // the document never sees it, and "release to commit" cannot be honoured.
      // The switch is asynchronous, so a fast tap can outrun it; `active` only
      // becomes true once the bridge confirms, and the tap path below covers the
      // window where the release would still be swallowed.
      const startBoardCapture = () => {
        const service = ctx.shortcuts;
        if (typeof service?.recording !== 'function') return;
        board.capturePending = true;
        Promise.resolve(service.recording(true)).then(() => {
          // Closed while the request was in flight: stopBoardCapture has already
          // queued the matching release, so nothing else to do here.
          if (!board.capturePending) return;
          board.capturePending = false;
          board.captureActive = true;
        }).catch((error) => {
          board.capturePending = false;
          console.error('kana-desktop-shortcuts: board keyboard capture failed', error);
        });
      };
      const stopBoardCapture = () => {
        if (!board.captureActive && !board.capturePending) return;
        board.capturePending = false;
        board.captureActive = false;
        Promise.resolve(ctx.shortcuts?.recording?.(false)).catch((error) =>
          console.error('kana-desktop-shortcuts: board keyboard release failed', error));
      };
      // With the capture held the native dispatcher stays silent, so the board
      // moves itself: the recorded base key steps forward and Shift reverses it.
      const boardMoves = (event) => {
        if (!board.captureActive) return false;
        const binding = boardBaseBinding();
        if (!binding || binding.secondCode || event.code !== binding.code) return false;
        const modifiers = binding.modifiers ?? [];
        if (modifiers.length !== 1 || modifiers[0] !== 'alt') return false;
        if (event.ctrlKey || event.metaKey || !event.altKey) return false;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) moveBoard(event.shiftKey ? -1 : 1);
        return true;
      };
      const boardKeyDown = (event) => {
        if (board.mode === null) return;
        if (event.isComposing || event.getModifierState?.('AltGraph')) return;
        const altKey = event.code === 'AltLeft' || event.code === 'AltRight';
        if (boardMoves(event)) return;
        // Losing the modifier without the matching keyup means the release may
        // never arrive; cancelling is the only outcome that cannot misfire.
        if (board.mode === 'transient' && !altKey && !event.altKey) {
          closeBoard(true);
          return;
        }
        if (event.code === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          closeBoard(true);
          return;
        }
        if (event.code === 'Delete') {
          if (event.ctrlKey || event.metaKey || event.repeat) return;
          event.preventDefault();
          event.stopPropagation();
          removeBoardTarget(board.ids[board.index]);
          return;
        }
        if (board.mode !== 'pinned') return;
        if (event.code === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          commitBoard();
          return;
        }
        if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          moveBoard(event.code === 'ArrowRight' ? 1 : -1);
        }
      };
      const boardKeyUp = (event) => {
        if (board.mode !== 'transient') return;
        // A fast tap (Alt+Q released at once) can outrun the asynchronous
        // keyboard capture, and then the menu bar swallows the Alt release and
        // the board would hang open. The base key's own release is the signal we
        // do get in that window, so it commits exactly like Alt+Tab does.
        if (!board.captureActive) {
          const binding = boardBaseBinding();
          if (binding !== null && !binding.secondCode && event.code === binding.code) {
            event.preventDefault();
            commitBoard();
            return;
          }
        }
        if (event.code !== 'AltLeft' && event.code !== 'AltRight' && event.key !== 'Alt') return;
        commitBoard();
      };
      const boardBlur = () => { closeBoard(false); };
      const attachBoardInput = () => {
        if (board.detach) return;
        window.addEventListener('keydown', boardKeyDown, true);
        window.addEventListener('keyup', boardKeyUp, true);
        window.addEventListener('blur', boardBlur);
        board.detach = () => {
          window.removeEventListener('keydown', boardKeyDown, true);
          window.removeEventListener('keyup', boardKeyUp, true);
          window.removeEventListener('blur', boardBlur);
          board.detach = null;
        };
      };
      const openBoard = (mode) => {
        if (!switcherReady() || !pageReady() || !document.hasFocus()) {
          return false;
        }
        if (board.mode !== null) return true;
        syncRecent();
        const ids = boardCandidates();
        if (ids.length < 2) {
          boardHint(t('boardNone'));
          return false;
        }
        // The tap finished before this document heard about the press: the keys
        // are already up, so switching now is the only honest reading of it.
        // Opening a board here would leave nobody able to close it.
        if (mode === 'transient' && tapAlreadyReleased()) {
          const target = ids[1] ?? null;
          if (target !== null && target !== currentSessionId() && !openVisibleSession(target)) {
            boardHint(t('boardGone'));
          }
          return true;
        }
        board.mode = mode;
        board.ids = ids;
        board.index = 1;
        board.previousFocus = document.activeElement ?? null;
        attachBoardInput();
        startBoardCapture();
        publishBoard();
        return true;
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
          if (epoch !== focusEpoch || !pageReady() || !document.hasFocus() || currentSessionId() !== sessionId) return;
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
      // A trigger forwarded from an embedded frame reports its source; the
      // release of Alt never reaches this document in that case.
      const boardFocusOk = (context) => context?.source !== 'iframe' && context?.source !== 'webview';
      const commands = [
        { id: ids[0], key: 'devtools', nativeOnly: true,
          run: () => {
            let action;
            try {
              if (desktopReady()) action = globalThis.dshDesktopActions.invoke('developer');
              else if (nextDeveloperReady()) action = globalThis.desktopNext.command({ type: 'devtools' });
            } catch (error) {
              console.error('kana-desktop-shortcuts: developer action failed', error);
              return;
            }
            return Promise.resolve(action).catch((error) =>
              console.error('kana-desktop-shortcuts: developer action failed', error));
          } },
        { id: ids[1], key: 'conversation', run: () => ctx.layout.selectPanel(null) },
        { id: ids[2], key: 'focus', run: focusCurrentComposer,
          available: () => Boolean(currentSession()) && Boolean(ctx.get('conversation')) },
        { id: ids[3], key: 'content', run: focusCurrentContent,
          regions: ['page', 'editable'], available: () => Boolean(currentSession()) },
        { id: ids[4], key: 'recent', run: cycleRecentSession, regions: ['page', 'editable'],
          available: () => visibleSessionIds().length > 1 && Boolean(currentSession()) },
        { id: ids[5], key: 'previous', run: openPreviousSession, regions: ['page', 'editable'],
          available: () => { syncRecent(); return recentIds.some((id) => id !== currentSessionId()); } },
        ...Array.from({ length: 9 }, (_, index) => {
          const digit = index + 1;
          return { id: `kana.shortcuts.panel.digit${digit}`, key: 'panelAction', digit,
            label: () => t('panelAction', { digit }), regions: ['page', 'editable'],
            run: () => { const panel = panelForDigit(digit); if (panel) ctx.layout.selectPanel(panel.id); },
            available: () => Boolean(panelForDigit(digit)) };
        }),
        // The board records one base combination and derives the other two, so
        // the three rows stay out of the ordinary shortcut list (`board: true`).
        { id: boardIds[0], key: 'board', board: true, regions: ['page', 'editable', 'terminal'],
          resolve: (context) => {
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null) {
              return { status: 'blocked', reason: 'board-unavailable' };
            }
            // An embedded frame cannot observe the Alt release; refuse rather
            // than open a board that could not commit or cancel safely.
            if (board.mode === null && !boardFocusOk(context)) {
              boardHint(t('boardFocus'));
              return { status: 'handled', run: () => {} };
            }
            return { status: 'handled', run: () => {
              if (board.mode === null) openBoard('transient');
              else moveBoard(1);
            } };
          } },
        { id: boardIds[1], key: 'boardBack', board: true, regions: ['page', 'editable', 'terminal'],
          resolve: (context) => {
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null ||
                board.mode === null) return { status: 'blocked', reason: 'board-closed' };
            return { status: 'handled', run: () => moveBoard(-1) };
          } },
        { id: boardIds[2], key: 'boardPin', board: true, regions: ['page', 'editable', 'terminal'],
          resolve: (context) => {
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null) {
              return { status: 'blocked', reason: 'board-unavailable' };
            }
            if (board.mode === null && !boardFocusOk(context)) {
              boardHint(t('boardFocus'));
              return { status: 'handled', run: () => {} };
            }
            return { status: 'handled', run: () => {
              if (board.mode === null) openBoard('pinned');
              // Pinning an open transient board keeps the highlight; pressing
              // the combination again cancels and never commits implicitly.
              else if (board.mode === 'transient') { board.mode = 'pinned'; publishBoard(); }
              else closeBoard(true);
            } };
          } },
      ];
      const enabledCommands = () => commands.filter((command) =>
        (!command.nativeOnly || devtoolsReady()) && (!command.board || switcherReady()));
      const commandLabel = (command) => command.label?.() ?? t(command.key);
      // Lexical handles Ctrl+Shift+Z (redo) before the shortcuts service's
      // window-bubble listener. Route only our explicitly assigned new actions
      // in the editable capture phase; leave every other key to its owner.
      ctx.effect(() => {
        const onEditableKey = (event) => {
          if (!desktopReady() || ctx.shortcuts.runtime !== 'web' || !document.hasFocus() ||
              event.defaultPrevented || event.repeat ||
              event.isComposing || event.getModifierState?.('AltGraph') ||
              document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"]') ||
              !event.target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
          if (ctx.shortcuts.config.getSnapshot().status !== 'ready') return;
          const modifiers = [
            event.ctrlKey && 'control', event.altKey && 'alt', event.shiftKey && 'shift', event.metaKey && 'meta',
          ].filter(Boolean);
          for (const command of commands.slice(3)) {
            // Board keys are native-desktop only and never recorded on web.
            if (command.board) continue;
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
      const commandResolve = (command) => command.resolve ?? (({ modal }) => (
        !pageReady() || (command.nativeOnly && !devtoolsReady()) || !document.hasFocus() ||
        modal !== null || (command.available && !command.available())
          ? { status: 'blocked', reason: 'focus-modal-or-session' }
          : { status: 'handled', run: command.run }
      ));
      const registerCommands = () => {
        const disposers = [];
        try {
          for (const command of enabledCommands()) disposers.push(ctx.shortcuts.register({
            id: command.id, label: () => commandLabel(command), aliases: [command.id, commandLabel(command)],
            defaults: {}, regions: command.regions ?? ['page'], modals: [],
            resolve: commandResolve(command),
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
          if (input.type !== 'keydown' || !fixedPanelAvailable() || !document.hasFocus()) return;
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
        // The board records one combination and derives the other two, so its
        // state stays separate from the single-action rows above.
        const [boardRecording, setBoardRecording] = React.useState(false);
        const [boardRecordReady, setBoardRecordReady] = React.useState(false);
        const [boardBusy, setBoardBusy] = React.useState(false);
        const [boardMessage, setBoardMessage] = React.useState('');
        const boardRecorder = React.useRef(null);
        const valid = pageReady();
        const available = valid && config.status === 'ready' && !busy;
        const visible = enabledCommands().filter((command) => !command.board);
        const rows = visible.map((command) => ({ ...command, row: catalog.find((row) => row.id === command.id) }));
        const selectedCommand = visible.some((command) => command.id === selected) ? selected : visible[0]?.id;
        const recordingHint = () => t(ctx.shortcuts.platform === 'macos' ? 'recordingMac' :
          ctx.shortcuts.platform === 'linux' ? 'recordingLinux' : 'recordingWindows');
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
          if (!pageReady() || config.status !== 'ready' || busy) return;
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
        const boardBaseRow = catalog.find((row) => row.id === boardIds[0]);
        const boardBindingText = () => boardBaseRow?.keys?.length ? boardBaseRow.keys.join('') : t('empty');
        // The three derived combinations are saved together: either all of them
        // are free and get written, or nothing changes at all.
        const saveBoardBinding = async (candidate) => {
          if (!switcherReady() || config.status !== 'ready' || busy || boardBusy) return;
          const modifiers = [['alt'], ['alt', 'shift'], ['control', 'alt']];
          const targets = boardIds.map((id, index) => ({
            id,
            binding: candidate === null ? null : { code: candidate.code, modifiers: modifiers[index] },
          }));
          setBoardBusy(true);
          try {
            for (const target of targets) {
              if (target.binding === null) continue;
              const description = ctx.shortcuts.describeBinding(target.binding);
              const conflicts = description.conflicts.filter((id) => !boardIds.includes(id));
              if (description.issue !== null || conflicts.length > 0) {
                setBoardMessage(description.issue !== null ? t('invalidBinding')
                  : t('conflict', { commands: conflicts.map(labelFor).join(', ') }));
                return;
              }
            }
            const previous = targets.map((target) => ({
              id: target.id,
              binding: catalog.find((row) => row.id === target.id)?.binding ?? null,
            }));
            let revision = config.revision;
            const applied = [];
            for (const target of targets) {
              const result = await ctx.shortcuts.edit(target.binding === null
                ? { type: 'reset', id: target.id }
                : { type: 'set', id: target.id, binding: target.binding }, revision);
              if (result.status !== 'saved') {
                for (const done of applied.reverse()) {
                  const before = previous.find((entry) => entry.id === done.id);
                  try {
                    const restore = await ctx.shortcuts.edit(before.binding === null
                      ? { type: 'reset', id: done.id }
                      : { type: 'set', id: done.id, binding: before.binding }, revision);
                    if (restore?.snapshot?.revision) revision = restore.snapshot.revision;
                  } catch (error) {
                    console.error('kana-desktop-shortcuts: board rollback failed', error);
                  }
                }
                setBoardMessage(failureText(result));
                return;
              }
              revision = result.snapshot?.revision ?? revision;
              applied.push(target);
            }
            setBoardMessage(t(candidate === null ? 'cleared' : 'saved'));
          } catch (error) {
            console.error('kana-desktop-shortcuts: board binding save failed', error);
            setBoardMessage(t('failed'));
          } finally {
            setBoardBusy(false);
          }
        };
        React.useEffect(() => {
          if (recordingId === null) return undefined;
          let disposed = false;
          let pending = null;
          setRecordReady(false);
          const down = (event) => {
            if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) { setMessage(t('cancelled')); setRecordingId(null); }
              return;
            }
            if (document.activeElement !== recorder.current || event.isComposing || event.getModifierState?.('AltGraph')) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.repeat) return;
            if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(event.code)) return;
            const platform = ctx.shortcuts.platform;
            const codeAllowed = platform === 'linux'
              ? /^(Slash|Comma|Period)$/.test(event.code)
              : /^(Key[A-Z]|Digit[0-9]|Slash|Comma|Period)$/.test(event.code);
            const primary = platform === 'macos' ? event.metaKey && !event.ctrlKey
              : event.ctrlKey && !event.metaKey;
            const modifiersAllowed = platform === 'linux' ? !event.altKey : event.altKey || event.shiftKey;
            if (!codeAllowed || !primary || !modifiersAllowed) {
              pending = null;
              setMessage(t('invalid'));
              return;
            }
            pending = { code: event.code, modifiers: [
              ...(event.ctrlKey ? ['control'] : []), ...(event.altKey ? ['alt'] : []),
              ...(event.shiftKey ? ['shift'] : []), ...(event.metaKey ? ['meta'] : []),
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
        // Alt-only recorder for the board. The ordinary recorder requires a
        // primary modifier, so it can never capture the base combination.
        React.useEffect(() => {
          if (!boardRecording) return undefined;
          let disposed = false;
          let pending = null;
          setBoardRecordReady(false);
          const down = (event) => {
            if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) { setBoardMessage(t('cancelled')); setBoardRecording(false); }
              return;
            }
            if (document.activeElement !== boardRecorder.current ||
                event.isComposing || event.getModifierState?.('AltGraph')) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.repeat) return;
            if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(event.code)) return;
            const codeAllowed = /^(Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2])|Slash|Comma|Period|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Backslash)$/.test(event.code);
            const altOnly = event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
            if (!codeAllowed || !altOnly) {
              pending = null;
              setBoardMessage(t('boardInvalid'));
              return;
            }
            pending = { code: event.code, modifiers: ['alt'] };
          };
          const up = (event) => {
            if (document.activeElement !== boardRecorder.current) return;
            event.preventDefault();
            event.stopPropagation();
            if (pending === null || pending.code !== event.code) return;
            const candidate = pending;
            pending = null;
            setBoardRecording(false);
            void saveBoardBinding(candidate);
          };
          Promise.resolve(ctx.shortcuts.recording(true)).then(() => {
            if (disposed) { void ctx.shortcuts.recording(false).catch(() => {}); return; }
            document.addEventListener('keydown', down, true);
            document.addEventListener('keyup', up, true);
            setBoardRecordReady(true);
          }, (error) => {
            if (disposed) return;
            console.error('kana-desktop-shortcuts: board recorder unavailable', error);
            setBoardMessage(t('failed'));
            setBoardRecording(false);
          });
          return () => {
            disposed = true;
            document.removeEventListener('keydown', down, true);
            document.removeEventListener('keyup', up, true);
            void ctx.shortcuts.recording(false).catch(() => {});
          };
        }, [boardRecording]);
        React.useEffect(() => {
          if (boardRecording && boardRecordReady) boardRecorder.current?.focus();
        }, [boardRecording, boardRecordReady]);
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
        !devtoolsReady() && React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } }, t('noDevtools')),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 } },
          React.createElement('label', { htmlFor: 'kana-shortcut-action' }, t('choose')),
          React.createElement('select', { id: 'kana-shortcut-action', value: selectedCommand,
            onChange: (event) => setSelected(event.target.value), disabled: recordingId !== null,
            style: { font: 'inherit', color: colors.text, background: colors.surface,
              border: `1px solid ${colors.border}`, borderRadius: 8, padding: '7px 12px' },
          }, visible.map((command) => React.createElement('option', { key: command.id, value: command.id }, commandLabel(command)))),
          React.createElement('button', {
            ref: recorder, type: 'button',
            'aria-label': recordingId === null ? t('record') : recordingHint(),
            onClick: () => {
              if (recordingId !== null) { setRecordingId(null); return; }
              if (!available) return;
              setMessage('');
              setRecordReady(false);
              setRecordingId(selectedCommand);
            },
            disabled: recordingId === null && !available,
            style: { font: 'inherit', color: recordingId === null ? colors.text : colors.accent,
              background: colors.surface, border: `1px solid ${recordingId === null ? colors.border : colors.accent}`,
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer' },
          }, recordingId === null ? t('record') : recordReady ? recordingHint() : t('preparing'))),
        config.status !== 'ready' && React.createElement('p', { role: 'alert' },
          t(config.status === 'unreadable' ? 'unreadable' : 'notReady')),
        React.createElement('div', null, rows.map(({ id, key, label, row }) => React.createElement('div', {
          key: id, style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            borderTop: `1px solid ${colors.border}`, padding: '14px 0' },
        }, React.createElement('span', { style: { minWidth: 150 } }, label?.() ?? t(key)),
        React.createElement('kbd', { style: { flex: 1, color: colors.secondary } }, row?.keys?.length ? row.keys.join(' ') : t('empty')),
        button(t('clear'), () => void save({ type: 'set', id, binding: null }), !available || recordingId !== null || !row?.binding),
        button(t('reset'), () => void save({ type: 'reset', id }), !available || recordingId !== null || !row?.modified)))),
        React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } }, t('sessionHelp')),
        React.createElement('h3', { style: { margin: '24px 0 8px', fontSize: 16 } }, t('panelKeys')),
        React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } },
          t(fixedPanelAvailable() ? 'panelHelpDesktop' : 'panelHelpOfficial')),
        panels.length === 0 ? React.createElement('p', null, t('panelNone')) :
          React.createElement('ul', { style: { paddingLeft: 20, lineHeight: 1.9 } },
            panels.slice(0, 8).map((panel, index) => React.createElement('li', { key: panel.id },
              `${fixedPanelAvailable() ? `Ctrl + ${index + 1}` : `${index + 1}`} — ${panel.label}`,
              fixedPanelAvailable() && occupied(`Digit${index + 1}`) ? ` (${t('panelTaken')})` : '')),
            panels.length > 1 && React.createElement('li', { key: 'last' },
              `${fixedPanelAvailable() ? 'Ctrl + 9' : '9'} — ${panels.at(-1).label}`,
              fixedPanelAvailable() && occupied('Digit9') ? ` (${t('panelTaken')})` : '')),
        switcherReady() && React.createElement('div', { 'data-kana-board-settings': '' },
          React.createElement('h3', { style: { margin: '24px 0 8px', fontSize: 16 } }, t('boardSection')),
          React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } }, t('boardHelp')),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap',
            gap: 12, padding: '14px 0', borderTop: `1px solid ${colors.border}` } },
          React.createElement('span', { style: { minWidth: 150 } }, t('board')),
          React.createElement('kbd', { style: { flex: 1, color: colors.secondary } }, boardBindingText()),
          React.createElement('button', {
            ref: boardRecorder, type: 'button',
            'aria-label': boardRecording ? t('boardRecording') : t('boardRecord'),
            onClick: () => {
              if (boardRecording) { setBoardRecording(false); setBoardMessage(t('cancelled')); return; }
              if (!available || boardBusy) return;
              setBoardMessage('');
              setBoardRecordReady(false);
              setBoardRecording(true);
            },
            disabled: !boardRecording && (!available || boardBusy),
            style: { font: 'inherit', color: boardRecording ? colors.accent : colors.text,
              background: colors.surface, border: `1px solid ${boardRecording ? colors.accent : colors.border}`,
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer' },
          }, boardRecording ? boardRecordReady ? t('boardRecording') : t('preparing') : t('boardRecord')),
          button(t('clear'), () => void saveBoardBinding(null),
            !available || boardRecording || boardBusy || !boardBaseRow?.binding)),
          boardMessage && React.createElement('p', { role: 'status', style: { color: colors.error } }, boardMessage)),
        message && React.createElement('p', { role: 'status', style: { color: colors.error } }, message));
      }

      // Rendered inside the shell overlay, so it covers this app window only.
      // Deliberately not a dialog: DSH reads an aria-modal element as a modal
      // and would block this plugin's own commands while the board is open.
      function SessionBoard() {
        const state = React.useSyncExternalStore(boardSubscribe, boardSnapshot);
        const root = React.useRef(null);
        const cardRefs = React.useRef([]);
        React.useEffect(() => {
          if (state.mode !== null) root.current?.focus?.();
        }, [state.mode]);
        // Keep the highlighted card visible without ever asking for the mouse:
        // rows scroll only once the panel has reached its maximum shape.
        React.useEffect(() => {
          if (state.mode === null) return;
          cardRefs.current[state.index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }, [state.mode, state.index]);
        const count = Math.max(state.cards.length, 1);
        const boardColumns = Math.min(count, boardMaxColumns);
        const rows = Math.ceil(count / boardColumns);
        const boardPanelHeight = (Math.min(rows, boardMaxRows) * (boardCardHeight + 12)) - 12 + 32;
        if (state.mode === null) {
          if (state.hint === '') return null;
          return React.createElement('div', {
            role: 'status', 'aria-live': 'polite', 'data-kana-session-board': 'hint',
            style: { position: 'absolute', left: '50%', bottom: 32, transform: 'translateX(-50%)',
              pointerEvents: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 13,
              color: colors.text, background: colors.surface, border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)' },
          }, state.hint);
        }
        return React.createElement('div', {
          'data-kana-session-board': state.mode, ref: root, tabIndex: -1,
          onClick: (event) => { if (event.target === event.currentTarget) closeBoard(true); },
          style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14, outline: 'none',
            background: 'rgb(0 0 0 / 0.28)' },
        },
        React.createElement('div', {
          role: 'listbox', 'aria-label': t('boardTitle'),
          // A rectangle that grows with the conversation count, like the Windows
          // switcher: one row while it fits, extra rows after that. It never
          // grows past its maximum shape; further cards scroll vertically, and
          // the highlight is scrolled into view so the keyboard alone suffices.
          style: { display: 'grid', gap: 12, padding: '16px 20px',
            gridTemplateColumns: `repeat(${boardColumns}, 190px)`,
            gridAutoRows: `${boardCardHeight}px`,
            alignContent: 'start',
            maxWidth: 'calc(100% - 48px)', maxHeight: boardPanelHeight,
            overflowY: rows > boardMaxRows ? 'auto' : 'hidden', overflowX: 'hidden',
            borderRadius: 16,
            background: colors.surface, border: `1px solid ${colors.border}`,
            boxShadow: '0 18px 48px rgb(0 0 0 / 0.35)' },
        }, state.cards.map((card, index) => React.createElement('div', {
          key: card.id, role: 'option', 'aria-selected': index === state.index,
          'aria-label': `${card.title} — ${card.workspace}`,
          ref: (node) => { cardRefs.current[index] = node; },
          onClick: () => { board.index = index; commitBoard(); },
          style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
            height: boardCardHeight, boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
            border: `2px solid ${index === state.index ? colors.accent : colors.border}`,
            background: 'var(--dsw-alias-bg-layer-1)' },
        },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, card.title),
        React.createElement('div', { style: { fontSize: 12, color: colors.secondary, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, card.workspace),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, marginTop: 4 } },
        card.current
          ? React.createElement('span', { style: { fontSize: 11, color: colors.accent } }, t('boardCurrent'))
          : React.createElement('span', null),
        card.current ? null : React.createElement('button', {
          type: 'button', 'aria-label': `${t('boardRemove')}: ${card.title}`,
          onClick: (event) => { event.stopPropagation(); removeBoardTarget(card.id); },
          style: { font: 'inherit', lineHeight: 1, padding: '2px 7px', borderRadius: 6, cursor: 'pointer',
            color: colors.secondary, background: 'transparent', border: `1px solid ${colors.border}` },
        }, '×'))))),
        React.createElement('p', { style: { margin: 0, fontSize: 12, color: colors.text } },
          t(state.mode === 'pinned' ? 'boardPinnedHint' : 'boardTransientHint')));
      }
      ctx.effect(() => {
        let disposeSlot;
        let disposeBoard;
        let disposeCommands;
        let registeredKind;
        // Record the base press and both releases for the whole session: the board
        // may be created after the tap already finished, and only the Alt release
        // is still delivered to the page in that window.
        const trackDown = (event) => {
          const binding = boardBaseBinding();
          if (binding === null || binding.secondCode || event.code !== binding.code) return;
          // No modifier check here: the window menu swallows the Alt press, so
          // this document sees the base key alone and reports `altKey: false`.
          keyWatch.lastBaseDownAt = Date.now();
        };
        const trackUp = (event) => {
          const binding = boardBaseBinding();
          if (binding !== null && !binding.secondCode && event.code === binding.code) {
            keyWatch.baseUpAt = Date.now();
            return;
          }
          if (event.code === 'AltLeft' || event.code === 'AltRight') {
            keyWatch.altUpAt = Date.now();
          }
        };
        window.addEventListener('keydown', trackDown, true);
        window.addEventListener('keyup', trackUp, true);
        const sync = () => {
          const active = pageReady();
          const kind = active ? (desktopReady() ? 'community-stable' : nextDeveloperReady() ? 'next' : 'official') : undefined;
          if (active && !disposeSlot) {
            disposeSlot = ctx.slots.inject('settings.section', () => ctx.slots.register({
              name: 'settings.section', id: 'kana-desktop-shortcuts', order: 22,
              label: () => t('title'),
            }, KeyboardSettings));
          } else if (!active && disposeSlot) {
            disposeSlot();
            disposeSlot = undefined;
          }
          // The board lives in the shell overlay so it only covers this app
          // window, and only where the Alt release is provably observable.
          if (switcherReady() && !disposeBoard) {
            disposeBoard = ctx.slots.inject('shell.overlay', () => ctx.slots.register({
              name: 'shell.overlay', id: 'kana.session-board',
            }, SessionBoard));
          } else if (!switcherReady() && disposeBoard) {
            closeBoard(false);
            disposeBoard();
            disposeBoard = undefined;
          }
          if (registeredKind !== kind) {
            disposeCommands?.();
            disposeCommands = kind === undefined ? undefined : registerCommands();
            registeredKind = kind;
          }
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-dsh-desktop-mode'], childList: true, subtree: true,
        });
        return () => { observer.disconnect(); disposeCommands?.(); disposeSlot?.(); closeBoard(false); disposeBoard?.();
          window.removeEventListener('keydown', trackDown, true); window.removeEventListener('keyup', trackUp, true); };
      }, 'kana shortcuts: DSH settings and commands');
    },
  }),
});
