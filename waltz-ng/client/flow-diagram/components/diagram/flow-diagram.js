/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016  Khartec Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import _ from 'lodash';
import {select, event} from 'd3-selection';
import {drag} from 'd3-drag';
import {zoom} from 'd3-zoom';
import {initialiseData} from '../../../common';
import {mkLineWithArrowPath, responsivefy, wrapText} from '../../../common/d3-utils';
import {d3ContextMenu} from '../../../common/d3-context-menu';
import {toGraphId, toNodeShape, shapeFor, positionFor} from '../../flow-diagram-utils';


/**
 * @name waltz-flow-diagram
 *
 * @description
 * This component ...
 */


const bindings = {
    contextMenus: '<',
    clickHandlers: '<'
};


const initialState = {};


const DEFAULT_CONTEXT_MENUS = {
    annotation: null,
    canvas: null,
    flowBucket: null,
    node: null
};


const DEFAULT_CLICK_HANDLER = (d) => console.log('wfd: default on-click handler', d);


const DEFAULT_CLICK_HANDLERS  = {
    node: DEFAULT_CLICK_HANDLER,
    flowBucket: DEFAULT_CLICK_HANDLER
};


const template = require('./flow-diagram.html');


const styles = {
    ANNOTATION: 'wfd-annotation',
    ANNOTATIONS: 'wfd-annotations',
    FLOW: 'wfd-flow',
    FLOWS: 'wfd-flows',
    FLOW_ARROW: 'wfd-flow-arrow',
    FLOW_BUCKET: 'wfd-flow-bucket',
    FLOW_BUCKETS: 'wfd-flow-buckets',
    NODE: 'wfd-node',
    NODES: 'wfd-nodes',
    SUBJECT: 'wfd-subject',
    TITLE: 'wdf-title',
    TITLE_ICON: 'wdf-title-icon',
};


const dimensions = {
    svg: {
        w: 1100,
        h: 600
    },
    flowBucket: {
        r: 10
    },
    annotation: {
        circle: {
            r: 10
        },
        text: {
            w: 120
        }
    }
};


const groups = {
    svg: null,
    nodes: null,
    flows: null
};


const contextMenus = Object.assign({}, DEFAULT_CONTEXT_MENUS);
const clickHandlers = Object.assign({}, DEFAULT_CLICK_HANDLERS);


function drawNodeShape(selection, state) {
    return selection
        .attr('d', d => {
            const path = shapeFor(state, d).path
            return path;
        })
        .attr('stroke', '#ccc')
        .attr('fill', '#eee');
}


function dragStarted(d) {
    select(this)
        .raise()
        .classed("wfd-active", true);
}


function dragger(commandProcessor) {
    return (d) => {
        const cmd = {
            command: 'MOVE',
            payload: {id: d.id, dx: event.dx, dy: event.dy}
        };
        commandProcessor([cmd]);
    };
}


function dragEnded(d) {
    select(this)
        .classed("wfd-active", false);
}


function drawNodes(state, group, commandProcessor) {
    if (!group) return;

    const nodeElems = group
        .selectAll(`.${styles.NODE}`)
        .data(state.model.nodes || [], d => d.id);

    nodeElems
        .exit()
        .remove();

    const dragHandler = drag()
        .on("start", dragStarted)
        .on("drag", dragger(commandProcessor))
        .on("end", dragEnded);

    const contextMenu = contextMenus.node
        ? d3ContextMenu(contextMenus.node)
        : null;

    const clickHandler = (d) => {
        clickHandlers.node(d);
    };

    const newNodeElems = nodeElems
        .enter()
        .append('g')
        .classed(styles.NODE, true)
        .on('click.node', clickHandler)
        .on('contextmenu', contextMenu)
        .call(dragHandler);


    // position and setup drag and drop

    newNodeElems
        .merge(nodeElems)
        .attr('transform', d => {
            const position = positionFor(state, d);
            return `translate(${position.x}, ${position.y})`;
        });

    // draw shape

    newNodeElems
        .append('path');

    nodeElems
        .merge(newNodeElems)
        .selectAll('path')
        .call(drawNodeShape, state);

    // icon

    newNodeElems
        .append('text')
        .classed(styles.TITLE_ICON, true)
        .attr('font-family', 'FontAwesome')
        .text(d => shapeFor(state, d).icon);

    nodeElems
        .merge(newNodeElems)
        .selectAll(`.${styles.TITLE_ICON}`)
        .attr('dx', d => shapeFor(state, d).title.dx)
        .attr('dy', d => shapeFor(state, d).title.dy);

    // title

    newNodeElems
        .append('text')
        .classed(styles.TITLE, true)
        .attr('dx', d => shapeFor(state, d).title.dx + 14)
        .attr('dy', d => shapeFor(state, d).title.dy);

    nodeElems
        .merge(newNodeElems)
        .selectAll(`.${styles.TITLE}`)
        .text(d => d.data.name)
        .each(function(d) {
            // update shape to accommodate label
            const labelWidth = Math.max(this.getComputedTextLength() + 32, 60);
            state.layout.shapes[d.id] = toNodeShape(d.data, labelWidth);
        });
}


