/*
 *  This file is part of Waltz.
 *
 *     Waltz is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     Waltz is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with Waltz.  If not, see <http://www.gnu.org/licenses/>.
 */

package com.khartec.waltz.web.endpoints.api;

import com.khartec.waltz.model.logical_flow.LogicalFlow;
import com.khartec.waltz.model.logical_flow.LogicalFlowStatistics;
import com.khartec.waltz.model.user.Role;
import com.khartec.waltz.service.logical_flow.LogicalFlowService;
import com.khartec.waltz.service.user.UserRoleService;
import com.khartec.waltz.web.DatumRoute;
import com.khartec.waltz.web.ListRoute;
import com.khartec.waltz.web.endpoints.Endpoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import spark.Request;
import spark.Response;

import java.io.IOException;

import static com.khartec.waltz.common.Checks.checkNotNull;
import static com.khartec.waltz.common.ListUtilities.newArrayList;
import static com.khartec.waltz.web.WebUtilities.*;
import static com.khartec.waltz.web.endpoints.EndpointUtilities.*;


@Service
public class LogicalFlowEndpoint implements Endpoint {

    private static final Logger LOG = LoggerFactory.getLogger(LogicalFlowEndpoint.class);
    private static final String BASE_URL = mkPath("api", "logical-flow");

    private final LogicalFlowService logicalFlowService;
    private final UserRoleService userRoleService;


    @Autowired
    public LogicalFlowEndpoint(LogicalFlowService logicalFlowService,
                               UserRoleService userRoleService) {
        checkNotNull(logicalFlowService, "logicalFlowService must not be null");
        checkNotNull(userRoleService, "userRoleService must not be null");

        this.logicalFlowService = logicalFlowService;
        this.userRoleService = userRoleService;
    }


    @Override
    public void register() {
        String findByEntityPath = mkPath(BASE_URL, "entity", ":kind", ":id");
        String findBySelectorPath = mkPath(BASE_URL, "selector");
        String findStatsPath = mkPath(BASE_URL, "stats");

        String removeFlowPath = mkPath(BASE_URL, ":id");
        String addFlowPath = mkPath(BASE_URL);

        ListRoute<LogicalFlow> getByEntityRef = (request, response)
                -> logicalFlowService.findByEntityReference(getEntityReference(request));

        ListRoute<LogicalFlow> findBySelectorRoute = (request, response)
                -> logicalFlowService.findBySelector(readIdSelectionOptionsFromBody(request));

        DatumRoute<LogicalFlowStatistics> findStatsRoute = (request, response)
                -> logicalFlowService.calculateStats(readIdSelectionOptionsFromBody(request));


        getForList(findByEntityPath, getByEntityRef);
        postForList(findBySelectorPath, findBySelectorRoute);

        postForDatum(findStatsPath, findStatsRoute);

        deleteForDatum(removeFlowPath, this::removeFlowRoute);
        postForDatum(addFlowPath, this::addFlowRoute);
    }


    private LogicalFlow addFlowRoute(Request request, Response response) throws IOException {
        ensureUserHasEditRights(request);

        LogicalFlow logicalFlow = readBody(request, LogicalFlow.class);
        String username = getUsername(request);

        if (logicalFlow.id().isPresent()) {
            LOG.warn("User: {}, ignoring attempt to add duplicate logical flow: {}", username, logicalFlow);
            return logicalFlow;
        }

        LOG.info("User: {}, adding new logical flow: {}", username, logicalFlow);
        LogicalFlow savedFlow = logicalFlowService.addFlow(logicalFlow);
        return savedFlow;
    }


    private int removeFlowRoute(Request request, Response response) {
        ensureUserHasEditRights(request);

        long flowId = getId(request);
        String username = getUsername(request);

        LOG.info("User: {} removing logical flow: {}", username, flowId);

        return logicalFlowService.removeFlows(newArrayList(flowId));
    }


    private void ensureUserHasEditRights(Request request) {
        requireRole(userRoleService, request, Role.LOGICAL_DATA_FLOW_EDITOR);
    }

}