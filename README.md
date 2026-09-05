# manuvo-dist

Публичное зеркало отрефакторенного custom code для сайта [Manuvo](https://manuvo.com) на Webflow.
Существует только для раздачи файлов через jsDelivr — CDN отдаёт исключительно публичные репозитории.

Исходники, история и аудит живут в приватном `flucostudio/manuvo`. **Правки вносите там**, сюда
попадает результат. Pull request'ы в этот репозиторий не принимаются.

## Подключение

```html
<script src="https://cdn.jsdelivr.net/gh/flucostudio/manuvo-dist@v1.0.0/shared/fluco-core.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/flucostudio/manuvo-dist@v1.0.0/scripts/navbar.js" defer></script>
```

`shared/fluco-core.js` подключается один раз на страницу и первым — всё остальное зависит от
`window.Fluco`. `defer` сохраняет порядок выполнения.

Всегда ссылайтесь на git-тег (`@v1.0.0`), никогда на `@main`: `main` отдаёт непроверенный код и
кешируется jsDelivr до 7 дней.

## Subresource Integrity

Если файл на CDN подменят, браузер его не выполнит:

```bash
openssl dgst -sha384 -binary shared/fluco-core.js | openssl base64 -A
```

```html
<script src="https://cdn.jsdelivr.net/gh/flucostudio/manuvo-dist@v1.0.0/shared/fluco-core.js"
        integrity="sha384-<хеш>" crossorigin="anonymous" defer></script>
```

Хеш меняется при каждом изменении файла, поэтому SRI работает только вместе с версионированием.

## Релиз новой версии

Обновляются и тегируются оба репозитория одной версией: сначала `flucostudio/manuvo`, затем
копируются `shared/` и `scripts/` сюда, коммит и тег `vX.Y.Z`. Файлы под уже опубликованным тегом
не переписываются — jsDelivr кеширует их бессрочно.
