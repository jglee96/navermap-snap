import "./style.css";
import RBush from "rbush";
import * as jsts from "jsts";
import { insertTree, searchSnapPoint } from "./common";

const NAVER_MAP_API = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${
  import.meta.env.VITE_OAPI_KEY
}&submodules=geocoder,drawing`;

export type TreeObject = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  value: jsts.geom.LineString;
};

let script: HTMLScriptElement | null = document.querySelector(
  `script[src="${NAVER_MAP_API}"]`
);

if (script === null) {
  script = document.createElement("script");
  script.src = NAVER_MAP_API;
  document.head.appendChild(script);
}

script.onload = () => {
  const fieldTree = new RBush<TreeObject>();
  const inVacTree = new RBush<TreeObject>();
  const outVacTree = new RBush<TreeObject>();

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
    const path: naver.maps.LatLng[] = [];
    const cursor = new naver.maps.Circle({
      map,
      center: [0, 0],
      radius: 1,
      fillColor: "purple",
    });
    const poly = new naver.maps.Polygon({
      map,
      paths: [path],
      fillColor: "rgb(255, 51, 51)",
      fillOpacity: 0.4,
      strokeColor: "#FF3333",
      strokeWeight: 3,
      strokeStyle: "shortdashdotdot",
    });
    const handleClick = map.addListener("click", (e) => {
      path.push(e.latlng);
      if (path.length === 1) {
        path.push(e.latlng);
      }
      poly.setPath(path);
    });

    const handleMove = map.addListener("mousemove", (e) => {
      const snapPoint = searchSnapPoint(fieldTree, e.latlng);

      if (snapPoint !== undefined) {
        path.pop();
        cursor.setCenter(new naver.maps.LatLng(snapPoint[1], snapPoint[0]));
        path.push(new naver.maps.LatLng(snapPoint[1], snapPoint[0]));
        poly.setPath(path);
      } else {
        path.pop();
        cursor.setCenter(e.latlng);
        path.push(e.latlng);
        poly.setPath(path);
      }
    });

    map.addListenerOnce("rightclick", () => {
      naver.maps.Event.removeListener([handleClick, handleMove]);
      cursor.setMap(null);

      path.pop();
      poly.setPath(path);
      poly.setEditable(true);
      const coords = poly.getPath() as naver.maps.KVOArrayOfCoords;
      coords.forEach((coord, idx) => {
        const p1 = coord as naver.maps.LatLng;
        const p2 = (
          idx !== coords.getLength() - 1
            ? coords.getAt(idx + 1)
            : coords.getAt(0)
        ) as naver.maps.LatLng;

        insertTree(fieldTree, p1, p2);
      });
    });
  };

  inVacBtn.onclick = () => {
    const path: naver.maps.LatLng[] = [];
    const cursor = new naver.maps.Circle({
      map,
      center: [0, 0],
      radius: 1,
      fillColor: "purple",
    });
    const poly = new naver.maps.Polygon({
      map,
      paths: [path],
      fillColor: "rgb(136, 0, 200)",
      fillOpacity: 0.2,
      strokeColor: "#8800C8",
      strokeWeight: 1,
    });
    const handleClick = map.addListener("click", (e) => {
      path.push(e.latlng);
      if (path.length === 1) {
        path.push(e.latlng);
      }
      poly.setPath(path);
    });

    const handleMove = map.addListener("mousemove", (e) => {
      const snapPoint = searchSnapPoint(fieldTree, e.latlng);
      if (snapPoint !== undefined) {
        path.pop();
        cursor.setCenter(new naver.maps.LatLng(snapPoint[1], snapPoint[0]));
        path.push(new naver.maps.LatLng(snapPoint[1], snapPoint[0]));
        poly.setPath(path);
      } else {
        path.pop();
        cursor.setCenter(e.latlng);
        path.push(e.latlng);
        poly.setPath(path);
      }
    });

    map.addListenerOnce("rightclick", () => {
      naver.maps.Event.removeListener([handleClick, handleMove]);
      cursor.setMap(null);

      path.pop();
      poly.setPath(path);
      poly.setEditable(true);
      const coords = poly.getPath() as naver.maps.KVOArrayOfCoords;
      coords.forEach((coord, idx) => {
        const p1 = coord as naver.maps.LatLng;
        const p2 = (
          idx !== coords.getLength() - 1
            ? coords.getAt(idx + 1)
            : coords.getAt(0)
        ) as naver.maps.LatLng;

        insertTree(inVacTree, p1, p2);
      });
    });
  };

  document.body.insertBefore(addFieldBtn, mapDiv);
  document.body.insertBefore(inVacBtn, mapDiv);
  document.body.insertBefore(outVacBtn, mapDiv);
};
