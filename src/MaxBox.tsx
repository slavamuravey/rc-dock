import React from "react";
import { BoxData, DockContext, DockContextType, PanelData } from "./DockData";
import {DockPanel} from "./DockPanel";
import classNames from "classnames";

interface Props {
  boxData: BoxData;
}

export class MaxBox extends React.PureComponent<Props, any> {
  static contextType = DockContextType;

  context!: DockContext;

  // a place holder panel data to be used during hide animation
  hidePanelData: PanelData;

  render(): React.ReactNode {
    let panelData = this.props.boxData.children[0] as PanelData;

    if (panelData) {
      this.hidePanelData = {...panelData, id: '', tabs: []};
      return (

        <div className={classNames("dock-box dock-mbox dock-mbox-show", this.context.getClassName())}>
          <DockPanel size={100} panelData={panelData}/>
        </div>
      );
    } else if (this.hidePanelData) {
      // use the hiden data only once, dont keep it for too long
      let hidePanelData = this.hidePanelData;
      this.hidePanelData = null;
      return (
        <div className={classNames("dock-box dock-mbox dock-mbox-hide", this.context.getClassName())}>
          <DockPanel size={100} panelData={hidePanelData}/>
        </div>
      );
    } else {
      return (
        <div className={classNames("dock-box dock-mbox dock-mbox-hide", this.context.getClassName())}/>
      );
    }
  }
}
