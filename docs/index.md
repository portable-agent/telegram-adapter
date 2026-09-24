# Telegram Adapter

Сервис превращает Telegram update в общий запрос Portable Agent. Telegram не становится центром системы:
Web, VK и будущие каналы используют тот же Channel Gateway.

Первые срезы реализуют безопасную привязку через Keycloak Device Flow: выдачу кода, polling с lease и
зашифрованное хранение refresh token. Для локального запуска не нужен настоящий Telegram: внешний API
будет заменён fake-сервисом в `test-lab`.
