# School CI Server

## Домашнее задание - Инфраструктура

### Установка и запуск

Сервер `cd server && npm ci && npm start` <br>
Агент `cd agent && npm ci && npm start` <br>

### Описание проекта

#### Сервер

В папку `/server` нужно положить файл конфигурации server-conf.json в формате:

```json
{
  "port": 8080,
  "apiBaseUrl": "https://hw.shri.yandex/api/",
  "apiToken": "YOUR_API_TOKEN"
}
```

##### API

POST - `/notify-agent` - зарегистрировать агента. <br>
Параметры :

```js
{
    port: number, // Порт на котором запущен агент
    host: string // Хост на котором запущен агент
}
```

POST - `/notify-build-result` - сохранить результаты сборки.<br>
Параметры :

```js
{
    buildId: string, // ID cборки
    log: string, // Лог сборки
    status: string // Статус сборки
}
```

#### Агент

В папку `/agent` нужно положить файл конфигурации agent-conf.json в формате:

```json
{
  "port": 8001,
  "serverHost": "127.0.0.1",
  "serverPort": 8080
}
```

##### API

POST - `/build` - запустить сборку.<br>
Параметры :

```js
{
    buildId: string, // ID cборки
    repoName: string, // Адрес репозитория
    commitHash: string, // Хэш коммита
    buildCommand: string // Команда билда
}
```
