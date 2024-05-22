import RBush from "rbush";
import * as jsts from "jsts";
import {
  TreeItem,
  checkInside,
  insert,
  getSnapPoint,
  getRestrictedPoint,
  PROJ_TM,
  PROJ_LL,
} from "./common";
import proj4 from "proj4";

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
    const ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
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
      let point: number[] = [];
      if (!checkInside(tree, e)) {
        point = getRestrictedPoint(tree, e, lastPoint);
      } else {
        point = getSnapPoint(tree, e);
      }

      const ll = proj4(PROJ_TM, PROJ_LL, point);

      const mp = point.length > 0 ? new naver.maps.LatLng(ll[1], ll[0]) : e;

      lastPoint && t.push(lastPoint);
      t.push(mp);
    };

    // @ts-ignore
    polygon.addPath = function (e) {
      /**
       * 내외부 조건이 맞지 않는 상태에서 클릭시
       * 마지막 점을 path로 적용하는 로직
       * path는 kvo array이기 때문에 t[t.length - 1]로 마지막 element를 접근할 수 없음
       * 따라서 pop으로 마지막 element 꺼내고
       * 첫번째 push로 고정된 point 적용
       * 두번째 push로 move하면서 변경될 point 적용
       */
      if (!checkInside(tree, e)) {
        const t = this.getPath();
        const last = t.pop() as naver.maps.LatLng | undefined;
        if (last === undefined) return;
        t.push(last.clone());
        t.push(last.clone());
        return;
      }

      const ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
      const mp = new naver.maps.LatLng(ll[1], ll[0]);

      const t = this.getPath();
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
    const ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
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
      let point: number[] = [];
      if (checkInside(tree, e)) {
        point = getRestrictedPoint(tree, e, lastPoint);
      } else {
        point = getSnapPoint(tree, e);
      }

      const ll = proj4(PROJ_TM, PROJ_LL, point);

      const mp = point.length > 0 ? new naver.maps.LatLng(ll[1], ll[0]) : e;

      lastPoint && t.push(lastPoint);
      t.push(mp);
    };

    // @ts-ignore
    polygon.addPath = function (e) {
      /**
       * 내외부 조건이 맞지 않는 상태에서 클릭시
       * 마지막 점을 path로 적용하는 로직
       * path는 kvo array이기 때문에 t[t.length - 1]로 마지막 element를 접근할 수 없음
       * 따라서 pop으로 마지막 element 꺼내고
       * 첫번째 push로 고정된 point 적용
       * 두번째 push로 move하면서 변경될 point 적용
       */
      if (checkInside(tree, e)) {
        const t = this.getPath();
        const last = t.pop() as naver.maps.LatLng | undefined;
        if (last === undefined) return;
        t.push(last.clone());
        t.push(last.clone());
        return;
      }

      const ll = proj4(PROJ_TM, PROJ_LL, getSnapPoint(tree, e));
      const mp = new naver.maps.LatLng(ll[1], ll[0]);

      const t = this.getPath();
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
    (e) => {
      // @ts-ignore
      insert(tree, e);
    }
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
