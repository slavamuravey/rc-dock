import React, { useContext, useMemo } from "react";
import * as DragManager from "./DragManager";
// tslint:disable-next-line:no-duplicate-imports
import { dragEnd, getTabByDockId } from "./DragManager";
import { GestureState } from "./GestureManager";
import { ITEM_TYPE_DEFAULT } from "../Constants";
import _ from "lodash";
import { DndSpec, DockContext, DockContextType, TabData } from "../DockData";
import { v4 as uuid } from "uuid";
import {
  ConnectDragSource,
  ConnectDropTarget,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
  DropTargetSpec,
  XYCoord
} from "react-dnd";

export type AbstractPointerEvent = MouseEvent | TouchEvent;

interface DragDropDivProps extends React.HTMLAttributes<HTMLDivElement> {
  getRef?: (ref: HTMLDivElement) => void;
  onDragStartT?: DragManager.DragHandler;
  onDragMoveT?: DragManager.DragHandler;
  onDragEndT?: DragManager.DragHandler;
  onDragOverT?: DragManager.DragHandler;
  onDragLeaveT?: DragManager.DragHandler;
  onDropT?: DragManager.DragHandler;
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

  extraData?: any;
}

interface DndSpecProps {
  dndSpec?: DndSpec;
}

interface ExternalDataProps {
  externalData?: any;
}

interface DndDragDropDivProps extends DragDropDivProps, DndSpecProps, ExternalDataProps {
  isOver: boolean;
  isOverCurrent: boolean;
  isDragging: boolean;
  canDrop: boolean;
  itemType: string;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
}

class RcDragDropDiv extends React.PureComponent<DragDropDivProps, any> {

  element: HTMLElement;
  ownerDocument: Document;
  _getRef = (r: HTMLDivElement) => {
    if (r === this.element) {
      return;
    }
    let {getRef, onDragOverT} = this.props;
    if (this.element && onDragOverT) {
      DragManager.removeHandlers(this.element);
    }
    this.element = r;
    if (r) {
      this.ownerDocument = r.ownerDocument;
    }
    if (getRef) {
      getRef(r);
    }
    if (r && onDragOverT) {
      DragManager.addHandlers(r, this.props);
    }
  };

  dragType: DragManager.DragType = null;
  baseX: number;
  baseY: number;
  scaleX: number;
  scaleY: number;
  waitingMove = false;
  listening = false;

  gesturing = false;
  baseX2: number;
  baseY2: number;
  baseDis: number;
  baseAng: number;

  onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    let nativeTarget = e.nativeEvent.target as HTMLElement;
    if (nativeTarget instanceof HTMLInputElement || nativeTarget instanceof HTMLTextAreaElement || nativeTarget.classList.contains('drag-ignore')) {
      // ignore drag from input element
      return;
    }

