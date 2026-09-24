# Карточка Telegram Adapter

| Поле               | Значение                                                                            |
| ------------------ | ----------------------------------------------------------------------------------- |
| Ответственность    | Перевести Telegram update в общий запрос Channel Gateway и ответ обратно в Telegram |
| Владелец           | `portable-agent/backend`                                                            |
| Язык               | TypeScript, Node.js 24                                                              |
| Входящий контракт  | Telegram Bot API webhook                                                            |
| Исходящий контракт | Keycloak Device Flow, Telegram Bot API, Channel Gateway API                         |
| Свои данные        | Pending Device Flow и привязка Telegram user к зашифрованному refresh token         |
| Прямые зависимости | PostgreSQL, Keycloak, Telegram Bot API, Channel Gateway                             |
| Не отвечает за     | Диалог, AI, approval, workflow и выполнение действий                                |
| SLO                | Не определён до baseline-теста                                                      |

## Безопасные границы

- webhook принимается только с настроенным Telegram secret token;
- Telegram user id не считается identity платформы;
- привязка создаётся только после входа пользователя через Keycloak Device Flow;
- refresh token шифруется до записи в PostgreSQL;
- секреты и содержимое сообщений не попадают в обычные логи.
