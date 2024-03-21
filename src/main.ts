import "./style.css";
import * as shape from "./shape";

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
  const map = new naver.maps.Map("map", {
    zoom: 20,
  });

  const mapDiv = map.getElement();

  const addFieldBtn = document.createElement("button");
  addFieldBtn.innerText = "Add Field Polygon";
  const inVacBtn = document.createElement("button");
  inVacBtn.innerText = "Add Inside Vacancy Polygon";
  const outVacBtn = document.createElement("button");
  outVacBtn.innerText = "Add Outside Vacancy Polygon";

  addFieldBtn.onclick = () => {
    new shape.Polygon(map, {
      fillColor: "rgb(255, 51, 51)",
      fillOpacity: 0.4,
      strokeColor: "#FF3333",
      strokeWeight: 3,
      strokeStyle: "shortdashdotdot",
    });
  };

  inVacBtn.onclick = () => {
    new shape.InPolygon(map, {
      fillColor: "rgb(136, 0, 200)",
      fillOpacity: 0.2,
      strokeColor: "#8800C8",
      strokeWeight: 1,
    });
  };

  outVacBtn.onclick = () => {
    new shape.OutPolygon(map, {
      fillColor: "#00A15E",
      fillOpacity: 0.3,
      strokeColor: "#00A15E",
      strokeWeight: 1,
    });
  };

  document.body.insertBefore(addFieldBtn, mapDiv);
  document.body.insertBefore(inVacBtn, mapDiv);
  document.body.insertBefore(outVacBtn, mapDiv);
};
