import { VcsModule as f } from "../../assets/core.js";
const y = "catalog", L = "0.0.1", _ = "^6.1", w = "https://wmsproxy.geoportail.lu/ogcproxywms", T = "https://wmts3.geoportail.lu/mapproxy_4_v3/wmts", h = "https://acts3.geoportail.lu/3d-data/3d-tiles";
function x(t) {
  return (t == null ? void 0 : t.split("/")[1]) || "png";
}
function c(t, e, o, s = !1, n) {
  if (s && (e.type = "3D"), e && e.type) {
    let r = {
      id: e.id,
      name: e.name,
      source: e.source,
      style: e.style,
      layers: e.name,
      activeOnStartup: !1,
      allowPicking: !1,
      properties: e.properties,
      type: `${e.type}Layer`
    };
    switch (e.type) {
      case "WMS":
        r = {
          ...r,
          url: w,
          tilingSchema: "mercator",
          parameters: {
            format: "image/png",
            transparent: !0
          }
        };
        break;
      case "WMTS":
        r = {
          ...r,
          url: `${T}/${e.name}/GLOBAL_WEBMERCATOR_4_V3/{TileMatrix}/{TileCol}/{TileRow}.${x(e.imageType)}`,
          extent: {
            coordinates: [5.7357, 49.4478, 6.5286, 50.1826],
            projection: {
              epsg: "EPSG:4326"
            }
          }
        };
        break;
      case "3D":
        r = {
          ...r,
          url: `${h}/${e.name}/tileset.json`,
          type: "CesiumTilesetLayer"
        };
        break;
    }
    t.layers.push(r);
  }
  if (t.contentTree.push({
    name: n ? `${n}.${e.name}` : e.name,
    type: e.children && e.children.length > 0 ? "NodeContentTreeItem" : "LayerContentTreeItem",
    layerName: e.name,
    title: o[e.name] || e.name,
    visible: !0
  }), e.children && Array.isArray(e.children)) {
    const r = n ? `${n}.${e.name}` : e.name;
    e.children.forEach((l) => {
      c(t, l, o, s, r);
    });
  }
}
const C = "https://migration.geoportail.lu/themes?limit=30&partitionlimit=5&interface=main&cache_version=0&background=background", S = "https://map.geoportail.lu/static/0/fr.json?";
function U(t, e) {
  return console.log(t, e), {
    get name() {
      return y;
    },
    get version() {
      return L;
    },
    get mapVersion() {
      return _;
    },
    async initialize(o, s) {
      var l, u, p, g;
      console.log(
        "Called before loading the rest of the current context. Passed in the containing Vcs UI App ",
        o,
        s
      );
      const n = await fetch(C).then(
        (a) => a.json()
      ), r = await fetch(S).then(
        (a) => a.json()
      );
      if (console.log("Fetched themes:", n), console.log("Fetched translations:", r.fr), n && n.themes) {
        const a = {
          _id: "catalogConfig",
          layers: [
            {
              id: "luxBaseTerrain",
              name: "LuxBaseTerrain",
              url: n.lux_3d.terrain_url,
              type: "TerrainLayer",
              activeOnStartup: !0,
              requestVertexNormals: !0,
              properties: {
                title: "Luxembourg Terrain"
              }
            }
          ],
          contentTree: [
            // terrain may be removed from content tree
            {
              name: "terrain",
              type: "LayerContentTreeItem",
              layerName: "LuxBaseTerrain"
            }
          ]
        };
        (u = (l = n == null ? void 0 : n.themes[17]) == null ? void 0 : l.children) == null || u.forEach(
          (i) => {
            c(a, i, r.fr, !0);
          }
        ), (g = (p = n == null ? void 0 : n.themes[0]) == null ? void 0 : p.children) == null || g.forEach(
          (i) => {
            c(a, i, r.fr);
          }
        );
        const d = new f(a);
        await o.addModule(d), console.log("App with new module", o);
      }
      return Promise.resolve();
    },
    onVcsAppMounted(o) {
      console.log(
        "Called when the root UI component is mounted and managers are ready to accept components",
        o
      );
    },
    /**
     * should return all default values of the configuration
     */
    getDefaultOptions() {
      return {};
    },
    /**
     * should return the plugin's serialization excluding all default values
     */
    toJSON() {
      return console.log("Called when serializing this plugin instance"), {};
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(o) {
      return console.log("Called when collecting state, e.g. for create link", o), {
        prop: "*"
      };
    },
    /**
     * components for configuring the plugin and/ or custom items defined by the plugin
     */
    getConfigEditors() {
      return [];
    },
    destroy() {
      console.log("hook to cleanup");
    }
  };
}
export {
  U as default
};
