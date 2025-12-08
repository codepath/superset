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
import { ReactNode } from 'react';
import { t, tn } from '@superset-ui/core';

import { ErrorMessageComponentProps } from './types';
import IssueCode from './IssueCode';
import ErrorAlert from './ErrorAlert';

interface DatabaseErrorExtra {
  owners?: string[];
  issue_codes?: {
    code: number;
    message: string;
  }[];
  engine_name: string | null;
  show_issue_info?: boolean;
  custom_doc_links?: Array<{ url: string; label: string }>;
}

function DatabaseErrorMessage({
  error,
  source,
  subtitle,
}: ErrorMessageComponentProps<DatabaseErrorExtra | null>) {
  const { extra, level, message } = error;

  const isVisualization = ['dashboard', 'explore'].includes(source || '');
  const [firstLine, ...remainingLines] = message.split('\n');
  const alertMessage = firstLine;
  const alertDescription =
    remainingLines.length > 0 ? remainingLines.join('\n') : null;

  // When show_issue_info is explicitly False, never show "See more" button
  // Check if show_issue_info is explicitly set to False
  const showIssueInfo = extra?.show_issue_info !== false;
  const hasIssueCodes =
    showIssueInfo && extra?.issue_codes && extra.issue_codes.length > 0;
  const hasOwners = isVisualization && extra?.owners && extra.owners.length > 0;
  const hasCustomDocLinks =
    extra?.custom_doc_links && extra.custom_doc_links.length > 0;
  // When show_issue_info is false, hide the "See more" button entirely
  // This must be false when show_issue_info is explicitly False, regardless of other content
  // If show_issue_info is False, hasDescriptionDetails must be false to hide "See more"
  const hasDescriptionDetails =
    showIssueInfo && (hasIssueCodes || hasOwners || hasCustomDocLinks);

  const body = extra && hasDescriptionDetails && (
    <>
      {hasIssueCodes && (
        <p>
          {t('This may be triggered by:')}
          <br />
          {extra.issue_codes!
            .map<ReactNode>(issueCode => (
              <IssueCode {...issueCode} key={issueCode.code} />
            ))
            .reduce((prev, curr) => [prev, <br />, curr])}
        </p>
      )}
      {hasOwners && (
        <>
          {hasIssueCodes && <br />}
          <p>
            {tn(
              'Please reach out to the Chart Owner for assistance.',
              'Please reach out to the Chart Owners for assistance.',
              extra.owners!.length,
            )}
          </p>
          <p>
            {tn(
              'Chart Owner: %s',
              'Chart Owners: %s',
              extra.owners!.length,
              extra.owners!.join(', '),
            )}
          </p>
        </>
      )}
      {hasCustomDocLinks && (
        <>
          {(hasIssueCodes || hasOwners) && <br />}
          <p>
            {t('For more information, see:')}
            <br />
            {extra.custom_doc_links!.map((link, index) => (
              <span key={link.url}>
                {index > 0 && <br />}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  {link.label}
                </a>
              </span>
            ))}
          </p>
        </>
      )}
    </>
  );

  // When show_issue_info is false, show custom doc links inline in description
  // instead of in the collapsible "See more" section
  const inlineCustomDocLinks =
    !showIssueInfo &&
    hasCustomDocLinks &&
    extra.custom_doc_links && (
      <>
        {alertDescription && <br />}
        <br />
        {t('For more information, see:')}
        <br />
        {extra.custom_doc_links.map((link, index) => (
          <span key={link.url}>
            {index > 0 && <br />}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline' }}
            >
              {link.label}
            </a>
          </span>
        ))}
      </>
    );

  const finalDescription =
    alertDescription || inlineCustomDocLinks
      ? (
          <>
            {alertDescription}
            {inlineCustomDocLinks}
          </>
        )
      : null;

  return (
    <ErrorAlert
      errorType={t('%s Error', extra?.engine_name || t('DB engine'))}
      message={alertMessage}
      description={finalDescription}
      type={level}
      descriptionDetails={hasDescriptionDetails && body ? body : undefined}
    />
  );
}

export default DatabaseErrorMessage;
