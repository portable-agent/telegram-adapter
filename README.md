# Telegram Adapter

Тонкий адаптер Telegram для Portable Agent. Он не содержит бизнес-правил: принимает webhook,
связывает Telegram с пользователем платформы через Keycloak Device Flow и вызывает Channel Gateway.

## Текущий срез

- защищённый webhook;
- команда `/link`;
- начало OAuth Device Flow;
- polling Keycloak с lease для нескольких worker;
- завершение привязки и уведомление пользователя;
- шифрование device и refresh token;
- обновление access token и отправка сообщения в Channel Gateway;
- сохранение `conversationId` для следующих сообщений;
- Telegram-кнопки подтверждения и отмены действий;
- одноразовые callback id с lease: повтор возможен после временной ошибки;
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
