import * as React from "react";
import * as DragManager from "./dragdrop/DragManager";
import type { TabNavListProps } from "rc-tabs/lib/TabNavList";
import { PanelData } from "./DockData";
interface DockTabBarProps extends TabNavListProps {
    isMaximized: boolean;
    onDragStart?: DragManager.DragHandler;
    onDragMove?: DragManager.DragHandler;
    onDragEnd?: DragManager.DragHandler;
    TabNavList: React.ComponentType<TabNavListProps>;
    panelData: PanelData;
}
export declare function DockTabBar(props: DockTabBarProps): JSX.Element;
export {};
