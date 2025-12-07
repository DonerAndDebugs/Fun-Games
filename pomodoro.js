(function() {
  const SETTINGS_KEY = 'pomo-settings-v1';
  const TASKS_KEY = 'pomo-tasks-v1';
  const COLOR_KEY = 'pomo-mode-colors-v1';
  const THEME_KEY = 'pomo-theme';
  const FOCUS_LOGS_KEY = 'pomo-focus-logs';
  const ACTIVE_USER_KEY = 'sucuk-auth-active-user';
  const DETAIL_MOCK = [
    { date: '5-Dec-2025', range: '15:40 ~ 15:53', project: 'No Project', minutes: 13 },
    { date: '5-Dec-2025', range: '13:32 ~ 14:29', project: 'No Project', minutes: 35 },
    { date: '5-Dec-2025', range: '09:17 ~ 11:53', project: 'No Project', minutes: 125 },
    { date: '4-Dec-2025', range: '18:57 ~ 19:19', project: 'No Project', minutes: 17 },
    { date: '4-Dec-2025', range: '15:46 ~ 16:51', project: 'No Project', minutes: 62 },
    { date: '4-Dec-2025', range: '14:04 ~ 14:35', project: 'No Project', minutes: 31 },
    { date: '4-Dec-2025', range: '12:42 ~ 12:59', project: 'No Project', minutes: 10 },
    { date: '4-Dec-2025', range: '11:52 ~ 12:12', project: 'No Project', minutes: 19 },
    { date: '3-Dec-2025', range: '14:28 ~ 14:45', project: 'No Project', minutes: 16 },
    { date: '3-Dec-2025', range: '10:05 ~ 12:56', project: 'No Project', minutes: 100 },
  ];
  const RANKING_MOCK = [
    { name: 'johny', time: '110:34', avatar: 'assets/creator.jpeg' },
    { name: 'ngockhanh nguyentran', time: '101:11', avatar: '' },
    { name: 'Tran Thien Tuan', time: '100:16', avatar: '' },
    { name: 'Melchizedek.', time: '99:54', avatar: '' },
    { name: 'Aisha Alme7', time: '98:37', avatar: '' },
    { name: 'Nguyễn Đức Dư Official', time: '97:22', avatar: '' },
    { name: 'i_am_therapysaurus', time: '92:01', avatar: '' },
    { name: 'Malak Zidi', time: '91:08', avatar: '' },
    { name: 'Paul Nyabaro', time: '89:58', avatar: '' },
    { name: 'Vanya doomra', time: '88:39', avatar: '' },
    { name: 'Subhan Abdulla Aamer', time: '87:23', avatar: '' },
  ];
  const DEFAULTS = {
    focus: 25,
    short: 5,
    long: 15,
    longInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    autoCheckTasks: false,
    checkToBottom: false,
    alarmSound: 'bell',
    alarmVolume: 50,
    alarmRepeat: 1,
    tickingSound: 'none',
    tickingVolume: 50,
    hourFormat: '24',
    darkWhenRunning: false,
    reminderType: 'last',
    reminderMinutes: 5,
  };
  const DEFAULT_COLORS = {
    focus: { main: '#1f2433', alt: '#0f121d' },
    short: { main: '#0f5447', alt: '#0b2c27' },
    long: { main: '#7c2f2f', alt: '#2f0f19' },
  };

  function readNumberInput(input, fallback, min, max) {
    const value = parseInt(input.value, 10);
    if (Number.isNaN(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (!stored) return { ...DEFAULTS };
      return { ...DEFAULTS, ...stored };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadTasks() {
    try {
      const stored = JSON.parse(localStorage.getItem(TASKS_KEY));
      if (!Array.isArray(stored)) return [];
      return stored;
    } catch (e) {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function loadFocusLogs() {
    try {
      const stored = JSON.parse(localStorage.getItem(FOCUS_LOGS_KEY));
      if (!Array.isArray(stored)) return [];
      return stored;
    } catch (e) {
      return [];
    }
  }

  function saveFocusLogs(logs) {
    localStorage.setItem(FOCUS_LOGS_KEY, JSON.stringify(logs));
  }

  function loadModeColors() {
    try {
      const stored = JSON.parse(localStorage.getItem(COLOR_KEY));
      if (!stored) return { ...DEFAULT_COLORS };
      return { ...DEFAULT_COLORS, ...stored };
    } catch (e) {
      return { ...DEFAULT_COLORS };
    }
  }

  function saveModeColors(colors) {
    localStorage.setItem(COLOR_KEY, JSON.stringify(colors));
  }

  function shadeColor(hex, percent) {
    if (!hex) return '#000000';
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) + amt;
    const g = (num >> 8 & 0x00FF) + amt;
    const b = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (r < 255 ? (r < 0 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 0 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 0 ? 0 : b) : 255)
    ).toString(16).slice(1);
  }

  function hexToRgba(hex, alpha) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    const r = num >> 16;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function initPomodoro() {
    if (initPomodoro.initialized) return;
    const wrapper = document.getElementById('pomodoro-wrapper');
    if (!wrapper) return;

    initPomodoro.initialized = true;

    const modeButtons = wrapper.querySelectorAll('.pomo-mode');
    const timeEl = document.getElementById('pomo-time');
    const primaryBtn = document.getElementById('pomo-start');
    const skipBtn = document.getElementById('pomo-skip');
    const statusEl = document.getElementById('pomo-status');
    const cycleEl = document.getElementById('pomo-cycle');
    const openSettingsBtn = document.getElementById('pomo-open-settings');
    const closeSettingsBtn = document.getElementById('pomo-close-settings');
    const saveSettingsBtn = document.getElementById('pomo-save-settings');
    const settingsPanel = document.getElementById('pomo-settings');
    const reportModal = document.getElementById('pomo-report');
    const openReportBtn = document.getElementById('pomo-open-report');
    const closeReportBtn = document.getElementById('pomo-close-report');
    const profileBtn = document.getElementById('pomo-open-profile');
    const profileMenu = document.getElementById('pomo-profile-menu');
    const profileLogoutBtn = document.getElementById('profile-logout');
    const profileLoginBtn = document.getElementById('profile-login');
    const detailRowsEl = document.getElementById('pomo-detail-rows');
    const rankingEl = document.getElementById('pomo-ranking');
    const reportTabs = document.querySelectorAll('.pomo-report-tab');
    const reportPanes = document.querySelectorAll('.report-pane');
    const focusInput = document.getElementById('pomo-input-focus');
    const shortInput = document.getElementById('pomo-input-short');
    const longInput = document.getElementById('pomo-input-long');
    const intervalInput = document.getElementById('pomo-input-interval');
    const autoBreaksInput = document.getElementById('pomo-auto-breaks');
    const autoFocusInput = document.getElementById('pomo-auto-focus');
    const taskForm = document.getElementById('pomo-task-form');
    const taskInput = document.getElementById('pomo-task-input');
    const taskList = document.getElementById('pomo-task-list');
    const taskMenu = document.getElementById('pomo-task-menu');
    const shell = wrapper.querySelector('.pomodoro-shell');
    const themeButtons = wrapper.querySelectorAll('.pomo-theme-swatch');
    const colorFocusInput = document.getElementById('pomo-color-focus');
    const colorShortInput = document.getElementById('pomo-color-short');
    const colorLongInput = document.getElementById('pomo-color-long');
    const card = wrapper.querySelector('.pomodoro-card');
    const tasksSection = wrapper.querySelector('.pomodoro-tasks');
    const autoCheckInput = document.getElementById('pomo-auto-check');
    const checkBottomInput = document.getElementById('pomo-check-bottom');
    const alarmSoundSelect = document.getElementById('pomo-alarm-sound');
    const alarmVolumeInput = document.getElementById('pomo-alarm-volume');
    const alarmRepeatInput = document.getElementById('pomo-alarm-repeat');
    const tickingSoundSelect = document.getElementById('pomo-ticking-sound');
    const tickingVolumeInput = document.getElementById('pomo-ticking-volume');
    const hourFormatSelect = document.getElementById('pomo-hour-format');
    const darkRunningInput = document.getElementById('pomo-dark-running');
    const reminderTypeSelect = document.getElementById('pomo-reminder-type');
    const reminderMinInput = document.getElementById('pomo-reminder-min');
    let focusLogs = loadFocusLogs();

    let timerId = null;
    let targetTime = null;
    let tasks = loadTasks();
    const settings = loadSettings();
    let modeColors = loadModeColors();

    const state = {
      mode: 'focus',
      durations: {
        focus: settings.focus,
        short: settings.short,
        long: settings.long,
      },
      longInterval: settings.longInterval,
      autoStartBreaks: settings.autoStartBreaks,
      autoStartPomodoros: settings.autoStartPomodoros,
      autoCheckTasks: settings.autoCheckTasks,
      checkToBottom: settings.checkToBottom,
      alarmSound: settings.alarmSound,
      alarmVolume: settings.alarmVolume,
      alarmRepeat: settings.alarmRepeat,
      tickingSound: settings.tickingSound,
      tickingVolume: settings.tickingVolume,
      hourFormat: settings.hourFormat,
      darkWhenRunning: settings.darkWhenRunning,
      reminderType: settings.reminderType,
      reminderMinutes: settings.reminderMinutes,
      remaining: settings.focus * 60,
      running: false,
      completedFocus: 0,
      theme: localStorage.getItem(THEME_KEY) || 'custom',
    };

    function setActiveModeButton(mode) {
      modeButtons.forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    }

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      targetTime = null;
      state.running = false;
    }

    function updateCycleLabel() {
      const upcomingNumber = state.completedFocus + 1;
      cycleEl.textContent = `#${upcomingNumber}`;
    }

    function updateStatus() {
      const messages = {
        focus: 'Time to focus!',
        short: 'Time for a short break!',
        long: 'Time to reset!',
      };
      statusEl.textContent = messages[state.mode] || 'Ready?';
    }

    function updatePrimaryLabel() {
      if (state.running) {
        primaryBtn.textContent = 'PAUSE';
        return;
      }
      const startingFromTop = state.remaining === state.durations[state.mode] * 60;
      primaryBtn.textContent = startingFromTop ? 'START' : 'RESUME';
    }

    function updateTime() {
      timeEl.textContent = formatTime(state.remaining);
      updateStatus();
      updateCycleLabel();
      updatePrimaryLabel();
      setActiveModeButton(state.mode);
    }

    function setMode(mode, resetTimer = true) {
      stopTimer();
      state.mode = mode;
      if (resetTimer) {
        const minutes = state.durations[mode] || DEFAULTS[mode] || DEFAULTS.focus;
        state.remaining = minutes * 60;
      }
      applyModeColors(mode);
      updateTime();
    }

    function tick() {
      if (!targetTime) return;
      const secondsLeft = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
      state.remaining = secondsLeft;
      updateTime();
      if (secondsLeft <= 0) {
        handleComplete();
      }
    }

    function startTimer() {
      if (state.running) return;
      state.running = true;
      targetTime = Date.now() + state.remaining * 1000;
      tick();
      timerId = setInterval(tick, 1000);
      updatePrimaryLabel();
    }

    function pauseTimer() {
      if (!state.running) return;
      state.remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
      stopTimer();
      updatePrimaryLabel();
      updateTime();
    }

    function handleComplete() {
      stopTimer();
      state.remaining = 0;
      updateTime();
      const finishedFocus = state.mode === 'focus';
      if (finishedFocus) {
        state.completedFocus += 1;
        addFocusLog(state.durations.focus);
      }
      const useLongBreak = finishedFocus && state.completedFocus % state.longInterval === 0;
      const nextMode = finishedFocus ? (useLongBreak ? 'long' : 'short') : 'focus';
      setMode(nextMode);
      const autoStart = nextMode === 'focus' ? state.autoStartPomodoros : state.autoStartBreaks;
      if (autoStart) {
        startTimer();
      }
    }

    function goToNextSegment() {
      handleComplete();
    }

    function toggleTimer() {
      if (state.running) {
        pauseTimer();
      } else {
        startTimer();
      }
    }

    function applySettingsToState(newSettings) {
      state.durations.focus = newSettings.focus;
      state.durations.short = newSettings.short;
      state.durations.long = newSettings.long;
      state.longInterval = newSettings.longInterval;
      state.autoStartBreaks = newSettings.autoStartBreaks;
      state.autoStartPomodoros = newSettings.autoStartPomodoros;
      state.autoCheckTasks = newSettings.autoCheckTasks;
      state.checkToBottom = newSettings.checkToBottom;
      state.alarmSound = newSettings.alarmSound;
      state.alarmVolume = newSettings.alarmVolume;
      state.alarmRepeat = newSettings.alarmRepeat;
      state.tickingSound = newSettings.tickingSound;
      state.tickingVolume = newSettings.tickingVolume;
      state.hourFormat = newSettings.hourFormat;
      state.darkWhenRunning = newSettings.darkWhenRunning;
      state.reminderType = newSettings.reminderType;
      state.reminderMinutes = newSettings.reminderMinutes;
      if (!state.running) {
        state.remaining = state.durations[state.mode] * 60;
        updateTime();
      }
    }

    function applyTheme(themeName) {
      state.theme = themeName;
      if (shell) {
        shell.dataset.theme = themeName;
      }
      themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === themeName));
      localStorage.setItem(THEME_KEY, themeName);
    }

    function hydrateSettingsForm(values) {
      focusInput.value = values.focus;
      shortInput.value = values.short;
      longInput.value = values.long;
      intervalInput.value = values.longInterval;
      autoBreaksInput.checked = values.autoStartBreaks;
      autoFocusInput.checked = values.autoStartPomodoros;
      if (autoCheckInput) autoCheckInput.checked = values.autoCheckTasks;
      if (checkBottomInput) checkBottomInput.checked = values.checkToBottom;
      if (alarmSoundSelect) alarmSoundSelect.value = values.alarmSound;
      if (alarmVolumeInput) alarmVolumeInput.value = values.alarmVolume;
      if (alarmRepeatInput) alarmRepeatInput.value = values.alarmRepeat;
      if (tickingSoundSelect) tickingSoundSelect.value = values.tickingSound;
      if (tickingVolumeInput) tickingVolumeInput.value = values.tickingVolume;
      if (hourFormatSelect) hourFormatSelect.value = values.hourFormat;
      if (darkRunningInput) darkRunningInput.checked = values.darkWhenRunning;
      if (reminderTypeSelect) reminderTypeSelect.value = values.reminderType;
      if (reminderMinInput) reminderMinInput.value = values.reminderMinutes;
    }

    function openSettings() {
      settingsPanel.classList.remove('hidden');
      settingsPanel.focus();
    }

    function closeSettings() {
      settingsPanel.classList.add('hidden');
    }

    function openReport() {
      if (reportModal) {
        reportModal.classList.remove('hidden');
      }
    }

    function closeReport() {
      if (reportModal) {
        reportModal.classList.add('hidden');
      }
    }

    function toggleProfileMenu() {
      if (!profileMenu || !profileBtn) return;
      const willOpen = profileMenu.classList.contains('hidden');
      if (willOpen) {
        profileMenu.classList.remove('hidden');
        profileMenu.style.visibility = 'hidden';
        positionProfileMenu();
        profileMenu.style.visibility = 'visible';
      } else {
        profileMenu.classList.add('hidden');
      }
    }

    function closeProfileMenu() {
      if (!profileMenu) return;
      profileMenu.classList.add('hidden');
    }

    function persistSettingsFromForm() {
      const newSettings = {
        focus: readNumberInput(focusInput, state.durations.focus, 1, 180),
        short: readNumberInput(shortInput, state.durations.short, 1, 60),
        long: readNumberInput(longInput, state.durations.long, 1, 60),
        longInterval: readNumberInput(intervalInput, state.longInterval, 1, 10),
        autoStartBreaks: !!autoBreaksInput.checked,
        autoStartPomodoros: !!autoFocusInput.checked,
        autoCheckTasks: !!(autoCheckInput && autoCheckInput.checked),
        checkToBottom: !!(checkBottomInput && checkBottomInput.checked),
        alarmSound: alarmSoundSelect ? alarmSoundSelect.value : DEFAULTS.alarmSound,
        alarmVolume: alarmVolumeInput ? readNumberInput(alarmVolumeInput, state.alarmVolume, 0, 100) : state.alarmVolume,
        alarmRepeat: alarmRepeatInput ? readNumberInput(alarmRepeatInput, state.alarmRepeat, 1, 10) : state.alarmRepeat,
        tickingSound: tickingSoundSelect ? tickingSoundSelect.value : state.tickingSound,
        tickingVolume: tickingVolumeInput ? readNumberInput(tickingVolumeInput, state.tickingVolume, 0, 100) : state.tickingVolume,
        hourFormat: hourFormatSelect ? hourFormatSelect.value : state.hourFormat,
        darkWhenRunning: !!(darkRunningInput && darkRunningInput.checked),
        reminderType: reminderTypeSelect ? reminderTypeSelect.value : state.reminderType,
        reminderMinutes: reminderMinInput ? readNumberInput(reminderMinInput, state.reminderMinutes, 1, 60) : state.reminderMinutes,
      };
      applySettingsToState(newSettings);
      saveSettings(newSettings);
      hydrateSettingsForm(newSettings);
      closeSettings();
    }

    function applyModeColors(modeName) {
      const key = modeName || state.mode;
      const color = modeColors[key] || DEFAULT_COLORS[key] || DEFAULT_COLORS.focus;
      const main = color.main;
      const alt = color.alt || shadeColor(main, -25);
      if (shell) {
        shell.style.background = `radial-gradient(circle at 12% 12%, rgba(255,255,255,0.05), transparent 32%), linear-gradient(160deg, ${main} 0%, ${alt} 100%)`;
      }
      if (card) {
        card.style.background = `linear-gradient(180deg, ${hexToRgba(main, 0.32)} 0%, ${hexToRgba(alt, 0.65)} 100%)`;
        card.style.borderColor = hexToRgba(main, 0.35);
      }
      if (tasksSection) {
        tasksSection.style.background = hexToRgba(main, 0.18);
        tasksSection.style.borderColor = hexToRgba(main, 0.3);
      }
    }

    function handleColorChange(modeKey, value) {
      const alt = shadeColor(value, -25);
      modeColors[modeKey] = { main: value, alt };
      saveModeColors(modeColors);
      applyModeColors(modeKey);
    }

    function getActiveTaskName() {
      const active = tasks.find(t => !t.done);
      return active ? active.text : '';
    }

    function getActiveUserName() {
      return localStorage.getItem(ACTIVE_USER_KEY) || 'You';
    }

    function updatePomoAccountLabel() {
      const label = document.getElementById('pomo-account-label');
      if (label) label.textContent = getActiveUserName();
      positionProfileMenu();
    }

    function addFocusLog(minutes) {
      const now = new Date();
      const end = now.toTimeString().slice(0, 5);
      const startDate = new Date(now.getTime() - minutes * 60000);
      const start = startDate.toTimeString().slice(0, 5);
      const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      focusLogs.unshift({
        date: dateStr,
        range: `${start} ~ ${end}`,
        project: getActiveTaskName() || '',
        minutes,
      });
      if (focusLogs.length > 50) focusLogs = focusLogs.slice(0, 50);
      saveFocusLogs(focusLogs);
      renderDetails();
      renderRanking();
      renderSummary();
    }

    function formatMinutesToHHMM(totalMinutes) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function renderSummary() {
      const hoursEl = document.getElementById('pomo-hours-focused');
      const daysEl = document.getElementById('pomo-days-accessed');
      const streakEl = document.getElementById('pomo-day-streak');
      if (!hoursEl || !daysEl || !streakEl) return;
      const totalMinutes = focusLogs.reduce((sum, log) => sum + (log.minutes || 0), 0);
      const hoursFocused = Math.round((totalMinutes / 60) * 10) / 10;
      const uniqueDates = new Set(focusLogs.map(log => log.date));
      const streak = computeStreak();
      hoursEl.textContent = hoursFocused;
      daysEl.textContent = uniqueDates.size;
      streakEl.textContent = streak;
    }

    function computeStreak() {
      if (!focusLogs.length) return 0;
      const dates = Array.from(new Set(focusLogs.map(log => log.date)));
      const parsed = dates.map(d => new Date(d.replace(/-/g, ' ')).setHours(0, 0, 0, 0)).sort((a, b) => b - a);
      let streak = 0;
      let current = new Date().setHours(0, 0, 0, 0);
      for (const day of parsed) {
        if (day === current) {
          streak += 1;
          current -= 24 * 60 * 60 * 1000;
        } else {
          break;
        }
      }
      return streak;
    }

    function renderDetails() {
      if (!detailRowsEl) return;
      detailRowsEl.innerHTML = '';
      if (!focusLogs.length) {
        const empty = document.createElement('div');
        empty.className = 'pomo-detail-row';
        empty.innerHTML = `
          <div class="detail-date">
            <div class="detail-date-main">No sessions yet</div>
            <div class="detail-date-sub">Start a focus timer to log sessions</div>
          </div>
          <div class="detail-project">—</div>
          <div class="detail-minutes">0</div>
        `;
        detailRowsEl.appendChild(empty);
        return;
      }
      focusLogs.forEach(item => {
        const row = document.createElement('div');
        row.className = 'pomo-detail-row';
        row.innerHTML = `
          <div class="detail-date">
            <div class="detail-date-main">${item.date}</div>
            <div class="detail-date-sub">${item.range}</div>
          </div>
          <div class="detail-project">${item.project || '—'}</div>
          <div class="detail-minutes">${item.minutes}</div>
        `;
        detailRowsEl.appendChild(row);
      });
    }

    function renderRanking() {
    if (!rankingEl) return;
      rankingEl.innerHTML = '';
      const totalMinutes = focusLogs.reduce((sum, log) => sum + (log.minutes || 0), 0);
      const userEntry = { name: getActiveUserName(), minutes: totalMinutes, avatar: '' };
    const others = RANKING_MOCK.map(item => {
      if (item.time && !item.minutes) {
        const [h, m] = item.time.split(':').map(n => parseInt(n, 10) || 0);
        return { ...item, minutes: h * 60 + m };
      }
      return item;
    });
    const leaderboard = [userEntry, ...others].sort((a, b) => (b.minutes || 0) - (a.minutes || 0));
    leaderboard.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'pomo-rank-row';
      const timeStr = item.time || formatMinutesToHHMM(item.minutes || 0);
      const avatarContent = item.avatar ? `<img src="${item.avatar}" alt="${item.name}">` : (item.name || '?').charAt(0).toUpperCase();
      row.innerHTML = `
        <div class="pomo-rank-num">${idx + 1}</div>
        <div class="pomo-rank-user">
          <div class="pomo-rank-avatar">${avatarContent}</div>
          <div class="pomo-rank-name">${item.name}</div>
        </div>
        <div class="pomo-rank-time">${timeStr}</div>
      `;
      rankingEl.appendChild(row);
    });
  }

    function switchReportTab(targetTab) {
      reportTabs.forEach(tab => {
        const active = tab.dataset.tab === targetTab;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      reportPanes.forEach(pane => {
        pane.classList.toggle('hidden', pane.dataset.tabContent !== targetTab);
      });
      if (targetTab === 'detail') renderDetails();
      if (targetTab === 'ranking') renderRanking();
    }

    function updateReportData(data) {
      const { summary, details, ranking } = data || {};
      if (summary) {
        const { hoursFocused, daysAccessed, dayStreak } = summary;
        const hoursEl = document.getElementById('pomo-hours-focused');
        const daysEl = document.getElementById('pomo-days-accessed');
        const streakEl = document.getElementById('pomo-day-streak');
        if (hoursEl && hoursFocused !== undefined) hoursEl.textContent = hoursFocused;
        if (daysEl && daysAccessed !== undefined) daysEl.textContent = daysAccessed;
        if (streakEl && dayStreak !== undefined) streakEl.textContent = dayStreak;
      }
      if (Array.isArray(details)) {
        DETAIL_MOCK.length = 0;
        details.forEach(item => DETAIL_MOCK.push(item));
        focusLogs = details.slice();
        saveFocusLogs(focusLogs);
        renderDetails();
        renderSummary();
      }
      if (Array.isArray(ranking)) {
        RANKING_MOCK.length = 0;
        ranking.forEach(item => RANKING_MOCK.push(item));
        renderRanking();
      }
    }
    window.updateReportData = updateReportData;

    function renderTasks() {
      taskList.innerHTML = '';
      if (!tasks.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'pomo-task-empty';
        emptyState.textContent = 'Add a task to stay on track';
        taskList.appendChild(emptyState);
        return;
      }

      tasks.forEach(task => {
        const item = document.createElement('li');
        item.className = 'pomo-task';
        if (task.done) item.classList.add('done');

        const label = document.createElement('label');
        label.className = 'pomo-task-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.addEventListener('change', () => {
          task.done = !task.done;
          saveTasks(tasks);
          renderTasks();
        });

        const text = document.createElement('span');
        text.className = 'pomo-task-text';
        text.textContent = task.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'pomo-task-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => {
          tasks = tasks.filter(t => t.id !== task.id);
          saveTasks(tasks);
          renderTasks();
        });

        label.appendChild(checkbox);
        label.appendChild(text);
        item.appendChild(label);
        item.appendChild(deleteBtn);
        taskList.appendChild(item);
      });
    }

    function addTask(text) {
      const clean = text.trim();
      if (!clean) return;
      tasks.push({ id: Date.now(), text: clean, done: false });
      saveTasks(tasks);
      renderTasks();
    }

    function clearCompletedTasks() {
      tasks = tasks.filter(t => !t.done);
      saveTasks(tasks);
      renderTasks();
    }

    // Event bindings
    primaryBtn.addEventListener('click', toggleTimer);
    skipBtn.addEventListener('click', goToNextSegment);
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        setMode(mode);
      });
    });

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', persistSettingsFromForm);
    if (settingsPanel) {
      settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
          closeSettings();
        }
      });
    }
    if (openReportBtn) openReportBtn.addEventListener('click', openReport);
    if (closeReportBtn) closeReportBtn.addEventListener('click', closeReport);
    if (reportModal) {
      reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) closeReport();
      });
    }
    function positionProfileMenu() {
      if (!profileMenu || !profileBtn) return;
      const rect = profileBtn.getBoundingClientRect();
      profileMenu.style.left = `${rect.left + window.scrollX - (profileMenu.offsetWidth - rect.width)}px`;
      profileMenu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeReport();
        closeProfileMenu();
        closeSettings();
      }
    });
    if (profileBtn) profileBtn.addEventListener('click', toggleProfileMenu);
    document.addEventListener('click', (e) => {
      if (profileMenu && !profileMenu.contains(e.target) && e.target !== profileBtn) {
        closeProfileMenu();
      }
    });
    window.addEventListener('resize', positionProfileMenu);
    if (profileLoginBtn) {
      profileLoginBtn.addEventListener('click', () => {
        closeProfileMenu();
        if (window.openAuthOverlay) window.openAuthOverlay();
        if (document.getElementById('auth-open')) {
          document.getElementById('auth-open').click();
        }
      });
    }
    if (profileLogoutBtn) {
      profileLogoutBtn.addEventListener('click', () => {
        if (window.handleLogout) {
          window.handleLogout();
        }
        closeProfileMenu();
      });
    }
    reportTabs.forEach(tab => {
      tab.addEventListener('click', () => switchReportTab(tab.dataset.tab));
    });

    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTask(taskInput.value);
      taskInput.value = '';
      taskInput.focus();
    });

    taskMenu.addEventListener('click', clearCompletedTasks);
    taskMenu.title = 'Clear completed tasks';

    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
      });
    });

    if (colorFocusInput) colorFocusInput.addEventListener('input', (e) => handleColorChange('focus', e.target.value));
    if (colorShortInput) colorShortInput.addEventListener('input', (e) => handleColorChange('short', e.target.value));
    if (colorLongInput) colorLongInput.addEventListener('input', (e) => handleColorChange('long', e.target.value));

    hydrateSettingsForm(settings);
    setMode('focus');
    renderTasks();
    applyTheme(state.theme);
    if (colorFocusInput) colorFocusInput.value = (modeColors.focus && modeColors.focus.main) || DEFAULT_COLORS.focus.main;
    if (colorShortInput) colorShortInput.value = (modeColors.short && modeColors.short.main) || DEFAULT_COLORS.short.main;
    if (colorLongInput) colorLongInput.value = (modeColors.long && modeColors.long.main) || DEFAULT_COLORS.long.main;
    applyModeColors('focus');
    renderDetails();
    renderRanking();
    renderSummary();
    updatePomoAccountLabel();
  }

  window.initPomodoro = initPomodoro;
  window.updatePomoAccountLabel = updatePomoAccountLabel;
})();
