# lux-3dviewer-themesync

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

This plugin fetches themes from the [Geoportail Luxembourg](https://map.geoportail.lu/) and maps them to a VCS module config. The module config includes `layers`, `contentTree` and `i18n` (for translations) entries.

## URL config parameters

These URLs must be indicated in the plugin config when deployed:

- `luxThemesUrl`- URL to themes API
- `luxI18nUrl`- URL to translations
- `luxOwsUrl`- URL to OGC web services
- `luxWmtsUrl`- URL to WMTS
- `lux3dUrl`- URL to 3D tiles
- `luxLegendUrl` - URL to legends
