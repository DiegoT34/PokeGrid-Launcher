(function exposeGameTheme() {
  const FALLBACK_LABELS = [
    'Capturar', 'Entrenador', 'Inventario', 'Pokémon', 'Gimnasios',
    'Región', 'Hogar', 'Mapa', 'Misiones', 'Logros', 'Clanes', 'Eventos',
    'Tienda', 'Pase', 'Ranking', 'Mazmorras', 'AFK', 'Diario',
    'Compañeros', 'Premium', 'Amigos', 'Ajustes', 'Salir'
  ];

  const THEME_CSS = `
    :root {
      --pg-gold: #e3a82f;
      --pg-gold-soft: rgba(227, 168, 47, .45);
      --pg-panel: rgba(8, 13, 21, .96);
      --pg-panel-2: rgba(15, 23, 34, .97);
    }

    .game-dock[data-pg-themed="true"] {
      z-index: 9000 !important;
      top: 8px !important;
      left: 50% !important;
      right: auto !important;
      width: max-content !important;
      max-width: none !important;
      min-height: 90px !important;
      padding: 3px !important;
      gap: 3px !important;
      display: grid !important;
      grid-template-columns: repeat(var(--pg-dock-columns, 12), 40px) !important;
      grid-auto-rows: 42px !important;
      grid-auto-flow: row !important;
      justify-content: flex-start !important;
      align-items: stretch !important;
      overflow: visible !important;
      scrollbar-width: thin;
      scrollbar-color: rgba(227, 168, 47, .48) transparent;
      transform: translateX(-50%) scale(var(--pg-dock-fit, 1)) !important;
      transform-origin: top center !important;
      border: 1px solid rgba(227,168,47,.58) !important;
      border-radius: 11px !important;
      border-image: none !important;
      background:
        radial-gradient(circle at 50% -50%, rgba(227,168,47,.13), transparent 36%),
        linear-gradient(180deg, rgba(15,23,34,.97), rgba(7,12,20,.97)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 10px 28px rgba(0,0,0,.52) !important;
      transition: transform .18s ease, opacity .18s ease !important;
    }

    .game-dock[data-pg-themed="true"]::-webkit-scrollbar { height: 4px; }
    .game-dock[data-pg-themed="true"]::-webkit-scrollbar-track { background: transparent; }
    .game-dock[data-pg-themed="true"]::-webkit-scrollbar-thumb {
      border-radius: 99px;
      background: rgba(227, 168, 47, .45);
    }

    .game-dock[data-pg-themed="true"]::before,
    .game-dock[data-pg-themed="true"]::after { display: none !important; }

    .game-dock[data-pg-themed="true"] .dock-poke-wrap {
      width: 40px !important;
      height: 42px !important;
      align-items: stretch !important;
      position: relative !important;
      overflow: visible !important;
    }

    .game-dock[data-pg-themed="true"] .poke-menu {
      z-index: 10060 !important;
      pointer-events: auto !important;
      position: absolute !important;
      top: calc(100% + 8px) !important;
      left: 50% !important;
      min-width: 154px !important;
      padding: 8px !important;
      flex-direction: column !important;
      gap: 5px !important;
      overflow: visible !important;
      border: 1px solid rgba(227,168,47,.72) !important;
      border-radius: 10px !important;
      background: linear-gradient(180deg, rgba(16,25,37,.995), rgba(6,12,20,.995)) !important;
      box-shadow: 0 14px 38px rgba(0,0,0,.68), 0 0 16px rgba(227,168,47,.1) !important;
      transform: translateX(-50%) !important;
    }

    .game-dock[data-pg-themed="true"] .poke-menu:not([hidden]) { display: flex !important; }

    .game-dock[data-pg-themed="true"] .poke-menu-item {
      min-height: 34px !important;
      border: 1px solid rgba(146,164,184,.16) !important;
      border-radius: 7px !important;
      background: rgba(255,255,255,.025) !important;
      color: #edf2f7 !important;
      font: 700 12px/1.2 "Segoe UI", system-ui, sans-serif !important;
    }

    .game-dock[data-pg-themed="true"] .poke-menu-item:hover {
      border-color: rgba(227,168,47,.65) !important;
      background: rgba(227,168,47,.1) !important;
    }

    .game-dock[data-pg-themed="true"] .dock-btn {
      z-index: 1 !important;
      box-sizing: border-box !important;
      width: 40px !important;
      height: 42px !important;
      padding: 2px 3px !important;
      gap: 2px !important;
      flex: 0 0 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1px solid rgba(151, 168, 191, .1) !important;
      border-radius: 8px !important;
      background: linear-gradient(180deg, rgba(26,35,48,.86), rgba(7,12,20,.82)) !important;
      color: #d8e0ea !important;
      filter: none !important;
      opacity: 1 !important;
      overflow: visible !important;
      -webkit-appearance: none !important;
      appearance: none !important;
      box-shadow: none !important;
      transition: background .16s ease, transform .16s ease, box-shadow .16s ease !important;
    }

    .game-dock[data-pg-themed="true"] .dock-btn:hover,
    .game-dock[data-pg-themed="true"] .dock-btn:focus-visible {
      background: linear-gradient(180deg, rgba(227,168,47,.17), rgba(227,168,47,.05)) !important;
      box-shadow: inset 0 0 0 1px rgba(227,168,47,.32), 0 7px 18px rgba(0,0,0,.3) !important;
      transform: translateY(-2px) !important;
      outline: none !important;
    }

    .game-dock[data-pg-themed="true"] .dock-btn:active { transform: translateY(0) scale(.97) !important; }

    .game-dock[data-pg-themed="true"] .dock-btn img {
      width: 23px !important;
      height: 23px !important;
      flex: 0 0 23px !important;
      box-sizing: content-box !important;
      padding: 2px !important;
      border: 1px solid rgba(227,168,47,.18) !important;
      border-radius: 50% !important;
      background: radial-gradient(circle at 45% 35%, #253142, #0a1018 72%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 9px rgba(0,0,0,.48) !important;
      object-fit: contain !important;
      filter: drop-shadow(0 3px 4px rgba(0,0,0,.72)) saturate(1.08) !important;
      image-rendering: auto !important;
    }

    .game-dock[data-pg-themed="true"] .pg-dock-label {
      display: block !important;
      width: 100% !important;
      overflow: hidden !important;
      color: #dce3ec !important;
      font: 700 5.8px/1.05 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .025em !important;
      text-align: center !important;
      text-overflow: ellipsis !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
      text-shadow: 0 1px 2px #000 !important;
    }

    .game-dock[data-pg-themed="true"] .dock-badge {
      top: -2px !important;
      right: 2px !important;
      transform: scale(.78) !important;
      transform-origin: top right !important;
      border: 2px solid #101722 !important;
      background: #ff4f48 !important;
      box-shadow: 0 0 9px rgba(255,79,72,.52) !important;
    }

    @media (min-width: 1251px) and (min-height: 421px) {
      html.pg-has-auto-helper .game-dock[data-pg-themed="true"] {
        left: calc(50% + 10px) !important;
      }
    }

    .pg-dock-burger,
    .pg-dock-top-toggle,
    .pg-dock-close,
    .pg-dock-backdrop,
    .game-dock[data-pg-themed="true"] .pg-auto-helper-entry { display: none !important; }

    .pg-dock-backdrop {
      pointer-events: none !important;
      opacity: 0 !important;
      backdrop-filter: none !important;
    }

    @media (min-width: 1251px) and (min-height: 421px) {
      html.pg-has-dock .pg-dock-top-toggle {
        z-index: 9001 !important;
        position: fixed !important;
        top: 98px !important;
        left: 50% !important;
        width: 54px !important;
        height: 18px !important;
        padding: 0 !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid rgba(227,168,47,.62) !important;
        border-top: 0 !important;
        border-radius: 0 0 10px 10px !important;
        background: linear-gradient(180deg, rgba(13,21,32,.98), rgba(5,10,17,.98)) !important;
        color: #eec454 !important;
        box-shadow: 0 7px 16px rgba(0,0,0,.42) !important;
        cursor: pointer !important;
        transition: top .18s ease, background .18s ease !important;
      }

      .pg-dock-top-toggle::before {
        content: "" !important;
        width: 8px !important;
        height: 8px !important;
        border-top: 2px solid currentColor !important;
        border-left: 2px solid currentColor !important;
        transform: translateY(2px) rotate(45deg) !important;
      }

      html.pg-dock-top-hidden .game-dock[data-pg-themed="true"] {
        pointer-events: none !important;
        opacity: 0 !important;
        transform: translate(-50%, calc(-100% - 12px)) scale(var(--pg-dock-fit, 1)) !important;
      }

      html.pg-dock-top-hidden .pg-dock-top-toggle {
        top: 0 !important;
        border-top: 0 !important;
      }

      html.pg-dock-top-hidden .pg-dock-top-toggle::before {
        transform: translateY(-2px) rotate(225deg) !important;
      }
    }

    .ah-panel[data-pg-auto-state="button"] {
      z-index: 8400 !important;
      position: fixed !important;
      top: max(10px, env(safe-area-inset-top)) !important;
      right: max(8px, env(safe-area-inset-right)) !important;
      bottom: auto !important;
      left: auto !important;
      width: 150px !important;
      min-width: 0 !important;
      max-width: 150px !important;
      height: 34px !important;
      min-height: 34px !important;
      padding: 1px !important;
      overflow: visible !important;
      border-color: rgba(227,168,47,.58) !important;
      border-radius: 11px !important;
      background:
        radial-gradient(circle at 15% 30%, rgba(227,168,47,.12), transparent 28%),
        linear-gradient(180deg, rgba(19,29,42,.98), rgba(7,13,21,.98)) !important;
      color: #edf2f7 !important;
      box-shadow:
        inset 0 0 0 2px rgba(3,7,12,.5),
        inset 0 1px 0 rgba(255,255,255,.07),
        0 9px 24px rgba(0,0,0,.42),
        0 0 14px rgba(227,168,47,.08) !important;
    }

    .ah-panel[data-pg-auto-state="button"] .ah-head {
      width: 100% !important;
      height: 32px !important;
      min-height: 32px !important;
      padding: 5px 9px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      appearance: none !important;
      border: 0 !important;
      border-radius: inherit !important;
      background: transparent !important;
      color: #f1f5f9 !important;
      font-size: 10px !important;
      line-height: 1 !important;
      letter-spacing: .035em !important;
      white-space: nowrap !important;
      text-shadow: 0 1px 2px #000 !important;
    }

    .ah-panel[data-pg-auto-state="button"] .ah-head.pg-auto-needs-icon::before {
      content: "⚙" !important;
      margin-right: 5px !important;
      color: #e8b33d !important;
      filter: drop-shadow(0 0 5px rgba(227,168,47,.4)) !important;
    }

    .ah-panel[data-pg-auto-state="button"] .ah-arrow-hint { display: none !important; }

    .ah-panel.pg-auto-trigger-hidden { display: none !important; }

    .ah-panel[data-pg-auto-state="container"] {
      position: static !important;
      width: auto !important;
      height: auto !important;
      padding: 0 !important;
      display: contents !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .ah-panel[data-pg-auto-state="container"] > .ah-head,
    .ah-panel[data-pg-auto-state="container"] .ah-head.pg-auto-expanded-trigger-hidden {
      display: none !important;
    }

    .ah-panel[data-pg-auto-state="container"] > .ah-overlay {
      position: static !important;
      inset: auto !important;
      width: auto !important;
      height: auto !important;
      padding: 0 !important;
      display: contents !important;
      background: transparent !important;
      backdrop-filter: none !important;
    }

    html.pg-auto-helper-expanded .game-dock[data-pg-themed="true"] {
      pointer-events: none !important;
      opacity: 0 !important;
    }

    .pg-hunt-external-trigger-hidden,
    .pg-hunt-duplicate-close { display: none !important; }

    [data-pg-auto-dialog="true"] {
      z-index: 10020 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      left: 50% !important;
      width: min(620px, calc(100vw - 24px)) !important;
      height: min(410px, calc(100dvh - 24px)) !important;
      min-width: min(340px, calc(100vw - 12px)) !important;
      min-height: min(280px, calc(100dvh - 12px)) !important;
      max-width: none !important;
      max-height: none !important;
      padding: 10px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      border: 2px solid transparent !important;
      border-radius: 18px !important;
      background:
        radial-gradient(circle at 78% 0, rgba(41,94,145,.16), transparent 30%),
        radial-gradient(circle at 15% 90%, rgba(75,32,133,.1), transparent 34%),
        linear-gradient(155deg, rgba(7,20,34,.995), rgba(3,10,18,.995)) padding-box,
        linear-gradient(118deg, #24c9ff, #3d8ed2 42%, #f4c52d 78%, #ff9d18) border-box !important;
      color: #dce6f1 !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.04),
        0 22px 60px rgba(0,0,0,.7),
        0 0 24px rgba(227,168,47,.1) !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(227,168,47,.5) #07111d !important;
      transform: translate(-50%, -50%) !important;
      resize: none !important;
      container: pg-auto / inline-size !important;
    }

    [data-pg-auto-dialog="true"][data-pg-floating="true"] {
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-header {
      box-sizing: border-box !important;
      position: relative !important;
      min-height: 62px !important;
      margin: -10px -10px 10px !important;
      padding: 13px 108px 10px 64px !important;
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 9px !important;
      border-bottom: 1px solid rgba(44,151,218,.42) !important;
      background:
        radial-gradient(circle at 78% 10%, rgba(28,113,207,.24), transparent 36%),
        linear-gradient(120deg, rgba(3,49,91,.98), rgba(3,25,59,.98)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-synthetic-header {
      position: sticky !important;
      top: -10px !important;
      z-index: 90 !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-title {
      margin: 0 !important;
      padding: 0 !important;
      color: #f4f7fa !important;
      font: 900 clamp(18px, 4.2cqi, 25px)/1.05 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .025em !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 4px #000 !important;
      cursor: grab !important;
      user-select: none !important;
      touch-action: none !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-title::before {
      content: "" !important;
      position: absolute !important;
      top: 11px !important;
      left: 15px !important;
      width: 38px !important;
      height: 38px !important;
      border: 3px solid #091421 !important;
      border-radius: 50% !important;
      background:
        radial-gradient(circle, #f7fbff 0 14%, #101a27 15% 25%, transparent 26%),
        linear-gradient(#ef493d 0 43%, #101823 44% 57%, #f1f5f8 58%) !important;
      box-shadow: 0 0 0 2px rgba(55,195,255,.36), 0 6px 14px rgba(0,0,0,.5) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-header .pg-auto-logo {
      z-index: 1 !important;
      width: 42px !important;
      height: 42px !important;
      margin-left: -50px !important;
      object-fit: contain !important;
      filter: drop-shadow(0 5px 7px rgba(0,0,0,.55)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-header:has(.pg-auto-logo) .pg-auto-title::before {
      display: none !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-header p,
    [data-pg-auto-dialog="true"] .pg-auto-header small {
      margin: 3px 0 0 !important;
      color: #b8cce2 !important;
      font-size: 10px !important;
      font-weight: 500 !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 9px !important;
      width: 100% !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card {
      box-sizing: border-box !important;
      min-width: 0 !important;
      position: relative !important;
      padding: 10px !important;
      border: 1px solid rgba(84,111,140,.34) !important;
      border-radius: 12px !important;
      background:
        radial-gradient(circle at 0 0, rgba(48,83,116,.1), transparent 32%),
        linear-gradient(145deg, rgba(13,28,43,.96), rgba(7,17,28,.96)) !important;
      color: #dce6f1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.035) !important;
      transition: border-color .16s ease, opacity .16s ease, box-shadow .16s ease !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card h2,
    [data-pg-auto-dialog="true"] .pg-auto-card h3,
    [data-pg-auto-dialog="true"] .pg-auto-card h4 {
      margin: 0 0 7px !important;
      color: #f5f8fc !important;
      font-size: 14px !important;
      font-weight: 900 !important;
      letter-spacing: .02em !important;
      text-transform: uppercase !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card .pg-auto-art {
      width: 66px !important;
      height: 66px !important;
      max-width: 66px !important;
      max-height: 66px !important;
      margin: 0 10px 7px 0 !important;
      float: left !important;
      object-fit: contain !important;
      filter: drop-shadow(0 7px 9px rgba(0,0,0,.56)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card[data-pg-auto-enabled="false"] {
      border-color: rgba(73,101,128,.34) !important;
      opacity: .72 !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card[data-pg-auto-enabled="false"] .pg-auto-art {
      filter: grayscale(.65) saturate(.55) drop-shadow(0 6px 8px rgba(0,0,0,.52)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card[data-pg-auto-enabled="true"] {
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 0 15px rgba(52,196,86,.08) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-potion {
      border-color: rgba(52,196,86,.46) !important;
      background: linear-gradient(145deg, rgba(10,50,30,.72), rgba(6,22,23,.94)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-revive {
      border-color: rgba(48,158,228,.46) !important;
      background: linear-gradient(145deg, rgba(8,43,70,.68), rgba(6,20,32,.96)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-catch {
      border-color: rgba(227,168,47,.48) !important;
      background: linear-gradient(145deg, rgba(54,40,8,.46), rgba(8,19,27,.96)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-shiny {
      border-color: rgba(139,80,226,.5) !important;
      background: linear-gradient(145deg, rgba(42,20,75,.48), rgba(8,18,30,.96)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-card[data-pg-auto-enabled="false"] {
      border-color: rgba(73,101,128,.34) !important;
      background: linear-gradient(145deg, rgba(18,30,42,.9), rgba(7,16,25,.96)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.025) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-names {
      clear: both !important;
      margin-top: 9px !important;
      border-color: rgba(111,75,189,.45) !important;
    }

    [data-pg-auto-dialog="true"] input,
    [data-pg-auto-dialog="true"] select,
    [data-pg-auto-dialog="true"] textarea,
    [data-pg-surface="true"] input,
    [data-pg-surface="true"] select,
    [data-pg-surface="true"] textarea {
      box-sizing: border-box !important;
      max-width: 100% !important;
      min-height: 34px !important;
      border: 1px solid rgba(102,129,158,.42) !important;
      border-radius: 8px !important;
      background: rgba(3,11,19,.86) !important;
      color: #e8eef6 !important;
      outline: none !important;
      box-shadow: inset 0 1px 4px rgba(0,0,0,.42) !important;
    }

    [data-pg-auto-dialog="true"] input:focus,
    [data-pg-auto-dialog="true"] select:focus,
    [data-pg-auto-dialog="true"] textarea:focus,
    [data-pg-surface="true"] input:focus,
    [data-pg-surface="true"] select:focus,
    [data-pg-surface="true"] textarea:focus {
      border-color: rgba(227,168,47,.8) !important;
      box-shadow: 0 0 0 2px rgba(227,168,47,.13) !important;
    }

    [data-pg-auto-dialog="true"] button,
    [data-pg-surface="true"] button {
      border-color: rgba(227,168,47,.36) !important;
      border-radius: 9px !important;
      background: linear-gradient(180deg, rgba(38,49,64,.94), rgba(12,20,30,.96)) !important;
      color: #edf2f7 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055) !important;
      transition: border-color .15s ease, background .15s ease, transform .15s ease !important;
    }

    [data-pg-auto-dialog="true"] button:hover,
    [data-pg-surface="true"] button:hover {
      border-color: rgba(227,168,47,.76) !important;
      background: linear-gradient(180deg, rgba(75,61,29,.72), rgba(18,25,33,.96)) !important;
    }

    [data-pg-auto-dialog="true"] input[type="checkbox"],
    [data-pg-auto-dialog="true"] input[type="radio"] {
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      padding: 0 !important;
      accent-color: #38d66b !important;
      cursor: pointer !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-option {
      min-width: 42px !important;
      min-height: 46px !important;
      margin: 3px !important;
      padding: 5px 7px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-direction: column !important;
      gap: 3px !important;
      border: 1px solid rgba(79,108,137,.55) !important;
      border-radius: 8px !important;
      background: linear-gradient(180deg, rgba(22,38,54,.9), rgba(7,17,27,.96)) !important;
      color: #8498ac !important;
      opacity: .66 !important;
      filter: saturate(.55) !important;
      cursor: pointer !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-option img {
      width: 26px !important;
      height: 26px !important;
      max-width: 26px !important;
      max-height: 26px !important;
      object-fit: contain !important;
      filter: drop-shadow(0 4px 5px rgba(0,0,0,.55)) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-option[data-pg-auto-active="true"] {
      border-color: rgba(55,222,104,.88) !important;
      background: linear-gradient(180deg, rgba(24,112,57,.96), rgba(7,56,32,.98)) !important;
      color: #eaffef !important;
      opacity: 1 !important;
      filter: none !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 0 12px rgba(45,224,105,.25) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-catch .pg-auto-option[data-pg-auto-active="true"] {
      border-color: #ffd22d !important;
      background: linear-gradient(180deg, rgba(126,94,8,.98), rgba(52,38,3,.98)) !important;
      color: #fff3ad !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 0 13px rgba(255,202,28,.25) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-shiny .pg-auto-option[data-pg-auto-active="true"] {
      border-color: #bd68ff !important;
      background: linear-gradient(180deg, rgba(101,40,153,.98), rgba(46,18,77,.98)) !important;
      color: #f2dcff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 0 13px rgba(183,84,255,.28) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-option:disabled,
    [data-pg-auto-dialog="true"] .pg-auto-option[aria-disabled="true"] {
      border-color: rgba(119,61,67,.48) !important;
      background: linear-gradient(180deg, rgba(57,25,31,.8), rgba(24,13,18,.96)) !important;
      color: #9a7177 !important;
      cursor: not-allowed !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-close {
      z-index: 120 !important;
      position: absolute !important;
      top: 11px !important;
      right: 12px !important;
      width: 39px !important;
      height: 39px !important;
      padding: 0 !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid rgba(255,70,70,.82) !important;
      border-radius: 11px !important;
      background: linear-gradient(180deg, rgba(91,21,25,.96), rgba(40,9,13,.98)) !important;
      color: #ffb7b7 !important;
      font-size: 0 !important;
      cursor: pointer !important;
      opacity: 1 !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-close::before,
    [data-pg-auto-dialog="true"] .pg-auto-close::after {
      content: "" !important;
      position: absolute !important;
      width: 19px !important;
      height: 3px !important;
      border-radius: 2px !important;
      background: #ffb9b9 !important;
    }
    [data-pg-auto-dialog="true"] .pg-auto-close::before { transform: rotate(45deg) !important; }
    [data-pg-auto-dialog="true"] .pg-auto-close::after { transform: rotate(-45deg) !important; }

    [data-pg-auto-dialog="true"] .pg-auto-reset {
      border-color: rgba(91,151,205,.62) !important;
      color: #d5e7f8 !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-master {
      border-color: rgba(116,129,143,.58) !important;
      color: #9eafbf !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-master[data-pg-auto-active="true"] {
      border-color: rgba(51,221,100,.82) !important;
      background: linear-gradient(180deg, rgba(18,101,47,.96), rgba(6,53,27,.98)) !important;
      color: #53ed82 !important;
      box-shadow: 0 0 12px rgba(47,220,99,.18) !important;
    }

    [data-pg-auto-dialog="true"] .pg-auto-save {
      min-height: 38px !important;
      margin-top: 9px !important;
      border-color: rgba(70,223,91,.75) !important;
      background: linear-gradient(180deg, rgba(28,126,49,.97), rgba(9,66,30,.98)) !important;
      color: #f0fff3 !important;
      font-weight: 900 !important;
      letter-spacing: .025em !important;
      text-transform: uppercase !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.17), 0 0 14px rgba(54,218,84,.16) !important;
    }

    @container pg-auto (max-width: 510px) {
      [data-pg-auto-dialog="true"] .pg-auto-header { min-height: 57px !important; padding: 13px 54px 10px 57px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-title { font-size: 18px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-title::before { top: 10px !important; left: 13px !important; width: 33px !important; height: 33px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-close { top: 9px !important; right: 9px !important; width: 36px !important; height: 36px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-grid { grid-template-columns: 1fr !important; gap: 7px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card { padding: 9px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card .pg-auto-art { width: 54px !important; height: 54px !important; max-width: 54px !important; max-height: 54px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-option { min-width: 39px !important; min-height: 42px !important; padding: 4px 6px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-option img { width: 23px !important; height: 23px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-header .pg-auto-master,
      [data-pg-auto-dialog="true"] .pg-auto-header .pg-auto-reset {
        order: 3 !important;
        flex: 1 1 90px !important;
        min-height: 30px !important;
        padding: 5px 7px !important;
        font-size: 9px !important;
      }
    }

    @container pg-auto (max-width: 370px) {
      [data-pg-auto-dialog="true"] .pg-auto-header { padding-left: 50px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-title { font-size: 16px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card .pg-auto-art { float: none !important; display: block !important; margin: 0 auto 7px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card h2,
      [data-pg-auto-dialog="true"] .pg-auto-card h3,
      [data-pg-auto-dialog="true"] .pg-auto-card h4 { text-align: center !important; }
      [data-pg-auto-dialog="true"] .pg-auto-option { min-width: 36px !important; }
    }

    [data-pg-profile-dialog="true"] {
      z-index: 10024 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      width: min(500px, calc(100vw - 24px)) !important;
      max-width: none !important;
      max-height: calc(100dvh - 24px) !important;
      padding: 10px !important;
      overflow: auto !important;
      border: 2px solid transparent !important;
      border-radius: 18px !important;
      background:
        radial-gradient(circle at 82% 0, rgba(34,116,205,.2), transparent 34%),
        linear-gradient(155deg, rgba(6,20,34,.995), rgba(3,11,20,.995)) padding-box,
        linear-gradient(118deg, #25caff, #3987cf 44%, #f0bf31 78%, #ff9f1b) border-box !important;
      color: #e8eef7 !important;
      box-shadow: 0 25px 72px rgba(0,0,0,.75), 0 0 28px rgba(34,166,226,.12) !important;
      transform: translate(-50%, -50%) !important;
      scrollbar-width: thin !important;
      scrollbar-color: #348fd7 rgba(4,18,31,.84) !important;
      container: pg-profile / inline-size !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-header,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-header {
      box-sizing: border-box !important;
      position: relative !important;
      min-height: 58px !important;
      margin: -10px -10px 10px !important;
      padding: 15px 55px 11px 58px !important;
      border-bottom: 1px solid rgba(48,149,215,.4) !important;
      background:
        radial-gradient(circle at 80% 10%, rgba(28,113,207,.23), transparent 36%),
        linear-gradient(120deg, rgba(3,48,91,.98), rgba(3,25,59,.98)) !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-title,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-title {
      margin: 0 !important;
      color: #f6f8fc !important;
      font: 900 clamp(18px, 5cqi, 24px)/1.05 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 5px rgba(0,0,0,.68) !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-title::before,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-title::before {
      content: "" !important;
      position: absolute !important;
      top: 11px !important;
      left: 14px !important;
      width: 34px !important;
      height: 34px !important;
      border: 3px solid #091421 !important;
      border-radius: 50% !important;
      background:
        radial-gradient(circle, #f7fbff 0 14%, #101a27 15% 25%, transparent 26%),
        linear-gradient(#ef493d 0 43%, #101823 44% 57%, #f1f5f8 58%) !important;
      box-shadow: 0 0 0 2px rgba(71,193,247,.32), 0 5px 12px rgba(0,0,0,.48) !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-close,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-close {
      z-index: 20 !important;
      position: absolute !important;
      top: 10px !important;
      right: 11px !important;
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid rgba(94,172,238,.65) !important;
      border-radius: 10px !important;
      background: rgba(8,31,59,.88) !important;
      color: #e7f1fb !important;
      cursor: pointer !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-body {
      min-width: 0 !important;
      display: grid !important;
      grid-template-columns: minmax(110px,.8fr) minmax(0,2fr) !important;
      gap: 9px !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-avatar {
      width: min(120px, 100%) !important;
      max-height: 150px !important;
      margin: 0 auto !important;
      object-fit: contain !important;
      filter: drop-shadow(0 8px 12px rgba(0,0,0,.58)) !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-stats {
      min-width: 0 !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0,1fr)) !important;
      gap: 7px !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-stat {
      box-sizing: border-box !important;
      min-width: 0 !important;
      padding: 8px 9px !important;
      border: 1px solid rgba(64,119,168,.38) !important;
      border-radius: 9px !important;
      background: linear-gradient(145deg, rgba(14,34,51,.94), rgba(7,19,31,.96)) !important;
      color: #b6c8d9 !important;
      font-size: 10px !important;
      overflow-wrap: anywhere !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-stat strong,
    [data-pg-profile-dialog="true"] .pg-profile-stat b,
    [data-pg-profile-dialog="true"] .pg-profile-stat output {
      display: block !important;
      margin-top: 3px !important;
      color: #f2f7fc !important;
      font-size: 14px !important;
    }

    [data-pg-profile-dialog="true"] .pg-profile-action,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-action {
      min-height: 34px !important;
      border: 1px solid rgba(68,139,199,.55) !important;
      border-radius: 8px !important;
      background: linear-gradient(180deg, rgba(16,48,78,.95), rgba(6,24,43,.97)) !important;
      color: #dceafa !important;
      font-weight: 800 !important;
    }

    @container pg-profile (max-width: 410px) {
      [data-pg-profile-dialog="true"] .pg-profile-header { min-height: 52px !important; padding: 14px 48px 10px 52px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-title { font-size: 17px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-title::before { top: 10px !important; left: 12px !important; width: 30px !important; height: 30px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-body { grid-template-columns: 1fr !important; }
      [data-pg-profile-dialog="true"] .pg-profile-avatar { width: 88px !important; max-height: 105px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-stats { grid-template-columns: 1fr !important; }
    }

    [data-pg-my-pokes-dialog="true"] {
      z-index: 10026 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      width: min(660px, calc(100vw - 24px)) !important;
      height: min(470px, calc(100dvh - 24px)) !important;
      max-width: none !important;
      max-height: none !important;
      padding: 10px !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      border: 2px solid transparent !important;
      border-radius: 18px !important;
      background:
        radial-gradient(circle at 82% 0, rgba(35,117,207,.18), transparent 34%),
        linear-gradient(155deg, rgba(6,20,34,.995), rgba(3,11,20,.995)) padding-box,
        linear-gradient(118deg, #24c9ff, #3a86ce 45%, #f0c132 78%, #ff9f1b) border-box !important;
      color: #e8eef7 !important;
      box-shadow: 0 25px 74px rgba(0,0,0,.76), 0 0 28px rgba(34,166,226,.11) !important;
      transform: translate(-50%, -50%) !important;
      container: pg-pokes / inline-size !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-content {
      min-width: 0 !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      overflow: auto !important;
      scrollbar-width: thin !important;
      scrollbar-color: #348fd7 rgba(4,18,31,.84) !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-list {
      min-width: 0 !important;
      padding: 3px !important;
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(min(150px,100%),1fr)) !important;
      align-content: start !important;
      gap: 8px !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-card {
      box-sizing: border-box !important;
      min-width: 0 !important;
      min-height: 132px !important;
      padding: 9px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      overflow: hidden !important;
      border: 1px solid rgba(37,157,225,.58) !important;
      border-radius: 11px !important;
      background:
        radial-gradient(circle at 50% 0, rgba(28,117,190,.16), transparent 38%),
        linear-gradient(145deg, rgba(10,34,53,.97), rgba(5,19,32,.98)) !important;
      color: #e8f0f8 !important;
      font-size: 10px !important;
      text-align: center !important;
      overflow-wrap: anywhere !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-card img,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-card picture {
      width: 62px !important;
      height: 62px !important;
      max-width: 62px !important;
      max-height: 62px !important;
      object-fit: contain !important;
      filter: drop-shadow(0 7px 8px rgba(0,0,0,.55)) !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-card strong,
    [data-pg-my-pokes-dialog="true"] .pg-pokes-card b {
      color: #f7f9fc !important;
      font-size: 13px !important;
    }

    [data-pg-my-pokes-dialog="true"] .pg-pokes-footer {
      flex: 0 0 auto !important;
      margin: 8px -10px -10px !important;
      padding: 8px 10px !important;
      border-top: 1px solid rgba(52,135,200,.34) !important;
      background: rgba(4,20,36,.94) !important;
    }

    @container pg-pokes (max-width: 470px) {
      [data-pg-my-pokes-dialog="true"] .pg-pokes-header { min-height: 52px !important; padding: 14px 48px 10px 52px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-title { font-size: 17px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-title::before { top: 10px !important; left: 12px !important; width: 30px !important; height: 30px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-list { grid-template-columns: repeat(auto-fit, minmax(min(125px,100%),1fr)) !important; gap: 6px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card { min-height: 116px !important; padding: 7px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card img,
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card picture { width: 50px !important; height: 50px !important; }
    }

    [data-pg-team-panel="true"] {
      z-index: 8500 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: max(56px, calc(env(safe-area-inset-top) + 8px)) !important;
      right: auto !important;
      bottom: auto !important;
      left: max(23px, env(safe-area-inset-left)) !important;
      width: min(192px, calc(100vw - 34px)) !important;
      max-width: 192px !important;
      max-height: calc(100dvh - 66px) !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 7px !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #e8eef7 !important;
      box-shadow: none !important;
      transform: translateX(0) !important;
      transition: transform .22s ease, opacity .22s ease !important;
      container: pg-team / inline-size !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel,
    [data-pg-team-panel="true"] .pg-team-roster-panel {
      box-sizing: border-box !important;
      min-width: 0 !important;
      overflow: hidden !important;
      border: 1px solid rgba(61,157,219,.62) !important;
      border-radius: 12px !important;
      background:
        radial-gradient(circle at 12% 0, rgba(38,139,207,.16), transparent 34%),
        linear-gradient(155deg, rgba(7,24,40,.985), rgba(4,13,23,.99)) !important;
      box-shadow: 0 12px 30px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.055) !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel {
      flex: 0 0 auto !important;
      min-height: 66px !important;
      padding: 9px 10px !important;
      display: grid !important;
      grid-template-columns: 42px minmax(0,1fr) !important;
      align-items: center !important;
      gap: 9px !important;
      border-color: rgba(226,174,54,.72) !important;
      background:
        radial-gradient(circle at 10% 10%, rgba(226,174,54,.13), transparent 34%),
        linear-gradient(145deg, rgba(11,29,45,.99), rgba(5,15,25,.99)) !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel:empty { display: none !important; }
    [data-pg-player-source-hidden="true"] { display: none !important; }
    [data-pg-team-host-neutralized="true"] { display: contents !important; }

    [data-pg-team-panel="true"] .pg-player-avatar {
      grid-column: 1 !important;
      grid-row: 1 / span 5 !important;
      width: 40px !important;
      height: 40px !important;
      max-width: 40px !important;
      max-height: 40px !important;
      display: block !important;
      object-fit: contain !important;
      filter: drop-shadow(0 5px 6px rgba(0,0,0,.58)) !important;
    }

    [data-pg-team-panel="true"] picture.pg-player-avatar img {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      object-fit: contain !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel > :not(.pg-player-avatar),
    [data-pg-team-panel="true"] .pg-player-panel > :not(.pg-player-avatar) * {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel > :not(.pg-player-avatar) {
      grid-column: 2 !important;
      margin: 0 !important;
      max-height: none !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel strong,
    [data-pg-team-panel="true"] .pg-player-panel b,
    [data-pg-team-panel="true"] .pg-player-panel h2,
    [data-pg-team-panel="true"] .pg-player-panel h3 {
      margin: 0 !important;
      color: #f6d879 !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
    }

    [data-pg-team-panel="true"] .pg-player-panel small,
    [data-pg-team-panel="true"] .pg-player-panel span,
    [data-pg-team-panel="true"] .pg-player-panel p {
      margin: 1px 0 !important;
      color: #9fb6ca !important;
      font-size: 9.5px !important;
      line-height: 1.3 !important;
    }

    [data-pg-team-panel="true"] .pg-team-roster-panel {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    [data-pg-team-panel="true"] .pg-team-titlebar {
      flex: 0 0 auto !important;
      min-height: 31px !important;
      padding: 6px 7px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      border-bottom: 1px solid rgba(52,143,207,.36) !important;
      background: linear-gradient(120deg, rgba(4,52,93,.94), rgba(4,27,58,.96)) !important;
      color: #f3f7fb !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      letter-spacing: .03em !important;
      text-transform: uppercase !important;
    }

    [data-pg-team-panel="true"] .pg-team-titlebar::before {
      content: "\\25C9" !important;
      margin-right: 4px !important;
      color: #ffcb3c !important;
      font-size: 10px !important;
    }

    [data-pg-team-panel="true"] .pg-team-titlebar-label { margin-right: auto !important; }
    [data-pg-team-panel="true"] .pg-team-count {
      color: #6fc5ff !important;
      font-size: 7px !important;
      white-space: nowrap !important;
    }

    [data-pg-team-panel="true"] .pg-team-list {
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 5px !important;
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(min(190px,100%),1fr)) !important;
      grid-auto-rows: min-content !important;
      align-content: start !important;
      gap: 5px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      scrollbar-width: thin !important;
      scrollbar-color: #338ed6 rgba(4,18,31,.82) !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot {
      box-sizing: border-box !important;
      position: relative !important;
      min-width: 0 !important;
      min-height: 58px !important;
      height: auto !important;
      margin: 0 !important;
      padding: 6px 19px 6px 6px !important;
      display: grid !important;
      grid-template-columns: 44px minmax(0,1fr) !important;
      grid-auto-rows: min-content !important;
      align-items: center !important;
      gap: 1px 5px !important;
      overflow: hidden !important;
      border: 1px solid rgba(61,123,173,.56) !important;
      border-radius: 10px !important;
      background:
        radial-gradient(circle at 5% 10%, rgba(41,128,188,.13), transparent 35%),
        linear-gradient(145deg, rgba(12,35,54,.97), rgba(6,20,33,.985)) !important;
      color: #dbe7f2 !important;
      font-size: 7px !important;
      line-height: 1.16 !important;
      cursor: pointer !important;
      transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot:hover {
      border-color: rgba(53,194,255,.86) !important;
      background:
        radial-gradient(circle at 8% 10%, rgba(46,168,232,.21), transparent 38%),
        linear-gradient(145deg, rgba(12,43,67,.985), rgba(5,23,39,.99)) !important;
      box-shadow: inset 0 0 0 1px rgba(61,184,242,.13), 0 7px 18px rgba(0,0,0,.32) !important;
      transform: translateY(-1px) !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot[data-pg-team-selected="true"],
    [data-pg-team-panel="true"] .pg-team-slot.active,
    [data-pg-team-panel="true"] .pg-team-slot[aria-selected="true"] {
      border-color: rgba(255,205,47,.92) !important;
      background:
        radial-gradient(circle at 7% 10%, rgba(255,199,32,.2), transparent 38%),
        linear-gradient(145deg, rgba(52,42,13,.97), rgba(8,24,35,.99)) !important;
      box-shadow: inset 0 0 0 1px rgba(255,202,39,.16), 0 0 16px rgba(255,195,25,.12) !important;
    }

    [data-pg-team-panel="true"] .pg-team-sprite,
    [data-pg-team-panel="true"] picture.pg-team-sprite,
    [data-pg-team-panel="true"] [role="img"].pg-team-sprite,
    [data-pg-team-panel="true"] .pg-team-background-sprite {
      grid-column: 1 !important;
      grid-row: 1 / span 4 !important;
      width: 41px !important;
      height: 41px !important;
      max-width: 41px !important;
      max-height: 41px !important;
      display: block !important;
      object-fit: contain !important;
      opacity: 1 !important;
      visibility: visible !important;
      filter: drop-shadow(0 6px 7px rgba(0,0,0,.6)) saturate(1.08) !important;
      image-rendering: auto !important;
    }

    [data-pg-team-panel="true"] .pg-team-sprite-host {
      grid-column: 1 !important;
      grid-row: 1 / span 4 !important;
      position: relative !important;
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      min-height: 44px !important;
      display: grid !important;
      place-items: center !important;
      align-self: center !important;
      overflow: visible !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    [data-pg-team-panel="true"] .pg-team-sprite-host > :not(.pg-team-type-icon):not(.pk-ts-type):not(.pk-ts-shiny) {
      position: relative !important;
      z-index: 1 !important;
      flex: 0 0 auto !important;
    }

    [data-pg-team-panel="true"] .pg-team-native-sprite-image {
      object-fit: initial !important;
      max-width: none !important;
      max-height: none !important;
    }

    [data-pg-team-panel="true"] .pg-team-background-sprite {
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
    }

    [data-pg-team-panel="true"] picture.pg-team-sprite img,
    [data-pg-team-panel="true"] .pg-team-sprite-image {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      object-fit: contain !important;
    }

    [data-pg-team-panel="true"] .pg-team-type-icon {
      position: absolute !important;
      z-index: 3 !important;
      top: 1px !important;
      right: 1px !important;
      width: 7px !important;
      height: 7px !important;
      max-width: 7px !important;
      max-height: 7px !important;
      display: block !important;
      object-fit: contain !important;
      opacity: .9 !important;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.65)) !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot > :not(.pg-team-sprite):not(.pg-team-sprite-host):not(.pg-team-type-icon) {
      grid-column: 2 !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot strong,
    [data-pg-team-panel="true"] .pg-team-slot b {
      color: #f5f8fc !important;
      font-size: 9px !important;
      font-weight: 900 !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot progress,
    [data-pg-team-panel="true"] .pg-team-slot [role="progressbar"] {
      width: 100% !important;
      height: 6px !important;
      padding: 1px !important;
      border: 1px solid rgba(75,112,141,.44) !important;
      border-radius: 99px !important;
      accent-color: #5cda72 !important;
      appearance: none !important;
      -webkit-appearance: none !important;
      background: rgba(2,10,17,.88) !important;
      box-shadow: inset 0 1px 3px rgba(0,0,0,.75), 0 1px 0 rgba(255,255,255,.035) !important;
      overflow: hidden !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot progress::-webkit-progress-bar {
      border-radius: 99px !important;
      background: rgba(2,10,17,.88) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot progress::-webkit-progress-value {
      border-radius: 99px !important;
      background: linear-gradient(90deg, #28c75f, #83ee67) !important;
      box-shadow: 0 0 7px rgba(70,225,103,.35) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot progress:nth-of-type(2)::-webkit-progress-value {
      background: linear-gradient(90deg, #e4a91e, #ffe064) !important;
      box-shadow: 0 0 7px rgba(255,200,43,.3) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot progress.pg-team-xp-meter::-webkit-progress-value,
    [data-pg-team-panel="true"] .pg-team-slot .pg-team-xp-meter::-webkit-progress-value {
      background: linear-gradient(90deg, #e4a91e, #ffe064) !important;
      box-shadow: 0 0 7px rgba(255,200,43,.3) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot [class*="hp" i][class*="bar" i],
    [data-pg-team-panel="true"] .pg-team-slot [class*="health" i][class*="bar" i],
    [data-pg-team-panel="true"] .pg-team-slot [class*="exp" i][class*="bar" i] {
      min-height: 5px !important;
      overflow: hidden !important;
      border: 1px solid rgba(75,112,141,.44) !important;
      border-radius: 99px !important;
      background: rgba(2,10,17,.88) !important;
      box-shadow: inset 0 1px 3px rgba(0,0,0,.72) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot [class*="hp" i][class*="bar" i] > *,
    [data-pg-team-panel="true"] .pg-team-slot [class*="health" i][class*="bar" i] > * {
      border-radius: inherit !important;
      background: linear-gradient(90deg, #28c75f, #83ee67) !important;
      box-shadow: 0 0 7px rgba(70,225,103,.32) !important;
    }
    [data-pg-team-panel="true"] .pg-team-slot [class*="exp" i][class*="bar" i] > * {
      border-radius: inherit !important;
      background: linear-gradient(90deg, #e4a91e, #ffe064) !important;
      box-shadow: 0 0 7px rgba(255,200,43,.28) !important;
    }

    .pg-team-side-toggle {
      z-index: 8501 !important;
      position: fixed !important;
      top: var(--pg-team-toggle-top, 117px) !important;
      right: auto !important;
      left: var(--pg-team-toggle-left, 0px) !important;
      width: 23px !important;
      height: 50px !important;
      padding: 0 !important;
      display: none !important;
      place-items: center !important;
      border: 1px solid rgba(61,157,219,.72) !important;
      border-right: 0 !important;
      border-radius: 10px 0 0 10px !important;
      background: linear-gradient(180deg, rgba(11,36,58,.98), rgba(5,17,29,.99)) !important;
      color: #76cdf7 !important;
      box-shadow: 7px 0 18px rgba(0,0,0,.36) !important;
      cursor: pointer !important;
      transition: left .22s ease, color .16s ease, border-color .16s ease !important;
    }

    html.pg-has-team .pg-team-side-toggle { display: grid !important; }
    .pg-team-side-toggle::before {
      content: "\\2039" !important;
      font: 900 22px/1 "Segoe UI", sans-serif !important;
      transform: none !important;
    }

    html.pg-team-hud-collapsed [data-pg-team-panel="true"] {
      pointer-events: none !important;
      opacity: .08 !important;
      transform: translateX(calc(-100% - 18px)) !important;
    }
    html.pg-team-hud-collapsed .pg-team-side-toggle {
      left: 0 !important;
      border-right: 1px solid rgba(226,174,54,.78) !important;
      border-radius: 0 10px 10px 0 !important;
      color: #f0c24d !important;
    }
    html.pg-team-hud-collapsed .pg-team-side-toggle::before { content: "\\203A" !important; }

    @container pg-team (max-width: 220px) {
      [data-pg-team-panel="true"] .pg-player-panel { min-height: 62px !important; padding: 8px 9px !important; grid-template-columns: 39px minmax(0,1fr) !important; }
      [data-pg-team-panel="true"] .pg-player-avatar { width: 37px !important; height: 37px !important; max-width: 37px !important; max-height: 37px !important; }
      [data-pg-team-panel="true"] .pg-team-list { padding: 5px !important; gap: 5px !important; }
      [data-pg-team-panel="true"] .pg-team-slot { min-height: 55px !important; padding: 5px 18px 5px 5px !important; grid-template-columns: 40px minmax(0,1fr) !important; gap: 1px 5px !important; }
      [data-pg-team-panel="true"] .pg-team-sprite,
      [data-pg-team-panel="true"] picture.pg-team-sprite,
      [data-pg-team-panel="true"] [role="img"].pg-team-sprite,
      [data-pg-team-panel="true"] .pg-team-background-sprite { width: 37px !important; height: 37px !important; max-width: 37px !important; max-height: 37px !important; }
      [data-pg-team-panel="true"] .pg-team-sprite-host { width: 40px !important; height: 40px !important; min-width: 40px !important; min-height: 40px !important; }
    }

    [data-pg-surface="true"] {
      border: 1px solid rgba(227,168,47,.48) !important;
      border-radius: 13px !important;
      background:
        radial-gradient(circle at 80% 0, rgba(50,93,136,.12), transparent 30%),
        linear-gradient(155deg, rgba(9,19,31,.985), rgba(5,12,20,.985)) !important;
      color: #dce6f1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 18px 48px rgba(0,0,0,.58) !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(227,168,47,.42) #07111d !important;
    }

    .clog-window[data-pg-clog-themed="true"] {
      z-index: 10030 !important;
      box-sizing: border-box !important;
      top: 50% !important;
      left: 50% !important;
      width: min(680px, calc(100vw - 24px)) !important;
      height: min(440px, calc(100dvh - 24px)) !important;
      min-width: min(340px, calc(100vw - 12px)) !important;
      min-height: min(280px, calc(100dvh - 12px)) !important;
      max-width: none !important;
      max-height: none !important;
      overflow: hidden !important;
      border: 2px solid transparent !important;
      border-radius: 22px !important;
      background:
        linear-gradient(155deg, rgba(7,21,36,.995), rgba(4,13,23,.995)) padding-box,
        linear-gradient(115deg, #27d8ff, #4ce1be 22%, #f2d23f 60%, #ffbd25) border-box !important;
      color: #e8eef7 !important;
      box-shadow: 0 26px 76px rgba(0,0,0,.74), 0 0 34px rgba(27,158,223,.13) !important;
      transform: translate(-50%, -50%) !important;
      resize: none !important;
      container: pg-clog / inline-size !important;
    }

    .clog-window[data-pg-clog-themed="true"]::after { display: none !important; }

    .clog-window[data-pg-clog-themed="true"] .clog-title {
      box-sizing: border-box !important;
      min-height: 70px !important;
      padding: 17px 62px 12px 74px !important;
      border-bottom: 1px solid rgba(43,164,231,.42) !important;
      background:
        radial-gradient(circle at 80% 15%, rgba(24,111,210,.25), transparent 35%),
        linear-gradient(120deg, rgba(3,51,97,.98), rgba(3,28,67,.98)) !important;
      color: #f7f9fc !important;
      font: 900 clamp(19px, 4cqi, 27px)/1 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .04em !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 5px rgba(0,0,0,.7) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-title::before {
      content: "" !important;
      position: absolute !important;
      top: 13px !important;
      left: 18px !important;
      width: 42px !important;
      height: 42px !important;
      border: 3px solid #091421 !important;
      border-radius: 50% !important;
      background:
        radial-gradient(circle, #f7fbff 0 14%, #101a27 15% 25%, transparent 26%),
        linear-gradient(#ef493d 0 43%, #101823 44% 57%, #f1f5f8 58%) !important;
      box-shadow: 0 0 0 2px rgba(255,255,255,.35), 0 7px 16px rgba(0,0,0,.5) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-title small {
      display: block !important;
      margin-top: 5px !important;
      color: #d0dced !important;
      font: 500 14px/1.2 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-x {
      z-index: 120 !important;
      top: 14px !important;
      right: 15px !important;
      width: 40px !important;
      height: 40px !important;
      border: 1px solid rgba(100,177,242,.68) !important;
      border-radius: 12px !important;
      background: rgba(9,32,62,.78) !important;
      color: #e4f0fc !important;
      font-size: 0 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-x::before,
    .clog-window[data-pg-clog-themed="true"] .clog-x::after {
      content: "" !important;
      position: absolute !important;
      top: 18px !important;
      left: 10px !important;
      width: 20px !important;
      height: 3px !important;
      border-radius: 2px !important;
      background: #e7f1fb !important;
    }
    .clog-window[data-pg-clog-themed="true"] .clog-x::before { transform: rotate(45deg) !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-x::after { transform: rotate(-45deg) !important; }

    .clog-window[data-pg-clog-themed="true"] .clog-head {
      padding: 13px 18px 8px !important;
      display: block !important;
      background: rgba(3,16,30,.56) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-tabs {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 10px !important;
      width: min(620px, 100%) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-tab {
      min-height: 42px !important;
      padding: 8px 14px !important;
      border: 1px solid rgba(87,131,177,.6) !important;
      border-radius: 9px !important;
      background: linear-gradient(180deg, rgba(21,50,82,.92), rgba(9,28,49,.94)) !important;
      color: #d7e1ec !important;
      font: 800 12px/1.1 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-tab.on {
      border-color: #ffd329 !important;
      background: linear-gradient(135deg, #ffe04d, #ffba16) !important;
      color: #101721 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 0 16px rgba(255,201,28,.18) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .pg-clog-columns {
      margin: 0 18px !important;
      padding: 9px 14px !important;
      display: grid !important;
      grid-template-columns: 46px minmax(140px,1.35fr) 70px minmax(110px,1fr) minmax(95px,.8fr) 102px !important;
      align-items: center !important;
      gap: 10px !important;
      border: 1px solid rgba(69,116,165,.43) !important;
      border-radius: 10px !important;
      background: rgba(4,23,43,.72) !important;
      color: #7fa8d8 !important;
      font: 800 10px/1 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .08em !important;
      text-transform: uppercase !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-list {
      min-height: 80px !important;
      padding: 8px 18px 10px !important;
      gap: 7px !important;
      scrollbar-width: thin !important;
      scrollbar-color: #2b8fd7 rgba(4,18,32,.8) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-list::-webkit-scrollbar { width: 7px !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-list::-webkit-scrollbar-thumb {
      border-radius: 99px !important;
      background: linear-gradient(#38bdf8, #2879c5) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-row {
      box-sizing: border-box !important;
      min-height: 54px !important;
      padding: 7px 14px !important;
      grid-template-columns: 46px minmax(140px,1.35fr) 70px minmax(110px,1fr) minmax(95px,.8fr) 102px !important;
      gap: 10px !important;
      border: 1px solid rgba(105,129,153,.42) !important;
      border-radius: 12px !important;
      background: linear-gradient(100deg, rgba(18,34,49,.95), rgba(8,24,38,.96)) !important;
      color: #dce6f1 !important;
      font-size: 12px !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.025) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-row:hover {
      border-color: rgba(57,171,237,.52) !important;
      background: linear-gradient(100deg, rgba(22,45,65,.97), rgba(10,29,45,.97)) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-row.shiny {
      border-color: rgba(255,205,45,.58) !important;
      background: linear-gradient(100deg, rgba(62,46,9,.67), rgba(12,27,40,.97)) !important;
      box-shadow: inset 3px 0 0 #ffd32b, inset 0 1px 0 rgba(255,255,255,.04) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-ico img {
      width: 40px !important;
      height: 40px !important;
      object-fit: contain !important;
      filter: drop-shadow(0 5px 6px rgba(0,0,0,.58)) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-name {
      color: #f2f6fa !important;
      font-size: 14px !important;
      font-weight: 800 !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-row.shiny .clog-name { color: #ffe46b !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-lvl { color: #39bdf5 !important; font-weight: 700 !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-meta {
      width: max-content !important;
      max-width: 100% !important;
      padding: 4px 9px !important;
      border: 1px solid rgba(115,79,212,.52) !important;
      border-radius: 6px !important;
      background: rgba(73,40,127,.38) !important;
      color: #d891ff !important;
      font-weight: 800 !important;
    }
    .clog-window[data-pg-clog-themed="true"] .clog-ball { color: #e0e7ef !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-when { color: #aebed0 !important; font-variant-numeric: tabular-nums !important; }
    .clog-window[data-pg-clog-themed="true"] .clog-first {
      border: 1px solid rgba(67,222,111,.5) !important;
      background: rgba(22,137,62,.45) !important;
      color: #78f3a0 !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-foot {
      min-height: 70px !important;
      padding: 10px 18px 14px !important;
      border-top: 1px solid rgba(42,154,218,.42) !important;
      background: linear-gradient(180deg, rgba(4,29,55,.9), rgba(4,20,38,.96)) !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-totals {
      margin-left: auto !important;
      padding: 7px 12px !important;
      gap: 16px !important;
      border: 1px solid rgba(55,132,194,.36) !important;
      border-radius: 10px !important;
      background: rgba(3,22,42,.66) !important;
      color: #aebed0 !important;
      font-size: 11px !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-head > .clog-totals { display: none !important; }

    .clog-window[data-pg-clog-themed="true"] .clog-totals b {
      color: #f3f7fb !important;
      font-size: 16px !important;
    }

    .clog-window[data-pg-clog-themed="true"] .clog-note { color: #9fb3ca !important; line-height: 1.35 !important; }

    .clog-window[data-pg-clog-themed="true"] .clog-row[data-pg-rarity="common"] .clog-meta {
      border-color: rgba(42,211,101,.55) !important; background: rgba(10,111,53,.42) !important; color: #72f3a2 !important;
    }
    .clog-window[data-pg-clog-themed="true"] .clog-row[data-pg-rarity="uncommon"] .clog-meta {
      border-color: rgba(49,159,239,.58) !important; background: rgba(13,76,133,.44) !important; color: #65d6ff !important;
    }
    .clog-window[data-pg-clog-themed="true"] .clog-row[data-pg-rarity="epic"] .clog-meta {
      border-color: rgba(241,166,24,.62) !important; background: rgba(134,75,5,.48) !important; color: #ffc85a !important;
    }
    .clog-window[data-pg-clog-themed="true"] .clog-clear {
      min-height: 38px !important;
      padding: 8px 15px !important;
      border: 1px solid #ffd22d !important;
      border-radius: 9px !important;
      background: linear-gradient(135deg, #ffe34d, #ffb917) !important;
      color: #141a20 !important;
      font-size: 11px !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 5px 15px rgba(255,188,21,.16) !important;
    }

    @media (max-width: 900px), (max-height: 420px) {
      .clog-window[data-pg-clog-themed="true"] {
        top: 6px !important;
        right: 6px !important;
        bottom: 6px !important;
        left: 6px !important;
        width: auto !important;
        height: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        border-radius: 14px !important;
        transform: none !important;
        resize: none !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-title {
        min-height: 58px !important;
        padding: 15px 54px 10px 62px !important;
        font-size: 19px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-title::before {
        top: 11px !important;
        left: 15px !important;
        width: 36px !important;
        height: 36px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-title small { margin-top: 4px !important; font-size: 10px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-x {
        top: 10px !important;
        right: 10px !important;
        width: 36px !important;
        height: 36px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-x::before,
      .clog-window[data-pg-clog-themed="true"] .clog-x::after {
        top: 16px !important;
        left: 9px !important;
        width: 18px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-head { padding: 8px 10px 5px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-tab { min-height: 34px !important; padding: 6px !important; font-size: 9px !important; }
      .clog-window[data-pg-clog-themed="true"] .pg-clog-columns { display: none !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-list { padding: 5px 10px !important; gap: 5px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-row {
        min-height: 46px !important;
        padding: 5px 8px !important;
        grid-template-columns: 36px minmax(110px,1.5fr) 54px minmax(90px,1fr) !important;
        gap: 7px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-ball,
      .clog-window[data-pg-clog-themed="true"] .clog-when { display: none !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-foot { min-height: 50px !important; padding: 7px 10px !important; gap: 7px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-totals { margin-left: 0 !important; padding: 5px 8px !important; gap: 8px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-note { display: none !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-clear { min-height: 32px !important; padding: 5px 9px !important; font-size: 9px !important; }
    }

    @media (max-width: 480px) {
      .clog-window[data-pg-clog-themed="true"] .clog-row {
        min-height: 76px !important;
        grid-template-columns: 34px minmax(0,1fr) auto !important;
        grid-template-rows: auto auto !important;
        align-content: center !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-ico { grid-row: 1 / 3 !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-name { grid-column: 2 !important; grid-row: 1 !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-lvl { grid-column: 3 !important; grid-row: 1 !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-meta {
        grid-column: 2 / -1 !important;
        grid-row: 2 !important;
        margin-top: 3px !important;
      }
      .clog-window[data-pg-clog-themed="true"] .clog-lvl { text-align: right !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-foot { flex-wrap: wrap !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-totals { order: 1 !important; width: 100% !important; justify-content: center !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-clear { order: 2 !important; width: 100% !important; }
    }

    [data-pg-capture-management="true"] {
      z-index: 10034 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      width: min(680px, calc(100vw - 24px)) !important;
      height: min(440px, calc(100dvh - 24px)) !important;
      min-width: min(340px, calc(100vw - 12px)) !important;
      min-height: min(280px, calc(100dvh - 12px)) !important;
      max-width: none !important;
      max-height: none !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      border: 2px solid transparent !important;
      border-radius: 20px !important;
      background:
        radial-gradient(circle at 82% 0, rgba(23,100,185,.22), transparent 32%),
        linear-gradient(155deg, rgba(5,20,36,.995), rgba(3,11,21,.995)) padding-box,
        linear-gradient(115deg, #20c8ff, #397fc8 48%, #e6b932) border-box !important;
      color: #e8eef7 !important;
      box-shadow: 0 27px 82px rgba(0,0,0,.78), 0 0 32px rgba(32,200,255,.12) !important;
      transform: translate(-50%, -50%) !important;
      container: pg-cm / inline-size !important;
    }

    [data-pg-capture-management="true"][data-pg-floating="true"] {
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
    }

    [data-pg-capture-management="true"] .pg-cm-header {
      position: relative !important;
      flex: 0 0 auto !important;
      min-height: 68px !important;
      padding: 14px 58px 11px 72px !important;
      border-bottom: 1px solid rgba(52,139,211,.38) !important;
      background:
        radial-gradient(circle at 78% 12%, rgba(24,104,210,.2), transparent 38%),
        linear-gradient(120deg, rgba(3,43,82,.98), rgba(3,22,50,.98)) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-drag-handle {
      margin: 0 !important;
      color: #f7f9fc !important;
      font: 900 clamp(18px, 4.1cqi, 27px)/1.08 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 5px rgba(0,0,0,.72) !important;
      cursor: grab !important;
      user-select: none !important;
      touch-action: none !important;
    }

    [data-pg-capture-management="true"] .pg-cm-header::before {
      content: "" !important;
      position: absolute !important;
      top: 13px !important;
      left: 17px !important;
      width: 40px !important;
      height: 40px !important;
      border: 3px solid #091421 !important;
      border-radius: 50% !important;
      background:
        radial-gradient(circle, #f7fbff 0 14%, #101a27 15% 25%, transparent 26%),
        linear-gradient(#ef493d 0 43%, #101823 44% 57%, #f1f5f8 58%) !important;
      box-shadow: 0 0 0 2px rgba(255,255,255,.32), 0 7px 16px rgba(0,0,0,.5) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-subtitle {
      display: block !important;
      margin: 5px 0 0 !important;
      color: #bdd2e9 !important;
      font: 500 12px/1.2 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    [data-pg-capture-management="true"] .pg-cm-close {
      z-index: 120 !important;
      position: absolute !important;
      top: 13px !important;
      right: 14px !important;
      width: 40px !important;
      height: 40px !important;
      padding: 0 !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid rgba(100,177,242,.68) !important;
      border-radius: 12px !important;
      background: rgba(9,32,62,.82) !important;
      color: #e4f0fc !important;
      font-size: 20px !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    [data-pg-capture-management="true"] .pg-cm-controls {
      flex: 0 0 auto !important;
      padding: 10px 14px 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      border-bottom: 1px solid rgba(57,126,187,.28) !important;
      background: rgba(3,17,31,.64) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-tab-group {
      min-width: 0 !important;
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 7px !important;
    }

    [data-pg-capture-management="true"] .pg-cm-tab,
    [data-pg-capture-management="true"] .pg-cm-view-button {
      min-height: 36px !important;
      padding: 7px 12px !important;
      border: 1px solid rgba(66,132,194,.64) !important;
      border-radius: 9px !important;
      background: linear-gradient(180deg, rgba(15,43,72,.95), rgba(6,23,42,.96)) !important;
      color: #a9c4e8 !important;
      font: 800 10px/1.1 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
    }

    [data-pg-capture-management="true"] .pg-cm-tab.pg-cm-active,
    [data-pg-capture-management="true"] .pg-cm-tab.active,
    [data-pg-capture-management="true"] .pg-cm-tab[aria-selected="true"],
    [data-pg-capture-management="true"] .pg-cm-tab[aria-pressed="true"],
    [data-pg-capture-management="true"] .pg-cm-view-button[aria-pressed="true"] {
      border-color: #ffd22b !important;
      background: linear-gradient(135deg, #ffe24b, #ffb916) !important;
      color: #111923 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 0 15px rgba(255,195,25,.18) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-view-switch {
      flex: 0 0 auto !important;
      display: flex !important;
      gap: 6px !important;
    }

    [data-pg-capture-management="true"] .pg-cm-view-button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      cursor: pointer !important;
    }

    [data-pg-capture-management="true"] .pg-cm-view-icon {
      font-size: 14px !important;
      line-height: 1 !important;
    }

    [data-pg-capture-management="true"] .pg-cm-content {
      min-width: 0 !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    [data-pg-capture-management="true"] .pg-cm-list {
      min-width: 0 !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      padding: 9px 12px !important;
      overflow: auto !important;
      scrollbar-width: thin !important;
      scrollbar-color: #338ee0 rgba(3,17,31,.72) !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="linear"] .pg-cm-list:not(tbody) {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }

    [data-pg-capture-management="true"] .pg-cm-item {
      box-sizing: border-box !important;
      position: relative !important;
      min-width: 0 !important;
      border: 1px solid rgba(74,126,172,.44) !important;
      border-radius: 11px !important;
      background: linear-gradient(100deg, rgba(15,34,52,.94), rgba(6,23,38,.97)) !important;
      color: #dce7f2 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.025) !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="linear"] .pg-cm-item {
      min-height: 48px !important;
      padding: 7px 10px !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-table {
      display: block !important;
      width: 100% !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] table thead,
    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-table thead {
      display: none !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-list {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(min(255px, 100%), 1fr)) !important;
      grid-auto-rows: minmax(174px, auto) !important;
      align-content: start !important;
      gap: 9px !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-item {
      min-height: 174px !important;
      height: auto !important;
      padding: 10px 11px !important;
      display: grid !important;
      grid-template-columns: repeat(10, minmax(0, 1fr)) !important;
      grid-template-rows: auto minmax(58px, 1fr) auto auto !important;
      align-items: center !important;
      column-gap: 5px !important;
      row-gap: 7px !important;
      overflow: hidden !important;
      border-color: rgba(31,163,235,.72) !important;
      background:
        radial-gradient(circle at 8% 0, rgba(22,117,190,.2), transparent 35%),
        linear-gradient(145deg, rgba(8,34,55,.98), rgba(4,20,34,.98)) !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-item > * {
      box-sizing: border-box !important;
      min-width: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-id {
      grid-column: 1 / -1 !important;
      grid-row: 1 !important;
      align-self: start !important;
      color: #78b8ff !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: .045em !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-pokemon {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
      min-height: 58px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      color: #f4f7fb !important;
      font-size: 14px !important;
      font-weight: 900 !important;
      line-height: 1.15 !important;
      overflow: hidden !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-pokemon img,
    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-pokemon picture {
      flex: 0 0 58px !important;
      width: 58px !important;
      height: 58px !important;
      max-width: 58px !important;
      max-height: 58px !important;
      object-fit: contain !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-ball-stat {
      grid-row: 3 !important;
      grid-column: span 2 !important;
      min-height: 26px !important;
      padding: 3px 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      border: 1px solid rgba(83,123,158,.46) !important;
      border-radius: 7px !important;
      background: rgba(8,25,40,.86) !important;
      color: #e1e9f2 !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      white-space: nowrap !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-ball-stat img {
      width: 17px !important;
      height: 17px !important;
      max-width: 17px !important;
      max-height: 17px !important;
      object-fit: contain !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-ball-stat-single {
      grid-column: 1 / -1 !important;
      justify-self: start !important;
      min-width: 58px !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-recent,
    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-total {
      grid-row: 4 !important;
      min-height: 39px !important;
      padding-top: 6px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      border-top: 1px solid rgba(71,112,146,.35) !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      line-height: 1.05 !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-recent {
      grid-column: 1 / 6 !important;
      color: #ffd328 !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-total {
      grid-column: 6 / -1 !important;
      border-left: 1px solid rgba(71,112,146,.35) !important;
      color: #78aaff !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-recent::before,
    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-total::before {
      margin-bottom: 3px !important;
      color: #a9bdd2 !important;
      font-size: 8px !important;
      font-weight: 600 !important;
      letter-spacing: .015em !important;
      line-height: 1 !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-recent::before { content: "Intentos recientes" !important; }
    [data-pg-capture-management="true"][data-pg-cm-view="grid"] .pg-cm-total::before { content: "Total intentos" !important; }

    [data-pg-capture-management="true"] .pg-cm-item[data-pg-cm-shiny="true"] {
      border-color: rgba(255,204,40,.84) !important;
      background:
        radial-gradient(circle at 8% 0, rgba(255,199,28,.16), transparent 35%),
        linear-gradient(145deg, rgba(42,36,15,.96), rgba(5,20,31,.98)) !important;
      box-shadow: inset 0 0 0 1px rgba(255,199,28,.12), 0 0 14px rgba(255,199,28,.08) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-item img {
      image-rendering: auto !important;
      filter: drop-shadow(0 5px 5px rgba(0,0,0,.55)) !important;
    }

    [data-pg-capture-management="true"] .pg-cm-item[data-pg-cm-shiny="true"] .pg-cm-id,
    [data-pg-capture-management="true"] .pg-cm-item[data-pg-cm-shiny="true"] .pg-cm-pokemon {
      color: #ffda3d !important;
    }

    [data-pg-capture-management="true"][data-pg-cm-view="linear"] .pg-cm-item > * {
      padding: 8px 7px !important;
      vertical-align: middle !important;
    }

    [data-pg-capture-management="true"] .pg-cm-footer {
      flex: 0 0 auto !important;
      min-height: 54px !important;
      padding: 8px 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      border-top: 1px solid rgba(53,134,199,.36) !important;
      background: linear-gradient(180deg, rgba(4,25,46,.94), rgba(3,15,29,.98)) !important;
    }

    [data-pg-capture-management="true"] input[type="search"],
    [data-pg-capture-management="true"] input[placeholder] {
      min-width: min(230px, 100%) !important;
      min-height: 36px !important;
      border: 1px solid rgba(67,126,181,.55) !important;
      border-radius: 9px !important;
      padding: 7px 11px !important;
      background: rgba(3,15,29,.92) !important;
      color: #e5edf7 !important;
      outline: none !important;
    }

    [data-pg-capture-management="true"] input:focus {
      border-color: #28bffc !important;
      box-shadow: 0 0 0 3px rgba(40,191,252,.1) !important;
    }

    @container pg-cm (max-width: 570px) {
      .pg-cm-header { min-height: 60px !important; padding: 13px 52px 9px 60px !important; }
      .pg-cm-header::before { top: 11px !important; left: 13px !important; width: 34px !important; height: 34px !important; }
      .pg-cm-close { top: 10px !important; right: 10px !important; width: 36px !important; height: 36px !important; }
      .pg-cm-controls { align-items: stretch !important; flex-direction: column !important; padding: 7px 9px !important; }
      .pg-cm-tab-group, .pg-cm-view-switch { width: 100% !important; }
      .pg-cm-tab, .pg-cm-view-button { flex: 1 1 0 !important; min-width: 0 !important; padding: 6px !important; font-size: 8.5px !important; white-space: normal !important; }
      .pg-cm-list { padding: 7px 8px !important; }
      .pg-cm-footer { padding: 7px 8px !important; }
      .pg-cm-footer input { width: 100% !important; }
    }

    @container pg-cm (max-width: 390px) {
      .pg-cm-subtitle { display: none !important; }
      .pg-cm-header { min-height: 52px !important; padding-top: 16px !important; }
      .pg-cm-view-button { min-height: 32px !important; }
      .pg-cm-item { font-size: 10px !important; }
      [data-pg-cm-view="grid"] .pg-cm-list { grid-template-columns: 1fr !important; }
    }

    [data-pg-hunt-dialog="true"] {
      z-index: 10032 !important;
      box-sizing: border-box !important;
      position: fixed !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      left: 50% !important;
      width: min(560px, calc(100vw - 24px)) !important;
      height: min(360px, calc(100dvh - 24px)) !important;
      min-width: min(320px, calc(100vw - 12px)) !important;
      min-height: min(250px, calc(100dvh - 12px)) !important;
      max-width: none !important;
      max-height: none !important;
      padding: 14px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      border: 2px solid transparent !important;
      border-radius: 20px !important;
      background:
        radial-gradient(circle at 80% 0, rgba(27,116,210,.2), transparent 34%),
        linear-gradient(155deg, rgba(6,20,34,.995), rgba(4,12,21,.995)) padding-box,
        linear-gradient(120deg, #27d8ff, #5be2bd 24%, #f2d23f 62%, #ffb91d) border-box !important;
      color: #e6edf6 !important;
      box-shadow: 0 26px 76px rgba(0,0,0,.74), 0 0 30px rgba(34,163,229,.12) !important;
      transform: translate(-50%, -50%) !important;
      scrollbar-width: thin !important;
      scrollbar-color: #2d8fd5 rgba(4,18,31,.84) !important;
      container: pg-hunt / inline-size !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-title {
      box-sizing: border-box !important;
      position: relative !important;
      min-height: 56px !important;
      margin: -14px -14px 10px !important;
      padding: 15px 58px 11px 60px !important;
      display: flex !important;
      align-items: center !important;
      border-bottom: 1px solid rgba(46,161,223,.42) !important;
      background:
        radial-gradient(circle at 82% 20%, rgba(29,118,215,.28), transparent 34%),
        linear-gradient(120deg, rgba(3,52,97,.99), rgba(3,27,64,.99)) !important;
      color: #f7f9fc !important;
      font: 900 clamp(16px, 4cqi, 21px)/1 "Segoe UI", system-ui, sans-serif !important;
      letter-spacing: .04em !important;
      text-transform: uppercase !important;
      text-shadow: 0 2px 5px rgba(0,0,0,.68) !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-synthetic-header {
      position: sticky !important;
      top: -14px !important;
      z-index: 90 !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-drag-header {
      cursor: grab !important;
      user-select: none !important;
      touch-action: none !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-title::before {
      content: "⚔" !important;
      position: absolute !important;
      top: 10px !important;
      left: 15px !important;
      width: 32px !important;
      height: 32px !important;
      display: grid !important;
      place-items: center !important;
      border: 2px solid rgba(109,190,241,.58) !important;
      border-radius: 50% !important;
      background: radial-gradient(circle at 40% 30%, #263d55, #091522 72%) !important;
      color: #ffd44a !important;
      font-size: 17px !important;
      box-shadow: 0 5px 14px rgba(0,0,0,.48) !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-close {
      z-index: 120 !important;
      position: absolute !important;
      top: 9px !important;
      right: 11px !important;
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      border: 1px solid rgba(102,177,239,.64) !important;
      border-radius: 11px !important;
      background: rgba(8,31,59,.82) !important;
      color: #e7f1fb !important;
      font-size: 18px !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055) !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-grid,
    [data-pg-hunt-dialog="true"] .pg-hunt-money-grid,
    [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid {
      display: grid !important;
      width: 100% !important;
      gap: 7px !important;
    }
    [data-pg-hunt-dialog="true"] .pg-hunt-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    [data-pg-hunt-dialog="true"] .pg-hunt-money-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; margin-top: 7px !important; }
    [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; margin-top: 7px !important; }

    [data-pg-hunt-dialog="true"] .pg-hunt-card {
      box-sizing: border-box !important;
      min-width: 0 !important;
      min-height: 70px !important;
      padding: 9px !important;
      border: 1px solid rgba(80,118,155,.38) !important;
      border-radius: 11px !important;
      background:
        radial-gradient(circle at 100% 0, rgba(42,103,153,.13), transparent 38%),
        linear-gradient(145deg, rgba(13,31,47,.96), rgba(7,18,30,.96)) !important;
      color: #e2eaf4 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03) !important;
      overflow: hidden !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-card *,
    [data-pg-hunt-dialog="true"] .pg-hunt-balance *,
    [data-pg-hunt-dialog="true"] .pg-hunt-drops td,
    [data-pg-hunt-dialog="true"] .pg-hunt-drops th {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-card > :first-child {
      color: #8da7c1 !important;
      font-size: 8px !important;
      font-weight: 800 !important;
      letter-spacing: .055em !important;
      text-transform: uppercase !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-card strong,
    [data-pg-hunt-dialog="true"] .pg-hunt-card b {
      color: #f3f7fb !important;
      font-size: 15px !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-loot {
      border-color: rgba(36,211,111,.4) !important;
      background: linear-gradient(145deg, rgba(9,67,39,.45), rgba(6,25,27,.95)) !important;
    }
    [data-pg-hunt-dialog="true"] .pg-hunt-supply {
      border-color: rgba(242,91,104,.4) !important;
      background: linear-gradient(145deg, rgba(83,20,31,.42), rgba(16,20,28,.96)) !important;
    }
    [data-pg-hunt-dialog="true"] .pg-hunt-loot strong,
    [data-pg-hunt-dialog="true"] .pg-hunt-loot b { color: #45ed92 !important; }
    [data-pg-hunt-dialog="true"] .pg-hunt-supply strong,
    [data-pg-hunt-dialog="true"] .pg-hunt-supply b { color: #ff737d !important; }

    [data-pg-hunt-dialog="true"] .pg-hunt-balance {
      box-sizing: border-box !important;
      width: 100% !important;
      min-height: 44px !important;
      margin-top: 7px !important;
      padding: 8px 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border: 1px solid rgba(37,227,114,.58) !important;
      border-radius: 10px !important;
      background: linear-gradient(90deg, rgba(0,81,43,.9), rgba(0,45,31,.88)) !important;
      color: #53f69b !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      box-shadow: inset 0 0 18px rgba(44,235,123,.08), 0 0 12px rgba(32,207,103,.08) !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-market {
      margin: 7px 2px !important;
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      color: #aab9c9 !important;
      font-size: 9px !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-drops {
      box-sizing: border-box !important;
      min-height: 115px !important;
      max-height: 170px !important;
      margin-top: 7px !important;
      padding: 8px !important;
      overflow: auto !important;
      border: 1px solid rgba(66,118,166,.38) !important;
      border-radius: 11px !important;
      background: rgba(4,17,30,.72) !important;
      scrollbar-width: thin !important;
      scrollbar-color: #2d8fd5 rgba(4,18,31,.82) !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-drops table {
      width: 100% !important;
      border-collapse: separate !important;
      border-spacing: 0 5px !important;
    }
    [data-pg-hunt-dialog="true"] .pg-hunt-drops th {
      color: #7896b5 !important;
      font-size: 9px !important;
      letter-spacing: .05em !important;
      text-align: left !important;
      text-transform: uppercase !important;
    }
    [data-pg-hunt-dialog="true"] .pg-hunt-drops td {
      padding: 7px !important;
      background: rgba(15,34,50,.78) !important;
      color: #dce6f1 !important;
      font-size: 9px !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-log-button {
      width: 100% !important;
      min-height: 35px !important;
      margin-top: 7px !important;
      border: 1px solid rgba(255,203,43,.66) !important;
      border-radius: 9px !important;
      background: linear-gradient(180deg, rgba(56,47,13,.72), rgba(17,22,26,.92)) !important;
      color: #f3cf58 !important;
      font-size: 9px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
    }

    [data-pg-hunt-dialog="true"] .pg-hunt-note {
      display: block !important;
      margin-top: 8px !important;
      color: #74889d !important;
      font-size: 9px !important;
      text-align: center !important;
    }

    html.pg-hunt-analyzer-open .game-dock[data-pg-themed="true"],
    html.pg-hunt-analyzer-open .ah-panel[data-pg-auto-state="button"] {
      pointer-events: none !important;
      opacity: 0 !important;
    }

    @media (max-width: 900px), (max-height: 420px) {
      [data-pg-hunt-dialog="true"] {
        top: 6px !important;
        right: 6px !important;
        bottom: 6px !important;
        left: 6px !important;
        width: auto !important;
        height: auto !important;
        padding: 9px !important;
        border-radius: 14px !important;
        transform: none !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-title {
        min-height: 54px !important;
        margin: -9px -9px 9px !important;
        padding: 15px 48px 11px 58px !important;
        font-size: 18px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-title::before {
        left: 14px !important;
        width: 32px !important;
        height: 32px !important;
        font-size: 15px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-close {
        top: 9px !important;
        right: 9px !important;
        width: 34px !important;
        height: 34px !important;
        font-size: 15px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; gap: 5px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-money-grid { gap: 5px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid { gap: 5px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card { min-height: 65px !important; padding: 7px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card strong,
      [data-pg-hunt-dialog="true"] .pg-hunt-card b { font-size: 14px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-balance { min-height: 40px !important; margin-top: 5px !important; padding: 7px 10px !important; font-size: 14px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-drops { min-height: 90px !important; max-height: 140px !important; margin-top: 5px !important; padding: 7px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-log-button { min-height: 32px !important; margin-top: 5px !important; }
      html.pg-hunt-analyzer-open .pg-dock-burger { display: none !important; }
    }

    @media (max-width: 520px) {
      [data-pg-hunt-dialog="true"] .pg-hunt-grid,
      [data-pg-hunt-dialog="true"] .pg-hunt-money-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid { grid-template-columns: 1fr !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card { min-height: 72px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-drops { max-height: 190px !important; }
    }

    @container pg-hunt (max-width: 520px) {
      [data-pg-hunt-dialog="true"] .pg-hunt-title { min-height: 52px !important; padding: 14px 48px 10px 54px !important; font-size: 16px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-title::before { left: 14px !important; width: 32px !important; height: 32px !important; font-size: 15px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-grid,
      [data-pg-hunt-dialog="true"] .pg-hunt-money-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid { grid-template-columns: 1fr !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card { min-height: 72px !important; padding: 8px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card strong,
      [data-pg-hunt-dialog="true"] .pg-hunt-card b { font-size: 13px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-balance { font-size: 13px !important; }
    }

    @container pg-hunt (max-width: 380px) {
      [data-pg-hunt-dialog="true"] .pg-hunt-title { padding-left: 49px !important; font-size: 15px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-title::before { left: 11px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-grid,
      [data-pg-hunt-dialog="true"] .pg-hunt-money-grid { grid-template-columns: 1fr !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-drops { min-height: 110px !important; }
    }

    @container pg-hunt (max-width: 300px) {
      [data-pg-hunt-dialog="true"] .pg-hunt-title {
        min-height: 47px !important;
        padding: 12px 38px 8px 43px !important;
        font-size: 12px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-title::before {
        top: 9px !important;
        left: 8px !important;
        width: 26px !important;
        height: 26px !important;
        font-size: 12px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-close {
        top: 7px !important;
        right: 7px !important;
        width: 30px !important;
        height: 30px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-card { min-height: 56px !important; padding: 6px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card strong,
      [data-pg-hunt-dialog="true"] .pg-hunt-card b { font-size: 12px !important; }
    }

    .clog-window[data-pg-floating="true"],
    [data-pg-auto-dialog="true"][data-pg-floating="true"],
    [data-pg-capture-management="true"][data-pg-floating="true"],
    [data-pg-hunt-dialog="true"][data-pg-floating="true"] {
      position: fixed !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      resize: none !important;
      transition: box-shadow .16s ease, opacity .2s ease !important;
    }

    .clog-window[data-pg-farm-monitor="capture"],
    [data-pg-hunt-dialog="true"][data-pg-farm-monitor="hunt"] {
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
    }

    .clog-window[data-pg-farm-monitor="capture"] {
      z-index: 10034 !important;
      box-shadow: 0 16px 46px rgba(0,0,0,.7), 0 0 18px rgba(39,190,244,.13) !important;
    }

    [data-pg-hunt-dialog="true"][data-pg-farm-monitor="hunt"] {
      z-index: 10035 !important;
      box-shadow: 0 16px 46px rgba(0,0,0,.7), 0 0 18px rgba(255,205,45,.11) !important;
    }

    .clog-window[data-pg-floating="true"] .clog-title,
    [data-pg-auto-dialog="true"][data-pg-floating="true"] .pg-auto-title,
    [data-pg-hunt-dialog="true"][data-pg-floating="true"] .pg-hunt-title {
      cursor: move !important;
      cursor: grab !important;
      user-select: none !important;
      touch-action: none !important;
    }

    html.pg-floating-active,
    html.pg-floating-active * {
      cursor: grabbing !important;
      user-select: none !important;
    }

    .clog-window[data-pg-floating="true"][data-pg-float-active="true"],
    [data-pg-auto-dialog="true"][data-pg-float-active="true"],
    [data-pg-capture-management="true"][data-pg-float-active="true"],
    [data-pg-hunt-dialog="true"][data-pg-float-active="true"] {
      box-shadow: 0 30px 90px rgba(0,0,0,.82), 0 0 38px rgba(39,216,255,.2) !important;
    }

    .pg-float-resizer {
      z-index: 100 !important;
      position: absolute !important;
      width: 20px !important;
      height: 20px !important;
      padding: 0 !important;
      display: block !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      touch-action: none !important;
      opacity: .85 !important;
    }

    .pg-float-resizer::after {
      content: "" !important;
      position: absolute !important;
      width: 8px !important;
      height: 8px !important;
      border-color: rgba(79,207,245,.75) !important;
      border-style: solid !important;
    }

    .pg-float-resizer[data-pg-corner="nw"] { top: 0 !important; left: 0 !important; cursor: nwse-resize !important; }
    .pg-float-resizer[data-pg-corner="ne"] { top: 0 !important; right: 0 !important; cursor: nesw-resize !important; }
    .pg-float-resizer[data-pg-corner="se"] { right: 0 !important; bottom: 0 !important; cursor: nwse-resize !important; }
    .pg-float-resizer[data-pg-corner="sw"] { bottom: 0 !important; left: 0 !important; cursor: nesw-resize !important; }
    .pg-float-resizer[data-pg-corner="nw"]::after { top: 4px !important; left: 4px !important; border-width: 2px 0 0 2px !important; }
    .pg-float-resizer[data-pg-corner="ne"]::after { top: 4px !important; right: 4px !important; border-width: 2px 2px 0 0 !important; }
    .pg-float-resizer[data-pg-corner="se"]::after { right: 4px !important; bottom: 4px !important; border-width: 0 2px 2px 0 !important; }
    .pg-float-resizer[data-pg-corner="sw"]::after { bottom: 4px !important; left: 4px !important; border-width: 0 0 2px 2px !important; }

    .clog-window[data-pg-clog-themed="true"][data-pg-collapsed="true"] {
      pointer-events: none !important;
      opacity: .25 !important;
      transform: translateX(calc(-100vw - 100%)) !important;
    }

    .pg-clog-side-toggle {
      z-index: 10036 !important;
      position: fixed !important;
      top: 50% !important;
      left: 0 !important;
      width: 34px !important;
      height: 76px !important;
      padding: 0 !important;
      display: none !important;
      place-items: center !important;
      border: 1px solid rgba(56,189,248,.72) !important;
      border-left: 0 !important;
      border-radius: 0 12px 12px 0 !important;
      background: linear-gradient(180deg, rgba(9,42,72,.97), rgba(5,20,36,.98)) !important;
      color: #dff5ff !important;
      box-shadow: 6px 0 22px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08) !important;
      transform: translateY(-50%) !important;
      cursor: pointer !important;
    }

    html.pg-capture-log-open .pg-clog-side-toggle { display: grid !important; }
    html.pg-hunt-analyzer-open .pg-clog-side-toggle { display: none !important; }
    .pg-clog-side-toggle svg {
      width: 20px !important;
      height: 20px !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2.4 !important;
      transition: transform .22s ease !important;
    }
    html.pg-clog-collapsed .pg-clog-side-toggle {
      border-color: rgba(255,202,44,.8) !important;
      color: #ffd65a !important;
      box-shadow: 7px 0 26px rgba(0,0,0,.5), 0 0 15px rgba(255,199,35,.12) !important;
    }
    html.pg-clog-collapsed .pg-clog-side-toggle svg { transform: rotate(180deg) !important; }

    @container pg-clog (max-width: 680px) {
      .pg-clog-columns { display: none !important; }
      .clog-row {
        grid-template-columns: 42px minmax(120px,1.45fr) 62px minmax(95px,1fr) !important;
        gap: 7px !important;
      }
      .clog-ball, .clog-when { display: none !important; }
      .clog-title { min-height: 60px !important; padding: 14px 52px 10px 62px !important; font-size: clamp(17px, 4.4cqi, 22px) !important; }
      .clog-title::before { top: 11px !important; left: 14px !important; width: 36px !important; height: 36px !important; }
      .clog-x { top: 10px !important; right: 10px !important; width: 36px !important; height: 36px !important; }
      .clog-x::before, .clog-x::after { top: 16px !important; left: 9px !important; width: 18px !important; }
    }

    @container pg-clog (max-width: 470px) {
      .clog-head { padding: 7px 8px 5px !important; }
      .clog-tabs { gap: 5px !important; }
      .clog-tab { min-height: 32px !important; padding: 5px !important; font-size: 8px !important; }
      .clog-list { padding: 5px 8px !important; gap: 5px !important; }
      .clog-row {
        min-height: 66px !important;
        padding: 5px 7px !important;
        grid-template-columns: 34px minmax(0,1fr) auto !important;
        grid-template-rows: auto auto !important;
        align-content: center !important;
      }
      .clog-ico { grid-row: 1 / 3 !important; }
      .clog-name { grid-column: 2 !important; grid-row: 1 !important; font-size: 12px !important; }
      .clog-lvl { grid-column: 3 !important; grid-row: 1 !important; text-align: right !important; }
      .clog-meta { grid-column: 2 / -1 !important; grid-row: 2 !important; margin-top: 3px !important; }
      .clog-foot { min-height: 48px !important; padding: 6px 8px !important; flex-wrap: wrap !important; gap: 5px !important; }
      .clog-note { display: none !important; }
      .clog-totals { order: 1 !important; width: 100% !important; margin-left: 0 !important; justify-content: center !important; }
      .clog-clear { order: 2 !important; width: 100% !important; min-height: 30px !important; }
    }

    @container pg-hunt (max-width: 560px) {
      .pg-hunt-grid, .pg-hunt-money-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
      .pg-hunt-rate-grid { grid-template-columns: 1fr !important; }
      .pg-hunt-card { min-height: 68px !important; padding: 8px !important; }
      .pg-hunt-card strong, .pg-hunt-card b { font-size: 15px !important; overflow-wrap: anywhere !important; }
      .pg-hunt-drops { max-height: 180px !important; }
    }

    @container pg-hunt (max-width: 410px) {
      .pg-hunt-title { min-height: 54px !important; margin: -9px -9px 8px !important; padding: 14px 45px 10px 54px !important; font-size: 17px !important; }
      .pg-hunt-title::before { left: 12px !important; width: 30px !important; height: 30px !important; font-size: 14px !important; }
      .pg-hunt-close { top: 8px !important; right: 8px !important; width: 34px !important; height: 34px !important; }
      .pg-hunt-grid, .pg-hunt-money-grid, .pg-hunt-rate-grid { gap: 5px !important; }
      .pg-hunt-card { min-height: 62px !important; padding: 7px !important; }
      .pg-hunt-card strong, .pg-hunt-card b { font-size: 14px !important; }
      .pg-hunt-balance { min-height: 38px !important; margin-top: 5px !important; padding: 6px 9px !important; font-size: 14px !important; }
      .pg-hunt-market { margin: 6px 2px !important; }
      .pg-hunt-drops { min-height: 90px !important; margin-top: 5px !important; padding: 7px !important; }
      .pg-hunt-log-button { min-height: 32px !important; margin-top: 5px !important; }
    }

    @media (max-width: 600px), (max-height: 480px) {
      .clog-window[data-pg-clog-themed="true"],
      [data-pg-auto-dialog="true"],
      [data-pg-capture-management="true"],
      [data-pg-hunt-dialog="true"],
      [data-pg-profile-dialog="true"],
      [data-pg-my-pokes-dialog="true"] {
        border-radius: 12px !important;
        box-shadow: 0 16px 42px rgba(0,0,0,.72), 0 0 16px rgba(34,166,226,.1) !important;
      }

      .clog-window[data-pg-clog-themed="true"],
      [data-pg-auto-dialog="true"],
      [data-pg-capture-management="true"],
      [data-pg-hunt-dialog="true"] {
        min-width: min(250px, 90vw) !important;
        min-height: min(170px, 80dvh) !important;
      }

      [data-pg-profile-dialog="true"] {
        width: min(420px, 90vw) !important;
        max-height: 82dvh !important;
        padding: 7px !important;
      }
      [data-pg-profile-dialog="true"] .pg-profile-header {
        min-height: 46px !important;
        margin: -7px -7px 7px !important;
        padding: 12px 42px 8px 48px !important;
      }
      [data-pg-profile-dialog="true"] .pg-profile-title { font-size: 15px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-title::before { top: 8px !important; left: 10px !important; width: 27px !important; height: 27px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-close { top: 7px !important; right: 8px !important; width: 30px !important; height: 30px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-body { grid-template-columns: 70px minmax(0,1fr) !important; gap: 6px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-avatar { width: 66px !important; max-height: 82px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-stats { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 4px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-stat { padding: 5px 6px !important; font-size: 8px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-stat strong,
      [data-pg-profile-dialog="true"] .pg-profile-stat b,
      [data-pg-profile-dialog="true"] .pg-profile-stat output { font-size: 11px !important; }
      [data-pg-profile-dialog="true"] .pg-profile-action { min-height: 29px !important; font-size: 9px !important; }

      [data-pg-my-pokes-dialog="true"] {
        width: min(520px, 90vw) !important;
        height: min(420px, 80dvh) !important;
        padding: 7px !important;
      }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-header {
        min-height: 46px !important;
        margin: -7px -7px 7px !important;
        padding: 12px 42px 8px 48px !important;
      }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-title { font-size: 15px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-title::before { top: 8px !important; left: 10px !important; width: 27px !important; height: 27px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-close { top: 7px !important; right: 8px !important; width: 30px !important; height: 30px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-list { grid-template-columns: repeat(auto-fit,minmax(min(105px,100%),1fr)) !important; gap: 5px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card { min-height: 92px !important; padding: 5px !important; gap: 3px !important; font-size: 8px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card img,
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card picture { width: 42px !important; height: 42px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card strong,
      [data-pg-my-pokes-dialog="true"] .pg-pokes-card b { font-size: 10px !important; }
      [data-pg-my-pokes-dialog="true"] .pg-pokes-footer { margin: 5px -7px -7px !important; padding: 5px 7px !important; }

      [data-pg-auto-dialog="true"] { padding: 7px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-header {
        min-height: 46px !important;
        margin: -7px -7px 6px !important;
        padding: 10px 42px 7px 48px !important;
      }
      [data-pg-auto-dialog="true"] .pg-auto-title { font-size: 15px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-title::before { top: 8px !important; left: 10px !important; width: 27px !important; height: 27px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-close { top: 7px !important; right: 7px !important; width: 30px !important; height: 30px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-grid { gap: 5px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card { padding: 6px !important; border-radius: 8px !important; font-size: 9px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card h2,
      [data-pg-auto-dialog="true"] .pg-auto-card h3,
      [data-pg-auto-dialog="true"] .pg-auto-card h4 { margin-bottom: 4px !important; font-size: 11px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-card .pg-auto-art { width: 38px !important; height: 38px !important; max-width: 38px !important; max-height: 38px !important; margin: 0 6px 4px 0 !important; }
      [data-pg-auto-dialog="true"] input,
      [data-pg-auto-dialog="true"] select,
      [data-pg-auto-dialog="true"] textarea { min-height: 28px !important; font-size: 9px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-option { min-width: 34px !important; min-height: 36px !important; margin: 2px !important; padding: 3px 4px !important; font-size: 8px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-option img { width: 19px !important; height: 19px !important; }
      [data-pg-auto-dialog="true"] .pg-auto-save { min-height: 31px !important; margin-top: 5px !important; font-size: 9px !important; }

      [data-pg-capture-management="true"] .pg-cm-header {
        min-height: 46px !important;
        padding: 10px 43px 7px 51px !important;
      }
      [data-pg-capture-management="true"] .pg-cm-drag-handle { font-size: 16px !important; }
      [data-pg-capture-management="true"] .pg-cm-header::before { top: 8px !important; left: 10px !important; width: 28px !important; height: 28px !important; }
      [data-pg-capture-management="true"] .pg-cm-close { top: 7px !important; right: 7px !important; width: 31px !important; height: 31px !important; }
      [data-pg-capture-management="true"] .pg-cm-subtitle { display: none !important; }
      [data-pg-capture-management="true"] .pg-cm-controls { padding: 5px 7px !important; gap: 4px !important; }
      [data-pg-capture-management="true"] .pg-cm-tab-group,
      [data-pg-capture-management="true"] .pg-cm-view-switch { gap: 4px !important; }
      [data-pg-capture-management="true"] .pg-cm-tab,
      [data-pg-capture-management="true"] .pg-cm-view-button { min-height: 29px !important; padding: 4px 6px !important; font-size: 7.5px !important; }
      [data-pg-capture-management="true"] .pg-cm-list { padding: 5px 7px !important; }
      [data-pg-capture-management="true"] .pg-cm-footer { min-height: 38px !important; padding: 5px 7px !important; gap: 5px !important; font-size: 8px !important; }
      [data-pg-capture-management="true"] input[type="search"],
      [data-pg-capture-management="true"] input[placeholder] { min-height: 29px !important; padding: 4px 7px !important; font-size: 9px !important; }

      .clog-window[data-pg-clog-themed="true"] .clog-title { min-height: 46px !important; padding: 11px 42px 8px 49px !important; font-size: 15px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-title::before { top: 7px !important; left: 10px !important; width: 28px !important; height: 28px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-x { top: 7px !important; right: 7px !important; width: 31px !important; height: 31px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-head { padding: 5px 7px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-tab { min-height: 28px !important; }
      .clog-window[data-pg-clog-themed="true"] .clog-foot { min-height: 38px !important; padding: 5px 7px !important; }

      [data-pg-hunt-dialog="true"] { padding: 7px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-title {
        min-height: 45px !important;
        margin: -7px -7px 6px !important;
        padding: 11px 42px 8px 48px !important;
        font-size: 15px !important;
      }
      [data-pg-hunt-dialog="true"] .pg-hunt-title::before { top: 7px !important; left: 10px !important; width: 27px !important; height: 27px !important; font-size: 12px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-close { top: 6px !important; right: 7px !important; width: 30px !important; height: 30px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-grid,
      [data-pg-hunt-dialog="true"] .pg-hunt-money-grid,
      [data-pg-hunt-dialog="true"] .pg-hunt-rate-grid { gap: 4px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card { min-height: 52px !important; padding: 5px !important; border-radius: 8px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card > :first-child { font-size: 7px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-card strong,
      [data-pg-hunt-dialog="true"] .pg-hunt-card b { font-size: 11px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-balance { min-height: 32px !important; margin-top: 4px !important; padding: 5px 7px !important; font-size: 11px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-market { margin: 4px 2px !important; font-size: 8px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-drops { min-height: 72px !important; max-height: 120px !important; margin-top: 4px !important; padding: 5px !important; }
      [data-pg-hunt-dialog="true"] .pg-hunt-log-button { min-height: 28px !important; margin-top: 4px !important; }

      .pg-float-resizer { width: 16px !important; height: 16px !important; }
      [data-pg-team-panel="true"] {
        top: max(52px, calc(env(safe-area-inset-top) + 6px)) !important;
        right: auto !important;
        left: max(20px, env(safe-area-inset-left)) !important;
        width: min(180px, calc(100vw - 32px)) !important;
        max-width: 180px !important;
        max-height: calc(100dvh - 60px) !important;
      }
      .pg-team-side-toggle { top: var(--pg-team-toggle-top, 108px) !important; right: auto !important; left: var(--pg-team-toggle-left, 0px) !important; }
      html.pg-team-hud-collapsed .pg-team-side-toggle { left: 0 !important; }
    }

    @media (max-width: 1250px), (max-height: 420px) {
      html.pg-has-dock .pg-dock-burger {
        z-index: 10002 !important;
        position: fixed !important;
        top: max(8px, env(safe-area-inset-top)) !important;
        left: auto !important;
        right: max(8px, env(safe-area-inset-right)) !important;
        width: 40px !important;
        height: 40px !important;
        padding: 0 !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid rgba(227,168,47,.7) !important;
        border-radius: 11px !important;
        background: linear-gradient(180deg, #182232, #0a1019) !important;
        color: #f0bb4a !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.35) !important;
        font: 800 0/1 system-ui !important;
        cursor: pointer !important;
        transform: none !important;
      }

      html.pg-dock-open .pg-dock-burger {
        display: none !important;
        pointer-events: none !important;
      }

      html.pg-auto-helper-expanded .pg-dock-burger {
        display: none !important;
        pointer-events: none !important;
      }

      .pg-dock-burger::before {
        content: "";
        width: 20px;
        height: 14px;
        border-top: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        background: linear-gradient(currentColor, currentColor) center/100% 2px no-repeat;
      }

      html body .game-dock[data-pg-themed="true"],
      html.is-phone body .game-dock[data-pg-themed="true"] {
        z-index: 10001 !important;
        box-sizing: border-box !important;
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: auto !important;
        width: min(70vw, 330px) !important;
        max-width: 330px !important;
        height: 100dvh !important;
        max-height: none !important;
        min-height: 0 !important;
        padding: max(50px, calc(env(safe-area-inset-top) + 46px)) 8px 12px !important;
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        grid-auto-rows: min-content !important;
        align-content: start !important;
        justify-content: stretch !important;
        gap: 4px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        border: 0 !important;
        border-left: 1px solid rgba(227,168,47,.68) !important;
        border-radius: 20px 0 0 20px !important;
        background:
          radial-gradient(circle at 70% 0, rgba(227,168,47,.12), transparent 30%),
          linear-gradient(165deg, rgba(13,22,34,.995), rgba(5,10,17,.995)) !important;
        box-shadow: -18px 0 48px rgba(0,0,0,.62), inset 1px 0 0 rgba(255,255,255,.035) !important;
        transform: translateX(105%) !important;
        transition: none !important;
      }

      html.pg-dock-open body .game-dock[data-pg-themed="true"] { transform: translateX(0) !important; }

      .game-dock[data-pg-themed="true"] .pg-dock-close {
        z-index: 4 !important;
        position: absolute !important;
        top: 7px !important;
        right: 7px !important;
        width: 34px !important;
        height: 34px !important;
        padding: 0 !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid rgba(227,168,47,.68) !important;
        border-radius: 10px !important;
        background: linear-gradient(180deg, #182232, #0a1019) !important;
        box-shadow: 0 7px 20px rgba(0,0,0,.42) !important;
        cursor: pointer !important;
      }

      .game-dock[data-pg-themed="true"] .pg-dock-close svg {
        width: 20px !important;
        height: 20px !important;
        fill: none !important;
        stroke: #f0bb4a !important;
        stroke-width: 2.2 !important;
        stroke-linecap: round !important;
      }

      .game-dock[data-pg-themed="true"]::after {
        top: 15px !important;
        left: 20px !important;
      }

      .game-dock[data-pg-themed="true"] .dock-poke-wrap { display: contents !important; }

      .game-dock[data-pg-themed="true"] .poke-menu {
        position: static !important;
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 2px 0 6px !important;
        transform: none !important;
      }

      .game-dock[data-pg-themed="true"] .poke-menu::before { display: none !important; }

      .game-dock[data-pg-themed="true"] .dock-btn {
        width: 100% !important;
        height: 54px !important;
        padding: 4px 2px 3px !important;
        gap: 3px !important;
        flex-basis: auto !important;
        border: 1px solid rgba(151,168,191,.12) !important;
        border-radius: 12px !important;
        background: rgba(255,255,255,.025) !important;
      }

      .game-dock[data-pg-themed="true"] .dock-btn img {
        width: 26px !important;
        height: 26px !important;
        flex-basis: 26px !important;
      }

      .game-dock[data-pg-themed="true"] .pg-dock-label {
        font-size: 6.5px !important;
        white-space: normal !important;
      }

      html.pg-has-auto-helper .game-dock[data-pg-themed="true"] .pg-auto-helper-entry {
        display: flex !important;
      }

      .game-dock[data-pg-themed="true"] .pg-auto-helper-icon {
        width: 32px !important;
        height: 32px !important;
        flex: 0 0 32px !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid rgba(227,168,47,.3) !important;
        border-radius: 50% !important;
        background: radial-gradient(circle at 45% 35%, #29384b, #0a1018 72%) !important;
        color: #e8b33d !important;
        font: 800 18px/1 "Segoe UI Symbol", sans-serif !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 9px rgba(0,0,0,.48) !important;
      }

      .game-dock[data-pg-themed="true"] .pg-auto-helper-icon svg {
        width: 20px !important;
        height: 20px !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 1.9 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      .ah-panel[data-pg-auto-state="button"] { display: none !important; }

      [data-pg-auto-dialog="true"]:not([data-pg-floating="true"]) {
        position: fixed !important;
        top: 50% !important;
        right: auto !important;
        left: 50% !important;
        width: min(520px, calc(100vw - 16px), calc(100dvh - 16px)) !important;
        height: min(520px, calc(100vw - 16px), calc(100dvh - 16px)) !important;
        max-height: none !important;
        transform: translate(-50%, -50%) !important;
      }

      [data-pg-auto-dialog="true"]:not([data-pg-floating="true"]) .pg-auto-grid {
        grid-template-columns: 1fr !important;
      }

    }

    /* Flat, non-invasive team HUD. Native children remain in their original DOM order. */
    [data-pg-team-panel="true"] {
      width: min(214px, calc(100vw - 32px)) !important;
      max-width: 214px !important;
      max-height: calc(100dvh - 64px) !important;
      gap: 5px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      scrollbar-width: thin !important;
      scrollbar-color: #246f9d #071724 !important;
    }

    [data-pg-team-panel="true"]::before {
      content: "\\25CF   MI EQUIPO      " attr(data-pg-team-count-label) !important;
      box-sizing: border-box !important;
      order: 1 !important;
      width: 100% !important;
      min-height: 29px !important;
      padding: 7px 8px !important;
      display: block !important;
      overflow: hidden !important;
      border: 1px solid #17658f !important;
      border-radius: 7px !important;
      background: #07304a !important;
      color: #e8f4fb !important;
      font: 900 8px/1.6 "Segoe UI", sans-serif !important;
      letter-spacing: .025em !important;
      white-space: nowrap !important;
    }

    [data-pg-team-panel="true"] > .pg-player-panel {
      order: 0 !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 60px !important;
      padding: 8px !important;
      overflow: hidden !important;
      border: 1px solid #8a6b17 !important;
      border-radius: 9px !important;
      background: #081a27 !important;
      box-shadow: none !important;
    }

    [data-pg-team-panel="true"] > .pg-team-slot {
      order: 2 !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: 56px !important;
      padding: 6px !important;
      grid-template-columns: 42px minmax(0, 1fr) !important;
      overflow: hidden !important;
      border: 1px solid #245f82 !important;
      border-radius: 8px !important;
      background: #0a2131 !important;
      box-shadow: none !important;
      transform: none !important;
    }

    [data-pg-team-panel="true"] > .pg-team-slot:hover {
      border-color: #338bb9 !important;
      background: #0c2a3e !important;
      box-shadow: none !important;
      transform: none !important;
    }

    [data-pg-team-panel="true"] > .pg-team-slot[data-pg-team-selected="true"],
    [data-pg-team-panel="true"] > .pg-team-slot.active,
    [data-pg-team-panel="true"] > .pg-team-slot[aria-selected="true"] {
      border-color: #c99f28 !important;
      background: #102a38 !important;
      box-shadow: inset 3px 0 0 #e0b72f !important;
    }

    [data-pg-team-panel="true"] > *,
    [data-pg-team-panel="true"] > * > * {
      box-sizing: border-box !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot strong,
    [data-pg-team-panel="true"] .pg-team-slot b,
    [data-pg-team-panel="true"] .pg-team-slot span,
    [data-pg-team-panel="true"] .pg-team-slot p {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    [data-pg-team-panel="true"] .pg-team-slot progress,
    [data-pg-team-panel="true"] .pg-team-slot [role="progressbar"] {
      width: 100% !important;
      max-width: 100% !important;
      box-shadow: none !important;
    }

    .pg-team-side-toggle {
      width: 23px !important;
      height: 52px !important;
      border-color: #1d769f !important;
      border-radius: 7px 0 0 7px !important;
      background: #06324d !important;
      color: #7fd4f5 !important;
      box-shadow: none !important;
    }

    html.pg-team-hud-collapsed .pg-team-side-toggle {
      border-radius: 0 7px 7px 0 !important;
      background: #06324d !important;
      box-shadow: none !important;
    }

    /* Compact roster inspired by the launcher's Hunt Analyzer. */
    [data-pg-team-panel="true"] {
      top: max(8px, env(safe-area-inset-top)) !important;
      left: max(24px, env(safe-area-inset-left)) !important;
      width: min(224px, calc(100vw - 34px)) !important;
      max-width: 224px !important;
      max-height: calc(100dvh - 16px) !important;
      padding: 5px !important;
      gap: 5px !important;
      border: 1px solid #124a6c !important;
      border-radius: 10px !important;
      background: #061522 !important;
      box-shadow: 0 10px 28px rgba(0,0,0,.34) !important;
    }

    [data-pg-team-panel="true"]::before {
      min-height: 31px !important;
      padding: 7px 8px !important;
      border-color: #164c6d !important;
      border-radius: 7px !important;
      background: #081d2c !important;
      color: #dbeaf4 !important;
    }

    [data-pg-team-panel="true"] > .pg-team-profile-summary {
      box-sizing: border-box !important;
      order: 0 !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 43px !important;
      padding: 6px 8px !important;
      display: grid !important;
      grid-template-columns: 30px minmax(0, 1fr) !important;
      align-items: center !important;
      gap: 7px !important;
      overflow: hidden !important;
      border: 1px solid #173f59 !important;
      border-radius: 7px !important;
      background: #071a28 !important;
    }

    [data-pg-team-panel="true"] .pg-team-profile-avatar {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      display: block !important;
      overflow: hidden !important;
      border: 1px solid #386078 !important;
      border-radius: 50% !important;
      background-color: #0b2638 !important;
      background-image: var(--pg-team-profile-image, radial-gradient(circle at 50% 42%, #e9f1f5 0 21%, #de3340 22% 45%, #101b25 46% 53%, #edf3f6 54% 100%)) !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
    }

    [data-pg-team-panel="true"] .pg-team-profile-copy {
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }

    [data-pg-team-panel="true"] .pg-team-profile-copy strong {
      overflow: hidden !important;
      color: #f0f5f8 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      letter-spacing: .03em !important;
      text-overflow: ellipsis !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
    }

    [data-pg-team-panel="true"] .pg-team-profile-copy small {
      overflow: hidden !important;
      color: #7894a8 !important;
      font-size: 7px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    [data-pg-team-panel="true"] > .pg-player-panel { display: none !important; }

    [data-pg-team-panel="true"] > .pg-team-slot {
      min-height: 63px !important;
      padding: 7px 7px 7px 6px !important;
      grid-template-columns: 48px minmax(0, 1fr) !important;
      gap: 1px 7px !important;
      border-color: #184c69 !important;
      border-radius: 8px !important;
      background: #081d2b !important;
    }

    [data-pg-team-panel="true"] > .pg-team-slot:hover { background: #0a2434 !important; }

    [data-pg-team-panel="true"] .pg-team-sprite-host {
      width: 46px !important;
      height: 46px !important;
      min-width: 46px !important;
      min-height: 46px !important;
      overflow: hidden !important;
      border: 1px solid #235a76 !important;
      border-radius: 50% !important;
      background: #0b293a !important;
    }

    [data-pg-team-panel="true"] .pg-team-sprite-host > :not(.pg-team-type-icon):not(.pk-ts-type):not(.pk-ts-shiny) {
      width: 42px !important;
      height: 42px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: 42px !important;
      max-height: 42px !important;
    }

    [data-pg-team-panel="true"] .pg-team-sprite-host > :not(.pg-team-type-icon):not(.pk-ts-type):not(.pk-ts-shiny) canvas,
    [data-pg-team-panel="true"] .pg-team-sprite-host > :not(.pg-team-type-icon):not(.pk-ts-type):not(.pk-ts-shiny) img {
      max-width: 42px !important;
      max-height: 42px !important;
    }

    [data-pg-team-panel="true"] .pg-team-type-icon,
    [data-pg-team-panel="true"] .pk-ts-type,
    [data-pg-team-panel="true"] .pk-ts-shiny {
      position: absolute !important;
      z-index: 5 !important;
      inset: 2px 2px auto auto !important;
      width: 9px !important;
      height: 9px !important;
      min-width: 9px !important;
      min-height: 9px !important;
      max-width: 9px !important;
      max-height: 9px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 50% !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      box-shadow: none !important;
      transform: none !important;
    }

    [data-pg-team-panel="true"] .pg-team-type-icon *,
    [data-pg-team-panel="true"] .pk-ts-type *,
    [data-pg-team-panel="true"] .pk-ts-shiny * {
      width: 9px !important;
      height: 9px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: 9px !important;
      max-height: 9px !important;
      margin: 0 !important;
      padding: 0 !important;
      object-fit: contain !important;
    }

    [data-pg-team-panel="true"] > .pg-team-empty-slot {
      box-sizing: border-box !important;
      order: 3 !important;
      width: 100% !important;
      min-height: 54px !important;
      padding: 7px !important;
      display: grid !important;
      grid-template-columns: 34px minmax(0, 1fr) 19px !important;
      align-items: center !important;
      gap: 7px !important;
      border: 1px dashed #193f56 !important;
      border-radius: 8px !important;
      background: #071824 !important;
      color: #59788d !important;
    }

    [data-pg-team-panel="true"] .pg-team-empty-icon {
      width: 32px !important;
      height: 32px !important;
      display: block !important;
      border: 1px dashed #2a5067 !important;
      border-radius: 50% !important;
      background: radial-gradient(circle, #17384b 0 18%, transparent 20% 100%) !important;
    }

    [data-pg-team-panel="true"] .pg-team-empty-slot strong {
      display: block !important;
      color: #6f899a !important;
      font-size: 8px !important;
      font-weight: 900 !important;
    }

    [data-pg-team-panel="true"] .pg-team-empty-slot small {
      display: block !important;
      margin-top: 2px !important;
      color: #486579 !important;
      font-size: 6px !important;
    }

    [data-pg-team-panel="true"] .pg-team-empty-slot > b {
      width: 18px !important;
      height: 18px !important;
      display: grid !important;
      place-items: center !important;
      border: 1px solid #245774 !important;
      border-radius: 4px !important;
      color: #68a9cc !important;
      font: 800 12px/1 sans-serif !important;
    }

    @media (max-width: 560px) {
      html body .game-dock[data-pg-themed="true"],
      html.is-phone body .game-dock[data-pg-themed="true"] {
        width: min(78vw, 280px) !important;
        max-width: 280px !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      .game-dock[data-pg-themed="true"] .dock-btn { height: 56px !important; }
      .game-dock[data-pg-themed="true"] .dock-btn img {
        width: 29px !important;
        height: 29px !important;
        flex-basis: 29px !important;
      }
      [data-pg-auto-dialog="true"]:not([data-pg-floating="true"]) {
        width: min(440px, calc(100vw - 12px), calc(100dvh - 12px)) !important;
        height: min(440px, calc(100vw - 12px), calc(100dvh - 12px)) !important;
        border-radius: 12px !important;
      }
    }

    @media (max-width: 350px) {
      html body .game-dock[data-pg-themed="true"],
      html.is-phone body .game-dock[data-pg-themed="true"] {
        width: 94vw !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }
  `;

  function buildInstallScript() {
    return `(() => {
      const css = ${JSON.stringify(THEME_CSS)};
      const fallbackLabels = ${JSON.stringify(FALLBACK_LABELS)};
      const root = document.documentElement;

      let style = document.getElementById('pg-dock-theme-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'pg-dock-theme-style';
        (document.head || root).appendChild(style);
      }
      const nativePanelSelector = (selector) => /(?:\\.clog-|\\[data-pg-clog|\\.pg-hunt-|\\[data-pg-hunt-dialog|\\.pg-profile-|\\[data-pg-profile-dialog|\\.pg-auto-|\\[data-pg-auto|\\.pg-team-|\\[data-pg-team|\\[data-pg-player-source|\\.pg-cm-|\\[data-pg-capture-management|\\.game-dock|\\.dock-btn|\\.dock-poke-wrap|\\.poke-menu|\\.pg-dock-|pg-has-dock|pg-dock-open|pg-dock-top-hidden)/i.test(selector);
      const removeNativePanelRules = (ruleList) => {
        for (let index = ruleList.length - 1; index >= 0; index -= 1) {
          const rule = ruleList[index];
          if (rule.selectorText) {
            const selectors = rule.selectorText.split(',').map((value) => value.trim()).filter(Boolean);
            const retained = selectors.filter((selector) => !nativePanelSelector(selector));
            if (!retained.length) {
              const owner = rule.parentRule || rule.parentStyleSheet;
              owner?.deleteRule(index);
            }
            else if (retained.length !== selectors.length) rule.selectorText = retained.join(', ');
            continue;
          }
          if (rule.cssRules) {
            removeNativePanelRules(rule.cssRules);
            if (!rule.cssRules.length) {
              const owner = rule.parentRule || rule.parentStyleSheet;
              owner?.deleteRule(index);
            }
          }
        }
      };
      try {
        const filteredSheet = new CSSStyleSheet();
        filteredSheet.replaceSync(css);
        removeNativePanelRules(filteredSheet.cssRules);
        style.textContent = [...filteredSheet.cssRules].map((rule) => rule.cssText).join('\\n');
      } catch {
        style.textContent = css;
      }

      root.classList.remove('pg-hunt-open', 'pg-has-dock', 'pg-dock-open', 'pg-dock-top-hidden');
      const restoreNativeDock = (dock) => {
        if (!dock) return;
        delete dock.dataset.pgThemed;
        dock.style.removeProperty('--pg-dock-columns');
        dock.style.removeProperty('--pg-dock-fit');
        dock.querySelectorAll(':scope > .pg-dock-close, .pg-dock-label, :scope > .pg-auto-helper-entry').forEach((element) => element.remove());
        dock.querySelectorAll('.dock-btn[data-pg-label]').forEach((button) => delete button.dataset.pgLabel);
      };
      document.querySelectorAll('nav.game-dock, .game-dock').forEach(restoreNativeDock);
      document.querySelectorAll('.pg-dock-burger, .pg-dock-top-toggle, .pg-dock-backdrop').forEach((element) => element.remove());
      document.querySelectorAll('.ah-panel[data-pg-themed="true"]').forEach((panel) => {
        delete panel.dataset.pgThemed;
      });
      if (window.__pgDockThemeObserver) {
        window.__pgDockThemeObserver.disconnect();
        delete window.__pgDockThemeObserver;
      }

      let burger = document.querySelector('.pg-dock-burger');
      if (!burger) {
        burger = document.createElement('button');
        burger.type = 'button';
        burger.className = 'pg-dock-burger';
        burger.setAttribute('aria-label', 'Abrir menú del juego');
        burger.setAttribute('aria-expanded', 'false');
        document.body.appendChild(burger);
      }

      let topToggle = document.querySelector('.pg-dock-top-toggle');
      if (!topToggle) {
        topToggle = document.createElement('button');
        topToggle.type = 'button';
        topToggle.className = 'pg-dock-top-toggle';
        topToggle.setAttribute('aria-label', 'Ocultar menu superior');
        topToggle.setAttribute('aria-expanded', 'true');
        document.body.appendChild(topToggle);
      }

      const setTopHidden = (hidden) => {
        root.classList.toggle('pg-dock-top-hidden', hidden);
        topToggle.setAttribute('aria-expanded', String(!hidden));
        topToggle.setAttribute('aria-label', hidden ? 'Mostrar menu superior' : 'Ocultar menu superior');
        try { localStorage.setItem('pokegrid:dock-top-hidden:v1', String(hidden)); } catch {}
      };

      if (!topToggle.dataset.pgBound) {
        topToggle.dataset.pgBound = 'true';
        topToggle.addEventListener('click', () => setTopHidden(!root.classList.contains('pg-dock-top-hidden')));
        try { setTopHidden(localStorage.getItem('pokegrid:dock-top-hidden:v1') === 'true'); } catch {}
      }

      let backdrop = document.querySelector('.pg-dock-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'pg-dock-backdrop';
        document.body.appendChild(backdrop);
      }
      burger.remove();
      topToggle.remove();
      backdrop.remove();

      const setOpen = (open) => {
        root.classList.toggle('pg-dock-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú del juego' : 'Abrir menú del juego');
      };

      if (!burger.dataset.pgBound) {
        burger.dataset.pgBound = 'true';
        burger.addEventListener('click', () => setOpen(!root.classList.contains('pg-dock-open')));
        backdrop.addEventListener('click', () => setOpen(false));
        addEventListener('keydown', (event) => {
          if (event.key === 'Escape') setOpen(false);
        }, true);
      }

      const cleanLabel = (value) => String(value || '')
        .replace(/[\\n\\r\\t]+/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim()
        .slice(0, 28);

      const fullText = (element) => String(element?.textContent || '').replace(/\\s+/g, ' ').trim();
      const ownText = (element) => String(
        [...(element?.childNodes || [])]
          .filter((node) => node.nodeType === 3)
          .map((node) => node.textContent)
          .join(' ')
      ).replace(/\\s+/g, ' ').trim();

      // A few game builds expose a very broad ancestor as a semantic dialog.
      // Never turn that application shell (world, HUD and injected controls) into
      // one of our floating windows; doing so collapses the whole game viewport.
      const applicationChromeSelector = [
        '.game-dock',
        '.pg-dock-burger',
        '.pg-dock-top-toggle',
        '.ah-panel',
        '.clog-window',
        '.pg-team-side-toggle'
      ].join(',');

      const isApplicationShell = (element) => {
        if (!element || element === document.body || element === root) return true;
        // A canvas can be the world renderer, but it is also used by Pokemon
        // sprites and trainer avatars inside legitimate dialogs/HUD panels.
        // Only reject the canvas itself; treating every ancestor that contains
        // one as the application shell hides Team, Profile and Capture Management.
        if (element.matches?.('canvas')) return true;
        if (element.matches?.(applicationChromeSelector)) return true;
        return Boolean(element.querySelector?.(applicationChromeSelector));
      };

      const resolveSafeDialogRoot = (marker, selector) => {
        if (!marker || isApplicationShell(marker)) return null;
        const semanticDialog = marker.closest(selector);
        return semanticDialog && !isApplicationShell(semanticDialog)
          ? semanticDialog
          : marker;
      };

      const findOwnText = (scope, pattern) => [...scope.querySelectorAll('*')]
        .find((element) => pattern.test(ownText(element)));

      const findCard = (scope, label) => {
        if (!label) return null;
        let current = label.closest('label') || label.parentElement;
        let best = current;
        for (let depth = 0; current && current !== scope && depth < 5; depth += 1) {
          const text = fullText(current);
          if (text.length < 700) best = current;
          const controls = current.querySelectorAll('input, select, button').length;
          if (controls > 0 && text.length < 700) return current;
          current = current.parentElement;
        }
        return best && best !== scope ? best : label;
      };

      const sharedContainer = (scope, cards) => {
        if (cards.length < 2) return null;
        let current = cards[0].parentElement;
        while (current && current !== scope) {
          if (cards.every((card) => current.contains(card))) return current;
          current = current.parentElement;
        }
        return null;
      };

      const findAutoDialog = () => {
        const markerContainer = [...document.querySelectorAll('body *')]
          .filter((element) => {
            if (element.matches('.ah-panel, .game-dock, .pg-dock-burger')) return false;
            if (element.matches('[data-pg-auto-closing="true"]') || element.closest('[data-pg-auto-closing="true"]')) return false;
            if (isApplicationShell(element)) return false;
            const text = fullText(element);
            if (text.length > 3600 || !/auto[-\\s]?potion/i.test(text) || !/auto[-\\s]?catch/i.test(text)) return false;
            const visibleLabel = (pattern) => [...element.querySelectorAll('*')].some((child) => {
              if (!pattern.test(ownText(child))) return false;
              const childRect = child.getBoundingClientRect();
              const childStyle = getComputedStyle(child);
              return childRect.width > 0 && childRect.height > 0 && childStyle.display !== 'none' && childStyle.visibility !== 'hidden';
            });
            if (!visibleLabel(/auto[-\\s]?potion/i) || !visibleLabel(/auto[-\\s]?catch/i)) return false;
            const visibleControls = [...element.querySelectorAll('input, select, button, [role="button"]')].filter((control) => {
              const controlRect = control.getBoundingClientRect();
              const controlStyle = getComputedStyle(control);
              return controlRect.width > 0 && controlRect.height > 0 && controlStyle.display !== 'none' && controlStyle.visibility !== 'hidden';
            });
            if (!visibleControls.length || visibleControls.length > 50) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 180 && rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden';
          })
          .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0] || null;
        if (!markerContainer) return null;
        const nativeDialog = markerContainer.closest('.ah-modal');
        if (nativeDialog && !isApplicationShell(nativeDialog)) return nativeDialog;
        return resolveSafeDialogRoot(markerContainer,
          '[role="dialog"], [aria-modal="true"], .ah-modal, .modal-content, [class*="modal-content"], [class*="dialog-content"]'
        );
      };

      const findCloseControl = (scope) => [...(scope?.querySelectorAll('button, [role="button"]') || [])]
        .find((button) => {
          const label = [
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            ownText(button)
          ].filter(Boolean).join(' ').trim();
          return /close|fechar|cerrar|salir|^[x×✕✖]$/i.test(label);
        }) || null;

      const isElementVisible = (element) => {
        if (!element?.isConnected || element.hidden) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const readAutoControlState = (control) => {
        if (!control) return null;
        const input = control.matches?.('input[type="checkbox"], input[type="radio"]')
          ? control
          : control.querySelector?.('input[type="checkbox"], input[type="radio"]');
        if (input) return Boolean(input.checked);
        if (control.matches?.(':disabled, [aria-disabled="true"]')) return false;
        const stateAttributes = ['aria-pressed', 'aria-selected', 'aria-checked', 'data-active', 'data-selected', 'data-enabled'];
        for (const attribute of stateAttributes) {
          const value = control.getAttribute?.(attribute);
          if (value === 'true') return true;
          if (value === 'false') return false;
        }
        const className = String(control.className || '');
        if (/(^|[\s_-])(active|selected|enabled|checked|is-on)([\s_-]|$)/i.test(className)) return true;
        if (/(^|[\s_-])(inactive|unselected|disabled|is-off)([\s_-]|$)/i.test(className)) return false;
        if (control.dataset?.pgAutoFallbackActive) return control.dataset.pgAutoFallbackActive === 'true';
        return null;
      };

      const refreshAutoControlStates = (dialog, cards) => {
        cards.forEach((card) => {
          const toggles = [...card.querySelectorAll('input[type="checkbox"], input[type="radio"]')];
          const mainToggle = toggles[0] || null;
          card.dataset.pgAutoEnabled = String(mainToggle ? mainToggle.checked : true);

          const mainToggleContainer = mainToggle?.closest('label, button, [role="button"]') || null;
          const cardImages = [...card.querySelectorAll('img, picture')];
          const artwork = cardImages.find((image) => !image.closest('button, label, [role="button"]'));
          artwork?.classList.add('pg-auto-art');

          const candidates = [...card.querySelectorAll('button, [role="button"], label')].filter((control) => {
            if (control === mainToggleContainer) return false;
            if (control.closest('.pg-auto-option') && control !== control.closest('.pg-auto-option')) return false;
            const hasToggle = Boolean(control.querySelector('input[type="checkbox"], input[type="radio"]'));
            const hasImage = Boolean(control.querySelector('img, picture'));
            const isCatchOption = card.matches('.pg-auto-catch, .pg-auto-shiny') && control.matches('button, [role="button"]');
            const hasSemanticState = ['aria-pressed', 'aria-selected', 'aria-checked', 'data-active', 'data-selected']
              .some((attribute) => control.hasAttribute(attribute));
            return hasToggle || hasImage || isCatchOption || hasSemanticState;
          });

          candidates.forEach((control) => {
            control.classList.add('pg-auto-option');
            const state = readAutoControlState(control);
            control.dataset.pgAutoActive = String(state === true);
          });
        });
      };

      const refreshAutoHelper = () => {
        const panel = document.querySelector('.ah-panel');
        root.classList.toggle('pg-has-auto-helper', Boolean(panel));
        if (panel) {
          const head = panel.querySelector('.ah-head');
          if (head) {
            const hasIcon = Boolean(head.querySelector('img, svg')) || /⚙/.test(head.textContent || '');
            head.classList.toggle('pg-auto-needs-icon', !hasIcon);
          }
        }

        const dialog = findAutoDialog();
        const dialogInsidePanel = Boolean(dialog && panel?.contains(dialog));
        if (panel) {
          panel.dataset.pgAutoState = dialogInsidePanel ? 'container' : 'button';
          const panelHead = panel.querySelector('.ah-head');
          panelHead?.classList.toggle('pg-auto-expanded-trigger-hidden', dialogInsidePanel);
          panel.classList.toggle('pg-auto-trigger-hidden', Boolean(dialog) && !dialogInsidePanel);
        }
        document.querySelectorAll('[data-pg-auto-dialog="true"]').forEach((element) => {
          if (element !== dialog) {
            delete element.dataset.pgAutoDialog;
            element.querySelectorAll('.pg-auto-card, .pg-auto-grid, .pg-auto-title').forEach((child) => {
              child.classList.remove(
                'pg-auto-card', 'pg-auto-grid', 'pg-auto-title', 'pg-auto-potion',
                'pg-auto-revive', 'pg-auto-catch', 'pg-auto-shiny', 'pg-auto-names'
              );
            });
          }
        });

        root.classList.toggle('pg-auto-helper-expanded', Boolean(dialog));
        if (!dialog) return panel;
        dialog.dataset.pgAutoDialog = 'true';

        let title = findOwnText(dialog, /auto[-\\s]?helper$/i);
        let header = title?.closest('header') || title?.parentElement;
        if (!title || !header || header === dialog) {
          header = dialog.querySelector(':scope > .pg-auto-synthetic-header');
          if (!header) {
            header = document.createElement('div');
            header.className = 'pg-auto-header pg-auto-synthetic-header';
            title = document.createElement('strong');
            title.className = 'pg-auto-title';
            title.textContent = 'Auto-Helper';
            header.appendChild(title);
            dialog.prepend(header);
          } else {
            title = header.querySelector('.pg-auto-title');
          }
        }
        if (title) {
          const normalizedTitle = ownText(title).replace(/^[^a-z0-9]+/i, '').trim();
          if (/^auto[-\\s]?helper$/i.test(normalizedTitle) && title.textContent !== normalizedTitle) title.textContent = normalizedTitle;
        }
        title?.classList.add('pg-auto-title');
        header?.classList.add('pg-auto-header');
        const headerLogo = header?.querySelector('img, picture');
        headerLogo?.classList.add('pg-auto-logo');

        let closeButton = findCloseControl(dialog);
        const closeWasInjected = !closeButton;
        if (!closeButton) {
          closeButton = document.createElement('button');
          closeButton.type = 'button';
          closeButton.className = 'pg-auto-close';
          closeButton.setAttribute('aria-label', 'Cerrar Auto-Helper');
          header?.appendChild(closeButton);
        }
        closeButton.classList.add('pg-auto-close');
        if (!closeButton.dataset.pgReliableCloseBound) {
          closeButton.dataset.pgReliableCloseBound = 'true';
          closeButton.addEventListener('click', (event) => {
            dialog.dataset.pgAutoClosing = 'true';
            root.classList.remove('pg-auto-helper-expanded');
            const fallbackClose = () => {
              if (!isElementVisible(dialog)) return;
              const nativeOverlay = dialog.closest('.ah-overlay');
              const nativeClose = dialog.querySelector('.ah-modal-close');
              if (nativeClose && nativeClose !== closeButton) {
                nativeClose.click();
              } else if (nativeOverlay) {
                nativeOverlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              } else {
                const trigger = panel?.querySelector('.ah-head');
                if (trigger && trigger !== closeButton && !trigger.contains(closeButton)) trigger.click();
              }
              setTimeout(() => {
                if (isElementVisible(dialog) && !nativeOverlay) dialog.hidden = true;
                refresh();
              }, 80);
            };
            if (closeWasInjected) {
              event.preventDefault();
              event.stopPropagation();
              fallbackClose();
            } else {
              setTimeout(fallbackClose, 80);
            }
            setTimeout(() => {
              delete dialog.dataset.pgAutoClosing;
              refresh();
            }, 360);
          });
        }

        const dialogButtons = [...dialog.querySelectorAll('button, [role="button"]')];
        const buttonLabel = (button) => [
          button.getAttribute('aria-label'),
          button.getAttribute('title'),
          ownText(button)
        ].filter(Boolean).join(' ');
        const resetButton = dialogButtons.find((button) => /reset|restablecer|redefinir|reiniciar/i.test(buttonLabel(button)));
        resetButton?.classList.add('pg-auto-reset');
        const saveButton = dialogButtons.find((button) => /save configuration|guardar configuraci[oó]n|salvar configura[cç][aã]o/i.test(buttonLabel(button)));
        saveButton?.classList.add('pg-auto-save');
        const masterButton = dialogButtons.find((button) => /^(active|activo|ativo|inactive|inactivo|desativado)$/i.test(ownText(button)));
        if (masterButton) {
          masterButton.classList.add('pg-auto-master');
          const explicitState = readAutoControlState(masterButton);
          const activeByText = !/inactive|inactivo|desativado/i.test(ownText(masterButton));
          masterButton.dataset.pgAutoActive = String(explicitState ?? activeByText);
        }

        const markCard = (pattern, className) => {
          const card = findCard(dialog, findOwnText(dialog, pattern));
          if (!card) return null;
          card.classList.add('pg-auto-card', className);
          return card;
        };

        const cards = [
          markCard(/auto[-\\s]?potion/i, 'pg-auto-potion'),
          markCard(/auto[-\\s]?revive/i, 'pg-auto-revive'),
          markCard(/^auto[-\\s]?catch$/i, 'pg-auto-catch'),
          markCard(/auto[-\\s]?catch shiny/i, 'pg-auto-shiny')
        ].filter(Boolean);
        const grid = sharedContainer(dialog, cards);
        if (grid) grid.classList.add('pg-auto-grid');
        refreshAutoControlStates(dialog, cards);

        const names = markCard(/names|nombres|nomes/i, 'pg-auto-names');
        names?.classList.add('pg-auto-names');
        if (!dialog.dataset.pgAutoStateBound) {
          dialog.dataset.pgAutoStateBound = 'true';
          dialog.addEventListener('change', () => requestAnimationFrame(refresh), true);
          dialog.addEventListener('click', (event) => {
            const option = event.target.closest('.pg-auto-option');
            if (!option || option.matches(':disabled, [aria-disabled="true"]')) return;
            setTimeout(() => {
              const hasNativeToggle = Boolean(option.querySelector('input[type="checkbox"], input[type="radio"]'));
              const hasSemanticAttribute = ['aria-pressed', 'aria-selected', 'aria-checked', 'data-active', 'data-selected', 'data-enabled']
                .some((attribute) => option.hasAttribute(attribute));
              const hasSemanticClass = /(^|[\s_-])(active|selected|enabled|checked|is-on|inactive|disabled|is-off)([\s_-]|$)/i
                .test(String(option.className || '').replace('pg-auto-option', ''));
              if (!hasNativeToggle && !hasSemanticAttribute && !hasSemanticClass) {
                option.dataset.pgAutoFallbackActive = String(option.dataset.pgAutoActive !== 'true');
              }
              refresh();
            }, 40);
          }, true);
        }
        enableFloatingAutoHelper(dialog, header || title);
        return panel;
      };

      const findMetricCard = (scope, label) => {
        if (!label) return null;
        let current = label.parentElement;
        let best = current;
        for (let depth = 0; current && current !== scope && depth < 5; depth += 1) {
          const text = fullText(current);
          if (text.length <= 260) best = current;
          const hasValue = current.querySelector('strong, b, output, [class*="value"], [class*="amount"]');
          if (hasValue && text.length <= 260) return current;
          current = current.parentElement;
        }
        return best && best !== scope ? best : label;
      };

      const findHuntDialog = () => {
        const markerContainer = [...document.querySelectorAll('body *')]
          .filter((element) => {
            if (element.matches('.ah-panel, .game-dock, .pg-dock-burger, .clog-window')) return false;
            if (isApplicationShell(element)) return false;
            const text = fullText(element);
            const hasTitle = /hunt analyzer/i.test(text);
            const hasDefeated = /defeated|derrotad|abatid/i.test(text);
            const hasTime = /time in hunt|tempo na hunt|tiempo en hunt/i.test(text);
            const hasCaptured = /captured|capturad/i.test(text);
            const hasXp = /xp gained|xp ganha|xp ganad/i.test(text);
            if (!(hasTitle && hasDefeated && hasTime && hasCaptured && hasXp)) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 220 && rect.height > 180 && style.display !== 'none' && style.visibility !== 'hidden';
          })
          .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0] || null;
        if (!markerContainer) return null;
        return resolveSafeDialogRoot(markerContainer,
          '[role="dialog"], [aria-modal="true"], .modal-content, [class*="modal-content"], [class*="dialog-content"]'
        );
      };

      const refreshHuntAnalyzer = () => {
        const dialog = findHuntDialog();
        document.querySelectorAll('.pg-hunt-external-trigger-hidden').forEach((element) => {
          element.classList.remove('pg-hunt-external-trigger-hidden');
        });
        document.querySelectorAll('[data-pg-hunt-dialog="true"]').forEach((element) => {
          if (element === dialog) return;
          delete element.dataset.pgHuntDialog;
          element.querySelectorAll([
            '.pg-hunt-title', '.pg-hunt-close', '.pg-hunt-grid', '.pg-hunt-money-grid',
            '.pg-hunt-rate-grid', '.pg-hunt-card', '.pg-hunt-loot', '.pg-hunt-supply',
            '.pg-hunt-balance', '.pg-hunt-market', '.pg-hunt-drops', '.pg-hunt-log-button',
            '.pg-hunt-note', '.pg-hunt-duplicate-close'
          ].join(',')).forEach((child) => {
            child.classList.remove(
              'pg-hunt-title', 'pg-hunt-close', 'pg-hunt-grid', 'pg-hunt-money-grid',
              'pg-hunt-rate-grid', 'pg-hunt-card', 'pg-hunt-loot', 'pg-hunt-supply',
              'pg-hunt-balance', 'pg-hunt-market', 'pg-hunt-drops', 'pg-hunt-log-button',
              'pg-hunt-note', 'pg-hunt-duplicate-close'
            );
          });
        });

        root.classList.toggle('pg-hunt-analyzer-open', Boolean(dialog));
        if (!dialog) return null;
        dialog.dataset.pgHuntDialog = 'true';

        let title = findOwnText(dialog, /^hunt analyzer$/i);
        let dragHeader = title?.closest('header') || title?.parentElement;
        if (!title || !dragHeader || dragHeader === dialog) {
          dragHeader = dialog.querySelector(':scope > .pg-hunt-synthetic-header');
          if (!dragHeader) {
            dragHeader = document.createElement('div');
            dragHeader.className = 'pg-hunt-title pg-hunt-synthetic-header';
            dragHeader.textContent = 'Hunt Analyzer';
            dialog.prepend(dragHeader);
          }
          title = dragHeader;
        }
        title.classList.add('pg-hunt-title');
        dragHeader?.classList.add('pg-hunt-drag-header');

        let closeButton = findCloseControl(dialog) || [...dialog.querySelectorAll('button, [role="button"]')].find((button) => {
          const label = [
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            ownText(button)
          ].filter(Boolean).join(' ');
          return /close|fechar|cerrar|^[xÃ—]$/i.test(label);
        });
        closeButton?.classList.add('pg-hunt-close');
        const closeWasInjected = !closeButton;
        if (!closeButton) {
          closeButton = document.createElement('button');
          closeButton.type = 'button';
          closeButton.className = 'pg-hunt-close';
          closeButton.setAttribute('aria-label', 'Cerrar Hunt Analyzer');
          dragHeader.appendChild(closeButton);
        }
        if (title && closeButton.parentElement !== title) title.appendChild(closeButton);
        closeButton.classList.add('pg-hunt-close');
        [...dialog.querySelectorAll('button, [role="button"]')].forEach((button) => {
          if (button === closeButton) return;
          const label = [button.getAttribute('aria-label'), button.getAttribute('title'), ownText(button)]
            .filter(Boolean).join(' ').trim();
          button.classList.toggle('pg-hunt-duplicate-close', /close|fechar|cerrar|salir|^[xÃƒâ€”Ã—]$/i.test(label));
        });

        const externalHuntLabels = [...document.querySelectorAll('body *')]
          .filter((element) => {
            if (dialog.contains(element) || element.closest('.game-dock, .pg-dock-burger, .pg-dock-top-toggle')) return false;
            const label = [element.getAttribute?.('aria-label'), element.getAttribute?.('title'), ownText(element)]
              .filter(Boolean).join(' ').trim();
            if (!/hunt analyzer/i.test(label)) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.width <= 380 && rect.height > 0 && rect.height <= 130 && style.display !== 'none';
          });
        externalHuntLabels.forEach((label) => {
          let target = label.closest('button, [role="button"]') || label;
          for (let depth = 0; target.parentElement && target.parentElement !== document.body && depth < 3; depth += 1) {
            const parent = target.parentElement;
            const rect = parent.getBoundingClientRect();
            if (parent.contains(dialog) || rect.width > 380 || rect.height > 130) break;
            if (!parent.querySelector('button, [role="button"]')) break;
            target = parent;
          }
          target.classList.add('pg-hunt-external-trigger-hidden');
        });
        if (!closeButton.dataset.pgReliableCloseBound) {
          closeButton.dataset.pgReliableCloseBound = 'true';
          closeButton.addEventListener('click', (event) => {
            const fallbackClose = () => {
              if (!isElementVisible(dialog)) return;
              dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
              setTimeout(() => {
                if (isElementVisible(dialog)) dialog.hidden = true;
                refresh();
              }, 80);
            };
            if (closeWasInjected) {
              event.preventDefault();
              event.stopPropagation();
              fallbackClose();
            } else {
              setTimeout(fallbackClose, 80);
            }
          });
        }

        const markMetric = (pattern, className = '') => {
          const card = findMetricCard(dialog, findOwnText(dialog, pattern));
          if (!card) return null;
          card.classList.add('pg-hunt-card');
          if (className) card.classList.add(className);
          return card;
        };

        const mainCards = [
          markMetric(/^(defeated|derrotados?|abatidos?)$/i),
          markMetric(/^(time in hunt|tempo na hunt|tiempo en hunt)$/i),
          markMetric(/^xp (gained|ganha|ganada)$/i),
          markMetric(/^(captured|capturados?)$/i)
        ].filter(Boolean);
        const mainGrid = sharedContainer(dialog, mainCards);
        if (mainGrid) mainGrid.classList.add('pg-hunt-grid');

        const moneyCards = [
          markMetric(/^(loot|bot[iÃ­]n)$/i, 'pg-hunt-loot'),
          markMetric(/^(supply|suministros?|suprimentos?)$/i, 'pg-hunt-supply')
        ].filter(Boolean);
        const moneyGrid = sharedContainer(dialog, moneyCards);
        if (moneyGrid) moneyGrid.classList.add('pg-hunt-money-grid');

        const balanceLabel = findOwnText(dialog, /^(balance|saldo)(\s|$)/i);
        const balanceCard = findMetricCard(dialog, balanceLabel);
        if (balanceCard) {
          balanceCard.classList.remove('pg-hunt-card');
          balanceCard.classList.add('pg-hunt-balance');
        }

        const rateCards = [
          markMetric(/^(loot|bot[iÃ­]n).*(per hour|por hora)|^(loot|bot[iÃ­]n)\\/h$/i),
          markMetric(/^xp.*(per hour|por hora)|^xp\\/h$/i),
          markMetric(/^(kills|defeated|derrotados?|abatidos?).*(per hour|por hora)/i)
        ].filter(Boolean);
        const rateGrid = sharedContainer(dialog, rateCards);
        if (rateGrid) rateGrid.classList.add('pg-hunt-rate-grid');

        const marketText = findOwnText(dialog, /market prices|pre[cÃ§]o.*mercado|precio.*mercado/i);
        const market = marketText?.closest('label') || marketText?.parentElement;
        market?.classList.add('pg-hunt-market');

        const dropsTitle = findOwnText(dialog, /session drops|drops da sess[aÃ£]o|drops de la sesi[oÃ³]n/i);
        if (dropsTitle) {
          let drops = dropsTitle.closest('section, article');
          if (!drops) {
            drops = dropsTitle.parentElement;
            while (drops && drops !== dialog && !drops.querySelector('table, [role="table"], ul, ol')) {
              drops = drops.parentElement;
            }
          }
          if (drops && drops !== dialog) drops.classList.add('pg-hunt-drops');
        }

        const logText = findOwnText(dialog, /view capture log|ver log de capturas|ver historial de capturas/i);
        const logButton = logText?.closest('button, a, [role="button"]') || logText;
        logButton?.classList.add('pg-hunt-log-button');

        const note = findOwnText(dialog, /values at npc|valores.*pre[cÃ§]o.*npc|valores.*precio.*npc/i);
        note?.classList.add('pg-hunt-note');
        enableFloatingHuntAnalyzer(dialog, dragHeader || title);
        return dialog;
      };

      const profileTitlePattern = /^(profile|perfil)$/i;
      const profileInfoPattern = /level|nivel|n[ií]vel|experience|experiencia|xp|trainer|entrenador|treinador|region|regi[oó]n|coins?|monedas?|gold|guild|clan|captures?|capturas?/i;
      const myPokesTitlePattern = /^(my pokes|my pok[eé]mon|mis pok[eé]mon|meus pok[eé]mon)$/i;

      const visiblePanelCandidate = (element, minimumWidth = 220, minimumHeight = 120) => {
        if (!element || element === document.body || element === root) return false;
        if (isApplicationShell(element)) return false;
        if (element.closest('.game-dock, .ah-panel, .clog-window, [data-pg-hunt-dialog="true"], [data-pg-capture-management="true"]')) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width >= minimumWidth && rect.height >= minimumHeight && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const panelFromTitle = (pattern, validator) => {
        const candidates = [...document.querySelectorAll('body *')]
          .filter((element) => pattern.test(ownText(element)))
          .map((title) => {
            if (title.closest('.game-dock, .ah-panel, .clog-window')) return null;
            const semantic = resolveSafeDialogRoot(title, '[role="dialog"], [aria-modal="true"], .modal-content, [class*="modal-content"], [class*="dialog-content"]');
            if (semantic && visiblePanelCandidate(semantic) && validator(semantic)) return { title, panel: semantic };
            let current = title.parentElement;
            for (let depth = 0; current && current !== document.body && depth < 7; depth += 1) {
              if (visiblePanelCandidate(current) && validator(current)) return { title, panel: current };
              current = current.parentElement;
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => a.panel.querySelectorAll('*').length - b.panel.querySelectorAll('*').length);
        return candidates[0] || null;
      };

      const refreshProfilePanel = () => {
        const result = panelFromTitle(profileTitlePattern, (panel) => {
          const text = fullText(panel);
          return profileInfoPattern.test(text) && Boolean(panel.querySelector('button, img, input, select'));
        });
        const dialog = result?.panel || null;
        document.querySelectorAll('[data-pg-profile-dialog="true"]').forEach((element) => {
          if (element !== dialog) delete element.dataset.pgProfileDialog;
        });
        root.classList.toggle('pg-profile-open', Boolean(dialog));
        if (!dialog) return null;

        dialog.dataset.pgProfileDialog = 'true';
        const title = result.title;
        title.classList.add('pg-profile-title');
        const header = title.closest('header') || title.parentElement;
        header?.classList.add('pg-profile-header');
        const closeButton = findCloseControl(dialog);
        if (closeButton) {
          closeButton.classList.add('pg-profile-close');
          if (header && closeButton.parentElement !== header) header.appendChild(closeButton);
        }

        const avatar = [...dialog.querySelectorAll('img, picture')]
          .find((image) => !image.closest('button, [role="button"]'));
        avatar?.classList.add('pg-profile-avatar');

        const statCards = [...dialog.querySelectorAll('*')]
          .filter((element) => {
            const text = ownText(element);
            if (!text || !profileInfoPattern.test(text)) return false;
            const card = findMetricCard(dialog, element);
            return card && card !== dialog;
          })
          .map((element) => findMetricCard(dialog, element))
          .filter((element, index, all) => element && all.indexOf(element) === index && fullText(element).length < 190);
        statCards.forEach((card) => card.classList.add('pg-profile-stat'));
        const stats = sharedContainer(dialog, statCards);
        if (stats && stats !== dialog) stats.classList.add('pg-profile-stats');
        const bodyParts = [avatar, stats || statCards[0]].filter(Boolean);
        const body = sharedContainer(dialog, bodyParts);
        if (body && body !== dialog && body !== header) body.classList.add('pg-profile-body');

        dialog.querySelectorAll('button, a[role="button"]').forEach((button) => {
          if (button !== closeButton) button.classList.add('pg-profile-action');
        });
        return dialog;
      };

      const findPokesList = (dialog) => [...dialog.querySelectorAll('*')]
        .map((container) => ({
          container,
          items: [...container.children].filter((child) => {
            if (!child.querySelector('img, picture, [role="img"]')) return false;
            const text = fullText(child);
            return text.length >= 2 && !myPokesTitlePattern.test(text);
          })
        }))
        .filter(({ container, items }) => items.length >= 2 && !container.closest('.pg-pokes-header'))
        .sort((a, b) => b.items.length - a.items.length || a.container.querySelectorAll('*').length - b.container.querySelectorAll('*').length)[0] || null;

      const refreshMyPokesPanel = () => {
        const result = panelFromTitle(myPokesTitlePattern, (panel) => panel.querySelectorAll('img, picture, [role="img"]').length >= 2);
        const dialog = result?.panel || null;
        document.querySelectorAll('[data-pg-my-pokes-dialog="true"]').forEach((element) => {
          if (element !== dialog) delete element.dataset.pgMyPokesDialog;
        });
        root.classList.toggle('pg-my-pokes-open', Boolean(dialog));
        if (!dialog) return null;

        dialog.dataset.pgMyPokesDialog = 'true';
        const title = result.title;
        title.classList.add('pg-pokes-title');
        const header = title.closest('header') || title.parentElement;
        header?.classList.add('pg-pokes-header');
        const closeButton = findCloseControl(dialog);
        if (closeButton) {
          closeButton.classList.add('pg-pokes-close');
          if (header && closeButton.parentElement !== header) header.appendChild(closeButton);
        }

        const listResult = findPokesList(dialog);
        const list = listResult?.container || null;
        if (list) {
          list.classList.add('pg-pokes-list');
          listResult.items.forEach((item) => item.classList.add('pg-pokes-card'));
          const table = list.closest('table');
          const content = table?.parentElement || list;
          content.classList.add('pg-pokes-content');
        }

        const search = dialog.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i], input[placeholder*="nombre" i], input[placeholder*="name" i]');
        if (search) {
          let footer = search.parentElement;
          for (let depth = 0; footer && footer !== dialog && depth < 4; depth += 1) {
            if (footer.querySelectorAll('button, input, select').length > 1) break;
            footer = footer.parentElement;
          }
          if (footer && footer !== dialog) footer.classList.add('pg-pokes-footer');
        }
        dialog.querySelectorAll('button, [role="button"]').forEach((button) => {
          if (button !== closeButton) button.classList.add('pg-pokes-action');
        });
        return dialog;
      };

      const findTeamPanel = () => {
        const isTeamSlotCandidate = (child) => {
          if (child.classList.contains('pg-team-slot')) return true;
          if (!child.querySelector('img, picture, [role="img"]')) return false;
          const text = fullText(child);
          const hasStatus = Boolean(child.querySelector('progress, [role="progressbar"], [class*="hp" i], [class*="exp" i], [class*="health" i]'));
          return hasStatus || /\\bhp\\b|\\bexp\\b|health|salud|vida/i.test(text);
        };
        const existing = document.querySelector('[data-pg-team-panel="true"]');
        if (existing) {
          const existingSlots = [...existing.children].filter(isTeamSlotCandidate);
          const style = getComputedStyle(existing);
          if (existingSlots.length >= 1 && style.display !== 'none' && style.visibility !== 'hidden') {
            return { container: existing, slots: existingSlots };
          }
        }

        return [...document.querySelectorAll('body aside, body section, body div')]
        .filter((container) => !container.matches('.pg-player-panel, .pg-team-roster-panel, .pg-team-list'))
        .map((container) => {
          const slots = [...container.children].filter(isTeamSlotCandidate);
          return { container, slots };
        })
        .filter(({ container, slots }) => {
          if (slots.length < 2 || slots.length > 8) return false;
          if (isApplicationShell(container)) return false;
          if (container.closest('.game-dock, .ah-panel, .clog-window, [data-pg-profile-dialog="true"], [data-pg-my-pokes-dialog="true"], [data-pg-hunt-dialog="true"], [data-pg-capture-management="true"]')) return false;
          const rect = container.getBoundingClientRect();
          const style = getComputedStyle(container);
          return rect.width >= 120 && rect.width <= 420 && rect.height >= 70 && rect.height <= 430 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .sort((a, b) => b.slots.length - a.slots.length || a.container.querySelectorAll('*').length - b.container.querySelectorAll('*').length)[0] || null;
      };

      const scoreLegacyTeamMedia = (media, slotText) => {
        const image = media.matches?.('picture') ? (media.querySelector('img') || media) : media;
        const descriptor = [
          media.className,
          image.className,
          image.getAttribute?.('src'),
          image.getAttribute?.('alt'),
          image.getAttribute?.('title')
        ].filter(Boolean).join(' ').toLowerCase();
        let score = 0;
        if (/pokemon|pok[eÃ©]|sprite|front|creature|shiny/.test(descriptor)) score += 80;
        if (/type|element|icon|badge|gender|status|ball/.test(descriptor)) score -= 70;
        const alt = cleanLabel(image.getAttribute?.('alt') || '').toLowerCase();
        if (alt && alt.length > 2 && slotText.toLowerCase().includes(alt)) score += 45;
        const naturalWidth = Number(image.naturalWidth) || 0;
        const naturalHeight = Number(image.naturalHeight) || 0;
        score += Math.min(35, Math.sqrt(naturalWidth * naturalHeight) / 3);
        return score;
      };

      const markLegacyTeamSlotMedia = (slot) => {
        const media = [...slot.querySelectorAll('picture, img, [role="img"]')]
          .filter((element) => !(element.matches('img') && element.closest('picture')));
        const sprite = media
          .map((element, index) => ({ element, index, score: scoreTeamMedia(element, fullText(slot)) }))
          .sort((a, b) => b.score - a.score || b.index - a.index)[0]?.element || null;
        media.forEach((element) => {
          element.classList.toggle('pg-team-sprite', element === sprite);
          element.classList.toggle('pg-team-type-icon', element !== sprite);
        });
        const spriteImage = sprite?.querySelector?.('img') || null;
        if (spriteImage && !spriteImage.classList.contains('pg-team-sprite-image')) spriteImage.classList.add('pg-team-sprite-image');
        return sprite;
      };

      const normalizeTeamToken = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '')
        .toLowerCase();

      const teamTypePattern = /(?:^|[^a-z])(normal|fire|water|electric|grass|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|dark|steel|fairy|type|element|elemento|badge|gender|status|ball)(?:[^a-z]|$)/i;

      const getTeamPokemonName = (slot) => {
        const candidates = [...slot.querySelectorAll('strong, b, h2, h3, h4, [class*="name" i]')]
          .map((element) => cleanLabel(ownText(element) || fullText(element)))
          .concat([cleanLabel(fullText(slot).split(/(?:lv[.]?|level|nivel|hp|exp)/i)[0])]);
        return candidates
          .map((value) => value.replace(/[·|-]+[ ]*$/g, '').trim())
          .find((value) => value.length >= 2 && value.length <= 32 && !/^(hp|exp|level|nivel|evolve|evolucion|evolucionar)$/i.test(value) && !/^[0-9]+$/.test(value)) || '';
      };

      const getTeamMediaDescriptor = (media) => {
        const image = media.matches?.('picture') ? (media.querySelector('img') || media) : media;
        let background = '';
        try { background = getComputedStyle(media).backgroundImage || ''; } catch {}
        return [
          typeof media.className === 'string' ? media.className : '',
          media.id,
          typeof image.className === 'string' ? image.className : '',
          image.getAttribute?.('src'),
          image.getAttribute?.('alt'),
          image.getAttribute?.('title'),
          background
        ].filter(Boolean).join(' ').toLowerCase();
      };

      const scoreTeamMedia = (media, slotText, pokemonName = '') => {
        const image = media.matches?.('picture') ? (media.querySelector('img') || media) : media;
        const descriptor = getTeamMediaDescriptor(media);
        let score = 0;
        if (/pokemon|poke|sprite|front|creature|shiny/.test(descriptor)) score += 80;
        if (teamTypePattern.test(descriptor)) score -= 110;
        const normalizedName = normalizeTeamToken(pokemonName);
        if (normalizedName && normalizeTeamToken(descriptor).includes(normalizedName)) score += 100;
        const alt = cleanLabel(image.getAttribute?.('alt') || '').toLowerCase();
        if (alt && alt.length > 2 && slotText.toLowerCase().includes(alt)) score += 45;
        const naturalWidth = Number(image.naturalWidth) || 0;
        const naturalHeight = Number(image.naturalHeight) || 0;
        score += Math.min(35, Math.sqrt(naturalWidth * naturalHeight) / 3);
        return score;
      };

      const markTeamSlotMedia = (slot) => {
        const nativeSpriteHost = slot.querySelector(':scope > .phud-ico');
        if (nativeSpriteHost) {
          const setNativeClass = (element, className, enabled) => {
            if (element.classList.contains(className) !== enabled) element.classList.toggle(className, enabled);
          };
          setNativeClass(nativeSpriteHost, 'pg-team-sprite-host', true);
          slot.querySelector(':scope > .pg-team-generated-sprite')?.remove();
          const nativeRenderer = [...nativeSpriteHost.children]
            .find((element) => !element.matches('.pk-ts-type, .pk-ts-shiny')) || null;
          nativeRenderer?.querySelectorAll('img, picture, [role="img"]').forEach((element) => {
            setNativeClass(element, 'pg-team-sprite', false);
            setNativeClass(element, 'pg-team-type-icon', false);
            setNativeClass(element, 'pg-team-sprite-image', false);
            setNativeClass(element, 'pg-team-native-sprite-image', true);
          });
          nativeSpriteHost.querySelectorAll('.pk-ts-type, .pk-ts-shiny').forEach((element) => {
            setNativeClass(element, 'pg-team-sprite', false);
            setNativeClass(element, 'pg-team-sprite-image', false);
            setNativeClass(element, 'pg-team-native-sprite-image', false);
            setNativeClass(element, 'pg-team-type-icon', true);
          });
          return nativeSpriteHost;
        }

        const slotText = fullText(slot);
        const pokemonName = getTeamPokemonName(slot);
        const media = [...slot.querySelectorAll('picture, img, [role="img"]')]
          .filter((element) => !(element.matches('img') && element.closest('picture')) && !element.classList.contains('pg-team-generated-sprite'));
        const backgroundCandidates = [...slot.querySelectorAll('*')]
          .filter((element) => {
            if (element.classList.contains('pg-team-generated-sprite')) return false;
            try { return /url\\(/i.test(getComputedStyle(element).backgroundImage || ''); } catch { return false; }
          });
        const ranked = media
          .concat(backgroundCandidates.filter((element) => !media.includes(element)))
          .map((element, index) => ({ element, index, score: scoreTeamMedia(element, slotText, pokemonName) }))
          .sort((a, b) => b.score - a.score || b.index - a.index);
        let sprite = ranked[0]?.element || null;
        let generated = slot.querySelector(':scope > .pg-team-generated-sprite');
        const chosenBackground = sprite && backgroundCandidates.includes(sprite) ? sprite : null;

        if (chosenBackground) {
          if (!generated || generated.tagName === 'IMG') {
            generated?.remove();
            generated = document.createElement('span');
            generated.className = 'pg-team-generated-sprite pg-team-background-sprite pg-team-sprite';
            generated.setAttribute('aria-hidden', 'true');
            slot.prepend(generated);
          }
          const computed = getComputedStyle(chosenBackground);
          const copyBackgroundProperty = (property, value) => {
            if (generated.style.getPropertyValue(property) !== value || generated.style.getPropertyPriority(property) !== 'important') {
              generated.style.setProperty(property, value, 'important');
            }
          };
          copyBackgroundProperty('background-image', computed.backgroundImage);
          copyBackgroundProperty('background-position', computed.backgroundPosition);
          copyBackgroundProperty('background-size', computed.backgroundSize);
          copyBackgroundProperty('background-repeat', computed.backgroundRepeat);
          sprite = generated;
        } else if (generated?.tagName !== 'IMG') {
          generated?.remove();
          generated = null;
        }

        if ((!sprite || (ranked[0]?.score || 0) < 1) && pokemonName) {
          const normalizedName = normalizeTeamToken(pokemonName);
          const sourceImage = [...document.images].find((image) => {
            if (slot.contains(image) || image.closest('[data-pg-team-panel="true"]')) return false;
            const descriptor = [image.alt, image.title, image.currentSrc, image.src, image.className].filter(Boolean).join(' ');
            return normalizedName && normalizeTeamToken(descriptor).includes(normalizedName) && !teamTypePattern.test(descriptor);
          });
          if (sourceImage) {
            if (!generated || generated.tagName !== 'IMG') {
              generated?.remove();
              generated = document.createElement('img');
              generated.className = 'pg-team-generated-sprite pg-team-sprite';
              generated.alt = pokemonName;
              slot.prepend(generated);
            }
            const source = sourceImage.currentSrc || sourceImage.src;
            if (generated.src !== source) generated.src = source;
            sprite = generated;
          }
        }

        media.forEach((element) => {
          const isSprite = element === sprite;
          const isTypeIcon = element !== sprite && !element.contains(sprite);
          if (element.classList.contains('pg-team-sprite') !== isSprite) element.classList.toggle('pg-team-sprite', isSprite);
          if (element.classList.contains('pg-team-type-icon') !== isTypeIcon) element.classList.toggle('pg-team-type-icon', isTypeIcon);
        });
        const spriteImage = sprite?.querySelector?.('img') || null;
        if (spriteImage && !spriteImage.classList.contains('pg-team-sprite-image')) spriteImage.classList.add('pg-team-sprite-image');
        return sprite;
      };

      const findPlayerInfoSource = (teamPanel) => {
        const teamRect = teamPanel.getBoundingClientRect();
        return [...document.querySelectorAll('body aside, body section, body div')]
          .filter((element) => {
            if (element === teamPanel || element.contains(teamPanel) || teamPanel.contains(element)) return false;
            if (element.matches('[data-pg-player-source-hidden="true"]')) return false;
            if (element.closest('.game-dock, .ah-panel, .clog-window, [role="dialog"], [data-pg-profile-dialog="true"], [data-pg-my-pokes-dialog="true"], [data-pg-hunt-dialog="true"], [data-pg-capture-management="true"]')) return false;
            const text = fullText(element);
            if (text.length < 4 || text.length > 180 || !/(?:level|nivel|lv[.]?[ ]*[0-9])/i.test(text)) return false;
            if (/hp|exp|health|salud|vida/i.test(text)) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const overlapsX = rect.right >= teamRect.left - 18 && rect.left <= teamRect.right + 18;
            const nearTeam = rect.top <= teamRect.top + 20 && teamRect.top - rect.top < 180;
            return overlapsX && nearTeam && rect.width >= 90 && rect.width <= 360 && rect.height >= 20 && rect.height <= 150 && style.display !== 'none' && style.visibility !== 'hidden';
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const imageBonus = element.querySelector('img, picture, [role="img"]') ? 120 : 0;
            const horizontalDistance = Math.abs(rect.left - teamRect.left);
            const verticalDistance = Math.max(0, teamRect.top - rect.bottom);
            return { element, score: imageBonus - horizontalDistance - verticalDistance - (rect.width * rect.height / 2000) };
          })
          .sort((a, b) => b.score - a.score || a.element.querySelectorAll('*').length - b.element.querySelectorAll('*').length)[0]?.element || null;
      };

      const readPlayerSummary = (source) => {
        const text = cleanLabel(fullText(source));
        const levelMatch = text.match(/(?:level|nivel|lv[.]?)[ ]*([0-9]+)/i);
        const namedElements = [...source.querySelectorAll('[class*="name" i], strong, b, h1, h2, h3, h4')]
          .map((element) => cleanLabel(ownText(element) || fullText(element)))
          .filter((value) => value.length >= 2 && value.length <= 32 && !/(?:level|nivel|lv[.]?)[ ]*[0-9]/i.test(value));
        const leadingName = text.match(/^(.{2,32}?)[ ]+(?=(?:level|nivel|lv[.]?)[ ]*[0-9])/i)?.[1] || '';
        const name = namedElements[0] || cleanLabel(leadingName) || 'ENTRENADOR';
        const detail = levelMatch ? 'Nivel ' + levelMatch[1] + ' · Entrenador' : 'Perfil de entrenador';
        const canvas = [...source.querySelectorAll('canvas')]
          .filter((element) => element.width >= 24 && element.height >= 24)
          .sort((a, b) => (Number(b.width) * Number(b.height)) - (Number(a.width) * Number(a.height)))[0] || null;
        let canvasSource = '';
        if (canvas) { try { canvasSource = canvas.toDataURL('image/png'); } catch {} }
        const image = [...source.querySelectorAll('img')]
          .filter((element) => !/map|tile|background|logo|brand|pokeball|icon/i.test([element.src, element.className, element.alt].join(' ')))
          .sort((a, b) => (Number(b.naturalWidth) * Number(b.naturalHeight)) - (Number(a.naturalWidth) * Number(a.naturalHeight)))[0] || null;
        return { name, detail, imageSrc: canvasSource || image?.currentSrc || image?.src || '' };
      };

      const refreshPlayerSummary = (panel) => {
        let source = window.__pgTeamPlayerSource;
        if (!source?.isConnected) source = findPlayerInfoSource(panel);
        if (source && !panel.contains(source)) {
          window.__pgTeamPlayerSource = source;
          source.dataset.pgPlayerSourceHidden = 'true';
        }
        let summary = panel.querySelector(':scope > .pg-team-profile-summary');
        if (!summary) {
          summary = document.createElement('section');
          summary.className = 'pg-team-profile-summary pg-team-generated';
          summary.innerHTML = '<span class="pg-team-profile-avatar" aria-hidden="true"></span><span class="pg-team-profile-copy"><strong></strong><small></small></span>';
          panel.prepend(summary);
        }
        const data = readPlayerSummary(source || panel);
        summary.querySelector('strong').textContent = data.name;
        summary.querySelector('small').textContent = data.detail;
        const avatar = summary.querySelector('.pg-team-profile-avatar');
        if (data.imageSrc) avatar.style.setProperty('--pg-team-profile-image', 'url("' + data.imageSrc.replaceAll('"', '%22') + '")');
        else avatar.style.removeProperty('--pg-team-profile-image');
        return summary;
      };

      const refreshTeamPanel = () => {
        const result = findTeamPanel();
        const panel = result?.container || null;
        root.classList.toggle('pg-has-team', Boolean(panel));
        document.querySelectorAll('[data-pg-team-panel="true"]').forEach((element) => {
          if (element !== panel) delete element.dataset.pgTeamPanel;
        });

        let sideToggle = document.querySelector('.pg-team-side-toggle');
        if (!sideToggle) {
          sideToggle = document.createElement('button');
          sideToggle.type = 'button';
          sideToggle.className = 'pg-team-side-toggle';
          sideToggle.setAttribute('aria-label', 'Ocultar entrenador y equipo');
          sideToggle.setAttribute('aria-expanded', 'true');
          document.body.appendChild(sideToggle);
        }
        const syncTeamTogglePosition = () => {
          if (!panel) return;
          const rect = panel.getBoundingClientRect();
          const toggleWidth = sideToggle.offsetWidth || 23;
          const toggleHeight = sideToggle.offsetHeight || 50;
          const firstSlot = panel.querySelector('.pg-team-slot');
          const firstSlotRect = firstSlot?.getBoundingClientRect();
          const rosterTop = firstSlotRect ? firstSlotRect.top - 24 : rect.top + Math.min(72, rect.height * .34);
          const top = Math.round(Math.max(6, Math.min(innerHeight - toggleHeight - 6, rosterTop)));
          const left = root.classList.contains('pg-team-hud-collapsed') ? 0 : Math.round(Math.max(0, rect.left - toggleWidth + 1));
          const topValue = top + 'px';
          const leftValue = left + 'px';
          if (sideToggle.style.getPropertyValue('--pg-team-toggle-top') !== topValue) sideToggle.style.setProperty('--pg-team-toggle-top', topValue);
          if (sideToggle.style.getPropertyValue('--pg-team-toggle-left') !== leftValue) sideToggle.style.setProperty('--pg-team-toggle-left', leftValue);
        };
        const setTeamCollapsed = (collapsed) => {
          root.classList.toggle('pg-team-hud-collapsed', collapsed);
          sideToggle.setAttribute('aria-expanded', String(!collapsed));
          sideToggle.setAttribute('aria-label', collapsed ? 'Mostrar entrenador y equipo' : 'Ocultar entrenador y equipo');
          try { localStorage.setItem('pokegrid:team-hud-collapsed:v1', String(collapsed)); } catch {}
          requestAnimationFrame(syncTeamTogglePosition);
        };
        if (!sideToggle.dataset.pgBound) {
          sideToggle.dataset.pgBound = 'true';
          sideToggle.addEventListener('click', () => setTeamCollapsed(!root.classList.contains('pg-team-hud-collapsed')));
          try { setTeamCollapsed(localStorage.getItem('pokegrid:team-hud-collapsed:v1') === 'true'); } catch {}
        }

        if (!panel) return null;
        panel.dataset.pgTeamPanel = 'true';
        if (window.__pgTeamPanelObserverTarget !== panel) {
          window.__pgTeamPanelObserver?.disconnect();
          window.__pgTeamPanelObserver = new MutationObserver(refreshTeamPanel);
          window.__pgTeamPanelObserver.observe(panel, { childList: true });
          window.__pgTeamPanelObserverTarget = panel;
        }
        if (!panel.dataset.pgTeamCapacity) {
          const capacityText = [...panel.children]
            .filter((child) => !result.slots.includes(child))
            .map((child) => fullText(child))
            .join(' ');
          const capacityMatch = capacityText.match(new RegExp('[0-9]+[ ]*/[ ]*([0-9]+)'));
          panel.dataset.pgTeamCapacity = capacityMatch?.[1] || '6';
        }
        const teamList = panel;
        refreshPlayerSummary(panel);
        const playerNodes = [...panel.children].filter((child) =>
          !result.slots.includes(child) && !child.classList.contains('pg-team-generated'));
        playerNodes.forEach((node) => {
          node.classList.remove('pg-team-header');
          node.classList.add('pg-player-panel');
        });
        const playerPanel = playerNodes[0] || null;
        delete panel.dataset.pgTeamStructured;

        const nativeTeamHost = panel.closest('.phud');
        if (nativeTeamHost && nativeTeamHost !== panel) nativeTeamHost.dataset.pgTeamHostNeutralized = 'true';

        const slots = [...result.slots, ...teamList.querySelectorAll(':scope > .pg-team-slot')]
          .filter((slot, index, all) => all.indexOf(slot) === index);
        panel.dataset.pgTeamCount = String(slots.length);
        const countLabel = slots.length + '/' + panel.dataset.pgTeamCapacity + ' POKEMON';
        panel.dataset.pgTeamCountLabel = countLabel;

        const emptyCount = Math.max(0, Number(panel.dataset.pgTeamCapacity) - slots.length);
        const emptySlots = [...panel.querySelectorAll(':scope > .pg-team-empty-slot')];
        emptySlots.slice(emptyCount).forEach((element) => element.remove());
        for (let index = emptySlots.length; index < emptyCount; index += 1) {
          const emptySlot = document.createElement('div');
          emptySlot.className = 'pg-team-empty-slot pg-team-generated';
          emptySlot.innerHTML = '<span class="pg-team-empty-icon" aria-hidden="true"></span><span><strong>ESPACIO VACÍO</strong><small>Añade un Pokémon a tu equipo.</small></span><b aria-hidden="true">+</b>';
          panel.appendChild(emptySlot);
        }

        const playerMedia = playerPanel ? [...playerPanel.querySelectorAll('picture, img, [role="img"]')]
          .filter((element) => !(element.matches('img') && element.closest('picture')))
          .sort((a, b) => scoreTeamMedia(b, fullText(playerPanel)) - scoreTeamMedia(a, fullText(playerPanel))) : [];
        const playerAvatar = playerMedia[0] || null;
        playerMedia.forEach((element) => {
          const isAvatar = element === playerAvatar;
          if (element.classList.contains('pg-player-avatar') !== isAvatar) element.classList.toggle('pg-player-avatar', isAvatar);
        });
        slots.forEach((slot) => {
          if (!slot.classList.contains('pg-team-slot')) slot.classList.add('pg-team-slot');
          markTeamSlotMedia(slot);
          const meters = [...slot.querySelectorAll('progress, [role="progressbar"]')];
          meters.forEach((meter, index) => {
            const isXpMeter = index === 1;
            if (meter.classList.contains('pg-team-xp-meter') !== isXpMeter) meter.classList.toggle('pg-team-xp-meter', isXpMeter);
          });
          if (!slot.dataset.pgTeamSelectBound) {
            slot.dataset.pgTeamSelectBound = 'true';
            slot.addEventListener('click', () => {
              panel.querySelectorAll('.pg-team-slot').forEach((other) => delete other.dataset.pgTeamSelected);
              slot.dataset.pgTeamSelected = 'true';
            });
          }
        });
        syncTeamTogglePosition();
        return panel;
      };

      const refreshGenericSurfaces = () => {
        const selectors = [
          '[role="dialog"]',
          '[aria-modal="true"]',
          '.modal-content',
          '[class*="modal-content"]',
          '[class*="dialog-content"]'
        ].join(',');
        document.querySelectorAll(selectors).forEach((element) => {
          const surfaceText = fullText(element);
          if (
            isApplicationShell(element) ||
            element.matches('.clog-window, .ha-window, .ah-modal, .auto-helper-dialog, .capture-dialog, [class*="profile" i], [class*="capture-management" i]') ||
            /profile|perfil|auto[-\\s]?helper|capture\\s*management/i.test(surfaceText) ||
            element.matches('[data-pg-auto-dialog="true"], [data-pg-hunt-dialog="true"], [data-pg-capture-management="true"], [data-pg-profile-dialog="true"], [data-pg-my-pokes-dialog="true"], [data-pg-team-panel="true"]') ||
            element.closest('.game-dock, .ah-panel, .clog-window, .ha-window, [data-pg-hunt-dialog="true"], [data-pg-capture-management="true"], [data-pg-profile-dialog="true"], [data-pg-my-pokes-dialog="true"], [data-pg-team-panel="true"]')
          ) return;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const interactive = element.querySelector('button, input, select, textarea');
          if (interactive && rect.width >= 180 && rect.height >= 80 && style.display !== 'none') {
            element.dataset.pgSurface = 'true';
          }
        });
      };

      const FLOAT_MARGIN = 6;
      const CAPTURE_GEOMETRY_KEY = 'pokegrid:capture-log-geometry:v2';
      const CAPTURE_MANAGEMENT_GEOMETRY_KEY = 'pokegrid:capture-management-geometry:v2';
      const CAPTURE_MANAGEMENT_VIEW_KEY = 'pokegrid:capture-management-view:v1';
      const HUNT_ANALYZER_GEOMETRY_KEY = 'pokegrid:hunt-analyzer-geometry:v3';
      const AUTO_HELPER_GEOMETRY_KEY = 'pokegrid:auto-helper-geometry:v2';
      let centerAutoHelperOnOpen = false;

      const clampFloatValue = (value, minimum, maximum) => Math.min(
        Math.max(value, minimum),
        Math.max(minimum, maximum)
      );

      const setImportantPixels = (element, property, value) => {
        const nextValue = Math.round(value) + 'px';
        if (
          element.style.getPropertyValue(property) === nextValue &&
          element.style.getPropertyPriority(property) === 'important'
        ) return;
        element.style.setProperty(property, nextValue, 'important');
      };

      const readCaptureGeometry = (storageKey = CAPTURE_GEOMETRY_KEY) => {
        try {
          const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (!value || typeof value !== 'object') return null;
          const geometry = {
            left: Number(value.left),
            top: Number(value.top),
            width: Number(value.width),
            height: Number(value.height)
          };
          return Object.values(geometry).every(Number.isFinite) ? geometry : null;
        } catch {
          return null;
        }
      };

      const captureGeometryFromElement = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        };
      };

      const constrainFloatingGeometry = (geometry, element = null) => {
        const availableWidth = Math.max(1, innerWidth - (FLOAT_MARGIN * 2));
        const availableHeight = Math.max(1, innerHeight - (FLOAT_MARGIN * 2));
        const compactViewport = innerWidth <= 600 || innerHeight <= 480;
        const maximumWidth = compactViewport
          ? Math.min(availableWidth, Math.max(250, Math.floor(innerWidth * .9)))
          : availableWidth;
        const maximumHeight = compactViewport
          ? Math.min(availableHeight, Math.max(170, Math.floor(innerHeight * .8)))
          : availableHeight;
        const minimumWidth = Math.min(compactViewport ? 250 : 340, maximumWidth);
        const minimumHeight = Math.min(compactViewport ? 170 : 280, maximumHeight);
        const width = clampFloatValue(Number(geometry.width) || 680, minimumWidth, maximumWidth);
        const height = clampFloatValue(Number(geometry.height) || 440, minimumHeight, maximumHeight);
        const maximumLeft = Math.max(FLOAT_MARGIN, innerWidth - FLOAT_MARGIN - width);
        const maximumTop = Math.max(FLOAT_MARGIN, innerHeight - FLOAT_MARGIN - height);
        const requestedLeft = Number.isFinite(Number(geometry.left)) ? Number(geometry.left) : (innerWidth - width) / 2;
        const requestedTop = Number.isFinite(Number(geometry.top)) ? Number(geometry.top) : (innerHeight - height) / 2;
        return {
          left: clampFloatValue(requestedLeft, FLOAT_MARGIN, maximumLeft),
          top: clampFloatValue(requestedTop, FLOAT_MARGIN, maximumTop),
          width,
          height
        };
      };

      const applyFloatingGeometry = (element, geometry) => {
        const constrained = constrainFloatingGeometry(geometry, element);
        setImportantPixels(element, 'left', constrained.left);
        setImportantPixels(element, 'top', constrained.top);
        setImportantPixels(element, 'width', constrained.width);
        setImportantPixels(element, 'height', constrained.height);
        return constrained;
      };

      const saveCaptureGeometry = (element, storageKey = CAPTURE_GEOMETRY_KEY) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(captureGeometryFromElement(element)));
        } catch {}
      };

      const beginFloatingInteraction = (
        element,
        handle,
        corner,
        event,
        storageKey = CAPTURE_GEOMETRY_KEY
      ) => {
        if (event.button !== 0 || element.dataset.pgCollapsed === 'true') return;
        if (
          !corner &&
          event.target.closest('button, a, input, select, textarea, [role="button"], .clog-x')
        ) return;
        event.preventDefault();
        event.stopPropagation();

        const start = captureGeometryFromElement(element);
        const interaction = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          start
        };
        handle.__pgFloatInteraction = interaction;
        element.dataset.pgFloatActive = 'true';
        root.classList.add('pg-floating-active');
        try { handle.setPointerCapture(event.pointerId); } catch {}

        const onMove = (moveEvent) => {
          const active = handle.__pgFloatInteraction;
          if (!active || active.pointerId !== moveEvent.pointerId) return;
          moveEvent.preventDefault();
          const dx = moveEvent.clientX - active.startX;
          const dy = moveEvent.clientY - active.startY;
          const next = { ...active.start };

          if (!corner) {
            next.left += dx;
            next.top += dy;
          } else {
            const availableWidth = Math.max(1, innerWidth - (FLOAT_MARGIN * 2));
            const availableHeight = Math.max(1, innerHeight - (FLOAT_MARGIN * 2));
            const compactViewport = innerWidth <= 600 || innerHeight <= 480;
            const maximumWidth = compactViewport ? Math.min(availableWidth, Math.max(250, Math.floor(innerWidth * .9))) : availableWidth;
            const maximumHeight = compactViewport ? Math.min(availableHeight, Math.max(170, Math.floor(innerHeight * .8))) : availableHeight;
            const minimumWidth = Math.min(compactViewport ? 250 : 340, maximumWidth);
            const minimumHeight = Math.min(compactViewport ? 170 : 280, maximumHeight);

            if (corner.includes('e')) {
              next.width = clampFloatValue(active.start.width + dx, minimumWidth, Math.min(maximumWidth, innerWidth - FLOAT_MARGIN - active.start.left));
            }
            if (corner.includes('s')) {
              next.height = clampFloatValue(active.start.height + dy, minimumHeight, Math.min(maximumHeight, innerHeight - FLOAT_MARGIN - active.start.top));
            }
            if (corner.includes('w')) {
              const right = active.start.left + active.start.width;
              next.left = clampFloatValue(active.start.left + dx, Math.max(FLOAT_MARGIN, right - maximumWidth), right - minimumWidth);
              next.width = right - next.left;
            }
            if (corner.includes('n')) {
              const bottom = active.start.top + active.start.height;
              next.top = clampFloatValue(active.start.top + dy, Math.max(FLOAT_MARGIN, bottom - maximumHeight), bottom - minimumHeight);
              next.height = bottom - next.top;
            }
          }

          applyFloatingGeometry(element, next);
        };

        const finish = (finishEvent) => {
          const active = handle.__pgFloatInteraction;
          if (!active || active.pointerId !== finishEvent.pointerId) return;
          delete handle.__pgFloatInteraction;
          delete element.dataset.pgFloatActive;
          root.classList.remove('pg-floating-active');
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', finish);
          handle.removeEventListener('pointercancel', finish);
          handle.removeEventListener('lostpointercapture', finish);
          saveCaptureGeometry(element, storageKey);
          requestAnimationFrame(refresh);
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
      };

      const enableFloatingCaptureLog = (captureLog) => {
        captureLog.dataset.pgFloating = 'true';

        if (!captureLog.dataset.pgFloatingBound) {
          captureLog.dataset.pgFloatingBound = 'true';
          const title = captureLog.querySelector('.clog-title');
          if (title) {
            title.setAttribute('title', 'Arrastra para mover la ventana');
            title.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(captureLog, title, '', event);
            });
          }

          ['nw', 'ne', 'se', 'sw'].forEach((corner) => {
            let resizer = captureLog.querySelector('.pg-float-resizer[data-pg-corner="' + corner + '"]');
            if (!resizer) {
              resizer = document.createElement('span');
              resizer.className = 'pg-float-resizer';
              resizer.dataset.pgCorner = corner;
              resizer.setAttribute('aria-hidden', 'true');
              captureLog.appendChild(resizer);
            }
            resizer.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(captureLog, resizer, corner, event);
            });
          });

          const stored = readCaptureGeometry();
          applyFloatingGeometry(captureLog, stored || {
            width: 680,
            height: 440
          });
        } else if (!captureLog.dataset.pgFloatActive) {
          applyFloatingGeometry(captureLog, captureGeometryFromElement(captureLog));
        }
      };

      const captureManagementTitlePattern = /capture management|gerenciamento de captura|gesti[oó]n de capturas?|administraci[oó]n de capturas?/i;
      const captureManagementRecentPattern = /most recent attempts|intentos m[aá]s recientes|tentativas mais recentes/i;
      const captureManagementTotalPattern = /total attempts|intentos totales?|tentativas totais/i;

      const findCaptureManagementDialog = () => {
        const markerContainer = [...document.querySelectorAll('body *')]
          .filter((element) => {
            if (element.matches('.clog-window, .ah-panel, .game-dock, .pg-dock-burger')) return false;
            if (isApplicationShell(element)) return false;
            const text = fullText(element);
            if (!captureManagementTitlePattern.test(text)) return false;
            if (!captureManagementRecentPattern.test(text) || !captureManagementTotalPattern.test(text)) return false;
            if (!element.querySelector('button, input, [role="button"]')) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 260 && rect.height > 180 && style.display !== 'none' && style.visibility !== 'hidden';
          })
          .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0] || null;
        if (!markerContainer) return null;
        return resolveSafeDialogRoot(markerContainer,
          '[role="dialog"], [aria-modal="true"], .modal-content, [class*="modal-content"], [class*="dialog-content"]'
        );
      };

      const findCaptureManagementList = (dialog) => {
        const candidates = [...dialog.querySelectorAll('*')]
          .map((container) => {
            const children = [...container.children].filter((child) => {
              if (!child.querySelector('img, picture, [role="img"]')) return false;
              const text = fullText(child);
              return text.length >= 14 && !captureManagementTitlePattern.test(text);
            });
            return { container, children };
          })
          .filter(({ container, children }) => {
            if (children.length < 2) return false;
            if (container.closest('.pg-cm-header, .pg-cm-controls, .pg-cm-view-switch')) return false;
            const rect = container.getBoundingClientRect();
            return rect.width > 180 && rect.height > 70;
          })
          .sort((a, b) => {
            if (b.children.length !== a.children.length) return b.children.length - a.children.length;
            return a.container.querySelectorAll('*').length - b.container.querySelectorAll('*').length;
          });
        return candidates[0] || null;
      };

      const setCaptureManagementView = (dialog, view) => {
        const nextView = view === 'grid' ? 'grid' : 'linear';
        dialog.dataset.pgCmView = nextView;
        dialog.querySelectorAll('.pg-cm-view-button').forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.pgView === nextView));
        });
        try { localStorage.setItem(CAPTURE_MANAGEMENT_VIEW_KEY, nextView); } catch {}
      };

      const buildCaptureManagementViewSwitch = (dialog) => {
        let switcher = dialog.querySelector('.pg-cm-view-switch');
        if (!switcher) {
          switcher = document.createElement('div');
          switcher.className = 'pg-cm-view-switch';
          switcher.setAttribute('role', 'group');
          switcher.setAttribute('aria-label', 'Tipo de visualización');

          const options = [
            { view: 'linear', icon: '☷', label: 'Vista lineal' },
            { view: 'grid', icon: '▦', label: 'Vista cuadros' }
          ];
          options.forEach((option) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'pg-cm-view-button';
            button.dataset.pgView = option.view;
            const icon = document.createElement('span');
            icon.className = 'pg-cm-view-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = option.icon;
            const label = document.createElement('span');
            label.textContent = option.label;
            button.append(icon, label);
            button.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              setCaptureManagementView(dialog, option.view);
            });
            switcher.appendChild(button);
          });
        }
        return switcher;
      };

      const enableFloatingCaptureManagement = (dialog, dragHandle) => {
        dialog.dataset.pgFloating = 'true';
        if (!dialog.dataset.pgFloatingBound) {
          dialog.dataset.pgFloatingBound = 'true';
          if (dragHandle) {
            dragHandle.setAttribute('title', 'Arrastra para mover la ventana');
            dragHandle.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(
                dialog,
                dragHandle,
                '',
                event,
                CAPTURE_MANAGEMENT_GEOMETRY_KEY
              );
            });
          }

          ['nw', 'ne', 'se', 'sw'].forEach((corner) => {
            let resizer = dialog.querySelector('.pg-float-resizer[data-pg-corner="' + corner + '"]');
            if (!resizer) {
              resizer = document.createElement('span');
              resizer.className = 'pg-float-resizer';
              resizer.dataset.pgCorner = corner;
              resizer.setAttribute('aria-hidden', 'true');
              dialog.appendChild(resizer);
            }
            resizer.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(
                dialog,
                resizer,
                corner,
                event,
                CAPTURE_MANAGEMENT_GEOMETRY_KEY
              );
            });
          });

          const stored = readCaptureGeometry(CAPTURE_MANAGEMENT_GEOMETRY_KEY);
          applyFloatingGeometry(dialog, stored || {
            width: 680,
            height: 440
          });
        } else if (!dialog.dataset.pgFloatActive) {
          applyFloatingGeometry(dialog, captureGeometryFromElement(dialog));
        }
      };

      const enableFloatingAutoHelper = (dialog, dragHandle) => {
        dialog.dataset.pgFloating = 'true';
        if (!dialog.dataset.pgFloatingBound) {
          dialog.dataset.pgFloatingBound = 'true';
          if (dragHandle) {
            dragHandle.setAttribute('title', 'Arrastra para mover la ventana');
            dragHandle.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(dialog, dragHandle, '', event, AUTO_HELPER_GEOMETRY_KEY);
            });
          }

          ['nw', 'ne', 'se', 'sw'].forEach((corner) => {
            let resizer = dialog.querySelector('.pg-float-resizer[data-pg-corner="' + corner + '"]');
            if (!resizer) {
              resizer = document.createElement('span');
              resizer.className = 'pg-float-resizer';
              resizer.dataset.pgCorner = corner;
              resizer.setAttribute('aria-hidden', 'true');
              dialog.appendChild(resizer);
            }
            resizer.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(dialog, resizer, corner, event, AUTO_HELPER_GEOMETRY_KEY);
            });
          });

          const stored = readCaptureGeometry(AUTO_HELPER_GEOMETRY_KEY);
          const initialGeometry = stored || { width: 620, height: 410 };
          applyFloatingGeometry(dialog, centerAutoHelperOnOpen ? {
            width: initialGeometry.width,
            height: initialGeometry.height
          } : initialGeometry);
        } else if (!dialog.dataset.pgFloatActive) {
          const currentGeometry = captureGeometryFromElement(dialog);
          applyFloatingGeometry(dialog, centerAutoHelperOnOpen ? {
            width: currentGeometry.width,
            height: currentGeometry.height
          } : currentGeometry);
        }
        if (centerAutoHelperOnOpen) {
          centerAutoHelperOnOpen = false;
          saveCaptureGeometry(dialog, AUTO_HELPER_GEOMETRY_KEY);
        }
      };

      const enableFloatingHuntAnalyzer = (dialog, dragHandle) => {
        dialog.dataset.pgFloating = 'true';
        if (!dialog.dataset.pgFloatingBound) {
          dialog.dataset.pgFloatingBound = 'true';
          if (dragHandle) {
            dragHandle.setAttribute('title', 'Arrastra para mover la ventana');
            dragHandle.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(dialog, dragHandle, '', event, HUNT_ANALYZER_GEOMETRY_KEY);
            });
          }

          ['nw', 'ne', 'se', 'sw'].forEach((corner) => {
            let resizer = dialog.querySelector('.pg-float-resizer[data-pg-corner="' + corner + '"]');
            if (!resizer) {
              resizer = document.createElement('span');
              resizer.className = 'pg-float-resizer';
              resizer.dataset.pgCorner = corner;
              resizer.setAttribute('aria-hidden', 'true');
              dialog.appendChild(resizer);
            }
            resizer.addEventListener('pointerdown', (event) => {
              beginFloatingInteraction(dialog, resizer, corner, event, HUNT_ANALYZER_GEOMETRY_KEY);
            });
          });

          const stored = readCaptureGeometry(HUNT_ANALYZER_GEOMETRY_KEY);
          applyFloatingGeometry(dialog, stored || {
            width: 560,
            height: 360
          });
        } else if (!dialog.dataset.pgFloatActive) {
          applyFloatingGeometry(dialog, captureGeometryFromElement(dialog));
        }
      };

      const refreshCaptureManagement = () => {
        const dialog = findCaptureManagementDialog();
        document.querySelectorAll('[data-pg-capture-management="true"]').forEach((element) => {
          if (element === dialog) return;
          delete element.dataset.pgCaptureManagement;
          delete element.dataset.pgCmView;
        });
        root.classList.toggle('pg-capture-management-open', Boolean(dialog));
        if (!dialog) return null;

        dialog.dataset.pgCaptureManagement = 'true';
        const title = findOwnText(dialog, captureManagementTitlePattern);
        const header = title?.closest('header') || title?.parentElement;
        if (header && header !== dialog) header.classList.add('pg-cm-header');
        title?.classList.add('pg-cm-drag-handle');

        if (header) {
          const subtitle = [...header.querySelectorAll('*')].find((element) => {
            const text = ownText(element);
            return /administra|manage and review|revise suas capturas|revisa tus capturas/i.test(text);
          });
          subtitle?.classList.add('pg-cm-subtitle');
        }

        const closeButton = [...dialog.querySelectorAll('button, [role="button"]')].find((button) => {
          const label = [
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            ownText(button)
          ].filter(Boolean).join(' ');
          return /close|fechar|cerrar|^[x×]$/i.test(label);
        });
        closeButton?.classList.add('pg-cm-close');

        const tabButtons = [...dialog.querySelectorAll('button, [role="tab"]')].filter((button) => {
          const text = fullText(button);
          return /pok[eé] balls? used|pok[eé] bolas? utilizadas?|pok[eé] bolas? usadas?|balls? used on shin/i.test(text);
        });
        tabButtons.forEach((button) => {
          button.classList.add('pg-cm-tab');
          if (!button.dataset.pgCmTabBound) {
            button.dataset.pgCmTabBound = 'true';
            button.addEventListener('click', () => {
              tabButtons.forEach((item) => item.classList.toggle('pg-cm-active', item === button));
            });
          }
        });
        if (tabButtons.length && !tabButtons.some((button) => button.classList.contains('pg-cm-active'))) {
          const selected = tabButtons.find((button) =>
            button.matches('.active, [aria-selected="true"], [aria-pressed="true"], [data-active="true"]')
          ) || tabButtons[0];
          selected.classList.add('pg-cm-active');
        }

        const tabGroup = tabButtons.length > 1 ? sharedContainer(dialog, tabButtons) : tabButtons[0]?.parentElement;
        tabGroup?.classList.add('pg-cm-tab-group', 'pg-cm-controls');

        const listResult = findCaptureManagementList(dialog);
        const list = listResult?.container || null;
        const items = list
          ? [...list.children].filter((item) => {
              const text = fullText(item);
              return text.length >= 3 && !captureManagementTitlePattern.test(text);
            })
          : [];
        if (list) {
          list.classList.add('pg-cm-list');
          items.forEach((item) => {
            item.classList.add('pg-cm-item');
            const cells = [...item.children];
            cells.forEach((cell) => cell.classList.remove(
              'pg-cm-id', 'pg-cm-pokemon', 'pg-cm-ball-stat', 'pg-cm-ball-stat-single',
              'pg-cm-recent', 'pg-cm-total'
            ));
            if (cells.length >= 4) {
              cells[0]?.classList.add('pg-cm-id');
              cells[1]?.classList.add('pg-cm-pokemon');
              const ballCells = cells.slice(2, -2);
              ballCells.forEach((cell) => cell.classList.add('pg-cm-ball-stat'));
              if (ballCells.length === 1) ballCells[0].classList.add('pg-cm-ball-stat-single');
              cells.at(-2)?.classList.add('pg-cm-recent');
              cells.at(-1)?.classList.add('pg-cm-total');
            }
            item.dataset.pgCmShiny = String(/shiny|✨/i.test(fullText(item)));
          });
          const table = list.closest('table');
          if (table) {
            table.classList.add('pg-cm-table');
            dialog.dataset.pgCmTable = 'true';
          }
          let content = table?.parentElement || (list.parentElement !== dialog ? list.parentElement : null);
          if (!content || content === dialog) {
            const contentNode = table || list;
            content = document.createElement('div');
            content.className = 'pg-cm-content';
            dialog.insertBefore(content, contentNode);
            content.appendChild(contentNode);
          } else {
            content.classList.add('pg-cm-content');
          }
        }

        const switcher = buildCaptureManagementViewSwitch(dialog);
        if (!switcher.isConnected) {
          if (tabGroup) tabGroup.appendChild(switcher);
          else if (list) list.parentElement?.insertBefore(switcher, list);
          else dialog.appendChild(switcher);
        }

        const search = dialog.querySelector('input[type="search"], input[placeholder*="Name" i], input[placeholder*="Nombre" i], input[placeholder*="Nome" i]');
        if (search) {
          let footer = search.parentElement;
          for (let depth = 0; footer && footer !== dialog && depth < 4; depth += 1) {
            if (footer.querySelectorAll('button, input[type="checkbox"]').length >= 2) break;
            footer = footer.parentElement;
          }
          if (footer && footer !== dialog) footer.classList.add('pg-cm-footer');
        }

        if (!dialog.dataset.pgCmView) {
          let storedView = 'linear';
          try { storedView = localStorage.getItem(CAPTURE_MANAGEMENT_VIEW_KEY) || 'linear'; } catch {}
          setCaptureManagementView(dialog, storedView);
        } else {
          setCaptureManagementView(dialog, dialog.dataset.pgCmView);
        }

        enableFloatingCaptureManagement(dialog, title || header);
        return dialog;
      };

      const refreshCaptureLog = () => {
        const captureLog = document.querySelector('.clog-window');
        root.classList.toggle('pg-capture-log-open', Boolean(captureLog));
        if (!captureLog) return;
        captureLog.dataset.pgClogThemed = 'true';
        enableFloatingCaptureLog(captureLog);

        const list = captureLog.querySelector('.clog-list');
        if (list && !captureLog.querySelector(':scope > .pg-clog-columns')) {
          const language = String(document.documentElement.lang || navigator.language || 'es').toLowerCase();
          const labels = language.startsWith('pt')
            ? ['', 'Pokémon', 'Nível', 'Detalhes / IV', 'Bola', 'Data']
            : language.startsWith('en')
              ? ['', 'Pokémon', 'Level', 'Details / IV', 'Ball', 'Date']
              : ['', 'Pokémon', 'Nivel', 'Detalles / IV', 'Ball', 'Fecha'];
          const columns = document.createElement('div');
          columns.className = 'pg-clog-columns';
          labels.forEach((label) => {
            const span = document.createElement('span');
            span.textContent = label;
            columns.appendChild(span);
          });
          captureLog.insertBefore(columns, list);
        }

        const sourceTotals = captureLog.querySelector('.clog-head .clog-totals');
        const foot = captureLog.querySelector('.clog-foot');
        if (sourceTotals && foot) {
          let summary = foot.querySelector('.pg-clog-summary');
          if (!summary) {
            summary = document.createElement('div');
            summary.className = 'clog-totals pg-clog-summary';
            const clearButton = foot.querySelector('.clog-clear');
            foot.insertBefore(summary, clearButton || null);
          }
          if (summary.innerHTML !== sourceTotals.innerHTML) summary.innerHTML = sourceTotals.innerHTML;
        }

        captureLog.querySelectorAll('.clog-row').forEach((row) => {
          const text = fullText(row).toLowerCase();
          let rarity = '';
          if (/com[uú]n|common/.test(text)) rarity = 'common';
          if (/incom[uú]n|uncommon/.test(text)) rarity = 'uncommon';
          if (/rara?|rare/.test(text)) rarity = 'rare';
          if (/[eé]pica?|epic/.test(text)) rarity = 'epic';
          if (rarity) row.dataset.pgRarity = rarity;
        });
      };

      const refresh = () => {
        const dock = document.querySelector('nav.game-dock, .game-dock');
        root.classList.remove('pg-has-dock', 'pg-dock-open', 'pg-dock-top-hidden');
        restoreNativeDock(dock);
        if (false && dock) {
          dock.dataset.pgThemed = 'true';

          let closeButton = dock.querySelector(':scope > .pg-dock-close');
          if (!closeButton) {
            closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'pg-dock-close';
            closeButton.setAttribute('aria-label', 'Cerrar menu del juego');
            closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
            closeButton.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            });
            dock.appendChild(closeButton);
          }

          dock.querySelector(':scope > .pg-auto-helper-entry')?.remove();

          const buttons = [...dock.querySelectorAll('.dock-btn')];
          buttons.forEach((button, index) => {
            let labelNode = button.querySelector(':scope > .pg-dock-label');
            const image = button.querySelector('img');
            const label = cleanLabel(
              button.dataset.pgLabel ||
              button.getAttribute('aria-label') ||
              button.getAttribute('title') ||
              image?.getAttribute('alt') ||
              fallbackLabels[index] ||
              'Acceso'
            );
            button.dataset.pgLabel = label;
            button.setAttribute('aria-label', label);
            if (!labelNode) {
              labelNode = document.createElement('span');
              labelNode.className = 'pg-dock-label';
              button.appendChild(labelNode);
            }
            if (labelNode.textContent !== label) labelNode.textContent = label;
          });

          const topLevelEntries = [...dock.children].filter((child) =>
            child.matches('.dock-btn, .dock-poke-wrap') && !child.matches('.pg-dock-close')
          );
          const dockColumns = Math.max(1, Math.ceil(topLevelEntries.length / 2));
          if (dock.style.getPropertyValue('--pg-dock-columns') !== String(dockColumns)) {
            dock.style.setProperty('--pg-dock-columns', String(dockColumns));
          }

          const compact = matchMedia('(max-width: 1250px), (max-height: 420px)').matches;
          const hasHelper = Boolean(document.querySelector('.ah-panel'));
          const availableWidth = Math.max(1, innerWidth - (hasHelper ? 525 : 20));
          const naturalWidth = Math.max(1, dock.scrollWidth);
          const fit = compact ? 1 : Math.min(1, availableWidth / naturalWidth);
          if (dock.style.getPropertyValue('--pg-dock-fit') !== String(fit)) {
            dock.style.setProperty('--pg-dock-fit', String(fit));
          }

          if (!dock.dataset.pgCloseBound) {
            dock.dataset.pgCloseBound = 'true';
            dock.addEventListener('click', (event) => {
              const compact = matchMedia('(max-width: 1250px), (max-height: 420px)').matches;
              if (!compact) return;
              const submenuItem = event.target.closest('.poke-menu-item');
              if (submenuItem) {
                setTimeout(() => setOpen(false), 140);
                return;
              }
              const clickedButton = event.target.closest('.dock-btn');
              if (!clickedButton) return;
              const pokemonWrap = clickedButton.closest('.dock-poke-wrap');
              if (pokemonWrap) {
                setTimeout(() => {
                  const submenu = pokemonWrap.querySelector('.poke-menu');
                  if (!submenu || submenu.hidden) setOpen(false);
                }, 140);
                return;
              }
              setTimeout(() => setOpen(false), 120);
            });
          }
        } else {
          setOpen(false);
          setTopHidden(false);
        }

        root.classList.remove('pg-auto-helper-expanded', 'pg-capture-management-open', 'pg-has-team', 'pg-team-hud-collapsed');
        document.querySelectorAll('.pg-team-side-toggle').forEach((element) => element.remove());
        refreshMyPokesPanel();
        refreshGenericSurfaces();
      };

      window.__pgDockThemeRefresh = refresh;
      refresh();

      if (!window.__pgDockOutsideBound) {
        window.__pgDockOutsideBound = true;
        document.addEventListener('pointerdown', (event) => {
          if (!root.classList.contains('pg-dock-open')) return;
          const dock = document.querySelector('nav.game-dock, .game-dock');
          if (dock?.contains(event.target) || burger.contains(event.target)) return;
          setOpen(false);
        }, true);
      }

      if (!window.__pgDockResizeBound) {
        window.__pgDockResizeBound = true;
        addEventListener('resize', () => requestAnimationFrame(refresh), { passive: true });
      }

      if (!window.__pgDockThemeObserver) {
        let queued = false;
        const relevantSelector = '.game-dock, .poke-menu, [role="dialog"], [aria-modal="true"], .modal-content, [class*="modal-content"], [class*="dialog-content"]';
        window.__pgDockThemeObserver = new MutationObserver((mutations) => {
          if (root.classList.contains('pg-floating-active')) return;
          const relevant = mutations.some((mutation) => {
            const target = mutation.target instanceof Element ? mutation.target : null;
            if (target?.matches(relevantSelector) || target?.closest(relevantSelector)) return true;
            return [...mutation.addedNodes].some((node) => node instanceof Element &&
              (node.matches(relevantSelector) || node.querySelector(relevantSelector)));
          });
          if (!relevant) return;
          if (queued) return;
          queued = true;
          setTimeout(() => {
            queued = false;
            refresh();
          }, 60);
        });
        window.__pgDockThemeObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden']
        });
      }
      return 'installed';
    })()`;
  }

  window.pokeGridTheme = { buildInstallScript };
})();
