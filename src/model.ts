import type { I18nConfigurationItem } from '@vcmap/ui';

export const LOCALES = ['fr', 'de', 'en', 'lb'];

export type PluginConfig = {
  name: string;
  luxThemesUrl: string;
  luxI18nUrl: string;
  luxOwsUrl: string;
  luxWmtsUrl: string;
  lux3dUrl: string;
  luxLegendUrl: string;
};

export interface ThemeItem {
  id: number;
  name: string;
  layer?: string;
  source?: string;
  url?: string;
  style?: string | LayerStyle;
  type?: 'WMS' | 'WMTS' | 'data3d' | 'mesh3d';
  imageType?: string;
  properties?: Record<string, unknown>;
  children?: ThemeItem[];
  metadata?: {
    exclusion?: string;
    // eslint-disable-next-line  @typescript-eslint/naming-convention
    legend_name?: string;
    // eslint-disable-next-line  @typescript-eslint/naming-convention
    ol3d_options?: Record<string, unknown> & {
      heightOffset?: number;
      cesium3DTileStyle?: Record<string, unknown>;
      vcsHiddenObjectIds?: string[];
      vcsClippingPolygons?: number[][][];
    };
  } & Record<string, unknown>;
}

export interface Theme {
  id: number;
  name: string;
  children: ThemeItem[];
  metadata?: {
    // eslint-disable-next-line
    display_in_switcher?: boolean;
  };
}

export interface ThemesResponse {
  themes: Theme[];
  // eslint-disable-next-line
  lux_3d: {
    // eslint-disable-next-line
    terrain_url: string;
  };
}

export interface LayerStyle {
  type: string;
  declarativeStyle: Record<string, unknown>;
}

export interface LayerConfig {
  id?: number;
  name: string;
  source?: string;
  style?: string | LayerStyle;
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
  exclusiveGroups?: Array<number | string>;
  extent?: {
    coordinates: number[];
    projection: {
      epsg: string;
    };
  };
  requestVertexNormals?: boolean;
  offset?: number[];
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

export interface ClippingPolygon {
  name: string;
  activeOnStartup: boolean;
  terrain: boolean;
  layerNames: string[];
  coordinates: number[][];
}

export interface ModuleConfig {
  _id: string; // for theme modules, this corresponds to the theme.name
  layers: LayerConfig[];
  clippingPolygons: ClippingPolygon[];
  contentTree: ContentTreeItemConfig[];
  i18n: Array<I18nConfigurationItem & { fr: object; lb: object }>;
}
