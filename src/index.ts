import { type VcsApp, VcsModule } from '@vcmap/core';
import type { VcsPlugin, VcsUiApp, PluginConfigEditor } from '@vcmap/ui';
import { name, version, mapVersion } from '../package.json';
import {
  LOCALES,
  type PluginConfig,
  type ModuleConfig,
  type Theme,
  type ThemeItem,
  type ThemesResponse,
} from './model';
import { mapThemeToConfig } from './utils';

type PluginState = Record<never, never>;

type Lux3dviewerThemesyncPlugin = VcsPlugin<PluginConfig, PluginState>;

export default function lux3dviewerThemesyncPlugin(
  pluginConfig: PluginConfig,
): Lux3dviewerThemesyncPlugin {
  /**
   * Maps themes and adds them to application.
   * @param theme The theme to add.
   * @param translations The translations to use.
   **/
  async function addThemes(
    vcsUiApp: VcsApp,
    themes: Theme[],
    terrainUrl: string,
    translations: Record<string, Record<string, string>>,
  ): Promise<void> {
    const moduleConfig: ModuleConfig = {
      _id: 'catalogConfig',
      layers: [
        {
          name: 'LuxBaseTerrain',
          url: terrainUrl,
          type: 'TerrainLayer',
          activeOnStartup: true,
          requestVertexNormals: true,
          properties: {
            title: 'Terrain',
          },
          exclusiveGroups: ['mesh'],
        },
      ],
      clippingPolygons: [],
      contentTree: [
        {
          name: 'terrain',
          type: 'LayerContentTreeItem',
          layerName: 'LuxBaseTerrain',
        },
      ],
      i18n: [
        {
          name: 'layerTranslations2d',
          fr: { layers: [] },
          de: { layers: [] },
          en: { layers: [] },
          lb: { layers: [] },
        },
      ],
    };

    themes?.forEach((theme: Theme) => {
      let type3D: 'data3d' | 'mesh3d' | undefined;
      if (theme.name === '3D Layers') {
        type3D = 'data3d';
      } else if (theme.name === '3D Meshes') {
        type3D = 'mesh3d';
      }
      mapThemeToConfig(
        vcsUiApp,
        pluginConfig,
        moduleConfig,
        theme as ThemeItem,
        translations,
        type3D,
      );
    });

    const newModule = new VcsModule(moduleConfig);
    await vcsUiApp.addModule(newModule);
  }

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
    async initialize(vcsUiApp: VcsUiApp): Promise<void> {
      // fetch and filter themes
      const themesResponse: ThemesResponse = await fetch(
        pluginConfig.luxThemesUrl,
      ).then((response) => response.json());
      const { themes } = themesResponse;
      const terrainUrl = themesResponse.lux_3d.terrain_url;

      const themesFiltered = themes
        .filter(
          (theme) =>
            theme.name === '3D Layers' ||
            theme.name === '3D Meshes' ||
            theme.metadata?.display_in_switcher === true,
        )
        .sort((a, b) => {
          if (a.name === '3D Layers' || a.name === '3D Meshes') return -1;
          if (b.name === '3D Layers' || b.name === '3D Meshes') return 1;
          return 0;
        });

      // fetch and flatten translations
      const translations = await Promise.all(
        LOCALES.map((locale) =>
          fetch(`${pluginConfig.luxI18nUrl}/${locale}.json`).then((response) =>
            response.json(),
          ),
        ),
      );
      const flatTranslations = translations.reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {},
      );

      if (themesFiltered.length > 0) {
        await addThemes(vcsUiApp, themesFiltered, terrainUrl, flatTranslations);
      }
    },
    onVcsAppMounted(): void {},
    /**
     * should return all default values of the configuration
     */
    getDefaultOptions(): PluginConfig {
      return pluginConfig;
    },
    /**
     * should return the plugin's serialization excluding all default values
     */
    toJSON(): PluginConfig {
      return pluginConfig;
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(): PluginState {
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
    destroy(): void {},
  };
}
