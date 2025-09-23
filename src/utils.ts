import type { VcsApp } from '@vcmap/core';
import {
  type LayerConfig,
  type LayerStyle,
  type ThemeItem,
  type ModuleConfig,
  LOCALES,
  type PluginConfig,
  type ClippingPolygon,
  type Ol3dType,
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
  type3D?: Ol3dType,
  parentName?: string,
): void {
  // fill layers
  if (
    themeItem &&
    themeItem.type &&
    !moduleConfig.layers.some((layer) => layer.id === themeItem.id) &&
    themeItem.name !== 'wintermesh'
  ) {
    if (type3D) themeItem.type = type3D;
    let layerConfig: LayerConfig = {
      id: themeItem.id,
      name: themeItem.name,
      source: themeItem.source,
      style: themeItem.style,
      layers: themeItem.name,
      activeOnStartup: false,
      allowPicking: !!themeItem.metadata?.is_queryable,
      properties: {
        is3DLayer: !!type3D, // For 2d back button
        luxId: themeItem.id, // For 2d back button
        luxIsBaselayer: themeItem.isBaselayer, // For 2d back button
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
      ...(themeItem.layer === pluginConfig.luxDefaultBaselayer && {
        activeOnStartup: true,
      }),
      ...(themeItem.isBaselayer && {
        zIndex: 0,
      }),
    };

    if (themeItem.metadata?.exclusion) {
      layerConfig.exclusiveGroups = JSON.parse(themeItem.metadata?.exclusion);
    }
    if (themeItem.isBaselayer) {
      layerConfig.exclusiveGroups?.push('baselayer');
    }

    switch (themeItem.type) {
      case 'WMS':
        layerConfig = {
          ...layerConfig,
          url: pluginConfig.luxOwsUrl,
          tilingSchema: 'mercator',
          featureInfo: {
            responseType: 'text/html',
          },
          parameters: {
            format: 'image/png',
            transparent: true,
          },
        };
        layerConfig.properties.featureInfo = 'featureInfo2d';
        break;
      case 'WMTS':
        layerConfig = {
          ...layerConfig,
          url: `${pluginConfig.luxWmtsUrl}/${themeItem.layer}/${themeItem.matrixSet}/{TileMatrix}/{TileCol}/{TileRow}.${getFormat(themeItem.imageType)}`,
          format: themeItem.imageType,
          extent: {
            coordinates: themeItem.isBaselayer
              ? [-180, -85, 180, 85]
              : [5.7357, 49.4478, 6.5286, 50.1826],
            projection: {
              epsg: 'EPSG:4326',
            },
          },
        };
        break;
      case 'data':
        layerConfig = {
          ...layerConfig,
          url: `${themeItem.url}/${themeItem.layer}/tileset.json`,
          type: 'CesiumTilesetLayer',
          style: get3dStyle(themeItem),
          activeOnStartup: themeItem.metadata?.ol3d_defaultlayer || false,
        };
        layerConfig.allowPicking = true;
        layerConfig.properties.featureInfo = 'featureInfo3d';
        break;
      case 'mesh':
        layerConfig = {
          ...layerConfig,
          url: `${themeItem.url}/${themeItem.layer}/tileset.json`,
          type: 'CesiumTilesetLayer',
          // activeOnStartup: do not recover ol3d_defaultlayer value for mesh as exclusive terrain is already activeOnStartup
          offset: [0, 0, themeItem.metadata?.ol3d_options?.heightOffset || 0],
          exclusiveGroups: ['mesh'],
        };
        if (themeItem.metadata?.ol3d_options?.vcsClippingPolygons) {
          themeItem.metadata.ol3d_options.vcsClippingPolygons.forEach(
            (polygon, index) => {
              const clippingPolygon: ClippingPolygon = {
                name: `ClippingPolygon_${themeItem.name}_${index}`,
                activeOnStartup: true,
                terrain: false,
                layerNames: [themeItem.name],
                coordinates: polygon,
              };
              moduleConfig.clippingPolygons.push(clippingPolygon);
            },
          );
        }
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
