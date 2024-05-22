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

    const addFieldBtn = document.createElement("button");
    addFieldBtn.innerText = "Draw Main Polygon";
    const inVacBtn = document.createElement("button");
    inVacBtn.innerText = "Draw Snap In Polygon";
    const outVacBtn = document.createElement("button");
    outVacBtn.innerText = "Draw Snap Out Polygon";

    addFieldBtn.onclick = () => {
      shape.createPolygon({
        dm,
        options: {
          fillColor: "rgb(255, 51, 51)",
          fillOpacity: 0.4,
          strokeColor: "#FF3333",
          strokeWeight: 3,
          strokeStyle: "shortdashdotdot",
        },
        tree: treeStore.getState().tree,
      });
    };

    inVacBtn.onclick = () => {
      shape.createSnapPolygon({
        dm,
        options: {
          fillColor: "rgb(255, 51, 51)",
          fillOpacity: 0.4,
          strokeColor: "#FF3333",
          strokeWeight: 3,
          strokeStyle: "shortdashdotdot",
        },
        tree: treeStore.getState().tree,
        type: "in",
      });
    };

    outVacBtn.onclick = () => {
      shape.createSnapPolygon({
        dm,
        options: {
          fillColor: "rgb(255, 51, 51)",
          fillOpacity: 0.4,
          strokeColor: "#FF3333",
          strokeWeight: 3,
          strokeStyle: "shortdashdotdot",
        },
        tree: treeStore.getState().tree,
        type: "out",
      });
    };

    document.body.insertBefore(addFieldBtn, mapDiv);
    document.body.insertBefore(inVacBtn, mapDiv);
    document.body.insertBefore(outVacBtn, mapDiv);
  };
};
