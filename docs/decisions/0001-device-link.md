# ADR-0001: привязка через OAuth Device Flow

- Status: accepted
- Date: 2026-09-25

## Контекст

Telegram webhook содержит Telegram user id, но не содержит identity Portable Agent. Доверять этому id
как `sub` нельзя. Хранить пароль пользователя или общую ручную таблицу также нельзя.

## Решение

Использовать OAuth 2.0 Device Authorization Grant в Keycloak. `/link` получает одноразовый код и ссылку.
Пользователь входит в Keycloak и подтверждает связь. Адаптер получает короткий access token и refresh
token. Refresh token шифруется AES-256-GCM до записи в PostgreSQL.

## Последствия

- пользователь может привязать канал без передачи пароля боту;
- адаптер становится stateful и получает отдельную таблицу;
- access token не хранится дольше срока действия;
- нужны polling, отзыв связи и ротация ключа;
- вход через Telegram сам по себе не заменяет вход через Keycloak.
