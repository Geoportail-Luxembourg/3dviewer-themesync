import { type VcsApp, VcsModule } from '@vcmap/core';
import {
  type LayerConfig,
  type ThemeItem,
  type ModuleConfig,
  LOCALES,
  type Theme,
} from './model';

// TODO: move to plugin config
const LUX_OWS_URL = 'https://wmsproxy.geoportail.lu/ogcproxywms';
const LUX_WMTS_URL = 'https://wmts3.geoportail.lu/mapproxy_4_v3/wmts';
const LUX_3D_URL = 'https://acts3.geoportail.lu/3d-data/3d-tiles';

function getFormat(imageType?: string): string {
  return imageType?.split('/')[1] || 'png';
}

export function mapThemeToConfig(
  moduleConfig: ModuleConfig,
  themeItem: ThemeItem,
  translations: Record<string, Record<string, string>>,
  is3D = false,
  parentName?: string,
): void {
  // fill layers
  if (is3D) themeItem.type = '3D';
  if (themeItem && themeItem.type) {
    let layerConfig: LayerConfig = {
      id: themeItem.id,
      name: themeItem.name,
      source: themeItem.source,
      style: themeItem.style,
      layers: themeItem.name,
      activeOnStartup: false,
      allowPicking: false,
      properties: {
        title: `layers.${themeItem.name}.title`, // use translations for layers (content tree and elsewhere). does not contain nodes
        ...themeItem.properties,
      },
      type: `${themeItem.type}Layer`,
    };
    switch (themeItem.type) {
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
          url: `${LUX_WMTS_URL}/${themeItem.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.${getFormat(themeItem.imageType)}`,
          extent: {
            coordinates: [5.7357, 49.4478, 6.5286, 50.1826],
            projection: {
              epsg: 'EPSG:4326',
            },
          },
        };
        break;
      case '3D':
        layerConfig = {
          ...layerConfig,
          url: `${LUX_3D_URL}/${themeItem.name}/tileset.json`,
          type: 'CesiumTilesetLayer',
        };
        break;
      default:
        break;
    }
    moduleConfig.layers.push(layerConfig);
  }

  // fill content tree
  const prefix = is3D ? '3d.' : '';
  moduleConfig.contentTree.push({
    name: parentName
      ? `${prefix}${parentName}.${themeItem.name}`
      : `${prefix}${themeItem.name}`,
    type:
      themeItem.children && themeItem.children.length > 0
        ? 'NodeContentTreeItem'
        : 'LayerContentTreeItem',
    layerName: themeItem.name,
    title: `layers.${themeItem.name}.title`, // use translations for layers and nodes (content tree only)
    visible: true,
  });

  // fill i18n
  function getTranslatedLayers(locale: string): Record<string, object> {
    return {
      layers: {
        [themeItem.name]: {
          title: translations[locale][themeItem.name] || themeItem.name,
        },
        ...(moduleConfig.i18n[0][locale] as Record<string, object>).layers,
      },
    };
  }
  LOCALES.forEach((locale) => {
    const translatedLayers = {
      [locale]: getTranslatedLayers(locale),
    };
    moduleConfig.i18n[0][locale] = translatedLayers[locale];
  });

  // recursively map children
  if (themeItem.children && Array.isArray(themeItem.children)) {
    const subParentName = parentName
      ? `${parentName}.${themeItem.name}`
      : themeItem.name;
    themeItem.children.forEach((child) => {
      mapThemeToConfig(moduleConfig, child, translations, is3D, subParentName);
    });
  }
}

export async function set2dTheme(
  vcsUiApp: VcsApp,
  theme: Theme,
  translations: Record<string, Record<string, string>>,
): Promise<void> {
  const currentThemeConfig = vcsUiApp.getModuleById('catalogConfig2d');
  if (currentThemeConfig) {
    await vcsUiApp.removeModule(currentThemeConfig._id);
  }

  const moduleConfig2d: ModuleConfig = {
    _id: 'catalogConfig2d',
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

  const module2d = new VcsModule(moduleConfig2d);
  await vcsUiApp.addModule(module2d);
}

export async function set3dTheme(
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
