# Требования к миграции Electron-приложений на Tauri

Дата: 2026-02-23  
Источник анализа: последний коммит `f67537af4f84b9a92882d930e08501443ee3d320` (`Release v0.0.8`)

## 1. Что именно показал последний коммит

Коммит подтверждает рабочую схему миграции для приложений класса:

- UI на React/Vite.
- Backend-логика на Node/TypeScript.
- IPC-модель `renderer <-> host`.
- Локальное хранилище (SQLite + JSON-настройки).
- Инструменты/агентные функции (shell, файловые операции, web, sandbox).

Ключевые изменения, которые уже реализованы:

1. Добавлен Tauri host (`src-tauri/*`) и запуск UI в Tauri.
1. Вынесена backend-логика в Node-sidecar (`src/sidecar/*`) с JSONL-протоколом по `stdin/stdout`.
1. UI отвязан от прямого `window.electron` через платформенный адаптер (`src/ui/platform/*`).
1. Persistence перенесена в Rust/SQLite (`src-tauri/src/db.rs`) с миграцией JSON-настроек в БД.
1. В bundle добавлен sidecar-бинарник (`src-tauri/tauri.conf.json`, `externalBin`) и ресурсы prompt-файлов.
1. Обновлена сборка: проверки Rust/Node/Tauri CLI + сборка sidecar через `esbuild + pkg` (`Makefile`, `scripts/*`).

## 2. Обязательные технические требования для миграции похожих приложений

## 2.1 Архитектурное разделение

Перед переносом нужно жестко разделить код на 3 слоя:

1. `UI` (webview-agnostic).
1. `Host` (Tauri/Rust, OS-интеграции, IPC-шина, безопасность, persistency).
1. `Agent/Backend` (бизнес-логика, раннеры, tools), сначала можно оставить на Node как sidecar.

Минимальные критерии:

- UI не использует напрямую Electron API.
- Все host-зависимости идут через интерфейс платформы.
- Backend способен запускаться вне Electron (в отдельном процессе).

## 2.2 Платформенный API в UI

Нужен единый интерфейс (как в `src/ui/platform/types.ts`):

- `sendClientEvent(event)`
- `onServerEvent(callback)`
- `invoke(channel, ...args)`
- `send(channel, ...args)`
- вспомогательные host-методы (`selectDirectory`, `getRecentCwds`, `generateSessionTitle`)

Требование:

- Реализовать минимум 2 адаптера: `electron` и `tauri`.
- Подключение выбирать в runtime (`__TAURI__` / `window.electron`).
- Добавить fallback web-адаптер для отладки (по возможности).

## 2.3 Контракт IPC и событий

Нужен стабильный контракт событий (типизированный), один и тот же для Electron и Tauri:

- Client events: `session.*`, `settings.*`, `llm.*`, `task.*`, `skills.*`, `open.external`, `permission.response` и т.д.
- Server events: `stream.*`, `session.*`, `runner.error`, `permission.request`, `models.*`, `file_changes.*` и т.д.

Практическое требование:

1. Зафиксировать список событий до миграции.
1. Для каждого события назначить владельца:
   - Host (Rust) или
   - Sidecar (Node).
1. Не допускать silent drop неизвестных событий.

## 2.4 Host <-> sidecar протокол

Для сохранения Node-логики без полного rewrite нужен sidecar-протокол:

- Формат: JSON per line (newline-delimited JSON).
- Вход sidecar: `{ "type": "client-event", "event": ... }`.
- Выход sidecar: `{ "type": "server-event", "event": ... }` и `{ "type": "log", ... }`.

Обязательные условия:

- Host обязан уметь перезапускать sidecar.
- Host обязан логировать stderr/stdout sidecar.
- Host обязан прокидывать `LOCALDESK_USER_DATA_DIR` (или аналог), чтобы backend работал вне Electron.

## 2.5 Данные и миграция хранилищ

Обязательная схема для production-миграции:

1. Перенести persistence в host-уровень (Rust DB), минимум:
   - sessions/messages
   - settings
   - providers/models
1. Добавить one-time миграцию из legacy JSON в DB.
1. Сохранять совместимость путей пользовательских данных на всех ОС.
1. На старте сбрасывать зависшие `running` сессии в `idle`.

Что обязательно проверить:

- Сессии сохраняются после перезапуска.
- История не теряется при `message.edit`/`session.continue`.
- Миграция не затирает существующие данные.

## 2.6 Безопасность и права

При миграции на Tauri повышаются риски неправильных allowlist/команд.

Обязательные требования:

1. Ограничить файловые операции рабочей директорией (cwd sandbox).
1. Валидировать внешние URL (`http/https` allowlist минимум).
1. Явно описать Tauri capabilities/permissions.
1. Централизовать security-check в host, а не дублировать в UI.

Критично:

- Нельзя оставлять команды типа `list_directory` без проверки границ sandbox.
- Нельзя полагаться только на UI-валидацию.

## 2.7 Инструменты/Tools и функциональный паритет

Нужен инвентарь инструментов с маркировкой:

- `host-native` (перенесено в Rust),
- `sidecar` (пока в Node),
- `deprecated` (временно выключено),
- `blocked` (требует redesign).

Типичный пример из коммита:

- `render_page` (Electron-зависимость) отключен и требует отдельной стратегии.
- Часть логики уже в Rust (`sandbox_execute_*`, DB-команды).
- Остальная агентная логика временно в sidecar.

## 2.8 Сборка и packaging

Для миграции с Electron на Tauri обязателен новый pipeline:

1. Проверка окружения: Node, Rust (минимальная версия), `cargo-tauri`.
1. Сборка sidecar-бинарника под target triple.
1. Сборка UI.
1. Сборка Tauri bundle с вложенным sidecar.

