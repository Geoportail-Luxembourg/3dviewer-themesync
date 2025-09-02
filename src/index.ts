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
   * Maps 2D themes and adds them to application.
   * @param theme The theme to add.
   * @param translations The translations to use.
   **/
  async function add2dThemes(
    vcsUiApp: VcsApp,
    themes: Theme[],
    translations: Record<string, Record<string, string>>,
  ): Promise<void> {
    const moduleConfig2d: ModuleConfig = {
      _id: 'catalogConfig',
      layers: [],
      contentTree: [],
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

    themes?.forEach((themeItem: ThemeItem) => {
      mapThemeToConfig(pluginConfig, moduleConfig2d, themeItem, translations);
    });

    const newModule = new VcsModule(moduleConfig2d);
    await vcsUiApp.addModule(newModule);
  }

  /**
   * Maps 3d theme and adds it to application.
   * @param moduleConfig The module configuration to update.
   * @param themeItem The theme item to map.
   * @param translations The translations to use.
   **/
  async function add3dTheme(
    vcsUiApp: VcsApp,
    theme: Theme,
    terrainUrl: string,
    translations: Record<string, Record<string, string>>,
  ): Promise<void> {
    const moduleConfig3d: ModuleConfig = {
      _id: 'catalogConfig3d',
      layers: [
        {
          name: 'LuxBaseTerrain',
          url: terrainUrl,
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
      ],
      i18n: [
        {
          name: 'layerTranslations3d',
          fr: { layers: [] },
          de: { layers: [] },
          en: { layers: [] },
          lb: { layers: [] },
        },
      ],
    };

    theme.children?.forEach((themeItem: ThemeItem) => {
      mapThemeToConfig(
        pluginConfig,
        moduleConfig3d,
        themeItem,
        translations,
        true,
      );
    });

    const module3d = new VcsModule(moduleConfig3d);
    await vcsUiApp.addModule(module3d);
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
      const theme3d = themes.find(
        (theme) => theme.name === '3D Layers',
      ) as Theme;
      const themes2d = themes.filter(
        (theme) =>
          theme.name !== '3D Layers' &&
          theme.metadata?.display_in_switcher === true,
      );

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

      if (themes2d.length > 0 || theme3d) {
        // add 3D theme and 2D themes in separate contentTrees
        await add3dTheme(vcsUiApp, theme3d, terrainUrl, flatTranslations);
        await add2dThemes(vcsUiApp, themes2d, flatTranslations);
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