function drawFlows(state, group) {
    if (!group) return;

    const linkElems = group
        .selectAll(`.${styles.FLOW}`)
        .data(state.model.flows || [], d => d.id);

    linkElems
        .exit()
        .remove();

    const newLinkElems = linkElems
        .enter()
        .append('g')
        .classed(styles.FLOW, true);

    newLinkElems
        .append('path')
        .classed(styles.FLOW_ARROW, true);

    newLinkElems
        .merge(linkElems)
        .selectAll(`.${styles.FLOW_ARROW}`)
        .attr('d', d => {
            const sourcePos = positionFor(state, d.source);
            const targetPos = positionFor(state, d.target);

            const sourceShape = shapeFor(state, d.source);
            const targetShape = shapeFor(state, d.target);

            return mkLineWithArrowPath(
                sourcePos.x + sourceShape.cx,
                sourcePos.y + sourceShape.cy,
                targetPos.x + targetShape.cx,
                targetPos.y + targetShape.cy,
                1.3 /* arrow in center */);
        });
}


function drawFlowBuckets(state, group) {
    if (! group) return;

    const relevantFlows = _.filter(
        state.model.flows || [],
        f => f.data.kind === 'LOGICAL_DATA_FLOW');

    const bucketElems = group
        .selectAll(`.${styles.FLOW_BUCKET}`)
        .data(relevantFlows, f => f.id);

    bucketElems
        .exit()
        .remove();

    const newBucketElems = bucketElems
        .enter()
        .append('g')
        .classed(styles.FLOW_BUCKET, true)
        .on('contextmenu', contextMenus.flowBucket
            ? d3ContextMenu(contextMenus.flowBucket)
            : null)
        .on('click.flowBucket', clickHandlers.flowBucket);

    newBucketElems
        .append('circle');

    const newBucketTextElems = newBucketElems
        .append('text')
        .classed('fa-fw', true)
        .attr('font-family', 'FontAwesome')
        .attr('dx', -6)
        .attr('dy', 5);

    newBucketElems
        .merge(bucketElems)
        .attr('transform', d => {
            // position buckets near center of line
            const p = determineBucketPosition(state, d);
            return `translate(${p.x},${p.y})`;
        })
        .selectAll('circle')
        .attr('r', d => _.size(state.model.decorations[d.id]) > 0
            ? dimensions.flowBucket.r * 1.5
            : dimensions.flowBucket.r );


    group
        .selectAll('text')
        .merge(newBucketTextElems)
        .text(d => {
            const decorationCount = _.size(state.model.decorations[d.id]);
            if (decorationCount === 0) {
                return "\uf29c"; // question
            } else if (decorationCount === 1) {
                return "\uf016"; // one
            } else {
                return "\uf0c5"; // many
            }
        });
}


function determineBucketPosition(state, flow) {
    const sourcePos = positionFor(state, flow.source);
    const targetPos = positionFor(state, flow.target);

    const sourceShape = shapeFor(state, flow.source);
    const targetShape = shapeFor(state, flow.target);

    const sx = sourcePos.x + sourceShape.cx;
    const sy = sourcePos.y + sourceShape.cy;
    const tx = targetPos.x + targetShape.cx;
    const ty = targetPos.y + targetShape.cy;

    const dx = tx - sx;
    const dy = ty - sy;

    const cx = sx + (dx / 1.8);
    const cy = sy + (dy / 1.8);

    return {
        x: cx, y: cy
    };
}


