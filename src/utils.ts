import type { ContentTreeItem } from '@vcmap/ui';
import type { LayerConfig, ThemeLayer } from './model';

const LUX_3D_URL = 'https://acts3.geoportail.lu/3d-data/3d-tiles';

function getFormat(imageType?: string): string {
  return imageType?.split('/')[1] || 'png';
}

export function mapLayerToConfig(
  configDiff: { layers: []; contentTree: [] },
  layer: ThemeLayer,
  owsUrl: string,
  wmtsUrl: string,
  translations: Record<string, string>,
  is3D = false,
  parentName?: string,
): void {
  if (is3D) layer.type = '3D';
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
    switch (layer.type) {
      case 'WMS':
        layerConfig = {
          ...layerConfig,
          url: owsUrl,
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
          url: `${wmtsUrl}/${layer.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.${getFormat(layer.imageType)}`,
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
          url: `${LUX_3D_URL}/${layer.name}/tileset.json`,
          type: 'CesiumTilesetLayer',
        };
        break;
      default:
        break;
    }
    (configDiff.layers as LayerConfig[]).push(layerConfig);
  }
  (configDiff.contentTree as ContentTreeItem[]).push({
    name: parentName ? `${parentName}.${layer.name}` : layer.name,
    type:
      layer.children && layer.children.length > 0
        ? 'NodeContentTreeItem'
        : 'LayerContentTreeItem',
    layerName: layer.name,
    title: translations[layer.name] || layer.name,
    visible: true,
  });

  if (layer.children && Array.isArray(layer.children)) {
    const subParentName = parentName
      ? `${parentName}.${layer.name}`
      : layer.name;
    layer.children.forEach((child) => {
      mapLayerToConfig(
        configDiff,
        child,
        owsUrl,
        wmtsUrl,
        translations,
        is3D,
        subParentName,
      );
    });
  }
}
