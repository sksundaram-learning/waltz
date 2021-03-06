/*
 *
 *  * Waltz - Enterprise Architecture
 *  * Copyright (C) 2017  Khartec Ltd.
 *  *
 *  * This program is free software: you can redistribute it and/or modify
 *  * it under the terms of the GNU Lesser General Public License as published by
 *  * the Free Software Foundation, either version 3 of the License, or
 *  * (at your option) any later version.
 *  *
 *  * This program is distributed in the hope that it will be useful,
 *  * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  * GNU Lesser General Public License for more details.
 *  *
 *  * You should have received a copy of the GNU Lesser General Public License
 *  * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

import _ from "lodash";
import {initialiseData} from "../../../common";


const bindings = {
    flowDiagrams: '<',
    flowDiagramEntities: '<',
    createDiagramCommands: '<',
    reload: '<',
};


const template = require('./flow-diagrams-panel.html');


const initialState = {
    flowDiagrams: [],
    flowDiagramEntities: [],
    diagrams: [],
    createDiagramCommands: () => ([]),
    reload: () => console.log('wfdp:reload - default (do nothing) handler'),
    visibility: {
        diagram: false,
        editor: false
    },
    selected: {
        diagram: null,
        node: null,
        flowBucket: null
    }
};


function toRef(d) {
    return {
        id: d.id,
        kind: d.kind,
        name: d.name
    };
}

function controller(
    $timeout,
    flowDiagramStateService,
    physicalFlowStore,
    physicalSpecificationStore)
{
    const vm = initialiseData(this, initialState);

    const showReadOnlyDiagram = () => {
        vm.visibility.diagram = true;
        vm.visibility.editor = false;
    };

    const showEditableDiagram = () => {
        vm.visibility.diagram = false;
        vm.visibility.editor = true;
    };

    const hideDiagram = () => {
        vm.visibility.diagram = false;
        vm.visibility.editor = false;
    };

    const clearSelections = () => {
        vm.selected.diagram = null;
        vm.selected.node = null;
        vm.selected.flowBucket = null;
    };

    const showNodeDetail = (d) => {
        $timeout(() => {
            vm.selected.node = d.data;
            vm.selected.flowBucket = null;
        }, 0);
    };

    const showFlowBucketDetail = (d) => {
        $timeout(() => {
            vm.selected.node = null;
            vm.selected.flowBucket = {
                flow: d.data,
                decorations: []
            };

            const state = flowDiagramStateService.getState();
            const decorations  = state.model.decorations[d.id];

            if (_.isEmpty(decorations)) {
                return;
            } else {
                const selector = {
                    entityReference: toRef(d.data),
                    scope: 'EXACT'
                };

                const tmp = { flows: [], specs: []};

                const flowPromise = physicalFlowStore
                    .findBySelector(selector)
                    .then(flows => tmp.flows = flows);

                const specPromise = physicalSpecificationStore
                    .findBySelector(selector)
                    .then(specs => tmp.specs = specs);

                flowPromise
                    .then(() => specPromise)
                    .then(() => {
                        const flowsById = _.keyBy(tmp.flows, 'id');
                        const specsById = _.keyBy(tmp.specs, 'id');

                        vm.selected.flowBucket.decorations = _
                            .chain(decorations)
                            .map(d => {
                                const flow = flowsById[d.data.id];
                                return flow
                                    ? { specification: specsById[flow.specificationId], flow }
                                    : null;
                            })
                            .reject(d => d === null)
                            .value();

                    });
            }
        }, 0);
    };

    vm.$onChanges = () => {
        if(vm.flowDiagrams && vm.flowDiagramEntities) {
            const flowEntitiesDiagramId = _.keyBy(vm.flowDiagramEntities, 'diagramId');
            vm.diagrams = _.map(
                vm.flowDiagrams,
                d => Object.assign(
                    {},
                    d,
                    { notable: flowEntitiesDiagramId[d.id].isNotable || false }));
        }
    };

    vm.onDiagramSelect = (diagram) => {
        showReadOnlyDiagram();
        clearSelections();
        vm.selected.diagram = diagram;
        flowDiagramStateService.reset()
        flowDiagramStateService
            .load(diagram.id)
            .then(() => console.log('loaded'))
    };

    vm.onDiagramDismiss = () => {
        hideDiagram();
        clearSelections();
        flowDiagramStateService.reset();
    };

    vm.contextMenus = {};

    vm.createDiagram = () => {
        flowDiagramStateService
            .reset();

        showEditableDiagram();

        flowDiagramStateService.processCommands(vm.createDiagramCommands() || []);
        setTimeout(() => flowDiagramStateService.processCommands([]), 0);
    };

    vm.editDiagram = () => {
        showEditableDiagram();
        flowDiagramStateService.processCommands([
            { command: 'SET_TITLE', payload: vm.selected.diagram.name }
        ]);
    };

    vm.dismissDiagramEditor = () => {
        hideDiagram();
        clearSelections();

        flowDiagramStateService
            .reset();
        vm.reload();
    };

    vm.clickHandlers = {
        node: showNodeDetail,
        flowBucket: showFlowBucketDetail
    };
}


controller.$inject = [
    '$timeout',
    'FlowDiagramStateService',
    'PhysicalFlowStore',
    'PhysicalSpecificationStore'
];


const component = {
    template,
    bindings,
    controller
};


export default component;