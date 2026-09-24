# Архитектура

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant Bot as Telegram Adapter
    participant Id as Keycloak
    participant Edge as Channel Gateway

    User->>Bot: /link
    Bot->>Id: Device Authorization Request
    Id-->>Bot: user_code + verification_uri
    Bot-->>User: ссылка + одноразовый код
    User->>Id: вход и подтверждение
    Bot->>Id: polling device_code
    Id-->>Bot: access + refresh token
    Bot->>Bot: refresh token шифруется
    User->>Bot: сообщение
    Bot->>Edge: сообщение + короткий access token
```

## Границы

- Telegram user id используется только как ключ внешнего канала.
- Identity появляется только после подтверждения в Keycloak.
- Conversation Service хранит диалог.
- Action Service принимает решение и выполняет действие.
- Адаптер хранит только данные связи канала и зашифрованный refresh token.

Ключ шифрования приходит из secret manager через окружение. В Git и PostgreSQL открытого токена нет.
