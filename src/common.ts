import RBush, { BBox } from "rbush";
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

export const PROJ_LL = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
export const PROJ_TM =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs";

const factory = new jsts.geom.GeometryFactory();
const writer = new jsts.io.WKTWriter();

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

export const checkInside = (
  items: TreeItem<jsts.geom.Polygon>[],
  latlng: naver.maps.LatLng
) => {
  if (items.length === 0) return false;

  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  return items.some((item) => item.geom.covers(point));
};

export const checkCross = (
  items: TreeItem<jsts.geom.Polygon>[],
  cur: naver.maps.LatLng,
  prev?: naver.maps.LatLng,
  tolerance = 0
) => {
  if (items.length === 0) return false;
  if (prev === undefined) return false;

  const start = proj4(PROJ_LL, PROJ_TM, [cur.x, cur.y]);
  const end = proj4(PROJ_LL, PROJ_TM, [prev.x, prev.y]);
  const line = factory.createLineString([
    new jsts.geom.Coordinate(start[0], start[1]),
    new jsts.geom.Coordinate(end[0], end[1]),
  ]);
  return items.some(
    (item) =>
      !item.geom.buffer(tolerance).covers(line) &&
      item.geom.buffer(tolerance).intersects(line)
  );
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

export const polygonToRing = (polygon: jsts.geom.Polygon, buffer = 0) => {
  const result: jsts.geom.LinearRing[] = [];
  const bufferedPolygon = polygon.buffer(buffer) as jsts.geom.Polygon;
  result.push(bufferedPolygon.getExteriorRing());

  for (let i = 0; i < bufferedPolygon.getNumInteriorRing(); i++) {
    result.push(bufferedPolygon.getInteriorRingN(i));
  }
  return result;
};

export const polygonToLine = (polygon: jsts.geom.Polygon) => {
  const exteriorCoords = polygon.getExteriorRing().getCoordinates();
  const result: jsts.geom.LineString[] = [];
  result.push(
    ...exteriorCoords.map((coord, i) =>
      factory.createLineString([
        coord,
        i === exteriorCoords.length - 1
          ? exteriorCoords[0]
          : exteriorCoords[i + 1],
      ])
    )
  );

  for (let i = 0; i < polygon.getNumInteriorRing(); i++) {
    const coords = polygon.getInteriorRingN(i).getCoordinates();
    result.push(
      ...coords.map((coord, i) =>
        factory.createLineString([
          coord,
          i === coords.length - 1 ? coords[0] : coords[i + 1],
        ])
      )
    );
  }
  return result;
};

export const getNearestPoint = (
  items: TreeItem<jsts.geom.Polygon>[],
  latlng: naver.maps.LatLng
): number[] => {
  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const comp = items.map((item) => ({
    distance: jsts.operation.distance.DistanceOp.distance(item.geom, point),
    poly: item.geom,
  }));

  const nearestPolygon = comp.reduce((min, cur) =>
    min.distance > cur.distance ? cur : min
  ).poly;

  const nearestPoint = polygonToRing(nearestPolygon)
    .map((line): [number, jsts.geom.Coordinate] => {
      const nearestPoints = jsts.operation.distance.DistanceOp.nearestPoints(
        line,
        point
      );
      const np = factory.createPoint(nearestPoints[0]);
      const dist = jsts.operation.distance.DistanceOp.distance(point, np);
      return [dist, nearestPoints[0]];
    })
    .reduce((min, cur) => (min[0] > cur[0] ? cur : min));

  return [nearestPoint[1].x, nearestPoint[1].y];
};

export const getSnapPoint = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  latlng: naver.maps.LatLng
): number[] => {
  const bufferSize = 10;
  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const result = search(tree, latlng, bufferSize);
  if (result.length === 0) return proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);

  const lineTree = new RBush<TreeItem<jsts.geom.LineString>>();
  lineTree.load(
    result
      .flatMap((p) => polygonToLine(p.geom))
      .map(
        (line): TreeItem<jsts.geom.LineString> => ({
          minX: line.getEnvelopeInternal().getMinX(),
          minY: line.getEnvelopeInternal().getMinY(),
          maxX: line.getEnvelopeInternal().getMaxX(),
          maxY: line.getEnvelopeInternal().getMaxY(),
          id: undefined,
          geom: line,
        })
      )
  );

  const lineResult = search(lineTree, latlng, bufferSize);
  if (lineResult.length === 0)
    return proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);

  const nearestPoint = lineResult
    .map(({ geom }): [number, jsts.geom.Coordinate] => {
      const nearestPoints = jsts.operation.distance.DistanceOp.nearestPoints(
        geom,
        point
      );
      const np = factory.createPoint(nearestPoints[0]);
      const dist = jsts.operation.distance.DistanceOp.distance(point, np);
      return [dist, nearestPoints[0]];
    })
    .reduce((min, cur) => (min[0] > cur[0] ? cur : min));

  return [nearestPoint[1].x, nearestPoint[1].y];
};

export const getRestrictedPoint = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  cur: naver.maps.LatLng,
  prev?: naver.maps.LatLng
): number[] => {
  const curT = proj4(PROJ_LL, PROJ_TM, [cur.x, cur.y]);
  if (prev === undefined) {
    return getNearestPoint(tree.all(), cur);
  }
  const prevT = proj4(PROJ_LL, PROJ_TM, [prev.x, prev.y]);

  const searchItem: BBox = {
    minX: Math.min(curT[0], prevT[0]),
    minY: Math.min(curT[1], prevT[1]),
    maxX: Math.max(curT[0], prevT[0]),
    maxY: Math.max(curT[1], prevT[1]),
  };

  const result = tree.search(searchItem);

  if (result.length === 0) return curT;

  const prevGeom = factory.createPoint(
    new jsts.geom.Coordinate(prevT[0], prevT[1])
  );

  const currentLine = factory.createLineString([
    new jsts.geom.Coordinate(curT[0], curT[1]),
    new jsts.geom.Coordinate(prevT[0], prevT[1]),
  ]);
  const intersections = result
    .flatMap(({ geom }) => polygonToRing(geom, 1))
    .map((ring) => currentLine.intersection(ring))
    .filter((g) => !g.isEmpty());

  if (intersections.length === 0) return curT;

  const first = intersections
    .flatMap((g) => g.getCoordinates())
    .reduce((min, cur) =>
      jsts.operation.distance.DistanceOp.distance(
        prevGeom,
        factory.createPoint(min)
      ) >
      jsts.operation.distance.DistanceOp.distance(
        prevGeom,
        factory.createPoint(cur)
      )
        ? cur
        : min
    );

  return [first.x, first.y];
};
