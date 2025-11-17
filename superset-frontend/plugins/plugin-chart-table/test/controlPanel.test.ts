/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { QueryMode } from '@superset-ui/core';
import config from '../src/controlPanel';

function getOrderDescVisibility() {
    const [querySection] = config.controlPanelSections;
    if (!querySection) {
        throw new Error('Query section missing from table control panel');
    }
    const orderDescControl = querySection.controlSetRows
        .flat()
        .find(control => control && control.name === 'order_desc');
    if (!orderDescControl) {
        throw new Error('order_desc control not found');
    }
    return orderDescControl.config.visibility!;
}

describe('plugin-chart-table control panel', () => {
    const visibility = getOrderDescVisibility();

    it('hides Sort Descending when no metric is selected', () => {
        expect(
            visibility({
                controls: {
                    query_mode: { value: QueryMode.Aggregate },
                    timeseries_limit_metric: { value: null },
                },
            } as any),
        ).toBe(false);
    });

    it('shows Sort Descending when a metric is selected in aggregate mode', () => {
        expect(
            visibility({
                controls: {
                    query_mode: { value: QueryMode.Aggregate },
                    timeseries_limit_metric: { value: 'metric_1' },
                },
            } as any),
        ).toBe(true);
    });

    it('keeps Sort Descending hidden in raw mode even when a metric exists', () => {
        expect(
            visibility({
                controls: {
                    query_mode: { value: QueryMode.Raw },
                    timeseries_limit_metric: { value: 'metric_1' },
                },
            } as any),
        ).toBe(false);
    });
});

