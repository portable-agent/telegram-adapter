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
    Bot->>Id: refresh token
    Id-->>Bot: короткий access token + новый refresh token
    Bot->>Edge: сообщение + короткий access token
    Edge-->>Bot: текст или карточка
    Bot->>Bot: сохраняет action и создаёт случайные callback id
    Bot-->>User: текст или кнопки
    User->>Bot: нажимает Подтвердить
    Bot->>Bot: берёт callback во временный lease
    Bot->>Id: обновляет access token
    Bot->>Edge: decision + payload hash
    Edge-->>Bot: действие принято
    Bot->>Bot: помечает callback использованным
    Bot-->>User: Решение принято
```

## Границы

- Telegram user id используется только как ключ внешнего канала.
- Identity появляется только после подтверждения в Keycloak.
- Conversation Service хранит диалог.
- Action Service принимает решение и выполняет действие.
- Адаптер хранит только данные связи канала и зашифрованный refresh token.
- `update_id` становится стабильным `requestKey`, поэтому повтор webhook не создаёт второе действие.
- `conversationId` сохраняется рядом со связью, чтобы следующие сообщения продолжали тот же диалог.
- Telegram получает только случайный callback id. `actionId`, `payloadHash` и решение хранятся на
  стороне адаптера.
- Lease не позволяет двум worker обработать одно нажатие одновременно. После ошибки зависимости
  lease снимается, поэтому пользователь может повторить действие.

Ключ шифрования приходит из secret manager через окружение. В Git и PostgreSQL открытого токена нет.