function drawAnnotations(state, group, commandProcessor) {
    if (!group) return;

    const annotationElems = group
        .selectAll(`.${styles.ANNOTATION}`)
        .data(state.model.annotations || [], d => d.id);

    const newAnnotationElems = annotationElems
        .enter()
        .append('g')
        .classed(styles.ANNOTATION, true)
        .on('contextmenu', contextMenus.annotation
            ? d3ContextMenu(contextMenus.annotation)
            : null);

    annotationElems
        .exit()
        .remove();

    // line
    newAnnotationElems
        .append('path');

    const allLines = annotationElems
        .merge(newAnnotationElems)
        .selectAll('path');

    const determineAnnotationGeometry = (state, d) => {
        const ref = d.data.entityReference;
        if (ref.kind === 'LOGICAL_DATA_FLOW') {
            const flowId = toGraphId(ref);
            const flow = _.find(state.model.flows, { id: flowId });
            return {
                subjectPosition: determineBucketPosition(state, flow),
                subjectShape: { cx: 0, cy: 0},
                annotationPosition: positionFor(state, d.id)
            };
        } else {
            const subjectPosition = positionFor(state, toGraphId(ref));
            const subjectShape = shapeFor(state, toGraphId(ref));
            const annotationPosition = positionFor(state, d.id);
            return { subjectPosition, subjectShape, annotationPosition };
        }
    };

    allLines
        .attr('d', d => {
            const p = determineAnnotationGeometry(state, d);
            const bar = dimensions.annotation.text.w * (p.annotationPosition.x > 0 ? 1 : -1);
            const sx = p.subjectPosition.x + p.subjectShape.cx;
            const sy = p.subjectPosition.y + p.subjectShape.cy;
            return `
                M${sx},${sy}
                l${p.annotationPosition.x},${p.annotationPosition.y}
                l${bar},0
            `;
        });

    // joint
    newAnnotationElems
        .append('circle')
        .attr('draggy', 10)
        .call(drag()
            .on("start", dragStarted)
            .on("drag", dragger(commandProcessor))
            .on("end", dragEnded));

    annotationElems
        .merge(newAnnotationElems)
        .selectAll('circle')
        .attr('r', dimensions.annotation.circle.r)
        .each(function(d) {
            const p = determineAnnotationGeometry(state, d);
            const cx = p.subjectPosition.x + p.annotationPosition.x + p.subjectShape.cx;
            const cy = p.subjectPosition.y + p.annotationPosition.y + p.subjectShape.cy;
            select(this)
                .attr('cx', cx)
                .attr('cy', cy);
        });

    // text
    newAnnotationElems
        .append('text');

    annotationElems
        .merge(newAnnotationElems)
        .selectAll('text')
        .each(function(d) {
            const p = determineAnnotationGeometry(state, d);
            const bar = p.annotationPosition.x > 0 ? 10 : dimensions.annotation.text.w * -1;
            const x = p.subjectPosition.x + p.annotationPosition.x + bar + p.subjectShape.cx;
            const y = p.subjectPosition.y + p.annotationPosition.y + 18;
            select(this)
                .attr('transform', `translate(${x}, ${y})`);
        })
        .text(d => d.data.note)
        .call(wrapText, dimensions.annotation.text.w - 5);
}


function draw(state, commandProcessor = () => console.log('no command processor given')) {
    //console.log('draw', state);

    if (state.layout.diagramTransform) {
        groups
            .container
            .attr("transform", state.layout.diagramTransform);
    }

    drawNodes(state, groups.nodes, commandProcessor);
    drawFlows(state, groups.flows, commandProcessor);
    drawFlowBuckets(state, groups.flowBuckets, commandProcessor);
    drawAnnotations(state, groups.annotations, commandProcessor);
}


function prepareGroups(holder) {
    const svg = select(holder)
        .append('svg')
        .attr("width", dimensions.svg.w)
        .attr("height", dimensions.svg.h)
        .attr('viewBox', `0 0 ${dimensions.svg.w} ${dimensions.svg.h}`);

    const container = svg
        .append('g')
        .attr('transform', 'translate(0,0) scale(1)');

    const annotations = container
        .append("g")
        .classed(styles.ANNOTATIONS, true);

    const flows = container
        .append('g')
        .classed(styles.FLOWS, true);

    const flowBuckets = container
        .append('g')
        .classed(styles.FLOW_BUCKETS, true);

    const nodes = container
        .append('g')
        .classed(styles.NODES, true);

    return {
        svg,
        container,
        annotations,
        flows,
        flowBuckets,
        nodes
    };
}


/**
 * Pan and zoom only enabled if ctrl or meta key is held down.
 * @param commandProcessor
 */
function setupPanAndZoom(commandProcessor) {
    function zoomed() {
        const t = event.transform;
        commandProcessor([{ command: 'TRANSFORM_DIAGRAM', payload: t }]);
    }

    const myZoom = zoom()
        .scaleExtent([1 / 4, 2])
        .on("zoom", zoomed);


    select('body').on('keyup.zoom', () => {
        groups.svg
            .on('.zoom', null);
    });

    select('body').on('keydown.zoom', () => {
        const active = event.metaKey || event.ctrlKey;
        if (active) {
            groups.svg
                .call(myZoom)
                .on('dblclick.zoom', null);
        }
    });
}



function controller($element, flowDiagramStateService) {
    const vm = this;
    let destroyResizeListener = null;

    vm.$onInit = () => {
        initialiseData(vm, initialState);
        const holder = $element.find('div')[0];
        Object.assign(groups, prepareGroups(holder));

        groups
            .svg
            .on('contextmenu', contextMenus.canvas
                ? d3ContextMenu(contextMenus.canvas)
                : null);

        destroyResizeListener = responsivefy(groups.svg);

        setupPanAndZoom(flowDiagramStateService.processCommands);

        vm.$onChanges();
    };

    flowDiagramStateService.onChange(() => draw(
        flowDiagramStateService.getState(),
        flowDiagramStateService.processCommands));

    vm.$onChanges = (c) => {
        Object.assign(contextMenus, DEFAULT_CONTEXT_MENUS, vm.contextMenus || {});
        Object.assign(clickHandlers, DEFAULT_CLICK_HANDLERS, vm.clickHandlers || {});
        draw(
            flowDiagramStateService.getState(),
            flowDiagramStateService.processCommands);
    };

    vm.$onDestroy = () => {
        destroyResizeListener();
    };
}


controller.$inject = [
    '$element',
    'FlowDiagramStateService'
];


const component = {
    template,
    bindings,
    controller
};



export default component;