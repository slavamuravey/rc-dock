import React from "react";
import * as DragManager from "./DragManager";
import { GestureState } from "./GestureManager";
import { PanelData, TabData } from "../DockData";
export declare type AbstractPointerEvent = MouseEvent | TouchEvent;
export interface DragDropDivProps extends React.HTMLAttributes<HTMLDivElement> {
    getRef?: (ref: HTMLDivElement) => void;
    onDragStartT?: DragManager.DragHandler;
    onDragMoveT?: DragManager.DragHandler;
    onDragEndT?: DragManager.DragHandler;
    onDragOverT?: DragManager.DragHandler;
    onDragLeaveT?: DragManager.DragHandler;
    /**
     * Anything returned by onDropT will be stored in DragState.dropped
     * return false to indicate the drop is canceled
     */
    onDropT?: DragManager.DropHandler;
    /**
     * by default onDragStartT will be called on first drag move
     * but if directDragT is true, onDragStartT will be called as soon as mouse is down
     */
    directDragT?: boolean;
    useRightButtonDragT?: boolean;
    onGestureStartT?: (state: GestureState) => boolean;
    onGestureMoveT?: (state: GestureState) => void;
    onGestureEndT?: () => void;
    gestureSensitivity?: number;
    tabData?: TabData;
    panelData?: PanelData;
    getElement?: () => HTMLElement;
}
declare const EnhancedDndDragDropDiv: any;
export { EnhancedDndDragDropDiv as DragDropDiv };
