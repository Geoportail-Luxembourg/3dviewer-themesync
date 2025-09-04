import type { VcsApp } from '@vcmap/core';
import {
  type LayerConfig,
  type LayerStyle,
  type ThemeItem,
  type ModuleConfig,
  LOCALES,
  type PluginConfig,
} from './model';

function getFormat(imageType?: string): string {
  return imageType?.split('/')[1] || 'png';
}

function getLegendUrl(
  legendBaseUrl: string,
  metadata: Record<string, unknown> | undefined,
  id: string,
  lang: string,
): string {
  const name = metadata?.legend_name;
  const queryParams = {
    lang,
    id,
    ...((name && { name }) as { name?: string }),
  };

  return `${legendBaseUrl}?${new URLSearchParams(queryParams).toString()}`;
}

function getCesium3DTileStyleHideIds(ids: string[]): { show: string } {
  const cesiumCondition = ids.map((id) => `\${id} === '${id}'`);
  return {
    show: `!(${cesiumCondition.join('||')})`,
  };
}

function get3dStyle(themeItem: ThemeItem): LayerStyle | undefined {
  let style: LayerStyle | undefined;
  const old3dOptions = themeItem.metadata?.ol3d_options;

  if (!old3dOptions) {
    return style;
  }

  style = {
    type: 'DeclarativeStyleItem',
    declarativeStyle: {},
  };

  if (old3dOptions.cesium3DTileStyle) {
    style.declarativeStyle = old3dOptions.cesium3DTileStyle;
  }

  if (old3dOptions.vcsHiddenObjectIds) {
    style.declarativeStyle = getCesium3DTileStyleHideIds(
      old3dOptions.vcsHiddenObjectIds,
    );
  }

  return style;
}

export function mapThemeToConfig(
  vcsUiApp: VcsApp,
  pluginConfig: PluginConfig,
  moduleConfig: ModuleConfig,
  themeItem: ThemeItem,
  translations: Record<string, Record<string, string>>,
  type3D?: 'data3d' | 'mesh3d',
  parentName?: string,
): void {
  // fill layers
  if (
    themeItem &&
    themeItem.type &&
    !moduleConfig.layers.some((layer) => layer.id === themeItem.id)
  ) {
    if (type3D) themeItem.type = type3D;
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
        legend: [
          {
            type: 'IframeLegendItem',
            src: getLegendUrl(
              pluginConfig.luxLegendUrl,
              themeItem.metadata,
              `${themeItem.id}`,
              vcsUiApp.locale,
            ), // Nice to have: update the legend when switching lang, but this is not implemented in vcmap-ui yet
          },
        ],
        ...themeItem.properties,
      },
      type: `${themeItem.type}Layer`,
    };

    if (themeItem.metadata?.exclusion) {
      layerConfig.exclusiveGroups = JSON.parse(themeItem.metadata?.exclusion);
    }

    switch (themeItem.type) {
      case 'WMS':
        layerConfig = {
          ...layerConfig,
          url: pluginConfig.luxOwsUrl,
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
          url: `${pluginConfig.luxWmtsUrl}/${themeItem.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.${getFormat(themeItem.imageType)}`,
          extent: {
            coordinates: [5.7357, 49.4478, 6.5286, 50.1826],
            projection: {
              epsg: 'EPSG:4326',
            },
          },
        };
        break;
      case 'data3d':
        layerConfig = {
          ...layerConfig,
          url: `${pluginConfig.lux3dUrl}/${themeItem.name}/tileset.json`,
          type: 'CesiumTilesetLayer',
          style: get3dStyle(themeItem),
        };
        break;
      case 'mesh3d':
        layerConfig = {
          ...layerConfig,
          url: `${pluginConfig.lux3dUrl}/mesh3D/mesh3D_2020_v2/${themeItem.layer}/tileset.json`,
          type: 'CesiumTilesetLayer',
          offset: [
            0,
            0,
            (themeItem.metadata?.ol3d_options?.heightOffset || 0) + 10, //display mesh 10m above ground to avoid "overlaps" of terrain and mesh
          ],
        };
        break;
      default:
        break;
    }

    moduleConfig.layers.push(layerConfig);
  }

  // fill content tree
  moduleConfig.contentTree.push({
    name: parentName ? `${parentName}.${themeItem.name}` : themeItem.name,
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
      mapThemeToConfig(
        vcsUiApp,
        pluginConfig,
        moduleConfig,
        child,
        translations,
        type3D,
        subParentName,
      );
    });
  }
}
