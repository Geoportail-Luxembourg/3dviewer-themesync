import type { VcsPlugin, VcsUiApp, PluginConfigEditor } from '@vcmap/ui';
import { VcsModule } from '@vcmap/core';
import { name, version, mapVersion } from '../package.json';
import {
  LOCALES,
  type ModuleConfig,
  type ThemeItem,
  type ThemesResponse,
} from './model';
import { mapThemeToConfig } from './utils';

// TODO: move to plugin config
const LUX_THEMES_URL =
  'https://migration.geoportail.lu/themes?limit=30&partitionlimit=5&interface=main&cache_version=0&background=background';
const LUX_I18N_URL = 'https://map.geoportail.lu/static/0';

type PluginConfig = Record<never, never>;
type PluginState = Record<never, never>;

type CatalogPlugin = VcsPlugin<PluginConfig, PluginState>;

export default function plugin(
  config: PluginConfig,
  baseUrl: string,
): CatalogPlugin {
  // eslint-disable-next-line no-console
  console.log(config, baseUrl);
  return {
    get name(): string {
      return name;
    },
    get version(): string {
      return version;
    },
    get mapVersion(): string {
      return mapVersion;
    },
    async initialize(vcsUiApp: VcsUiApp, state?: PluginState): Promise<void> {
      // eslint-disable-next-line no-console
      console.log(
        'Called before loading the rest of the current context. Passed in the containing Vcs UI App ',
        vcsUiApp,
        state,
      );

      const themes = await fetch(LUX_THEMES_URL).then((response) =>
        response.json(),
      );
      const translations = await Promise.all(
        LOCALES.map((locale) =>
          fetch(`${LUX_I18N_URL}/${locale}.json`).then((response) =>
            response.json(),
          ),
        ),
      );
      const flatTranslations = translations.reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {},
      );
      // eslint-disable-next-line no-console
      console.log('Fetched themes:', themes);
      // eslint-disable-next-line no-console
      console.log('Fetched translations:', translations);

      if (themes && themes.themes) {
        // init config with terrain
        const moduleConfig: ModuleConfig = {
          _id: 'catalogConfig',
          layers: [
            {
              id: 'luxBaseTerrain',
              name: 'LuxBaseTerrain',
              url: themes.lux_3d.terrain_url,
              type: 'TerrainLayer',
              activeOnStartup: true,
              requestVertexNormals: true,
              properties: {
                title: 'Luxembourg Terrain',
              },
            },
          ],
          contentTree: [
            {
              name: '3d',
              type: 'SubContentTreeItem',
              icon: '$vcsGround',
              title: '3D',
              tooltip: '3D Layers',
            },
            // terrain may be removed from content tree
            {
              name: '3d.terrain',
              type: 'LayerContentTreeItem',
              layerName: 'LuxBaseTerrain',
            },
          ],
          i18n: [
            {
              name: 'layerTranslations',
              fr: { layers: [] },
              de: { layers: [] },
              en: { layers: [] },
              lb: { layers: [] },
            },
          ],
        };

        // add 3D theme
        (themes as ThemesResponse)?.themes[17]?.children?.forEach(
          (themeItem: ThemeItem) => {
            mapThemeToConfig(moduleConfig, themeItem, flatTranslations, true);
          },
        );

        // add main theme
        (themes as ThemesResponse)?.themes[0]?.children?.forEach(
          (themeItem: ThemeItem) => {
            mapThemeToConfig(moduleConfig, themeItem, flatTranslations);
          },
        );

        const newModule = new VcsModule(moduleConfig);
        await vcsUiApp.addModule(newModule);

        // eslint-disable-next-line no-console
        console.log('App with new module', vcsUiApp);
      }

      return Promise.resolve();
    },
    onVcsAppMounted(vcsUiApp: VcsUiApp): void {
      // eslint-disable-next-line no-console
      console.log(
        'Called when the root UI component is mounted and managers are ready to accept components',
        vcsUiApp,
      );
    },
    /**
     * should return all default values of the configuration
     */
    getDefaultOptions(): PluginConfig {
      return {};
    },
    /**
     * should return the plugin's serialization excluding all default values
     */
    toJSON(): PluginConfig {
      // eslint-disable-next-line no-console
      console.log('Called when serializing this plugin instance');
      return {};
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(forUrl?: boolean): PluginState {
      // eslint-disable-next-line no-console
      console.log('Called when collecting state, e.g. for create link', forUrl);
      return {
        prop: '*',
      };
    },
    /**
     * components for configuring the plugin and/ or custom items defined by the plugin
     */
    getConfigEditors(): PluginConfigEditor<object>[] {
      return [];
    },
    destroy(): void {
      // eslint-disable-next-line no-console
      console.log('hook to cleanup');
    },
  };
}
