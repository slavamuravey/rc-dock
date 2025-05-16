import { TabGroup, Size, Coordinates } from "./DockData";
export declare function mergeTabGroups(group: TabGroup, localGroup?: TabGroup): TabGroup;
export declare function getFloatingCoordinatesBySize(size: Size, dockLayoutSize: Size): Coordinates;
export declare const groupClassNames: (groupNames?: string) => string[];
