# lux-3dviewer-themesync

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

This plugin fetches themes from the [Geoportail Luxembourg](https://map.geoportail.lu/) and maps them to a VCS module config. The module config includes `layers`, `contentTree` and `i18n` (for translations) entries.

## Development

To further develop the plugin run: `npm start`

## Config parameters

These params (mostly URLs) must be indicated in the plugin config when deployed:

- `luxThemesUrl`- URL to themes API
- `luxI18nUrl`- URL to translations
- `luxOwsUrl`- URL to OGC web services
- `luxWmtsUrl`- URL to WMTS
- `luxLegendUrl` - URL to legends
- `luxDefaultBaselayer` - name of the default baselayer to display

## Deploy plugin within map-ui

- Add plugin dependency in desired version to `plugins/package.json`:

```
"dependencies": {
  ...
  "@geoportallux/lux-3dviewer-themesync": "...",
  ...
```

- Add plugin with desired values to map-ui module configuration:

```
    {
      "name": "@geoportallux/lux-3dviewer-themesync",
      "entry": "plugins/@geoportallux/lux-3dviewer-themesync/index.js",
      "luxThemesUrl": "...",
      "luxI18nUrl": "...",
      "luxOwsUrl": "...",
      "luxWmtsUrl": "...",
      "luxLegendUrl": "...",
      "luxDefaultBaselayer": "..."
    },
```

## Build the npm package

Use the following commands to increase the version and push a new tag, which builds a new version as npm package:

```shell
npm version 1.0.0 --no-git-tag-version
git add .
git commit -m "1.0.0"
git tag v1.0.0
git push origin main v1.0.0 # replace "origin" with your remote repo name
```
