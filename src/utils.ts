import type { ContentTreeItem } from '@vcmap/ui';
import type { LayerConfig, ThemeLayer } from './model';

export function mapLayerToConfig(
  configDiff: { layers: []; contentTree: [] },
  layer: ThemeLayer,
  owsUrl: string,
  wmtsUrl: string,
  translations: Record<string, string>,
  parentName?: string,
): void {
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
          url: `${wmtsUrl}/${layer.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.png`,
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
        subParentName,
      );
    });
  }
}