    let {onDragStartT, onGestureStartT, onGestureMoveT, useRightButtonDragT} = this.props;
    let event = e.nativeEvent;
    this.cancel();
    if (event.type === 'touchstart') {
      // check single or double fingure touch
      if ((event as TouchEvent).touches.length === 1) {
        if (onDragStartT) {
          this.onDragStart(event);
        }
      } else if ((event as TouchEvent).touches.length === 2) {
        if (onGestureStartT && onGestureMoveT) {
          this.onGestureStart(event as TouchEvent);
        }
      }
    } else if (onDragStartT) {
      if ((event as MouseEvent).button === 2 && !useRightButtonDragT) {
        return;
      }
      this.onDragStart(event);
    }
  };

  onDragStart(event: MouseEvent | TouchEvent) {
    if (DragManager.isDragging()) {
      // same pointer event shouldn't trigger 2 drag start
      return;
    }
    let state = new DragManager.DragState(event, this, true);
    this.baseX = state.pageX;
    this.baseY = state.pageY;

    let baseElement = this.element.parentElement;
    let rect = baseElement.getBoundingClientRect();
    this.scaleX = baseElement.offsetWidth / Math.round(rect.width);
    this.scaleY = baseElement.offsetHeight / Math.round(rect.height);
    this.addDragListeners(event);
    if (this.props.directDragT) {
      this.executeFirstMove(state);
    }
  }

  addDragListeners(event: MouseEvent | TouchEvent) {
    let {onDragStartT} = this.props;

    if (event.type === 'touchstart') {
      this.ownerDocument.addEventListener('touchmove', this.onTouchMove);
      this.ownerDocument.addEventListener('touchend', this.onDragEnd);
      this.dragType = 'touch';
    } else {
      this.ownerDocument.addEventListener('mousemove', this.onMouseMove);
      this.ownerDocument.addEventListener('mouseup', this.onDragEnd);
      if ((event as MouseEvent).button === 2) {
        this.dragType = 'right';
      } else {
        this.dragType = 'left';
      }
    }
    this.waitingMove = true;
    this.listening = true;
  }

  // return true for a valid move
  checkFirstMove(e: AbstractPointerEvent) {
    let state = new DragManager.DragState(e, this, true);
    if (!state.moved()) {
      // not a move
      return false;
    }
    return this.executeFirstMove(state);
  }

  executeFirstMove(state: DragManager.DragState): boolean {
    let {onDragStartT} = this.props;

    this.waitingMove = false;
    onDragStartT(state);
    if (!DragManager.isDragging()) {
      this.onDragEnd();
      return false;
    }
    state._onMove();
    this.ownerDocument.addEventListener('keydown', this.onKeyDown);
    return true;
  }


  onMouseMove = (e: MouseEvent) => {
    let {onDragMoveT} = this.props;
    if (this.waitingMove) {
      if (DragManager.isDragging()) {
        this.onDragEnd();
        return;
      }
      if (!this.checkFirstMove(e)) {
        return;
      }
    } else {
      let state = new DragManager.DragState(e, this);
      state._onMove();
      if (onDragMoveT) {
        onDragMoveT(state);
      }
    }
    e.preventDefault();
  };

  onTouchMove = (e: TouchEvent) => {
    let {onDragMoveT} = this.props;
    if (this.waitingMove) {
      if (DragManager.isDragging()) {
        this.onDragEnd();
        return;
      }
      if (!this.checkFirstMove(e)) {
        return;
      }
    } else if (e.touches.length !== 1) {
      this.onDragEnd();
    } else {
      let state = new DragManager.DragState(e, this);
      state._onMove();
      if (onDragMoveT) {
        onDragMoveT(state);
      }
    }
    e.preventDefault();
  };

  onDragEnd = (e?: TouchEvent | MouseEvent) => {
    let {onDragEndT} = this.props;
    let state = new DragManager.DragState(e, this);

    this.removeListeners();

    if (!this.waitingMove) {
      // e=null means drag is canceled
      state._onDragEnd(e == null);
      if (onDragEndT) {
        onDragEndT(state);
      }
    }

    this.cleanupDrag(state);
  };

  addGestureListeners(event: TouchEvent) {
    this.ownerDocument.addEventListener('touchmove', this.onGestureMove);
    this.ownerDocument.addEventListener('touchend', this.onGestureEnd);
    this.ownerDocument.addEventListener('keydown', this.onKeyDown);
    this.gesturing = true;
    this.waitingMove = true;
  }

  onGestureStart(event: TouchEvent) {
    if (!DragManager.isDragging()) {
      // same pointer event shouldn't trigger 2 drag start
      return;
    }
    let {onGestureStartT} = this.props;


    this.baseX = event.touches[0].pageX;
    this.baseY = event.touches[0].pageY;
    this.baseX2 = event.touches[1].pageX;
    this.baseY2 = event.touches[1].pageY;
    let baseElement = this.element.parentElement;
    let rect = baseElement.getBoundingClientRect();
    this.scaleX = baseElement.offsetWidth / Math.round(rect.width);
    this.scaleY = baseElement.offsetHeight / Math.round(rect.height);
    this.baseDis = Math.sqrt(Math.pow(this.baseX - this.baseX2, 2) + Math.pow(this.baseY - this.baseY2, 2));
    this.baseAng = Math.atan2(this.baseY2 - this.baseY, this.baseX2 - this.baseX);

    let state = new GestureState(event, this, true);
    if (onGestureStartT(state)) {
      this.addGestureListeners(event);
      event.preventDefault();
    }
  }

  onGestureMove = (e: TouchEvent) => {
    let {onGestureMoveT, gestureSensitivity} = this.props;
    let state = new GestureState(e, this);
    if (this.waitingMove) {
      if (!(gestureSensitivity > 0)) {
        gestureSensitivity = 10; // default sensitivity
      }
      if (state.moved() > gestureSensitivity) {
        this.waitingMove = false;
      } else {
        return;
      }
    }
    if (onGestureMoveT) {
      onGestureMoveT(state);
    }
  };
  onGestureEnd = (e?: TouchEvent) => {
    let {onGestureEndT} = this.props;
    let state = new DragManager.DragState(e, this);

    this.removeListeners();
    if (onGestureEndT) {
      onGestureEndT();
    }
  };
  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.cancel();
    }
  };

  cancel() {
    if (this.listening) {
      this.onDragEnd();
    }
    if (this.gesturing) {
      this.onGestureEnd();
    }
  }

  removeListeners() {
    if (this.gesturing) {
      this.ownerDocument.removeEventListener('touchmove', this.onGestureMove);
      this.ownerDocument.removeEventListener('touchend', this.onGestureEnd);
    } else if (this.listening) {
      if (this.dragType === 'touch') {
        this.ownerDocument.removeEventListener('touchmove', this.onTouchMove);
        this.ownerDocument.removeEventListener('touchend', this.onDragEnd);
      } else {
        this.ownerDocument.removeEventListener('mousemove', this.onMouseMove);
        this.ownerDocument.removeEventListener('mouseup', this.onDragEnd);
      }
    }

    this.ownerDocument.removeEventListener('keydown', this.onKeyDown);
    this.listening = false;
    this.gesturing = false;
  }

  cleanupDrag(state: DragManager.DragState) {
    this.dragType = null;
    this.waitingMove = false;
  }

  render(): React.ReactNode {
    let {
      getRef, children, className,
      directDragT, onDragStartT, onDragMoveT, onDragEndT, onDragOverT, onDragLeaveT, onDropT,
      onGestureStartT, onGestureMoveT, onGestureEndT, useRightButtonDragT, extraData,
      ...others
    } = this.props;
    let onTouchDown = this.onPointerDown;
    let onMouseDown = this.onPointerDown;
    if (!onDragStartT) {
      onMouseDown = null;
      if (!onGestureStartT) {
        onTouchDown = null;
      }
    }
    if (onDragStartT || onGestureStartT) {
      if (className) {
        className = `${className} drag-initiator`;
      } else {
        className = 'drag-initiator';
      }
    }

    return (
      <div ref={this._getRef} className={className} {...others} onMouseDown={onMouseDown}
           onTouchStart={onTouchDown}>
        {children}
      </div>
    );
  }

  componentDidUpdate(prevProps: DragDropDivProps) {
    let {onDragOverT, onDragEndT, onDragLeaveT} = this.props;
    if (this.element
      && (
        prevProps.onDragOverT !== onDragOverT
        || prevProps.onDragLeaveT !== onDragLeaveT
        || prevProps.onDragEndT !== onDragEndT
      )
    ) {
      if (onDragOverT) {
        DragManager.addHandlers(this.element, this.props);
      } else {
        DragManager.removeHandlers(this.element);
      }
    }
  }

  componentWillUnmount(): void {
    let {onDragOverT} = this.props;
    if (this.element && onDragOverT) {
      DragManager.removeHandlers(this.element);
    }
    this.cancel();
  }
}

