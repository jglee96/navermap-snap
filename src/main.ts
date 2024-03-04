import "./style.css";
import RBush from "rbush";
import * as jsts from "jsts";

const NAVER_MAP_API = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${
  import.meta.env.VITE_OAPI_KEY
}&submodules=geocoder,drawing`;

type TreeObject = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  value: naver.maps.Polygon;
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
  const tree = new RBush<TreeObject>();
  const map = new naver.maps.Map("map", {
    zoom: 20,
  });

  const mapDiv = map.getElement();

  const addPolyBtn = document.createElement("button");
  addPolyBtn.innerText = "Add Polygon";

  const debugRect: naver.maps.Rectangle[] = [];
  const factory = new jsts.geom.GeometryFactory();
  addPolyBtn.onclick = () => {
    const path: naver.maps.LatLng[] = [];
    const poly = new naver.maps.Polygon({
      map,
      paths: [path],
    });
    const handleClick = map.addListener("click", (e) => {
      console.log("click");
      path.push(e.latlng);
      if (path.length === 1) {
        path.push(e.latlng);
      }
      poly.setPath(path);
    });

    const handleMove = map.addListener("mousemove", (e) => {
      console.log("mousemove");
      if (path.length < 1) return;
      const p1 = (e.latlng as naver.maps.LatLng).destinationPoint(135, 5);
      const p2 = (e.latlng as naver.maps.LatLng).destinationPoint(315, 5);
      const bounds = new naver.maps.LatLngBounds(p1, p2);
      const result = tree.search({
        minX: bounds.minX(),
        minY: bounds.minY(),
        maxX: bounds.maxX(),
        maxY: bounds.maxY(),
      });
      const jPoint = factory.createPoint(
        new jsts.geom.Coordinate(e.latlng.x, e.latlng.y)
      );

      const comp = result.map((item: TreeObject) => {
        const coords = (item.value.getPath() as naver.maps.KVOArrayOfCoords)
          .getArray()
          .reduce(
            (acc: jsts.geom.Coordinate[], cur) => [
              ...acc,
              new jsts.geom.Coordinate(cur.x, cur.y),
            ],
            []
          );
        coords.push(coords[0]);
        const jPoly = factory.createPolygon(coords);

        // jsts.operation.distance.DistanceOp.nearestPoints(jPoly, jPoint);
        return {
          distance: jsts.operation.distance.DistanceOp.distance(jPoly, jPoint),
          poly: jPoly,
        };
      });
      if (comp.length > 0) {
        comp.sort((a, b) => a.distance - b.distance);
        const [p1, p2] = jsts.operation.distance.DistanceOp.nearestPoints(
          comp[0].poly,
          jPoint
        );
        const snapPoint =
          p1.compareTo(new jsts.geom.Coordinate(e.latlng.x, e.latlng.y)) === 0
            ? p2
            : p1;

        path.pop();
        path.push(new naver.maps.LatLng(snapPoint.y, snapPoint.x));
        poly.setPath(path);
      } else {
        path.pop();
        path.push(e.latlng);
        poly.setPath(path);
      }

      // jsts.operation.distance.DistanceOp.nearestPoints();
      debugRect.forEach((rect) => rect.setMap(null));

      debugRect.push(
        ...result.map(
          (item: TreeObject) =>
            new naver.maps.Rectangle({
              map,
              bounds: item.value.getBounds(),
            })
        )
      );
    });

    map.addListenerOnce("rightclick", () => {
      console.log("rightclick");
      naver.maps.Event.removeListener([handleClick, handleMove]);

      path.pop();
      poly.setPath(path);
      const bounds = poly.getBounds() as naver.maps.LatLngBounds;
      const item = {
        minX: bounds.minX(),
        minY: bounds.minY(),
        maxX: bounds.maxX(),
        maxY: bounds.maxY(),
        value: poly,
      };
      tree.insert(item);
    });
  };
  document.body.insertBefore(addPolyBtn, mapDiv);
};
