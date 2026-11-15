// 桌面内容页快捷键，以及独立的 DSH 设置分区。
// 按键分发、冲突检查、录制暂停与持久化均由内置快捷键服务负责。
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
      // 一个由用户录制的基础组合键，以及由它派生的两个配套组合。
      const boardIds = [
        'kana.shortcuts.session-board', 'kana.shortcuts.session-board-back',
        'kana.shortcuts.session-board-pin',
      ];
      // 本次启动中被用户从轮切板候选中移除的会话。当前会话永远不会
      // 在这里被移除，而重新访问一个被移除的会话会把它放回来
      // （syncRecent 会在它成为当前会话后清除该条目）。
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
          panelHelpWeb: '在浏览器里 Ctrl+1～8 会被 Chrome/Edge 拿去切换标签页，页面收不到，所以这里改用 Ctrl+Alt+1～8 按左侧功能页顺序切换、Ctrl+Alt+9 打开最后一页。也可以用「切换到功能页」动作单独录制键位（浏览器需 Ctrl+Alt 或 Ctrl+Shift 形组合）。',
          noDevtools: '此动作只在有受控开发者工具桥的 Desktop 中显示；其他 Desktop 请用应用菜单。',
          panelTaken: '已被其他快捷键占用', panelNone: '暂无可切换的功能页',
          sessionHelp: '会话速切可连按轮换：短时间内连续按键会经过更多会话；“上一个会话”在最近访问的两个会话间往返。需先至少访问两个会话。系统 Alt+Tab 不会被接管。',
          board: '会话轮切板', boardBack: '会话轮切板（反向）', boardPin: '会话轮切板（固定模式）',
          boardSection: '会话轮切板（DSH NEXT / Windows / 浏览器）',
          boardHelp: '录一次 Alt + 普通键（例如 Alt+Q）。插件据此派生 Shift+Alt+Q 反向移动与 Ctrl+Alt+Q 固定模式；三者任一被占用就不保存，原键位保持不变。按住 Alt 连按基础键移动高亮，松开 Alt 才切换；Esc 取消。',
          boardHelpWeb: '浏览器里默认直接按 Alt+Q 就能开板，不必先录制。想换字母时录一次 Alt + 普通键：DSH 的 Web 运行时只肯保存 Ctrl+Alt 那一条，插件会从它推导出纯 Alt 手势。按住 Alt 连按 Q 会一直往前走、加 Shift 往回走，松开 Alt 才真正切换；固定板只在板子关着时用 Ctrl+Shift+Alt+Q 打开，打开后 Q 直接前进、Shift+Q 后退；Firefox 会把单独的 Alt 交给菜单，建议用 Chrome 或 Edge。',
          boardHelpOfficial: '官方桌面壳里轮切板无需录制：直接按住 Alt 点按 Q（按住 Shift 反向，板子关着时用 Ctrl+Shift+Alt+Q 打开固定板）。这里故意不提供录制——一旦在 DSH 的快捷键页录下纯 Alt 组合，原生的快捷键分发就会接管这次按键，内容页收不到按下和抬起，Alt+Q 反而整条失效；录过的请点「移除」清掉，立刻恢复。',
          boardNoRecord: '无需录制，直接按 Alt + 基础键',
          boardRecorded: '检测到已录制的轮切键：官方壳里录制会让原生分发接管按键，Alt+Q 会失效。点「移除」清掉即可恢复。',
          boardRecord: '＋ 录制轮切键',
          boardRecording: '请按住 Alt 再按一个普通键（如 Alt+Q）；再点按钮或 Esc 取消',
          boardInvalid: '轮切键必须只带 Alt：请按住 Alt，再按一个普通键。',
          boardTitle: '会话轮切板', boardCurrent: '当前',
          boardUntitled: '未命名会话', boardNoWorkspace: '未分组',
          boardRemove: '从本次候选移除',
          boardTransientHint: '按住 Alt 连按切换 · 松开 Alt 打开高亮会话 · Esc 取消 · Delete 移除',
          boardPinnedHint: 'Enter 或点击打开 · 基础键前进、Shift+基础键后退 · Esc 取消 · Delete 移除',
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
          panelHelpWeb: 'In a browser Chrome and Edge keep Ctrl+1–8 for their own tabs, so the page never sees them. Use Ctrl+Alt+1–8 to follow the left panel order and Ctrl+Alt+9 for the last panel, or record each panel with the "Open function panel" action (the Web runtime wants a Ctrl+Alt or Ctrl+Shift combination).',
          noDevtools: 'This action requires a supported Desktop developer bridge; use the application menu elsewhere.',
          panelTaken: 'Used by another shortcut', panelNone: 'No panels available',
          sessionHelp: 'Press the recent-conversation shortcut repeatedly to cycle within a short interval. Previous conversation toggles between the two most recently visited. Visit two conversations first. System Alt+Tab is unchanged.',
          board: 'Session board', boardBack: 'Session board (backwards)', boardPin: 'Session board (pinned)',
          boardSection: 'Session board (DSH NEXT / Windows / browser)',
          boardHelp: 'Record Alt + an ordinary key once (for example Alt+Q). Shift+Alt+Q moves backwards and Ctrl+Alt+Q pins the board; if any of the three is taken, nothing is saved. Hold Alt and tap the base key to move, release Alt to switch; Esc cancels.',
          boardHelpWeb: 'In a browser Alt+Q works out of the box; you do not have to record it. To pick another letter, record Alt + an ordinary key once: the Web runtime only accepts the Ctrl+Alt variant, and the plugin derives the bare Alt gesture from it. Tapping Q again while Alt is held keeps stepping and Shift steps back; the switch happens when Alt is released. Pin with Ctrl+Shift+Alt+Q while the board is closed, and a pinned board then steps with a bare Q and reverses with Shift+Q. Firefox hands a bare Alt to its menu, so Chrome or Edge is recommended.',
          boardHelpOfficial: 'On the official desktop shell the board needs no recording: hold Alt and tap Q (hold Shift to go backwards, Ctrl+Shift+Alt+Q opens a pinned board while it is closed). Recording is deliberately not offered here — once a bare Alt combination is recorded in DSH settings, the native dispatcher takes the key and the page never sees the press or the release, which breaks Alt+Q entirely. Clear it with Remove and it works again immediately.',
          boardNoRecord: 'No recording needed — just press Alt + the base key',
          boardRecorded: 'A board key is recorded: on this shell recording hands the keys to the native dispatcher and Alt+Q stops working. Click Remove to restore it.',
          boardRecord: '＋ Record board key',
          boardRecording: 'Hold Alt and press an ordinary key (for example Alt+Q); click again or Esc to cancel',
          boardInvalid: 'The board key must use Alt only: hold Alt and press an ordinary key.',
          boardTitle: 'Session board', boardCurrent: 'Current',
          boardUntitled: 'Untitled conversation', boardNoWorkspace: 'No workspace',
          boardRemove: 'Remove from this launch',
          boardTransientHint: 'Hold Alt and tap to move · release Alt to open · Esc cancels · Delete removes',
          boardPinnedHint: 'Enter or click to open · base key steps, Shift reverses · Esc cancels · Delete removes',
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
        // 兼容模式沿用上游根路径，从不写入 body 上的模式标记。
        // 只有在 Electron 的预加载桥接存在时，才接受它的 URL 标记；
        // 普通浏览器无法冒充桌面内容页。
        return bridgeReady() && urlMode() === 'compatibility' ? 'compatibility' : undefined;
      };
      const desktopReady = () => bridgeReady() && desktopModes.includes(desktopMode());
      const nextDeveloperReady = () => officialReady() && typeof globalThis.desktopNext?.command === 'function';
      const devtoolsReady = () => desktopReady() || nextDeveloperReady();
      // 纯 DSH Web（浏览器直接连服务器）没有预加载桥接，所以上面每个
      // 仅限桌面的辅助判断都为 false。快捷键服务在这里仍会分发按键，
      // 而会话、输入框相关的动作是纯客户端状态，因此照常可用——
      // 只有需要桌面壳的能力（开发者工具、固定的功能页数字键、
      // 菜单快捷键捕获）保持关闭。判据取“桥接缺失”，而不是
      // “无法识别的桌面模式”：未知模式的桌面壳必须保持不生效，
      // 而不是悄悄退化成 Web 的行为。
      const webReady = () => !officialReady() && !bridgeReady() && typeof window !== 'undefined';
      const pageReady = () => officialReady() || desktopReady() || webReady();
      const fixedPanelAvailable = () => desktopReady() && ctx.shortcuts.platform === 'windows';
      const webPanelAvailable = () => webReady() && ctx.shortcuts.platform === 'windows';
      // 浏览器会把 Ctrl+数字 留给自己的标签页，所以 Web 版把同样的思路
      // 挪到多一个修饰键上，而不是假装那个组合能用。
      const panelPrefix = (digit) => webPanelAvailable()
        ? `Ctrl + Alt + ${digit}`
        : fixedPanelAvailable() ? `Ctrl + ${digit}` : `${digit}`;
      // 轮切板在 Alt 抬起时提交，而只有当桌面壳自己不再吞掉那次抬起时，
      // 这个时机才可观测：在 Windows 上窗口菜单会吃掉 Alt 的抬起。
      // 两种桌面壳都实现了同一对开关——客户端的 `shortcuts.recording`
      // 与主进程的 `setIgnoreMenuShortcuts`——并且都在相同的
      // `consumed === "press"` 条件下吞掉基础键的抬起
      // （已对照社区版 `lib/main.js` 核实），所以任一桌面壳
      // 都能承载轮切板。社区版桌面壳上报 `runtime: "web"`，
      // 因为它在 web 内容视图中渲染，这也是 runtime 不再
      // 参与此判断条件的原因。纯 Web 没有这样的桥接，
      // 因而保持旧动作不变。
      // 上面的桌面壳判断针对 Electron 内容视图：那里的窗口菜单会
      // 吃掉 Alt 抬起，除非由 `setIgnoreMenuShortcuts` 接管。
      // 普通浏览器没有这样的菜单：抬起信号会自行到达文档，
      // 所以即使缺少 `recording`，Web 也需要轮切板。
      // 官方桌面壳（`dsh-app://`）既不提供社区版那套桥接，也不一定
      // 暴露 NEXT 的桌面通道；可它的内容页同样是普通渲染进程，
      // 按键照常送达到文档。所以当两条原生通道都不在时，
      // 官方壳与纯 Web 一样，改由文档自己驱动轮切板手势。
      // 原生通道在场时绝不走这条路：那会把一次按下处理两遍。
      const documentGesture = () => !nextDeveloperReady() && !desktopReady() &&
        (webReady() || officialReady());
      const switcherReady = () => (
        (nextDeveloperReady() || desktopReady()) &&
          ctx.shortcuts.platform === 'windows' && typeof ctx.shortcuts.recording === 'function'
      ) || (documentGesture() && ctx.shortcuts.platform === 'windows');
      // 官方桌面壳里轮切板改由文档驱动，录制反而有害：只要在 DSH 的
      // 快捷键页录下纯 Alt 组合，原生的快捷键分发就会接管这次按键，
      // 内容页收不到按下与抬起，整条手势随之失效（实测：录制后
      // Alt+Q 不能开板，恢复默认后立刻又好）。所以设置页在这种
      // 环境里只展示「无需录制」，并把录制按钮藏起来。
      const boardWithoutRecording = () => documentGesture() && !webReady();

      // DSH 负责键盘分发、冲突检查和存储。保留原有动作 ID，
      // 这样各运行时已保存的偏好设置不受影响。
      // 官方 Desktop 与 DSH NEXT 使用原生适配器；社区版 Stable 2.0.18
      // 被识别为 web:windows，并使用自己的渲染进程存储分区。
      const currentSessionId = () => ctx.uiSession.adapter.current.getSnapshot().key;
      const currentSession = () => ctx.sessions.list.getSnapshot().byId[currentSessionId()];
      // 与侧边栏中普通可见的会话保持一致；绝不打开归档会话、
      // 子代理子会话、过期的本地回退项，或另一个尚未启动的空白草稿。
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
        // 重新访问被轮切板移除的会话会把它放回候选列表；
        // 仅仅重绘同一个页面则不会。
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
      // ── 会话轮切板 ─────────────────────────────────────────────────────
      // 仅限 NEXT Windows。原生桥接只转发 keydown、从不转发抬起，
      // 所以临时板只有在该文档仍能收到 Alt 抬起时才能提交：
      // 主进程放行修饰键的抬起，轮切板则让主框架保持焦点。
      // 来自内嵌框架的触发观测不到这次抬起；
      // 因此轮切板宁可拒绝打开，
      // 也不靠定时器去猜。
      // 切换器矩形的尺寸上限：每行五张卡片，
      // 屏幕上先显示三行，之后列表才开始纵向滚动。
      const boardMaxColumns = 5;
      const boardMaxRows = 3;
      const boardCardHeight = 92;
      const board = {
        mode: null, ids: [], index: 0, hint: '', hintTimer: null,
        snapshot: { mode: null, index: 0, cards: [], hint: '' },
        listeners: new Set(), detach: null, previousFocus: null,
        // 捕获状态：桥接确认请求期间为 `pending`，
        // 窗口菜单真正不再吞掉 Alt 抬起后为 `active`。
        capturePending: false, captureActive: false,
      };
      // 原生分发器通过一次 IPC 往返才到达该文档，
      // 因此一次快速点按可能在轮切板创建之前就已松开两个键。
      // 分发器会消费基础键自身的抬起，但 Alt 的抬起仍会到达页面，
      // 所以整轮会话都记录这两者，轮切板
      // 便能判断这次点按已经结束。
      const keyWatch = { baseUpAt: 0, altUpAt: 0, lastBaseDownAt: 0, altDownAt: 0 };
      // 浏览器可能永远不会送来 Alt 抬起（Windows 会把单独的 Alt 交给
      // 窗口菜单），所以轮切板也会在基础键松开后稍等片刻再提交。
      // 真正的抬起一到，该定时器就立即取消。
      let webCommitTimer = 0;
      // “点按”指在命令到达之前就已完成的一次按下与松开。
      // 两种桌面壳的上报方式不同：社区版在渲染进程内解析快捷键，
      // 因此该文档能看到整个手势；而 DSH NEXT 在主进程中解析，
      // 它会对匹配到的 keydown 调用 `preventDefault()`，然后
      // 经由 IPC 往返。在那里基础键的 keydown 根本到不了页面，
      // 这次已完成的点按只剩一个痕迹——Alt 抬起。对这条盲路径
      // 时间窗必须收得很紧：IPC 往返只有几毫秒，因此比时间窗
      // 更早的抬起意味着 Alt 仍被按住，轮切板必须真正打开。
      const tapAlreadyReleased = () => {
        const upAt = Math.max(keyWatch.baseUpAt, keyWatch.altUpAt);
        if (upAt === 0) return false;
        const known = keyWatch.lastBaseDownAt > 0;
        const window = known ? 500 : 300;
        if (Date.now() - upAt > window) return false;
        if (!known) return keyWatch.altUpAt === upAt;
        return upAt >= keyWatch.lastBaseDownAt;
      };
      // 手势可能在不该结束的时候结束：浏览器里窗口菜单会抢走 Alt，
      // 页面上只看得到基础键的抬起，于是每次点按都提交一次。
      // 若把每次按下都当成新手势，Alt+Q 就会在同一对会话之间
      // 来回跳——第二次按下总是又落在「最近的那个」上。
      // 所以这里留住上一次点按停下的位置，让紧随其后的按下
      // 继续往后走到第三、第四个会话，就像 Alt+Tab 那样。
      // 留住的只是「走到哪一步」，卡片顺序永远按使用情况重排。
      const tapRing = { ids: [], index: 0, at: 0, expected: null };
      const tapRingWindowMs = 2500;
      // 只有真的收不到 Alt 抬起的环境才需要跨点按延续；
      // 一旦观察到过 Alt 的抬起，就说明这个环境收得到，
      // 每次松手都是一次完整手势，必须重新从「最近的那个」开始。
      let altReleaseSeen = false;
      const resetTapRing = () => {
        tapRing.ids = [];
        tapRing.index = 0;
        tapRing.at = 0;
        tapRing.expected = null;
      };
      // 返回本次点按应当打开的会话；没有可切换的目标时返回 null。
      // 延续期间只过滤已经不可见的会话，不重排顺序——
      // 重排会让「下一步」跟着漂移。
      const tapRingStep = () => {
        const current = currentSessionId();
        if (!current) return null;
        const visible = new Set(visibleSessionIds());
        const now = Date.now();
        const alive = tapRing.ids.length > 1 && tapRing.expected === current &&
          now - tapRing.at <= tapRingWindowMs;
        if (alive) tapRing.ids = tapRing.ids.filter((id) => visible.has(id));
        else {
          syncRecent();
          const merged = [current, ...recentIds];
          tapRing.ids = merged.filter((id, index) => merged.indexOf(id) === index && visible.has(id));
        }
        if (tapRing.ids.length < 2) { resetTapRing(); return null; }
        const anchor = tapRing.ids.indexOf(current);
        if (anchor < 0) { resetTapRing(); return null; }
        // 始终从用户真实所在的位置开始步进，绝不使用过期的索引。
        tapRing.index = (anchor + 1) % tapRing.ids.length;
        if (tapRing.ids[tapRing.index] === current && tapRing.ids.length > 1) {
          tapRing.index = (tapRing.index + 1) % tapRing.ids.length;
        }
        tapRing.at = now;
        tapRing.expected = tapRing.ids[tapRing.index];
        return tapRing.expected;
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
        // 基于 vm 的测试没有定时器；残留的提示在那里无伤大雅。
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
        // 环覆盖所有卡片，包括用户当前所在的会话，
        // 所以走得足够远就会像 Alt+Tab 一样回到这里。
        const total = board.ids.length;
        if (total < 2) return;
        board.index = ((board.index + delta) % total + total) % total;
        publishBoard();
      };
      const commitBoard = (keepRing = false) => {
        if (board.mode === null) return;
        const target = board.ids[board.index] ?? null;
        // 正常的一次松手就是一次完整手势，位置必须清掉：
        // 下一次按下会从「最近的那个」重新开始，和 Alt+Tab 一样。
        // 只有环境压根收不到 Alt 抬起时才把位置交给下一次点按。
        if (keepRing && !altReleaseSeen && target !== null && board.ids.length > 1) {
          // 已经在环上走到的位置就原样保留：环的顺序是手势开始时
          // 定下的，用展示顺序覆盖它会让「下一步」跟着漂移。
          if (target !== tapRing.expected || tapRing.ids.length < 2) {
            tapRing.ids = [...board.ids];
            tapRing.index = board.index;
          }
          tapRing.expected = target;
          tapRing.at = Date.now();
        } else {
          resetTapRing();
        }
        closeBoard(false);
        if (!target || target === currentSessionId()) return;
        if (!openVisibleSession(target)) boardHint(t('boardGone'));
      };
      const closeBoard = (restoreFocus) => {
        if (board.mode === null) return;
        board.mode = null;
        // 打开轮切板的那次手势已经结束；下一次打开
        // 不得再把这次抬起当成新的点按。
        keyWatch.baseUpAt = 0;
        keyWatch.altUpAt = 0;
        keyWatch.lastBaseDownAt = 0;
        if (webCommitTimer !== 0 && typeof clearTimeout === 'function') {
          clearTimeout(webCommitTimer);
          webCommitTimer = 0;
        }
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
        // 当前会话是轮切板的锚点：它是第一张卡片，
        // 且从不加入环，因此不会在本次交互中被移除。
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
      // 仅桌面壳：当录制器或轮切板占用键盘时，请求窗口停止把按键
      // 解释为菜单助记键。纯 Web 没有这样的通道，
      // 也不需要。
      const captureKeyboard = () => {
        const service = ctx.shortcuts;
        return typeof service?.recording === 'function' ? service.recording(true) : undefined;
      };
      const releaseKeyboard = () => {
        const service = ctx.shortcuts;
        if (typeof service?.recording !== 'function') return;
        void Promise.resolve(service.recording(false)).catch(() => {});
      };
      const boardCodeLabel = (code) => String(code ?? '').replace(/^(Key|Digit)/u, '');
      // DSH 的 Web 运行时在自己的保存路径上会拒绝纯 Alt 绑定，
      // 所以浏览器永远无法保存轮切板的基础行。于是手势改为
      // 从该文档读取，只剩基础字母需要找回：
      // 它来自浏览器能够保存的那一行轮切板记录（Ctrl+Alt 变体），
      // 找不到时回退到 Q，也就是文档中为轮切板指定的字母。
      const webBoardCode = () => {
        try {
          const catalog = ctx.shortcuts.catalog.getSnapshot();
          const stored = boardIds.map((id) => catalog.find((row) => row.id === id)?.binding)
            .find((binding) => binding && !binding.secondCode);
          return stored?.code ?? 'KeyQ';
        } catch (error) {
          console.error('kana-desktop-shortcuts: board binding read failed', error);
          return 'KeyQ';
        }
      };
      // 基础组合从快捷键目录读回，这样轮切板
      // 永远不必硬编码用户可能重新录制过的按键。
      const boardBaseBinding = () => {
        try {
          // 在 Web 与官方桌面壳里这一行是“无法保存”而非“为空”，
          // 而若让它因此禁用手势，正是那里单独的 Alt+Q 毫无反应的原因：
          // 改为从已保存的字母推导出纯 Alt 绑定。
          if (documentGesture()) return { code: webBoardCode(), modifiers: ['alt'] };
          return ctx.shortcuts.catalog.getSnapshot()
            .find((row) => row.id === boardIds[0])?.binding ?? null;
        } catch (error) {
          console.error('kana-desktop-shortcuts: board binding read failed', error);
          return null;
        }
      };
      // 轮切板打开期间，窗口必须停止把按键当作菜单助记键。
      // 否则 Windows 会把 Alt 抬起留在菜单栏里，
      // 文档永远看不到它，“松开即提交”就无从兑现。
      // 这个切换是异步的，快速点按可能抢在它之前；
      // 只有桥接确认之后 `active` 才为真，
      // 而下面那条点按路径覆盖了抬起仍可能被吞掉的那段时间窗。
      const startBoardCapture = () => {
        const service = ctx.shortcuts;
        if (typeof service?.recording !== 'function') return;
        // 已预置的捕获本身就占着键盘；再请求一次会
        // 排入第二次释放，而关闭路径永远不会与之配对。
        if (board.captureActive || board.capturePending) return;
        board.capturePending = true;
        Promise.resolve(service.recording(true)).then(() => {
          // 请求尚在进行中就被关闭：stopBoardCapture 已经
          // 排入了对应的释放，所以这里无需再做别的。
          if (!board.capturePending) return;
          board.capturePending = false;
          board.captureActive = true;
        }).catch((error) => {
          board.capturePending = false;
          console.error('kana-desktop-shortcuts: board keyboard capture failed', error);
        });
      };
      const stopBoardCapture = () => {
        // 每次手势都从头重新预置：若让标志位保持置位，第二次
        // Alt 按下就会跳过预置，退回那只又会吞掉
        // 抬起事件的菜单。
        if (preArm.on) {
          preArm.on = false;
          if (preArm.timer !== 0 && typeof clearTimeout === 'function') clearTimeout(preArm.timer);
          preArm.timer = 0;
        }
        if (!board.captureActive && !board.capturePending) return;
        board.capturePending = false;
        board.captureActive = false;
        Promise.resolve(ctx.shortcuts?.recording?.(false)).catch((error) =>
          console.error('kana-desktop-shortcuts: board keyboard release failed', error));
      };
      // 按住 Alt 是轮切板唯一需要键盘的时刻。在 Windows 上，
      // 该文档还没看到随后的 Q，窗口就已经把这个键交给了自己的菜单，
      // 而阻止它的开关（`setIgnoreMenuShortcuts`）
      // 只能通过 `shortcuts.recording` 触达。所以插件在 Alt 按住的
      // 整个期间占用键盘：整个手势于是都到达这里，
      // 并有意绕过 DSH 自己的分发。按住期间其他 Alt
      // 绑定都被静音——这是让 Alt+Q 能工作的代价。
      const preArm = { on: false, timer: 0 };
      const preArmLimitMs = 2000;
      const releasePreArm = () => {
        if (preArm.timer !== 0) {
          if (typeof clearTimeout === 'function') clearTimeout(preArm.timer);
          preArm.timer = 0;
        }
        const was = preArm.on;
        preArm.on = false;
        if (!was) return;
        // 轮切板一旦打开就由它掌管捕获；只有一次始终没能
        // 变成轮切板的 Alt 按下，才需要在这里交还键盘。
        if (board.mode === null) stopBoardCapture();
      };
      const holdPreArm = (event) => {
        // 只有单独按下 Alt 才启动轮切板手势。当 Ctrl 或 Meta 已经
        // 按下时，用户是在用普通的 Ctrl+Alt 快捷键
        // （`Ctrl+Alt+D` 之类），这些必须继续流向 DSH。
        if (event?.ctrlKey || event?.metaKey) return;
        // 文档自己读取手势的运行时里没有窗口菜单可对抗，
        // 预置只会让同一次按下被处理两遍。
        if (documentGesture()) return;
        // 预置只为了对抗 Electron 窗口菜单。浏览器
        // 没有这样的菜单，会继续分发，所以在那里预置会把
        // 手势跑两遍——先经这条路径打开，然后再经
        // 普通分发步进一次。
        if (typeof ctx.shortcuts?.recording !== 'function') return;
        if (preArm.on || board.mode !== null || !switcherReady()) return;
        preArm.on = true;
        startBoardCapture();
        if (typeof setTimeout === 'function') preArm.timer = setTimeout(releasePreArm, preArmLimitMs);
      };
      // 捕获生效期间原生分发器保持沉默，所以轮切板
      // 自行移动：录制的基础键向前步进，Shift 则反向。
      const boardMoves = (event) => {
        if (!board.captureActive) return false;
        // 在 Web 和官方桌面壳里文档监听器已经读取了手势，
        // 若在这里再步进一次，一次点按就会移动两张卡片。
        if (documentGesture()) return false;
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
        // 修饰键在消失时却没有对应的抬起事件，意味着抬起可能
        // 永远不会到达；取消是唯一不会误触的结果。浏览器路径
        // 接受我们看到的那次 Alt 按下视为仍被按住，因为
        // Windows 可能在修饰键已被清除的情况下送来随后的按键。
        const altGesture = event.altKey || (documentGesture() && keyWatch.altDownAt !== 0
          && Date.now() - keyWatch.altDownAt <= 1500);
        if (board.mode === 'transient' && !altKey && !altGesture) {
          closeBoard(true);
          return;
        }
        if (event.code === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          resetTapRing();
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
        // 一次快速点按（Alt+Q 立刻松开）可能抢在异步的
        // 键盘捕获之前，随后菜单栏吞掉 Alt 抬起，
        // 轮切板就会一直挂在屏幕上。在那个时间窗里，基础键自身的
        // 抬起是我们确实能拿到的信号，所以它像 Alt+Tab 一样提交。
        // 只有桌面壳路径需要这个兜底：浏览器从不捕获，
        // 因此它的基础键抬起表示“再走一步”，而非“提交”。
        if (!board.captureActive && !documentGesture()) {
          const binding = boardBaseBinding();
          if (binding !== null && !binding.secondCode && event.code === binding.code) {
            event.preventDefault();
            commitBoard(true);
            return;
          }
        }
        if (documentGesture()) {
          const binding = boardBaseBinding();
          if (binding !== null && !binding.secondCode && event.code === binding.code) {
            // Alt 仍按着意味着这是一次点按的结束，而不是
            // 手势的结束：再点按一次 Q 会继续前进。修饰键的抬起会在
            // 下面提交。只有当抬起到达时修饰键已经
            // 消失（浏览器在按下时清掉了 altKey，因此不会再有
            // Alt 抬起），才需要由基础键自身的抬起提交。
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (webCommitTimer === 0 && typeof setTimeout === 'function') {
              webCommitTimer = setTimeout(() => {
                webCommitTimer = 0;
                commitBoard(true);
              }, 400);
            }
            return;
          }
        }
        // 浏览器可能用 Ctrl 顶替被系统抢走的 Alt，
        // 所以这两个修饰键中任意一个松开都会结束那里的手势。
        const altRelease = event.code === 'AltLeft' || event.code === 'AltRight' || event.key === 'Alt';
        const ctrlRelease = documentGesture()
          && (event.code === 'ControlLeft' || event.code === 'ControlRight' || event.key === 'Control');
        if (!altRelease && !ctrlRelease) return;
        // 从这里开始可以确认：这个环境收得到修饰键的抬起。
        altReleaseSeen = true;
        if (webCommitTimer !== 0 && typeof clearTimeout === 'function') {
          clearTimeout(webCommitTimer);
          webCommitTimer = 0;
        }
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
        // 该文档得知这次按下之前，点按就已结束：按键
        // 都已经抬起，此时直接切换是唯一诚实的解读。
        // 在此打开轮切板会没人能把它关掉。
        if (mode === 'transient' && tapAlreadyReleased()) {
          // 消费掉这次手势，避免第二次打开重放这次抬起。
          keyWatch.baseUpAt = 0;
          keyWatch.altUpAt = 0;
          keyWatch.lastBaseDownAt = 0;
          const target = (mode === 'transient' ? tapRingStep() : null) ?? ids[1] ?? null;
          if (target !== null && target !== currentSessionId() && !openVisibleSession(target)) {
            boardHint(t('boardGone'));
          }
          return true;
        }
        board.mode = mode;
        board.ids = ids;
        board.index = 1;
        // 紧接上一次的点按会沿着同一组卡片继续：
        // 否则每次按下都从“最近”重新开始，Alt+Q 无论点按多少次
        // 都只能在两个会话之间来回跳。
        if (mode === 'transient' && !altReleaseSeen && tapRing.ids.length > 1 &&
          tapRing.expected === currentSessionId() &&
          Date.now() - tapRing.at <= tapRingWindowMs) {
          const target = tapRingStep();
          // 卡片始终按「当前会话 + 最近使用」展示，续的只是位置：
          // 高亮必须落在继续走到的那个会话上，而不是旧顺序里的同一格。
          const at = target === null ? -1 : board.ids.indexOf(target);
          if (at > 0) board.index = at;
        }
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
      // 从内嵌框架转发来的触发会带上来源；那种情况下
      // Alt 的抬起永远不会到达该文档。
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
        // 轮切板只记录一个基础组合并派生另外两个，
        // 所以这三行不出现在普通快捷键列表里（`board: true`）。
        { id: boardIds[0], key: 'board', board: true, regions: ['page', 'editable', 'terminal'],
          resolve: (context) => {
            // 在 Web 上该文档已经用自己的 keydown 监听器打开了
            // 或步进了轮切板；若再让分发执行一次，
            // 一次按下会让高亮移动两次。
            if (documentGesture()) return { status: 'handled', run: () => {} };
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null) {
              return { status: 'blocked', reason: 'board-unavailable' };
            }
            // 内嵌框架观测不到 Alt 抬起；宁可直接拒绝，
            // 也不打开一个无法安全提交或取消的轮切板。
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
            if (documentGesture()) return { status: 'handled', run: () => {} };
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null ||
                board.mode === null) return { status: 'blocked', reason: 'board-closed' };
            return { status: 'handled', run: () => moveBoard(-1) };
          } },
        { id: boardIds[2], key: 'boardPin', board: true, regions: ['page', 'editable', 'terminal'],
          resolve: (context) => {
            if (documentGesture()) return { status: 'handled', run: () => {} };
            if (!switcherReady() || !pageReady() || !document.hasFocus() || context?.modal !== null) {
              return { status: 'blocked', reason: 'board-unavailable' };
            }
            if (board.mode === null && !boardFocusOk(context)) {
              boardHint(t('boardFocus'));
              return { status: 'handled', run: () => {} };
            }
            return { status: 'handled', run: () => {
              if (board.mode === null) openBoard('pinned');
              // 固定正在打开的临时板会保留高亮；再次按
              // 该组合键则取消，且绝不隐式提交。
              else if (board.mode === 'transient') { board.mode = 'pinned'; publishBoard(); }
              else closeBoard(true);
            } };
          } },
      ];
      const enabledCommands = () => commands.filter((command) =>
        (!command.nativeOnly || devtoolsReady()) && (!command.board || switcherReady()));
      const commandLabel = (command) => command.label?.() ?? t(command.key);
      // Lexical 会先于快捷键服务的窗口冒泡监听器处理
      // Ctrl+Shift+Z（重做）。只在可编辑区域的捕获阶段转发
      // 我们明确指派的新动作；其他所有按键都留给它原本的归属者。
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
            // 轮切板按键仅限原生桌面，在 Web 上从不录制。
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
          if (input.type !== 'keydown' || !document.hasFocus()) return;
          const { gesture, context } = input;
          if (!/^Digit[1-9]$/.test(gesture.code) || !gesture.control || gesture.shift || gesture.meta ||
              gesture.repeat || gesture.composing || gesture.defaultPrevented || context.modal !== null ||
              context.region === 'terminal' || occupied(gesture.code)) return;
          // 桌面壳读取单独的 Ctrl+数字。浏览器会把该组合
          // 留给自己的标签栏，所以 Web 版改用 Ctrl+Alt+数字，它
          // 能到达页面，同时也是 Web 运行时接受的
          // 组合之一。
          const web = webPanelAvailable();
          if (!fixedPanelAvailable() && !web) return;
          if (web ? !gesture.alt : gesture.alt) return;
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
        // 轮切板记录一个组合并派生另外两个，所以它的
        // 状态与上面那些单动作行分开存放。
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
        // 只要三行里任意一行还留着录制结果，就说明用户碰过录制按钮：
        // 在官方壳里这意味着手势正被原生的快捷键分发截走，
        // 而浏览器里它只是用户自己选的字母。
        const boardRecordedRow = boardIds.map((id) => catalog.find((row) => row.id === id))
          .find((row) => row?.binding);
        const boardBindingText = () => {
          if (webReady() || boardWithoutRecording()) return `Alt + ${boardCodeLabel(webBoardCode())}`;
          return boardBaseRow?.keys?.length ? boardBaseRow.keys.join('') : t('empty');
        };
        // 三个派生组合一起保存：要么三者都
        // 未被占用并写入，要么什么都不改。
        const saveBoardBinding = async (candidate) => {
          if (!switcherReady() || config.status !== 'ready' || busy || boardBusy) return;
          const modifiers = [['alt'], ['alt', 'shift'], ['control', 'alt']];
          // 浏览器只能持久化 Ctrl+Alt 变体：DSH 在 Web 运行时上
          // 拒绝纯 Alt 绑定，所以写三行会让整个保存失败，
          // 轮切板在那里变得不可用。那一行
          // 携带字母信息，纯 Alt 与 Shift+Alt 手势都在本地
          // 由它推导。
          const rows = webReady() ? [2] : [0, 1, 2];
          const targets = rows.map((index) => ({
            id: boardIds[index],
            binding: candidate === null ? null : { code: candidate.code, modifiers: modifiers[index] },
          }));
          setBoardBusy(true);
          try {
            for (const target of targets) {
              if (target.binding === null) continue;
              const description = ctx.shortcuts.describeBinding(target.binding);
              const conflicts = description.conflicts.filter((id) => !boardIds.includes(id));
              // DSH 在其 Web 运行时上拒绝纯 Alt 组合，因为浏览器
              // 可能把它们据为己有。对任意绑定来说这条限制是对的，
              // 但轮切板的 Alt 行正是本插件的全部意义所在，
              // 而且浏览器（不同于 Electron 窗口菜单）确实会
              // 送来单独的 Alt 抬起。其他所有问题仍照旧强制执行。
              const tolerated = webReady() && description.issue === 'unsupported-browser';
              if ((description.issue !== null && !tolerated) || conflicts.length > 0) {
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
          Promise.resolve(captureKeyboard()).then(() => {
            if (disposed) { void releaseKeyboard(); return; }
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
            void releaseKeyboard();
          };
        }, [recordingId]);
        React.useEffect(() => {
          if (recordingId !== null && recordReady) recorder.current?.focus();
        }, [recordingId, recordReady]);
        // 轮切板专用的纯 Alt 录制器。普通录制器要求
        // 一个主修饰键，因此永远无法捕获基础组合。
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
          Promise.resolve(captureKeyboard()).then(() => {
            if (disposed) { void releaseKeyboard(); return; }
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
            void releaseKeyboard();
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
          t(webPanelAvailable() ? 'panelHelpWeb' : fixedPanelAvailable() ? 'panelHelpDesktop' : 'panelHelpOfficial')),
        panels.length === 0 ? React.createElement('p', null, t('panelNone')) :
          React.createElement('ul', { style: { paddingLeft: 20, lineHeight: 1.9 } },
            panels.slice(0, 8).map((panel, index) => React.createElement('li', { key: panel.id },
              `${panelPrefix(index + 1)} — ${panel.label}`,
              fixedPanelAvailable() && occupied(`Digit${index + 1}`) ? ` (${t('panelTaken')})` : '')),
            panels.length > 1 && React.createElement('li', { key: 'last' },
              `${panelPrefix(9)} — ${panels.at(-1).label}`,
              fixedPanelAvailable() && occupied('Digit9') ? ` (${t('panelTaken')})` : '')),
        switcherReady() && React.createElement('div', { 'data-kana-board-settings': '' },
          React.createElement('h3', { style: { margin: '24px 0 8px', fontSize: 16 } }, t('boardSection')),
          React.createElement('p', { style: { color: colors.secondary, fontSize: 13 } },
            t(boardWithoutRecording() ? 'boardHelpOfficial' : webReady() ? 'boardHelpWeb' : 'boardHelp')),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap',
            gap: 12, padding: '14px 0', borderTop: `1px solid ${colors.border}` } },
          React.createElement('span', { style: { minWidth: 150 } }, t('board')),
          React.createElement('kbd', { style: { flex: 1, color: colors.secondary } }, boardBindingText()),
          // 官方壳里不提供录制：录了就会被原生分发接管，手势反而死掉。
          boardWithoutRecording()
            ? React.createElement('span', { style: { color: colors.secondary, fontSize: 13 } }, t('boardNoRecord'))
            : React.createElement('button', {
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
            !available || boardRecording || boardBusy || !boardRecordedRow)),
          boardMessage && React.createElement('p', { role: 'status', style: { color: colors.error } }, boardMessage)),
        // 录过就必须提示：这时 Alt+Q 是坏状态，点「移除」立刻恢复。
        boardWithoutRecording() && boardRecordedRow && React.createElement('p', {
          role: 'alert', style: { color: colors.error, fontSize: 13 } }, t('boardRecorded')),
        message && React.createElement('p', { role: 'status', style: { color: colors.error } }, message));
      }

      // 渲染在桌面壳浮层中，因此只覆盖本应用窗口。
      // 刻意不用对话框：DSH 会把 aria-modal 元素当作模态框，
      // 在轮切板打开期间会阻断本插件自己的命令。
      function SessionBoard() {
        const state = React.useSyncExternalStore(boardSubscribe, boardSnapshot);
        const root = React.useRef(null);
        const cardRefs = React.useRef([]);
        React.useEffect(() => {
          if (state.mode !== null) root.current?.focus?.();
        }, [state.mode]);
        // 让高亮卡片保持可见，且从不请求鼠标：
        // 只有当面板达到最大尺寸后行才会滚动。
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
          // 一个随会话数量增长、类似 Windows Alt+Tab 切换器的矩形：
          // 放得下时只有一行，之后增加行。它绝不会
          // 超过最大尺寸；更多卡片纵向滚动，
          // 高亮会被滚动到可见处，因此仅靠键盘就足够。
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
        // 整轮会话都记录基础键按下和两次抬起：轮切板
        // 可能在点按已经结束之后才创建，而在那个时间窗里
        // 只有 Alt 抬起仍会送达页面。
        const trackDown = (event) => {
          const binding = boardBaseBinding();
          if (event.code === 'AltLeft' || event.code === 'AltRight') {
            if (!event.repeat) {
              keyWatch.altDownAt = event.ctrlKey || event.metaKey ? 0 : Date.now();
              holdPreArm(event);
            }
            return;
          }
          if (binding === null || binding.secondCode || event.code !== binding.code) {
            // 任何其他按键都会结束这次按住：缩短静音的时间窗
            // 可以避免一个无关的 Alt 组合被整段吞掉。
            if (preArm.on) releasePreArm();
            return;
          }
          keyWatch.lastBaseDownAt = Date.now();
          // 预置占着键盘期间 DSH 分发保持沉默，所以
          // 轮切板只能从该文档打开。
          if (preArm.on && board.mode === null && event.altKey) {
            if (openBoard(event.ctrlKey ? 'pinned' : 'transient') && event.shiftKey && board.mode === 'transient') {
              moveBoard(-1);
            }
            return;
          }
          // 浏览器没有预置，也没有菜单要对抗，但 DSH 的 Web 运行时
          // 在自己的保存路径上拒绝纯 Alt 绑定，因此手势可能
          // 永远不会被分发到。同样改为从该文档驱动轮切板：
          // 按键仍是用户录制的那一组，只是读取早了一层。
          if (documentGesture() && switcherReady()) {
            // Windows 会把单独的 Alt 按下交给窗口菜单，所以随后
            // 的 Q 到达时 altKey 可能已被清除。我们确实看到的
            // 那次 Alt 按下因此也被接受为手势的开始。
            const recentAlt = keyWatch.altDownAt !== 0 && Date.now() - keyWatch.altDownAt <= 1500;
            // 固定板已经在等用户了：手势已经结束，
            // 不再需要任何修饰键，所以普通按键即可步进，
            // Shift 反向。在那里仍要求完整组合只会让
            // 固定板显得卡住（单独的 Alt 按下被浏览器菜单
            // 拿走，所以 Alt+Q 永远到不了）。
            if (board.mode === 'pinned') {
              if (event.repeat) return;
              moveBoard(event.shiftKey ? -1 : 1);
              return;
            }
            if (board.mode === null && event.altKey && event.ctrlKey && event.shiftKey) {
              // 固定是少见的情况：多一个修饰键能让它在
              // 浏览器里触达，又不占用普通手势。只有处于关闭
              // 状态的轮切板才可这样固定——对已打开的板，Shift 是反向键，
              // 所以 Ctrl+Shift+Alt+Q 必须后退，
              // 而不是把轮切板冻结在原地。
              openBoard('pinned');
            } else if (event.altKey || (recentAlt && !event.metaKey)) {
              // 按住 Alt 再次点按意味着“再走一步”，所以必须先
              // 丢弃上一次抬起留下的待提交操作。
              if (webCommitTimer !== 0 && typeof clearTimeout === 'function') {
                clearTimeout(webCommitTimer);
                webCommitTimer = 0;
              }
              if (board.mode === null) openBoard('transient');
              else moveBoard(event.shiftKey ? -1 : 1);
            }
          }
        };
        const trackUp = (event) => {
          const binding = boardBaseBinding();
          if (binding !== null && !binding.secondCode && event.code === binding.code) {
            keyWatch.baseUpAt = Date.now();
            return;
          }
          if (event.code === 'AltLeft' || event.code === 'AltRight') {
            keyWatch.altUpAt = Date.now();
            // 只点按了 Alt：立刻交还键盘，这样没有其他
            // Alt 绑定会因超时而持续静音。
            if (board.mode === null) releasePreArm();
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
          // 轮切板位于桌面壳浮层中，因此只覆盖本应用
          // 窗口，且只在 Alt 抬起可被可靠观测的地方出现。
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
