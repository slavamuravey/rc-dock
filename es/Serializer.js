import { maximePlaceHolderId } from "./DockData";
function addPanelToCache(panelData, cache) {
    cache.panels.set(panelData.id, panelData);
    for (let tab of panelData.tabs) {
        cache.tabs.set(tab.id, tab);
    }
}
function addBoxToCache(boxData, cache) {
    for (let child of boxData.children) {
        if ('tabs' in child) {
            addPanelToCache(child, cache);
        }
        else if ('children' in child) {
            addBoxToCache(child, cache);
        }
    }
}
export function createLayoutCache(defaultLayout) {
    let cache = {
        panels: new Map(),
        tabs: new Map(),
    };
    if (defaultLayout) {
        if ('children' in defaultLayout) {
            // BoxData
            addBoxToCache(defaultLayout, cache);
        }
        else {
            // LayoutData
            if ('dockbox' in defaultLayout) {
                addBoxToCache(defaultLayout.dockbox, cache);
            }
            if ('floatbox' in defaultLayout) {
                addBoxToCache(defaultLayout.floatbox, cache);
            }
        }
    }
    return cache;
}
export function saveLayoutData(layout, saveTab, afterPanelSaved) {
    function saveTabData(tabData) {
        if (saveTab) {
            return saveTab(tabData);
        }
        return Object.assign({}, tabData);
    }
    function savePanelData(panelData) {
        let tabs = [];
        for (let tab of panelData.tabs) {
            let savedTab = saveTabData(tab);
            if (savedTab) {
                tabs.push(savedTab);
            }
        }
        let { id, size, activeId, collapsed, headerSize, preferredWidth, preferredHeight, ignorePreferredSize, group, localGroup, x, y, z, w, h, dockParent, panelIndex, tabIndex, tabPosition = "top" } = panelData;
        let savedPanel;
        if (panelData.parent.mode === 'float' || panelData.parent.mode === 'window') {
            savedPanel = { id, size, tabs, collapsed, headerSize, group, preferredWidth, preferredHeight, localGroup, ignorePreferredSize, tabPosition, activeId, x, y, z, w, h, dockParent, panelIndex, tabIndex };
        }
        else {
            let { needSetSize } = panelData;
            savedPanel = { id, size, tabs, collapsed, headerSize, group, preferredWidth, preferredHeight, localGroup, ignorePreferredSize, tabPosition, activeId, x, y, z, w, h, needSetSize, dockParent, panelIndex, tabIndex };
        }
        if (afterPanelSaved) {
            afterPanelSaved(savedPanel, panelData);
        }
        return savedPanel;
    }
    function saveBoxData(boxData) {
        let children = [];
        for (let child of boxData.children) {
            if ('tabs' in child) {
                children.push(savePanelData(child));
            }
            else if ('children' in child) {
                children.push(saveBoxData(child));
            }
        }
        let { id, size, preferredWidth, preferredHeight, ignorePreferredSize, mode } = boxData;
        return { id, size, preferredWidth, preferredHeight, ignorePreferredSize, mode, children };
    }
    return {
        dockbox: saveBoxData(layout.dockbox),
        floatbox: saveBoxData(layout.floatbox),
        windowbox: saveBoxData(layout.windowbox),
        maxbox: saveBoxData(layout.maxbox),
    };
}
export function loadLayoutData(savedLayout, defaultLayout, loadTab, afterPanelLoaded) {
    var _a, _b, _c;
    let cache = createLayoutCache(defaultLayout);
    function loadTabData(savedTab) {
        if (loadTab) {
            return loadTab(savedTab);
        }
        let { id } = savedTab;
        if (cache.tabs.has(id)) {
            return cache.tabs.get(id);
        }
        return null;
    }
    function loadPanelData(savedPanel) {
        let { id, size, activeId, x, y, z, w, h, collapsed, headerSize, preferredWidth, preferredHeight, ignorePreferredSize, group, localGroup, dockParent, panelIndex, tabIndex, needSetSize, tabPosition = "top" } = savedPanel;
        let tabs = [];
        for (let savedTab of savedPanel.tabs) {
            let tabData = loadTabData(savedTab);
            if (tabData) {
                tabs.push(tabData);
            }
        }
        let panelData;
        if (w || h || x || y || z) {
            panelData = { id, size, activeId, group, localGroup, tabPosition, collapsed, headerSize, preferredWidth, preferredHeight, ignorePreferredSize, x, y, z, w, h, tabs, dockParent, panelIndex, tabIndex };
        }
        else {
            panelData = { id, size, activeId, group, localGroup, tabPosition, collapsed, headerSize, preferredWidth, preferredHeight, ignorePreferredSize, tabs, needSetSize, dockParent, panelIndex, tabIndex };
        }
        if (savedPanel.id === maximePlaceHolderId) {
            panelData.panelLock = {};
        }
        else if (afterPanelLoaded) {
            afterPanelLoaded(savedPanel, panelData);
        }
        else if (cache.panels.has(id)) {
            panelData = Object.assign(Object.assign({}, cache.panels.get(id)), panelData);
        }
        return panelData;
    }
    function loadBoxData(savedBox) {
        if (!savedBox) {
            return null;
        }
        let children = [];
        for (let child of savedBox.children) {
            if ('tabs' in child) {
                children.push(loadPanelData(child));
            }
            else if ('children' in child) {
                children.push(loadBoxData(child));
            }
        }
        let { id, size, preferredWidth, preferredHeight, ignorePreferredSize, mode } = savedBox;
        return { id, size, preferredWidth, preferredHeight, ignorePreferredSize, mode, children };
    }
    return {
        dockbox: loadBoxData(savedLayout.dockbox),
        floatbox: loadBoxData((_a = savedLayout.floatbox) !== null && _a !== void 0 ? _a : { mode: 'float', children: [], size: 0 }),
        windowbox: loadBoxData((_b = savedLayout.windowbox) !== null && _b !== void 0 ? _b : { mode: 'window', children: [], size: 0 }),
        maxbox: loadBoxData((_c = savedLayout.maxbox) !== null && _c !== void 0 ? _c : { mode: 'maximize', children: [], size: 1 }),
    };
}
