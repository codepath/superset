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
import { JsonModal, safeJsonObjectParse } from 'src/components/JsonModal';
import { t, safeHtmlSpan, escapeHtml, isProbablyHTML } from '@superset-ui/core';
import { NULL_STRING, CellDataType } from './useCellContentParser';

type CellParams = {
  cellData: CellDataType;
  columnKey: string;
};

type Params = CellParams & {
  allowHTML?: boolean;
  getCellContent?: (args: CellParams) => string;
};

export const renderResultCell = ({
  cellData,
  getCellContent,
  columnKey,
  allowHTML = true,
}: Params) => {
  const cellNode =
    getCellContent?.({ cellData, columnKey }) ?? String(cellData);
  if (cellData === null) {
    return <i className="text-muted">{NULL_STRING}</i>;
  }
  const jsonObject = safeJsonObjectParse(cellData);
  if (jsonObject) {
    return (
      <JsonModal
        modalTitle={t('Cell content')}
        jsonObject={jsonObject}
        jsonValue={cellData}
      />
    );
  }
  if (typeof cellData === 'string') {
    // For SQL Lab query results, always display strings as text (not as HTML)
    // Escape HTML entities so strings like '<div>test</div>' display correctly
    if (!allowHTML) {
      // When HTML is not allowed, always escape entities
      // Wrap in span and use dangerouslySetInnerHTML to ensure proper rendering
      return (
        <span dangerouslySetInnerHTML={{ __html: escapeHtml(cellNode) }} />
      );
    }
    // When HTML is allowed, check if it looks like HTML
    // If it does, escape it to display as text (SQL results should show actual values)
    // If it doesn't, use safeHtmlSpan for potential HTML rendering
    if (isProbablyHTML(cellNode)) {
      // Escape HTML-like strings to display them as literal text
      // Use dangerouslySetInnerHTML so the browser decodes the entities correctly
      return (
        <span dangerouslySetInnerHTML={{ __html: escapeHtml(cellNode) }} />
      );
    }
    return safeHtmlSpan(cellNode);
  }
  return cellNode;
};
