
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

import angular from 'angular';


export default () => {
    const module = angular.module('waltz.user', []);

    module
        .config(require('./routes'));

    module
        .service('UserAgentInfoStore', require('./services/user-agent-info-store'))
        .service('UserService', require('./services/user-service'))
        .service('UserStore', require('./services/user-store'))
        .service('UserPreferenceStore', require('./services/user-preference-store'))
        .service('UserPreferenceService', require('./services/user-preference-service'));

    module
        .directive('waltzHasRole', require('./directives/has-role'))
        .directive('waltzUnlessRole', require('./directives/unless-role'))
        .directive('waltzIfAnonymous', require('./directives/if-anonymous'));

    return module.name;
};
