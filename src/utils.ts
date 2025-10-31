import type { VcsUiApp } from '@vcmap/ui';
import {
  type ContentTreeItemConfig,
  type LayerConfig,
  type LayerStyle,
  type ThemeItem,
  type ModuleConfig,
  LOCALES,
  type PluginConfig,
  type ClippingPolygon,
  type Ol3dLayerType,
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

function isoLang2To3(code: string): string {
  const lang = {
    fr: 'fre',
    en: 'eng',
    de: 'ger',
    lb: 'ltz',
  } as const;
  return lang[code.toLowerCase() as keyof typeof lang];
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
  vcsUiApp: VcsUiApp,
  pluginConfig: PluginConfig,
  moduleConfig: ModuleConfig,
  themeItem: ThemeItem,
  translations: Record<string, Record<string, string>>,
  type3D?: Ol3dLayerType,
  parentName?: string,
): void {
  const isLayer =
    themeItem &&
    themeItem.type &&
    !moduleConfig.layers.some((layer) => layer.id === themeItem.id) &&
    themeItem.name !== 'wintermesh' &&
    !themeItem.time; // isLayer in opposition to the sections
  // fill layers
  if (isLayer) {
    if (type3D) themeItem.type = type3D;
    let layerConfig: LayerConfig = {
      id: themeItem.id,
      name: themeItem.name,
      source: themeItem.source,
      style: themeItem.style,
      layers: themeItem.id,
      activeOnStartup: false,
      allowPicking: !!themeItem.metadata?.is_queryable,
      properties: {
        is3DLayer: !!type3D, // For 2d back button
        luxId: themeItem.id, // For 2d back button
        luxIsBaselayer: themeItem.type === 'BaseLayer', // For 2d back button
        title: `layers.${themeItem.name}.title`, // use translations for layers (content tree and elsewhere). does not contain nodes
        ...(themeItem.metadata?.legend_name && {
          legend: [
            {
              type: 'IframeLegendItem',
              popoutBtn: true,
              src: getLegendUrl(
                pluginConfig.luxLegendUrl,
                themeItem.metadata,
                `${themeItem.id}`,
                vcsUiApp.locale,
              ), // Nice to have: update the legend when switching lang, but this is not implemented in vcmap-ui yet
            },
          ],
        }),
        ...themeItem.properties,
      },
    };

    if (themeItem.metadata?.exclusion) {
      layerConfig.exclusiveGroups = JSON.parse(themeItem.metadata?.exclusion);
    }

    switch (themeItem.type) {
      case 'WMS':
      case 'WMTS': // display WMTS as WMS to have getFeatureInfo available
        layerConfig = {
          ...layerConfig,
          type: 'WMSLayer',
          url: pluginConfig.luxOwsUrl,
          tilingSchema: 'mercator',
          featureInfo: {
            responseType: 'text/html',
          },
          parameters: {
            format: 'image/png',
            transparent: true,
          },
          minLevel: 0,
          maxLevel: 22,
        };
        layerConfig.properties.featureInfo = 'featureInfo2d';
        break;
      case 'BaseLayer':
        layerConfig = {
          ...layerConfig,
          type: 'WMTSLayer',
          url: `${pluginConfig.luxWmtsUrl}/${themeItem.layer}/${themeItem.matrixSet}/{TileMatrix}/{TileCol}/{TileRow}.${getFormat(themeItem.imageType)}`,
          format: themeItem.imageType,
          extent: {
            coordinates: [-180, -85, 180, 85],
            projection: {
              epsg: 'EPSG:4326',
            },
          },
          minLevel: 0,
          maxLevel: 22,
          zIndex: 0,
        };
        layerConfig.exclusiveGroups?.push('baselayer');
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
  const contentTreeItem: ContentTreeItemConfig = {
    name: parentName ? `${parentName}.${themeItem.name}` : themeItem.name,
    type:
      themeItem.children && themeItem.children.length > 0
        ? 'NodeContentTreeItem'
        : 'LayerContentTreeItem',
    layerName: themeItem.name,
    title: `layers.${themeItem.name}.title`, // use translations for layers and nodes (content tree only)
    visible: true,
  };

  if (pluginConfig.luxGeonetworkUrl && themeItem.metadata?.metadata_id) {
    contentTreeItem.infoUrl = `${pluginConfig.luxGeonetworkUrl}/${isoLang2To3(vcsUiApp.locale)}/catalog.search#/metadata/${themeItem.metadata?.metadata_id}`;
  }

  moduleConfig.contentTree.push(contentTreeItem);

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

export async function setActiveBaselayer(
  vcsUiApp: VcsUiApp,
  pluginConfig: PluginConfig,
  baselayers: ThemeItem[],
): Promise<void> {
  const state = await vcsUiApp.getState(true);
  const stateHasBaselayer = baselayers.some((baseLayer) =>
    state.layers?.some(
      (stateLayer: { name: string }) => stateLayer.name === baseLayer.name,
    ),
  );
  if (!stateHasBaselayer) {
    await vcsUiApp.layers
      .getByKey(pluginConfig.luxDefaultBaselayer)
      ?.activate();
  }
}
