# lux-3dviewer-themesync

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

This plugin fetches themes from the [Geoportail Luxembourg](https://map.geoportail.lu/) and maps them to VCS module configs. A module config includes `layers`, `contentTree` and `i18n` (for translations) entries.

Each theme has a separate module. On initialization, all themes are mapped and added to the plugin state. However, only the 3d module and the main module are added to the application. When switching themes, the current 2d module is removed from the app and a newly selected one is added from the plugin state to the app.
