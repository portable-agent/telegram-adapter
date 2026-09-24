# Telegram Adapter

Сервис превращает Telegram update в общий запрос Portable Agent. Telegram не становится центром системы:
Web, VK и будущие каналы используют тот же Channel Gateway.

Первый срез реализует безопасное начало привязки через Keycloak Device Flow. Для локального запуска не
нужен настоящий Telegram: внешний API будет заменён fake-сервисом в `test-lab`.