class DndDragDropDiv extends React.PureComponent<DndDragDropDivProps, any> {
  element: HTMLElement;

  static contextType = DockContextType;

  context!: DockContext;

  _getRef = (r: HTMLDivElement) => {
    let {getRef} = this.props;
    this.element = r;

    if (getRef) {
      getRef(r);
    }
  };

  componentDidUpdate(prevProps: Readonly<DndDragDropDivProps>, prevState: Readonly<any>, snapshot?: any) {
    if (prevProps.isOver === true && this.props.isOver === false) {
      if (this.props.onDragLeaveT) {
        const state = new DragManager.DragState(undefined, this as any);
        this.props.onDragLeaveT(state);
      }
    }
  }

  render(): React.ReactNode {
    let {
      getRef, children, className,
      directDragT, onDragStartT, onDragMoveT, onDragEndT, onDragOverT, onDragLeaveT, onDropT,
      onGestureStartT, onGestureMoveT, onGestureEndT, useRightButtonDragT, extraData,
      // drag props
      isDragging, connectDragSource,
      // drop props
      isOver, canDrop, connectDropTarget, isOverCurrent, itemType,
      // dnd spec props
      dndSpec,
      // dnd spec props
      externalData,
      ...others
    } = this.props;

    if (canDrag(this.props)) {
      if (className) {
        className = `${className} drag-initiator`;
      } else {
        className = 'drag-initiator';
      }
    }

    return (
      connectDragSource(
        connectDropTarget(
          <div ref={this._getRef} className={className} {...others}>
            {children}
          </div>
        )
      )
    );
  }
}

