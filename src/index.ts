import { type Reactive, reactive } from 'vue';
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
import ThemesDropDownComponent from './ThemesDropDownComponent.vue';
import { mapThemeToConfig, translateThemes } from './utils';

type PluginState = Reactive<{
  selectedModuleId: string | null;
  modules: ModuleConfig[];
}>;

type CatalogPlugin = VcsPlugin<PluginConfig, PluginState>;

export default function catalogPlugin(
  pluginConfig: PluginConfig,
): CatalogPlugin {
  const pluginState = reactive({
    selectedModuleId: null as string | null,
    modules: [] as ModuleConfig[],
  });

  function addModule(moduleConfig: ModuleConfig): void {
    pluginState.modules.push(moduleConfig);
  }

  /**
   * Adds a module from the pluginState.modules to the VCS application.
   * @param app The VCS application instance.
   * @param moduleId The ID of the module to load.
   */
  async function loadModule(app: VcsApp, moduleId: string): Promise<void> {
    if (pluginState.selectedModuleId === moduleId) return;
    if (pluginState.selectedModuleId) {
      await app.removeModule(pluginState.selectedModuleId);
    }
    const moduleConfig = pluginState.modules.find(
      (module) => module._id === moduleId,
    );
    if (moduleConfig) {
      const newModule = new VcsModule(moduleConfig);
      await app.addModule(newModule);
      pluginState.selectedModuleId = moduleId;
    }
  }

  /**
   * Maps 2D theme and adds mapped config to pluginState.modules.
   * @param theme The theme to add.
   * @param translations The translations to use.
   **/
  function add2dTheme(
    theme: Theme,
    translations: Record<string, Record<string, string>>,
  ): void {
    const moduleConfig2d: ModuleConfig = {
      _id: theme.name,
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

    theme?.children?.forEach((themeItem: ThemeItem) => {
      mapThemeToConfig(pluginConfig, moduleConfig2d, themeItem, translations);
    });

    addModule(moduleConfig2d);
  }

  /**
   * Maps 3d theme and adds mapped config directly to the VCS application.
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

  /**
   * Adds a theme selector above the content tree to the VCS application.
   * @param vcsUiApp The VCS application instance.
   * @param themes The list of themes to include in the selector.
   **/
  function addThemeSelector(vcsUiApp: VcsUiApp, themes: Theme[]): void {
    vcsUiApp.windowManager.added.addEventListener((window) => {
      if (window.id === 'Content') {
        vcsUiApp.windowManager.setWindowPositionOptions('Content', {
          left: '0px',
          top: '74px',
        });
        vcsUiApp.windowManager.add(
          {
            id: 'themeSelector',
            component: ThemesDropDownComponent,
            props: {
              themes,
              onThemeSelected: async (selectedThemeName: string) => {
                // add selected 2d theme to the application (defaults to main)
                await loadModule(vcsUiApp, selectedThemeName);
              },
            },
            state: {
              headerTitle: 'Theme',
            },
            position: {
              left: '0px',
              top: '0px',
            },
          },
          'catalogPlugin',
        );
        vcsUiApp.windowManager.remove('3d');
      }
      if (window.id === '3d') {
        vcsUiApp.windowManager.remove('Content');
      }
    });
    vcsUiApp.windowManager.removed.addEventListener((window) => {
      if (window.id === 'Content') {
        vcsUiApp.windowManager.remove('themeSelector');
      }
      if (window.id === 'themeSelector') {
        vcsUiApp.windowManager.remove('Content');
      }
    });
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

      // add theme translations to app as they are not part of the module translations
      const themeTranslations = translateThemes(themes2d, flatTranslations);
      vcsUiApp.i18n.add(themeTranslations);

      if (themes2d.length > 0 || theme3d) {
        // add 3D theme in separate contentTree to application
        await add3dTheme(vcsUiApp, theme3d, terrainUrl, flatTranslations);
        // add 2D themes to pluginState.modules (do not add to application yet)
        themes2d.forEach((theme) => {
          add2dTheme(theme, flatTranslations);
        });
      }

      addThemeSelector(vcsUiApp, themes2d);
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
      return pluginState;
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
