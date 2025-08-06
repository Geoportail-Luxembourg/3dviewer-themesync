import type { VcsPlugin, VcsUiApp, PluginConfigEditor } from '@vcmap/ui';
import { VcsModule } from '@vcmap/core';
import { name, version, mapVersion } from '../package.json';
import type { ThemeLayer, ThemesResponse } from './model';
import { mapLayerToConfig } from './utils';

// TODO: move to plugin config
const LUX_THEMES_URL =
  'https://migration.geoportail.lu/themes?limit=30&partitionlimit=5&interface=main&cache_version=0&background=background';
const LUX_OWS_URL = 'https://wmsproxy.geoportail.lu/ogcproxywms';
const LUX_WMTS_URL = 'https://wmts3.geoportail.lu/mapproxy_4_v3/wmts';
const LUX_I18N_URL = 'https://map.geoportail.lu/static/0/fr.json?';

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
      const translations = await fetch(LUX_I18N_URL).then((response) =>
        response.json(),
      );
      console.log('Fetched themes:', themes);
      console.log('Fetched translations:', translations.fr);

      if (themes && themes.themes) {
        const moduleConfig = {
          _id: 'catalogConfig',
          layers: [],
          contentTree: [],
        };

        // add 3D theme
        (themes as ThemesResponse)?.themes[17]?.children?.forEach(
          (layer: ThemeLayer) => {
            mapLayerToConfig(
              moduleConfig,
              layer,
              LUX_OWS_URL,
              LUX_WMTS_URL,
              translations.fr,
              true,
            );
          },
        );

        // add main theme
        (themes as ThemesResponse)?.themes[0]?.children?.forEach(
          (layer: ThemeLayer) => {
            mapLayerToConfig(
              moduleConfig,
              layer,
              LUX_OWS_URL,
              LUX_WMTS_URL,
              translations.fr,
            );
          },
        );

        const newModule = new VcsModule(moduleConfig);
        await vcsUiApp.addModule(newModule);

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