interface DragObject {
  baseX: number;
  baseY: number;
  element: HTMLElement;
  scaleX: number;
  scaleY: number;
  externalData?: any;
}

interface DropResult {
  state: DragManager.DragState;
  externalData?: any;
  dropOutside?: boolean;
}

const dropSpec: DropTargetSpec<DndDragDropDivProps, DragObject, DropResult> = {
  canDrop(props, monitor) {
    return true;
  },

  hover(props, monitor, component) {
    const state = createDragState(monitor, component);
    const dockId = component.context.getDockId();
    const tab: TabData | null = getTabByDockId(dockId);

    if (!tab && monitor.getItem().externalData) {
      const tab = monitor.getItem().externalData.tab.id ?
        monitor.getItem().externalData.tab :
        {id: uuid(), ...monitor.getItem().externalData.tab};
      state.setData({
        tab,
        panelSize: [400, 300]
      }, dockId);
    }

    if (props.onDragOverT) {
      props.onDragOverT(state);
    }
  },

  drop(props, monitor, component) {
    if (monitor.didDrop()) {
      return;
    }

    const currentDockId = component?.decoratedRef?.current?.context?.getDockId();
    const externalDockId = monitor?.getItem()?.externalData?.context?.getDockId();

    if (currentDockId && externalDockId && currentDockId !== externalDockId && props.onDropT) {
      const tab = monitor?.getItem()?.externalData?.tab;
      externalDockId.dockMove(tab, null, 'remove');
    }

    const state = createDragState(monitor, component);

    if (props.onDropT) {
      props.onDropT(state);

      if (props.dndSpec?.dropTargetSpec?.drop) {
        props.dndSpec.dropTargetSpec.drop(monitor, component);
      }
    }

    dragEnd();

    const result: DropResult = {state};

    if (props.externalData) {
      result.externalData = props.externalData;
    }

    return result;
  }
};

interface DragMonitor {
  getClientOffset(): XYCoord | null;

  getItem(): DragObject;
}

function createDragState(monitor: DragMonitor, component: any): DragManager.DragState {
  const clientOffset = monitor.getClientOffset();
  const state = new DragManager.DragState(undefined, component);

  if (!clientOffset) {
    return state;
  }

  state.clientX = clientOffset.x || 0;
  state.clientY = clientOffset.y || 0;
  state.pageX = clientOffset.x || 0;
  state.pageY = clientOffset.y || 0;
  state.dx = (state.pageX - monitor.getItem().baseX) * monitor.getItem().scaleX;
  state.dy = (state.pageY - monitor.getItem().baseY) * monitor.getItem().scaleY;

  return state;
}

