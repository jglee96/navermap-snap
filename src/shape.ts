import RBush from "rbush";
import * as jsts from "jsts";
import {
  checkInside,
  getSnapPoint,
  PROJ_TM,
  PROJ_LL,
  checkCross,
  getNearestPoint,
  checkSnap,
  getCrossedPoint,
} from "./geo";
import proj4 from "proj4";
import { TreeItem, insert } from "./tree";

export const createSnapInPolygon = ({
  dm,
  options,
  tree,
}: {
  dm: naver.maps.drawing.DrawingManager;
  options: Partial<naver.maps.PolygonOptions>;
  tree: RBush<TreeItem<jsts.geom.Polygon>>;
}) => {
  // @ts-ignore
  const originCreateOverlay = dm._drawingTool._createOverlay;
  // @ts-ignore
  dm._drawingTool._createOverlay = (t: any, e: any) => {
    const ll = proj4(
      PROJ_TM,
      PROJ_LL,
      checkInside(tree, e)
        ? getSnapPoint(tree, e)
        : getNearestPoint(tree.all(), e)
    );
    const fp = new naver.maps.LatLng(ll[1], ll[0]);
    const polygon = new naver.maps.Polygon({
      map: dm.getMap()!,
      paths: [[fp, fp]],
      ...options,
    });

    // @ts-ignore
    polygon.updateLastPath = function (e: any) {
      const t = this.getPath();
      t.pop();
      const lastPoint = t.pop() as naver.maps.LatLng | undefined;

      // previous point exist?
      if (lastPoint !== undefined) {
        // previous point is snapped?
        if (!checkSnap(tree, lastPoint)) {
          // has cross point with r-tree
          if (checkCross(tree, e, lastPoint)) {
            t.push(lastPoint);
            const ll = proj4(
              PROJ_TM,
              PROJ_LL,
              getCrossedPoint(tree, e, lastPoint)
            );
            const mp = new naver.maps.LatLng(ll[1], ll[0]);
            t.push(mp);
            return;
          }
        }
      }

      let ll: number[] = [];
      if (checkInside(tree, e)) {
        ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
      } else {
        ll = proj4(PROJ_TM, PROJ_LL, getNearestPoint(tree.all(), e));
      }
      lastPoint && t.push(lastPoint);
      const mp = new naver.maps.LatLng(ll[1], ll[0]);
      t.push(mp);
    };

    return polygon;
  };

  dm.setOptions("polygonOptions", options);
  dm.setOptions("drawingMode", naver.maps.drawing.DrawingMode.POLYGON);
  const addListener = dm.addListener(
    naver.maps.drawing.DrawingEvents.ADD,
    () => {
      // @ts-ignore
      dm._drawingTool._createOverlay = originCreateOverlay;
    }
  );
  const escapeHandler = naver.maps.Event.addListener(
    dm,
    "escape_changed",
    (e) => {
      if (e === false) return;
      // @ts-ignore
      dm._drawingTool._createOverlay = originCreateOverlay;
      dm.removeListener([addListener]);
      naver.maps.Event.removeListener(escapeHandler);
    }
  );
};

export const createSnapOutPolygon = ({
  dm,
  options,
  tree,
}: {
  dm: naver.maps.drawing.DrawingManager;
  options: Partial<naver.maps.PolygonOptions>;
  tree: RBush<TreeItem<jsts.geom.Polygon>>;
}) => {
  // @ts-ignore
  const originCreateOverlay = dm._drawingTool._createOverlay;
  // @ts-ignore
  dm._drawingTool._createOverlay = (t: any, e: any) => {
    const ll = proj4(
      PROJ_TM,
      PROJ_LL,
      !checkInside(tree, e)
        ? getSnapPoint(tree, e)
        : getNearestPoint(tree.all(), e)
    );
    const fp = new naver.maps.LatLng(ll[1], ll[0]);
    const polygon = new naver.maps.Polygon({
      map: dm.getMap()!,
      paths: [[fp, fp]],
      ...options,
    });

    // @ts-ignore
    polygon.updateLastPath = function (e: any) {
      const t = this.getPath();
      t.pop();
      const lastPoint = t.pop() as naver.maps.LatLng | undefined;

      // previous point exist?
      if (lastPoint !== undefined) {
        // previous point is snapped?
        if (!checkSnap(tree, lastPoint)) {
          // has cross point with r-tree
          if (checkCross(tree, e, lastPoint)) {
            t.push(lastPoint);
            const ll = proj4(
              PROJ_TM,
              PROJ_LL,
              getCrossedPoint(tree, e, lastPoint)
            );
            const mp = new naver.maps.LatLng(ll[1], ll[0]);
            t.push(mp);
            return;
          }
        }
      }

      let ll: number[] = [];
      if (!checkInside(tree, e)) {
        ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
      } else {
        ll = proj4(PROJ_TM, PROJ_LL, getNearestPoint(tree.all(), e));
      }
      lastPoint && t.push(lastPoint);
      const mp = new naver.maps.LatLng(ll[1], ll[0]);
      t.push(mp);
    };

    return polygon;
  };

  dm.setOptions("polygonOptions", options);
  dm.setOptions("drawingMode", naver.maps.drawing.DrawingMode.POLYGON);
  const addListener = dm.addListener(
    naver.maps.drawing.DrawingEvents.ADD,
    () => {
      // @ts-ignore
      dm._drawingTool._createOverlay = originCreateOverlay;
    }
  );
  const escapeHandler = naver.maps.Event.addListener(
    dm,
    "escape_changed",
    (e) => {
      if (e === false) return;
      // @ts-ignore
      dm._drawingTool._createOverlay = originCreateOverlay;
      dm.removeListener([addListener]);
      naver.maps.Event.removeListener(escapeHandler);
    }
  );
};

export const createPolygon = ({
  dm,
  options,
  tree,
}: {
  dm: naver.maps.drawing.DrawingManager;
  options: Partial<naver.maps.PolygonOptions>;
  tree: RBush<TreeItem<jsts.geom.Polygon>>;
}) => {
  dm.setOptions("polygonOptions", options);
  dm.setOptions("drawingMode", naver.maps.drawing.DrawingMode.POLYGON);

  const addListener = dm.addListener(
    naver.maps.drawing.DrawingEvents.ADD,
    // @ts-ignore
    (e) => insert(tree, e)
  );
  const escapeHandler = naver.maps.Event.addListener(
    dm,
    "escape_changed",
    (e) => {
      if (e === false) return;
      dm.removeListener([addListener]);
      naver.maps.Event.removeListener(escapeHandler);
    }
  );
};
