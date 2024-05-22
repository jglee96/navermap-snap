import "./style.css";
import * as shape from "./shape";
import { treeStore } from "./store";

const NAVER_MAP_API = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${
  import.meta.env.VITE_OAPI_KEY
}&submodules=geocoder,drawing`;

let script: HTMLScriptElement | null = document.querySelector(
  `script[src="${NAVER_MAP_API}"]`
);

if (script === null) {
  script = document.createElement("script");
  script.src = NAVER_MAP_API;
  document.head.appendChild(script);
}

script.onload = () => {
  naver.maps.onJSContentLoaded = () => {
    const map = new naver.maps.Map("map", {
      zoom: 20,
    });
    const dm = new naver.maps.drawing.DrawingManager({ map });

    const mapDiv = map.getElement();

    const mainBtn = document.createElement("button");
    mainBtn.innerText = "Draw Main Polygon";
    const snapInBtn = document.createElement("button");
    snapInBtn.innerText = "Draw Snap In Polygon";
    const snapOutBtn = document.createElement("button");
    snapOutBtn.innerText = "Draw Snap Out Polygon";

    mainBtn.onclick = () => {
      shape.createPolygon({
        dm,
        options: {
          fillColor: "#FF3333",
          fillOpacity: 0.4,
          strokeColor: "#FF3333",
          strokeWeight: 3,
          strokeStyle: "shortdashdotdot",
        },
        tree: treeStore.getState().tree,
      });
    };

    snapInBtn.onclick = () => {
      shape.createSnapInPolygon({
        dm,
        options: {
          fillColor: "cyan",
          fillOpacity: 0.4,
          strokeColor: "cyan",
          strokeWeight: 3,
          strokeStyle: "solid",
        },
        tree: treeStore.getState().tree,
      });
    };

    snapOutBtn.onclick = () => {
      shape.createSnapOutPolygon({
        dm,
        options: {
          fillColor: "blue",
          fillOpacity: 0.4,
          strokeColor: "blue",
          strokeWeight: 3,
          strokeStyle: "solid",
        },
        tree: treeStore.getState().tree,
      });
    };

    document.body.insertBefore(mainBtn, mapDiv);
    document.body.insertBefore(snapInBtn, mapDiv);
    document.body.insertBefore(snapOutBtn, mapDiv);
  };
};