Минимум по конфигу:

- `tauri.conf.json` должен включать `bundle.externalBin` для sidecar.
- Ресурсы, нужные sidecar (prompts/assets), должны попадать в bundle.
- Имена sidecar должны учитывать target triple.

## 3. Пошаговый план миграции (рекомендуемая последовательность)

## Этап 0. Инвентаризация

Собрать:

1. Матрицу IPC-каналов и событий.
1. Список Electron API, используемых приложением.
1. Список инструментов и зависимостей (особенно native и browser automation).
1. Схемы хранения данных и пути файлов.

Выход:

- Документ “current-state map” и таблица ownership (UI/Host/Sidecar).

## Этап 1. UI-абстракция платформы

Сделать:

1. Вынести все вызовы `window.electron` в `PlatformAdapter`.
1. Переключить UI на adapter.
1. Оставить рабочий Electron-режим до cutover.

Выход:

- UI запускается и в Electron, и в Tauri без форков компонентов.

## Этап 2. Поднять Tauri host

Сделать:

1. Инициализировать `src-tauri`.
1. Подключить dev URL и production dist.
1. Реализовать минимум host-команд:
   - open/select dir
   - read/write memory
   - list dir
   - build info

Выход:

- UI стабильно стартует в `cargo tauri dev`.

## Этап 3. Sidecar bridge

Сделать:

1. Поднять sidecar-процесс из Tauri.
1. Проложить двусторонний мост событий.
1. Ввести env-переменные путей/конфига для sidecar.
1. Добавить обработку падений sidecar и диагностическое логирование.

Выход:

- Ключевой функционал (чат, стриминг, tools) снова работает.

## Этап 4. Перенос persistence в Rust

Сделать:

1. Реализовать rust-слой DB + команды.
1. Добавить миграцию legacy JSON->DB.
1. Внедрить sync sidecar->DB (`session.sync` или аналог).

Выход:

- Сессии/настройки больше не зависят от Electron-хранилищ.

## Этап 5. Перенос критичных подсистем из sidecar в host

Приоритет:

1. Security-sensitive операции (fs/shell/permissions).
1. DB и state management.
1. Code sandbox.
1. Затем web/browser-автоматизация.

Выход:

- Sidecar минимизирован или удален, если проект готов к полному Rust backend.

## Этап 6. Packaging и релиз

Сделать:

1. Бандл sidecar в Tauri app.
1. Проверить установку на clean-окружении.
1. Добавить CI матрицу по ОС.
1. Подпись/нотаризация (где требуется).

Выход:

- Воспроизводимые артефакты для macOS/Windows/Linux.

## 4. Definition of Done (DoD) для миграции

Миграция считается завершенной только если:

1. UI не зависит от Electron API.
1. Все критичные сценарии работают в Tauri (chat/stream/session/settings/tools).
1. Данные legacy-пользователя автоматически мигрируются или импортируются без потерь.
1. Ограничения безопасности в host реализованы и проверены.
1. Сборка и релиз воспроизводимы в CI.
1. Есть rollback-план на предыдущую стабильную ветку/сборку.

## 5. Технические риски и обязательные контрмеры

## Риск: feature parity проседает из-за Electron-only API

Контрмера:

- Явный список отключенных функций.
- Для каждой функции: target дата/владелец/стратегия (Rust rewrite или sidecar plugin).

## Риск: sidecar ломается в production bundle

Контрмера:

- Проверка имен бинарников по target triple.
- Startup self-check на существование sidecar.
- Smoke test установленного приложения, не только dev-режима.

## Риск: потеря пользовательских данных

Контрмера:

- Backup-before-migrate.
- Idempotent миграции.
- Логирование каждой миграции с версией схемы.

## Риск: расширение attack surface

Контрмера:

- Строгие пути и URL-валидаторы.
- Минимальные Tauri capabilities.
- Обязательные негативные security-тесты (path traversal, внешние команды, unsafe URL).

## 6. Практический checklist для похожих проектов

Использовать как go/no-go список:

- [ ] UI переведен на `PlatformAdapter`, прямых вызовов Electron API в компонентах нет.
- [ ] Контракт Client/Server events зафиксирован и типизирован.
- [ ] Tauri host реализует обязательные команды ОС и IPC bridge.
- [ ] Sidecar запускается в dev и prod, получает user-data-dir через env.
- [ ] DB на стороне host инициализируется и мигрирует legacy данные.
- [ ] Сценарии session.start/continue/edit/stop проходят без потери контекста.
- [ ] Ограничения sandbox по cwd включены на уровне host.
- [ ] Все критичные инструменты промаркированы как `host-native` или `sidecar`.
- [ ] `tauri.conf.json` включает `externalBin` и все runtime resources.
- [ ] Make/CI pipeline проверяет Rust/Node/Tauri CLI до запуска build.
- [ ] Smoke tests проходят на чистых машинах всех целевых ОС.

## 7. Минимальные команды для валидации процесса (по модели коммита)

```bash
# Проверка toolchain и зависимостей
make ensure-tools

# Локальная разработка (Vite + Tauri + sidecar)
make dev

# Сборка релизного пакета
make bundle
```

## 8. Что важно отдельно учесть именно для "подобных" Electron-приложений

1. Если у вас heavy Node-экосистема (Playwright, native модули), не делайте big-bang rewrite в Rust.
1. Стартуйте с sidecar-стратегии, затем переносите подсистемы в Rust по приоритету риска.
1. Сначала переносите слой данных и безопасность, потом удобства.
1. Не делайте cutover без миграции пользовательского состояния и без rollback.

Этот документ фиксирует не теорию, а набор практических требований, подтвержденных изменениями из коммита `f67537a`.