function canDrag(props: DndDragDropDivProps): boolean {
  if (props.role === "tab" &&
    props.extraData?.parent?.parent?.mode === 'float' &&
    props.extraData?.parent?.tabs?.length === 1
  ) {
    return false;
  }

  return props.onDragStartT !== undefined || props.onGestureStartT !== undefined;
}

function dropCollect(connect: DropTargetConnector, monitor: DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({shallow: true}),
    canDrop: monitor.canDrop(),
    itemType: monitor.getItemType()
  };
}

const dragSpec: DragSourceSpec<DndDragDropDivProps, DragObject, DropResult> = {
  canDrag(props) {
    return canDrag(props);
  },

  isDragging(props, monitor) {
    return true;
  },

  beginDrag(props, monitor, component) {
    const clientOffset = monitor.getClientOffset();
    const state = new DragManager.DragState(undefined, component);

    if (props.onDragEndT) {
      props.onDragEndT(state);
    }

    dragEnd();

    if (props.onDragStartT) {
      props.onDragStartT(state);
    }

    const dockId = component.context.getDockId();
    const tab: TabData | null = getTabByDockId(dockId);

    let baseElement = component.element.parentElement;
    let rect = baseElement.getBoundingClientRect();

    const item: DragObject = {
      baseX: clientOffset.x,
      baseY: clientOffset.y,
      element: component.element,
      scaleX: baseElement.offsetWidth / Math.round(rect.width),
      scaleY: baseElement.offsetHeight / Math.round(rect.height),
    };

    if (tab) {
      item.externalData = {
        tab,
        context: component.context,
        extra: props.externalData
      };
    }

    return item;
  },

  endDrag(props, monitor, component) {
    const state = monitor.didDrop() && monitor.getDropResult()?.state ?
      monitor.getDropResult()!.state :
      createDragState(monitor, component);

    if (props.onDragMoveT && monitor.didDrop()) {
      props.onDragMoveT(state);
    }

    if (props.onDragEndT) {
      props.onDragEndT(state);
    }

    if (monitor.getDropResult()?.dropOutside) {
      const externalDockId = monitor.getItem()?.externalData?.context?.getDockId();

      if (externalDockId) {
        const tab = monitor.getItem()?.externalData.tab;
        externalDockId.dockMove(tab, null, 'remove');
      }
    }

    dragEnd();
  }
};

function dragCollect(connect: DragSourceConnector, monitor: DragSourceMonitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

const withDndSpec = <P extends {}>(WrappedComponent: React.ComponentType<P>) => {
  return (props: P & DndSpecProps) => {
    // @ts-ignore
    const {props: {defaultDndSpec}} = useContext(DockContextType);

    return (
      <WrappedComponent
        dndSpec={useMemo(() => defaultDndSpec, [])}
        {...props}
      />
    );
  };
};

const withExternalData = <P extends {}>(WrappedComponent: React.ComponentType<P>) => {
  return (props: P & ExternalDataProps) => {
    // @ts-ignore
    const {props: {externalData}} = useContext(DockContextType);

    return (
      <WrappedComponent
        externalData={externalData}
        {...props}
      />
    );
  };
};

const EnhancedDndDragDropDiv = withExternalData<DragDropDivProps>(withDndSpec(
  _.flow(
    DragSource(
      ({dndSpec}) => dndSpec?.dragSourceSpec?.itemType !== undefined ? dndSpec.dragSourceSpec.itemType : ITEM_TYPE_DEFAULT,
      dragSpec,
      dragCollect
    ),
    DropTarget(
      ({dndSpec}) => dndSpec?.dropTargetSpec?.itemType !== undefined ? dndSpec.dropTargetSpec.itemType : ITEM_TYPE_DEFAULT,
      dropSpec,
      dropCollect
    )
  )(DndDragDropDiv)
));

export { EnhancedDndDragDropDiv as DragDropDiv };
