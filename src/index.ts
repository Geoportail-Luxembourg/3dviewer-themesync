import { type VcsApp, VcsModule } from '@vcmap/core';
import type { VcsPlugin, VcsUiApp, PluginConfigEditor } from '@vcmap/ui';
import { name, version, mapVersion } from '../package.json';
import {
  LOCALES,
  type ModuleConfig,
  type Theme,
  type ThemeItem,
  type ThemesResponse,
} from './model';
import ThemesDropDownComponent from './ThemesDropDownComponent.vue';
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

  const modules: ModuleConfig[] = [];
  let selectedModuleId: string;

  function addModule(moduleConfig: ModuleConfig): void {
    modules.push(moduleConfig);
  }

  /**
   * Adds a module from the modules[] array to the VCS application.
   * @param app The VCS application instance.
   * @param moduleId The ID of the module to load.
   */
  async function loadModule(app: VcsApp, moduleId: string): Promise<void> {
    if (selectedModuleId) {
      await app.removeModule(selectedModuleId);
    }
    const moduleConfig = modules.find((module) => module._id === moduleId);
    if (moduleConfig) {
      const newModule = new VcsModule(moduleConfig);
      await app.addModule(newModule);
      selectedModuleId = moduleId;
    }
  }

  /**
   * Maps 2D theme and adds mapped config to modules[] array.
   * @param theme The theme to add.
   * @param translations The translations to use.
   **/
  function add2dTheme(
    theme: Theme,
    translations: Record<string, Record<string, string>>,
  ): void {
    const moduleConfig2d: ModuleConfig = {
      _id: theme.id,
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
      mapThemeToConfig(moduleConfig2d, themeItem, translations);
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
          id: 'luxBaseTerrain',
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
        // terrain may be removed from content tree
        {
          name: '3d.terrain',
          type: 'LayerContentTreeItem',
          layerName: 'LuxBaseTerrain',
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
      mapThemeToConfig(moduleConfig3d, themeItem, translations, true);
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
      const contentTreePosition = {
        left: '0px',
        top: '74px',
      };
      if (window.id === 'Content') {
        vcsUiApp.windowManager.setWindowPositionOptions(
          'Content',
          contentTreePosition,
        );
        vcsUiApp.windowManager.remove('3d');
      }
      if (window.id === '3d') {
        vcsUiApp.windowManager.setWindowPositionOptions(
          '3d',
          contentTreePosition,
        );
        vcsUiApp.windowManager.remove('Content');
      }
    });

    vcsUiApp.windowManager.add(
      {
        component: ThemesDropDownComponent,
        props: {
          themes,
          onThemeSelected: async (selectedThemeId: string) => {
            // eslint-disable-next-line no-console
            console.log(`Theme selected listening: ${selectedThemeId}`);
            await loadModule(vcsUiApp, selectedThemeId);
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
    async initialize(vcsUiApp: VcsUiApp, state?: PluginState): Promise<void> {
      // eslint-disable-next-line no-console
      console.log(
        'Called before loading the rest of the current context. Passed in the containing Vcs UI App ',
        vcsUiApp,
        state,
      );

      // fetch and filter themes
      const themesResponse: ThemesResponse = await fetch(LUX_THEMES_URL).then(
        (response) => response.json(),
      );
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
      console.log('Fetched themeResponse:', themesResponse);
      // eslint-disable-next-line no-console
      console.log('Fetched translations:', translations);

      if (themes2d.length > 0 || theme3d) {
        await add3dTheme(vcsUiApp, theme3d, terrainUrl, flatTranslations);
        themes2d.forEach((theme) => {
          add2dTheme(theme, flatTranslations);
        });

        // eslint-disable-next-line no-console
        console.log('App with new module', vcsUiApp);
      }

      addThemeSelector(vcsUiApp, themes2d);
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
