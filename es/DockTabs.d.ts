import React from "react";
import { DockContext, DropDirection, PanelData, TabData } from "./DockData";
import * as DragManager from "./dragdrop/DragManager";
export declare class TabCache {
    _ref: HTMLDivElement;
    getRef: (r: HTMLDivElement) => void;
    _hitAreaRef: HTMLDivElement;
    getHitAreaRef: (r: HTMLDivElement) => void;
    data: TabData;
    context: DockContext;
    content: React.ReactElement;
    constructor(context: DockContext);
    setData(data: TabData): boolean;
    onCloseClick: (e: React.MouseEvent) => void;
    onDragStart: (e: DragManager.DragState) => void;
    onDragOver: (e: DragManager.DragState) => void;
    onDragLeave: (e: DragManager.DragState) => void;
    onDrop: (e: DragManager.DragState) => void;
    getDropDirection(e: DragManager.DragState): DropDirection;
    render(): React.ReactElement;
    destroy(): void;
}
interface Props {
    panelData: PanelData;
    onPanelDragStart: DragManager.DragHandler;
    onPanelDragMove: DragManager.DragHandler;
    onPanelDragEnd: DragManager.DragHandler;
    isCollapseDisabled?: boolean;
}
interface State {
    isAnimationDisabled: boolean;
}
export declare class DockTabs extends React.PureComponent<Props, State> {
    static contextType: React.Context<DockContext>;
    static readonly propKeys: string[];
    context: DockContext;
    _cache: Map<string, TabCache>;
    cachedTabs: TabData[];
    state: State;
    updateTabs(tabs: TabData[]): void;
    onMaximizeClick: (e: React.MouseEvent) => void;
    onCollapseExpandClick: (e: React.MouseEvent) => void;
    onNewWindowClick: () => void;
    addNewWindowMenu(element: React.ReactElement, showWithLeftClick: boolean): JSX.Element;
    renderTabBar: (props: any, TabNavList: React.ComponentType) => JSX.Element;
    onTabChange: (activeId: string) => void;
    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void;
    render(): React.ReactNode;
}
export {};
