# Памятка по Telegram Adapter

Сначала прочитай `SERVICE.md` и README. Не добавляй сюда правила диалога, действий или календаря.

## Слои

- `controller` принимает Telegram webhook;
- `service` выполняет сценарии `/link` и `/unlink`;
- `client` вызывает Telegram, Keycloak и Channel Gateway;
- `repository` хранит привязку и зашифрованные токены;
- `security` шифрует чувствительные значения;
- `model` не зависит от Fastify.

## Стиль и TDD

- используй простой английский: `link`, `token`, `message`, `user`, `save`;
- отступ — четыре пробела, Tab запрещён;
- сначала падающий тест, затем минимальный код и рефакторинг;
- токены, Telegram update и личные данные не пишутся в обычные логи;
- перед завершением запусти `pnpm lint`, `pnpm test` и `pnpm build`.
