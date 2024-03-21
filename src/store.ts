import RBush from "rbush";
import { create } from "zustand";
import { PolygonTreeObject } from "./common";

interface State {
  field: RBush<PolygonTreeObject>;
  vi: RBush<PolygonTreeObject>;
  vo: RBush<PolygonTreeObject>;
}

const initialState: State = {
  field: new RBush<PolygonTreeObject>(),
  vi: new RBush<PolygonTreeObject>(),
  vo: new RBush<PolygonTreeObject>(),
};

export const treeStore = create<State>()(() => ({ ...initialState }));
