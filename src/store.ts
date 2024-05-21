import RBush from "rbush";
import { create } from "zustand";
import * as jsts from "jsts";
import { TreeItem } from "./common";

interface State {
  tree: RBush<TreeItem<jsts.geom.Polygon>>;
}

const initialState: State = {
  tree: new RBush<TreeItem<jsts.geom.Polygon>>(),
};

export const treeStore = create<State>()(() => ({
  ...initialState,
}));
