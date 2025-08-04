export interface ThemeLayer {
  id: string;
  name: string;
  source?: string;
  style?: string;
  type: 'WMS' | 'WMTS';
  properties?: Record<string, unknown>;
  children?: ThemeLayer[];
}

export interface Theme {
  children: ThemeLayer[];
}

export interface ThemesResponse {
  themes: Theme[];
}

export interface LayerConfig {
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

export interface ContentTreeItem {
  name: string;
  type: string;
  layerName: string;
}
