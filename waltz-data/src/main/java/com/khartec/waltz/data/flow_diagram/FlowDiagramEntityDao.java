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

package com.khartec.waltz.data.flow_diagram;

import com.khartec.waltz.data.EntityNameUtilities;
import com.khartec.waltz.model.EntityKind;
import com.khartec.waltz.model.EntityReference;
import com.khartec.waltz.model.flow_diagram.FlowDiagramEntity;
import com.khartec.waltz.model.flow_diagram.ImmutableFlowDiagramEntity;
import com.khartec.waltz.schema.tables.records.FlowDiagramEntityRecord;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.RecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.function.Function;

import static com.khartec.waltz.common.Checks.checkNotNull;
import static com.khartec.waltz.common.ListUtilities.newArrayList;
import static com.khartec.waltz.model.EntityReference.mkRef;
import static com.khartec.waltz.schema.tables.FlowDiagramEntity.FLOW_DIAGRAM_ENTITY;
import static java.util.stream.Collectors.toList;


@Repository
public class FlowDiagramEntityDao {

    private static Field<String> ENTITY_NAME_FIELD = EntityNameUtilities.mkEntityNameField(
            FLOW_DIAGRAM_ENTITY.ENTITY_ID,
            FLOW_DIAGRAM_ENTITY.ENTITY_KIND,
            newArrayList(EntityKind.APPLICATION, EntityKind.ACTOR));


    private static final RecordMapper<Record, FlowDiagramEntity> TO_DOMAIN_MAPPER = r -> {
        FlowDiagramEntityRecord record = r.into(FLOW_DIAGRAM_ENTITY);
        return ImmutableFlowDiagramEntity.builder()
                .diagramId(record.getDiagramId())
                .entityReference(mkRef(
                        EntityKind.valueOf(record.getEntityKind()),
                        record.getEntityId(),
                        r.getValue(ENTITY_NAME_FIELD)))
                .isNotable(record.getIsNotable())
                .build();
    };


    public static final Function<FlowDiagramEntity, FlowDiagramEntityRecord> TO_RECORD_MAPPER = fde -> {
        EntityReference entityRef = fde.entityReference();

        FlowDiagramEntityRecord record = new FlowDiagramEntityRecord();
        record.setDiagramId(fde.diagramId().get());
        record.setEntityId(entityRef.id());
        record.setEntityKind(entityRef.kind().name());
        record.setIsNotable(fde.isNotable());

        return record;
    };


    private final DSLContext dsl;


    @Autowired
    public FlowDiagramEntityDao(DSLContext dsl) {
        checkNotNull(dsl, "dsl cannot be null");
        this.dsl = dsl;
    }


    public List<FlowDiagramEntity> findForDiagram(long diagramId) {
        return dsl
                .select(FLOW_DIAGRAM_ENTITY.fields())
                .select(ENTITY_NAME_FIELD)
                .from(FLOW_DIAGRAM_ENTITY)
                .where(FLOW_DIAGRAM_ENTITY.DIAGRAM_ID.eq(diagramId))
                .fetch(TO_DOMAIN_MAPPER);
    }


    public List<FlowDiagramEntity> findForEntity(EntityReference ref) {
        return dsl
                .select(FLOW_DIAGRAM_ENTITY.fields())
                .select(ENTITY_NAME_FIELD)
                .from(FLOW_DIAGRAM_ENTITY)
                .where(FLOW_DIAGRAM_ENTITY.ENTITY_KIND.eq(ref.kind().name()))
                .and(FLOW_DIAGRAM_ENTITY.ENTITY_ID.eq(ref.id()))
                .fetch(TO_DOMAIN_MAPPER);
    }


    public int[] createEntities(List<FlowDiagramEntity> entities) {
        List<FlowDiagramEntityRecord> records = entities
                .stream()
                .map(TO_RECORD_MAPPER::apply)
                .collect(toList());

        return dsl.batchInsert(records)
                .execute();
    }


    public int deleteForDiagram(long diagramId) {
        return dsl.deleteFrom(FLOW_DIAGRAM_ENTITY)
                .where(FLOW_DIAGRAM_ENTITY.DIAGRAM_ID.eq(diagramId))
                .execute();
    }
}
