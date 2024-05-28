import RBush, { BBox } from "rbush";
import proj4 from "proj4";
import * as jsts from "jsts";
import { TreeItem, search } from "./tree";

export const PROJ_LL = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
export const PROJ_TM =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs";

const factory = new jsts.geom.GeometryFactory();

export const checkSnap = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  latlng: naver.maps.LatLng,
  tolerance = 2
) => {
  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const result = search(tree, latlng);
  return result.some(({ geom }) =>
    polygonToRing(geom).some(
      (ring) =>
        jsts.operation.distance.DistanceOp.distance(ring, point) <= tolerance
    )
  );
};

export const checkInside = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  latlng: naver.maps.LatLng
) => {
  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));
  const env = point.getEnvelopeInternal();

  const items = tree.search({
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
  });

  return items.some(({ geom }) => point.within(geom));
};

export const checkCross = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  cur: naver.maps.LatLng,
  prev: naver.maps.LatLng
) => {
  const start = proj4(PROJ_LL, PROJ_TM, [prev.x, prev.y]);
  const end = proj4(PROJ_LL, PROJ_TM, [cur.x, cur.y]);
  const line = factory.createLineString([
    new jsts.geom.Coordinate(start[0], start[1]),
    new jsts.geom.Coordinate(end[0], end[1]),
  ]);
  const env = line.getEnvelopeInternal();
  const items = tree.search({
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
  });
  return items.some(
    (item) => !item.geom.covers(line) && item.geom.intersects(line)
  );
};

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

export const polygonToRing = (polygon: jsts.geom.Polygon) => {
  const result: jsts.geom.LinearRing[] = [];
  result.push(polygon.getExteriorRing());

  for (let i = 0; i < polygon.getNumInteriorRing(); i++) {
    result.push(polygon.getInteriorRingN(i));
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
  latlng: naver.maps.LatLng,
  tolerance = 10
): number[] => {
  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const result = search(tree, latlng, tolerance);
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

  const lineResult = search(lineTree, latlng, tolerance);
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

export const getCrossedPoint = (
  tree: RBush<TreeItem<jsts.geom.Polygon>>,
  cur: naver.maps.LatLng,
  prev: naver.maps.LatLng
): number[] => {
  const start = proj4(PROJ_LL, PROJ_TM, [prev.x, prev.y]);
  const end = proj4(PROJ_LL, PROJ_TM, [cur.x, cur.y]);
  const startCoord = new jsts.geom.Coordinate(start[0], start[1]);
  const endCoord = new jsts.geom.Coordinate(end[0], end[1]);
  const line = factory.createLineString([startCoord, endCoord]);
  const env = line.getEnvelopeInternal();

  const searchItem: BBox = {
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
  };

  const result = tree.search(searchItem);

  if (result.length === 0) return end;

  const startGeom = factory.createPoint(startCoord);

  const intersections = result
    .flatMap(({ geom }) => polygonToRing(geom))
    .map((ring) => line.intersection(ring))
    .filter((g) => !g.isEmpty());

  if (intersections.length === 0) return end;

  const first = intersections
    .flatMap((g) => g.getCoordinates())
    .reduce((min, cur) =>
      jsts.operation.distance.DistanceOp.distance(
        startGeom,
        factory.createPoint(min)
      ) >
      jsts.operation.distance.DistanceOp.distance(
        startGeom,
        factory.createPoint(cur)
      )
        ? cur
        : min
    );

  return [first.x, first.y];
};
