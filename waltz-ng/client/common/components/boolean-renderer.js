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
import {initialiseData} from "../../common";
import {strToBool} from "../bool-utils";


const bindings = {
    value: '<'
};


const template = `<waltz-icon ng-if="$ctrl.booleanValue === true" name="check" class="text-success"></waltz-icon>
                  <waltz-icon ng-if="$ctrl.booleanValue === false" name="times" class="text-danger"></waltz-icon>
                  <span ng-if="$ctrl.booleanValue == null" class="text-muted">-</span>`;


const initialState = {
    booleanValue: null
};


function controller() {
    const vm = initialiseData(this, initialState);

    vm.$onChanges = (changes) => {
        if (vm.value === true || strToBool(vm.value) === true) {
            vm.booleanValue = true;
        } else if (vm.value === false || strToBool(vm.value) === false) {
            vm.booleanValue = false;
        } else {
            vm.booleanValue = null;
        }
    };
}


controller.$inject = [];


const component = {
    bindings,
    template,
    controller
};


export default component;