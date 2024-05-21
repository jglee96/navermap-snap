import RBush from "rbush";
import proj4 from "proj4";
import * as jsts from "jsts";

export type TreeItem<T extends jsts.geom.Geometry> = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: T extends jsts.geom.Polygon ? string : undefined;
  geom: T;
};

const PROJ_LL = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
const PROJ_TM =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs";

const factory = new jsts.geom.GeometryFactory();

export const naverPolygonToGeom = (polygon: naver.maps.Polygon) => {
  const coords = (polygon.getPath() as naver.maps.KVOArrayOfCoords)
    .getArray()
    .map((coord) => proj4(PROJ_LL, PROJ_TM, [coord.x, coord.y]))
    .reduce(
      (acc: jsts.geom.Coordinate[], cur) => [
        ...acc,
        new jsts.geom.Coordinate(cur[0], cur[1]),
      ],
      []
    );
  coords.push(coords[0]);

  return factory.createPolygon(coords);
};

export const checkInside = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  latlng: naver.maps.LatLng
) => {
  const p1 = latlng.destinationPoint(135, 2);
  const p2 = latlng.destinationPoint(315, 2);

  const t1 = proj4(PROJ_LL, PROJ_TM, [p1.x, p1.y]);
  const t2 = proj4(PROJ_LL, PROJ_TM, [p2.x, p2.y]);
  const searchObject = {
    minX: Math.min(t1[0], t2[0]),
    minY: Math.min(t1[1], t2[1]),
    maxX: Math.max(t1[0], t2[0]),
    maxY: Math.max(t1[1], t2[1]),
  };

  const result = tree.search(searchObject);

  if (result.length === 0) return undefined;

  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  return result.some((item) => item.geom.covers(point));
};

export const insert = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  polygon: naver.maps.Polygon
) => {
  const geom = naverPolygonToGeom(polygon);
  const env = geom.getEnvelopeInternal();

  const item: TreeItem<jsts.geom.Polygon> = {
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
    // @ts-ignore
    id: polygon.id,
    geom,
  };
  tree.insert(item);
};

export const remove = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  id: string
) => {
  const item: TreeItem<jsts.geom.Polygon> = {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    id,
    geom: factory.createPolygon(),
  };

  tree.remove(item, (a, b) => a.id === b.id);
};

export const update = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  polygon: naver.maps.Polygon
) => {
  const geom = naverPolygonToGeom(polygon);
  const env = geom.getEnvelopeInternal();

  const item: TreeItem<jsts.geom.Polygon> = {
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
    // @ts-ignore
    id: polygon.id,
    geom,
  };
  tree.remove(item, (a, b) => a.id === b.id);
  tree.insert(item);
};

export const searchSnapPoint = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  latlng: naver.maps.LatLng
): undefined | number[] => {
  const bufferSize = 2;
  const p1 = latlng.destinationPoint(135, bufferSize);
  const p2 = latlng.destinationPoint(315, bufferSize);

  const t1 = proj4(PROJ_LL, PROJ_TM, [p1.x, p1.y]);
  const t2 = proj4(PROJ_LL, PROJ_TM, [p2.x, p2.y]);
  const searchObject = {
    minX: Math.min(t1[0], t2[0]),
    minY: Math.min(t1[1], t2[1]),
    maxX: Math.max(t1[0], t2[0]),
    maxY: Math.max(t1[1], t2[1]),
  };

  const result = tree.search(searchObject);

  if (result.length === 0) return undefined;

  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const comp = result.map((item) => ({
    distance: jsts.operation.distance.DistanceOp.distance(item.geom, point),
    poly: item.geom,
  }));

  comp.sort((a, b) => a.distance - b.distance);
  const nearestPolygon = comp[0].poly;

  // @ts-ignore
  const snapGeom = jsts.operation.overlay.snap.GeometrySnapper.snap(
    point,
    nearestPolygon,
    2
  );

  return proj4(PROJ_TM, PROJ_LL, [snapGeom[0].getX(), snapGeom[0].getY()]);
};
