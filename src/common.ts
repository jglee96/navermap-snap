import RBush from "rbush";
import proj4 from "proj4";
import * as jsts from "jsts";
import { TreeObject } from "./main";

const PROJ_LL = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
const PROJ_TM =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs";

const factory = new jsts.geom.GeometryFactory();
const writer = new jsts.io.WKTWriter();

export const insertTree = (
  tree: RBush<TreeObject>,
  p1: naver.maps.LatLng,
  p2: naver.maps.LatLng
) => {
  const t1 = proj4(PROJ_LL, PROJ_TM, [p1.x, p1.y]);
  const t2 = proj4(PROJ_LL, PROJ_TM, [p2.x, p2.y]);

  const lineStr = factory.createLineString([
    new jsts.geom.Coordinate(t1[0], t1[1]),
    new jsts.geom.Coordinate(t2[0], t2[1]),
  ]);

  console.log(
    writer.write(
      lineStr.buffer(2, 2, jsts.operation.buffer.BufferParameters.CAP_FLAT)
    )
  );
  const env = lineStr
    .buffer(2, 2, jsts.operation.buffer.BufferParameters.CAP_FLAT)
    .getEnvelopeInternal();

  const item = {
    minX: env.getMinX(),
    minY: env.getMinY(),
    maxX: env.getMaxX(),
    maxY: env.getMaxY(),
    value: lineStr,
  };
  tree.insert(item);
};

export const searchSnapPoint = (
  tree: RBush<TreeObject>,
  latlng: naver.maps.LatLng
): undefined | number[] => {
  const p1 = latlng.destinationPoint(135, 10);
  const p2 = latlng.destinationPoint(315, 10);

  const t1 = proj4(PROJ_LL, PROJ_TM, [p1.x, p1.y]);
  const t2 = proj4(PROJ_LL, PROJ_TM, [p2.x, p2.y]);

  console.log(t1, t2);
  const result = tree.search({
    minX: t2[0],
    minY: t1[1],
    maxX: t1[0],
    maxY: t2[1],
  });

  if (result.length === 0) return undefined;

  const p = proj4(PROJ_LL, PROJ_TM, [latlng.x, latlng.y]);
  const point = factory.createPoint(new jsts.geom.Coordinate(p[0], p[1]));

  const comp = result.map((item) => {
    const line = item.value;

    return {
      distance: jsts.operation.distance.DistanceOp.distance(line, point),
      line,
    };
  });

  comp.sort((a, b) => a.distance - b.distance);

  const [c1, c2] = jsts.operation.distance.DistanceOp.nearestPoints(
    comp[0].line,
    point
  );
  const snapPoint =
    c1.compareTo(new jsts.geom.Coordinate(latlng.x, latlng.y)) === 0 ? c2 : c1;

  return proj4(PROJ_TM, PROJ_LL, [snapPoint.x, snapPoint.y]);
};
