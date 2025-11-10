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
import { t, styled } from '@superset-ui/core';
import { ReactNode } from 'react';
import Modal from 'src/components/Modal';
import Button from 'src/components/Button';

const DescriptionContainer = styled.div`
  line-height: ${({ theme }) => theme.gridUnit * 4}px;
  padding-top: ${({ theme }) => theme.gridUnit * 2}px;
`;

interface UnsavedChangesModalProps {
  description?: ReactNode;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  show: boolean;
  title?: ReactNode;
  primaryButtonLoading?: boolean;
}

export default function UnsavedChangesModal({
  description,
  onSave,
  onDiscard,
  onCancel,
  show,
  title,
  primaryButtonLoading = false,
}: UnsavedChangesModalProps) {
  const defaultTitle = t('Unsaved changes');
  const defaultDescription = t(
    'You have unsaved changes. What would you like to do?',
  );

  const customFooter = (
    <>
      <Button
        key="discard"
        onClick={onDiscard}
        buttonStyle="default"
        data-test="unsaved-changes-modal-discard-button"
      >
        {t('Discard')}
      </Button>
      <Button
        key="cancel"
        onClick={onCancel}
        buttonStyle="default"
        data-test="unsaved-changes-modal-cancel-button"
      >
        {t('Cancel')}
      </Button>
      <Button
        key="save"
        onClick={onSave}
        buttonStyle="primary"
        loading={primaryButtonLoading}
        data-test="unsaved-changes-modal-save-button"
      >
        {t('Save')}
      </Button>
    </>
  );

  return (
    <Modal
      onHide={onCancel}
      show={show}
      title={title || defaultTitle}
      footer={customFooter}
      hideFooter={false}
      centered
      maskClosable={false}
    >
      <DescriptionContainer>
        {description || defaultDescription}
      </DescriptionContainer>
    </Modal>
  );
}


