# Telegram Adapter

Тонкий адаптер Telegram для Portable Agent. Он не содержит бизнес-правил: принимает webhook,
связывает Telegram с пользователем платформы через Keycloak Device Flow и вызывает Channel Gateway.

## Текущий срез

- защищённый webhook;
- локальный ответ на `/start` с подсказкой о `/link`;
- команда `/link`;
- начало OAuth Device Flow;
- polling Keycloak с lease для нескольких worker;
- завершение привязки и уведомление пользователя;
- шифрование device и refresh token;
- обновление access token и отправка сообщения в Channel Gateway;
- сохранение `conversationId` для следующих сообщений;
- Telegram-кнопки подтверждения и отмены действий;
- URL-кнопка общего виджета подключения внешнего аккаунта;
- одноразовые callback id с lease: повтор возможен после временной ошибки;
- отдельное сообщение об успехе, ошибке или отмене действия после завершения workflow;
- порты для PostgreSQL, Keycloak, Telegram и Gateway.

Команда `/unlink` будет добавлена следующим TDD-срезом.

## Проверка

```powershell
corepack pnpm install
pnpm lint
pnpm test
pnpm build
```

Интеграционная проверка repository требует отдельный PostgreSQL:

```powershell
$env:TEST_DATABASE_URL = "postgres://user:password@localhost:5432/telegram_adapter"
pnpm test:postgres
```

Настройки перечислены в `.env.example`. Настоящие секреты в Git не добавляются.
`TELEGRAM_API_URL` позволяет локальному стенду использовать fake Telegram API без настоящего bot token.

Типы запросов Channel Gateway генерируются из проверенного snapshot `contracts 4.1.0`. Обновление:

```powershell
./scripts/update-contracts.ps1 -Version 4.1.0
corepack pnpm generate
```

Скрипт проверяет checksum и GitHub attestation релиза до замены файлов.

После нажатия кнопки адаптер сохраняет `actionId` и chat id. Фоновый worker проверяет короткий статус
через Channel Gateway. Для `SUCCEEDED`, `FAILED` и `CANCELLED` он отправляет сообщение и удаляет запись
ожидания. При ошибке запрос повторяется. Если процесс оборвётся после отправки в Telegram, но до
удаления записи, сообщение может прийти повторно; гарантия доставки здесь **at least once**.
