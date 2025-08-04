import type {
  VcsPlugin,
  VcsUiApp,
  PluginConfigEditor,
  LayerContentTreeItem,
} from '@vcmap/ui';
import { VcsModule, VcsModuleConfig } from '@vcmap/core';
import { name, version, mapVersion } from '../package.json';

// TODO: move to plugin config
const LUX_THEMES_URL =
  'https://migration.geoportail.lu/themes?limit=30&partitionlimit=5&interface=main&cache_version=500844b6967f4c4b9f05085f3c22da5c&background=background';
const LUX_OWS_URL = 'https://wmsproxy.geoportail.lu/ogcproxywms';
const LUX_WMTS_URL = 'https://wmts3.geoportail.lu/mapproxy_4_v3/wmts';
const MODULE_ID = 'catalogConfig';

interface ThemeLayer {
  id: string;
  name: string;
  source?: string;
  style?: string;
  type: 'WMS' | 'WMTS';
  properties?: Record<string, unknown>;
  children?: ThemeLayer[];
}

interface Theme {
  children: ThemeLayer[];
}

interface ThemesResponse {
  themes: Theme[];
}

interface LayerConfig {
  id: string;
  name: string;
  source?: string;
  style?: string;
  layers: string;
  activeOnStartup: boolean;
  allowPicking: boolean;
  properties?: Record<string, unknown>;
  type: string;
  url?: string;
  tilingSchema?: string;
  parameters?: {
    format: string;
    transparent: boolean;
  };
  extent?: {
    coordinates: number[];
    projection: {
      epsg: string;
    };
  };
}

interface ContentTreeItem {
  name: string;
  type: string;
  layerName: string;
}

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
      console.log('Fetched themes:', themes);

      const module = vcsUiApp.getModuleById(MODULE_ID);
      // FIXME: contentTree should be in VcsModuleConfig type
      const appConfig: VcsModuleConfig & { contentTree?: any[] } = {
        ...module?.config,
      };
      appConfig._id = 'catalogConfigWithLayers';
      if (themes && themes.themes && appConfig) {
        const configDiff = { layers: [], contentTree: [] };

        (themes as ThemesResponse)?.themes[0]?.children[0]?.children?.forEach(
          (layer: ThemeLayer) => {
            if (layer && layer.type) {
              let layerConfig: LayerConfig = {
                id: layer.id,
                name: layer.name,
                source: layer.source,
                style: layer.style,
                layers: layer.name,
                activeOnStartup: false,
                allowPicking: false,
                properties: layer.properties,
                type: `${layer.type}Layer`,
              };
              // TODO: handle more layer types?
              switch (layer.type) {
                case 'WMS':
                  layerConfig = {
                    ...layerConfig,
                    url: LUX_OWS_URL,
                    tilingSchema: 'mercator',
                    parameters: {
                      format: 'image/png',
                      transparent: true,
                    },
                  };
                  break;
                case 'WMTS':
                  layerConfig = {
                    ...layerConfig,
                    url: `${LUX_WMTS_URL}/${layer.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.png`,
                    extent: {
                      coordinates: [-180, -85, 180, 85],
                      projection: {
                        epsg: 'EPSG:4326',
                      },
                    },
                  };
                  break;
                default:
                  break;
              }
              (configDiff.layers as LayerConfig[]).push(layerConfig);
            }
            (configDiff.contentTree as ContentTreeItem[]).push({
              name: layer.name,
              type: 'LayerContentTreeItem',
              layerName: layer.name,
            });
          },
        );

        appConfig.layers = [
          ...(appConfig.layers || []),
          ...configDiff.layers,
        ].filter((l) => l !== null);
        appConfig.contentTree = [
          ...(appConfig.contentTree || []),
          ...configDiff.contentTree,
        ].filter((l) => l !== null);

        const newModule = new VcsModule(appConfig);
        await vcsUiApp.addModule(newModule);
        await vcsUiApp.removeModule(MODULE_ID);

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
