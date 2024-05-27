import * as jsts from "jsts";
import proj4 from "proj4";
import RBush from "rbush";
import { PROJ_LL, PROJ_TM, naverPolygonToGeom } from "./geo";

const factory = new jsts.geom.GeometryFactory();

export type TreeItem<T extends jsts.geom.Geometry> = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: T extends jsts.geom.Polygon ? string : undefined;
  geom: T;
};

export const search = <T extends jsts.geom.Geometry>(
  tree: RBush<TreeItem<T>>,
  latlng: naver.maps.LatLng,
  buffer = 2
) => {
  const p1 = latlng.destinationPoint(135, buffer);
  const p2 = latlng.destinationPoint(315, buffer);

  const t1 = proj4(PROJ_LL, PROJ_TM, [p1.x, p1.y]);
  const t2 = proj4(PROJ_LL, PROJ_TM, [p2.x, p2.y]);
  const searchObject = {
    minX: Math.min(t1[0], t2[0]),
    minY: Math.min(t1[1], t2[1]),
    maxX: Math.max(t1[0], t2[0]),
    maxY: Math.max(t1[1], t2[1]),
  };

  const result = tree.search(searchObject);
  return result;
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
