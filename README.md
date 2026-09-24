# Telegram Adapter

Тонкий адаптер Telegram для Portable Agent. Он не содержит бизнес-правил: принимает webhook,
связывает Telegram с пользователем платформы через Keycloak Device Flow и вызывает Channel Gateway.

## Текущий срез

- защищённый webhook;
- команда `/link`;
- начало OAuth Device Flow;
- шифрование device и refresh token;
- порты для PostgreSQL, Keycloak, Telegram и Gateway.

Обычные сообщения, polling привязки, `/unlink` и карточки подтверждения добавляются следующими TDD-срезами.

## Проверка

```powershell
corepack pnpm install
pnpm lint
pnpm test
pnpm build
```

Настройки перечислены в `.env.example`. Настоящие секреты в Git не добавляются.
