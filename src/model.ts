import type { I18nConfigurationItem } from '@vcmap/ui';

export const LOCALES = ['fr', 'de', 'en', 'lb'];

export interface ThemeItem {
  id: string;
  name: string;
  source?: string;
  style?: string;
  type?: 'WMS' | 'WMTS' | '3D';
  imageType?: string;
  properties?: Record<string, unknown>;
  children?: ThemeItem[];
}

export interface Theme {
  children: ThemeItem[];
}

export interface ThemesResponse {
  themes: Theme[];
}

export interface LayerConfig {
  id: string;
  name: string;
  source?: string;
  style?: string;
  layers?: string;
  activeOnStartup: boolean;
  allowPicking?: boolean;
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
  requestVertexNormals?: boolean;
}

export interface ContentTreeItemConfig {
  name: string;
  type: string;
  layerName?: string;
  title?: string;
  visible?: boolean;
  icon?: string;
  tooltip?: string;
}

export interface ModuleConfig {
  _id: 'catalogConfig';
  layers: LayerConfig[];
  contentTree: ContentTreeItemConfig[];
  i18n: Array<I18nConfigurationItem & { fr: object; lb: object }>;
}
