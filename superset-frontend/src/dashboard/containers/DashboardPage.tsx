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
import { createContext, lazy, FC, useEffect, useMemo, useRef, useState } from 'react';
import { Global } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { t, useTheme } from '@superset-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import Loading from 'src/components/Loading';
import UnsavedChangesModal from 'src/components/UnsavedChangesModal';
import {
  useDashboard,
  useDashboardCharts,
  useDashboardDatasets,
} from 'src/hooks/apiResources';
import { hydrateDashboard } from 'src/dashboard/actions/hydrate';
import { setDatasources } from 'src/dashboard/actions/datasources';
import injectCustomCss from 'src/dashboard/util/injectCustomCss';
import {
  getAllActiveFilters,
  getRelevantDataMask,
} from 'src/dashboard/util/activeAllDashboardFilters';
import { getActiveFilters } from 'src/dashboard/util/activeDashboardFilters';
import { LocalStorageKeys, setItem } from 'src/utils/localStorageHelpers';
import { URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import {
  setDatasetsStatus,
  saveDashboardRequest,
  setUnsavedChanges,
} from 'src/dashboard/actions/dashboardState';
import {
  getFilterValue,
  getPermalinkValue,
} from 'src/dashboard/components/nativeFilters/FilterBar/keyValue';
import DashboardContainer from 'src/dashboard/containers/Dashboard';
import { SAVE_TYPE_OVERWRITE, DASHBOARD_HEADER_ID } from 'src/dashboard/util/constants';

import { nanoid } from 'nanoid';
import { RootState } from '../types';
import {
  chartContextMenuStyles,
  filterCardPopoverStyle,
  focusStyle,
  headerStyles,
  chartHeaderStyles,
} from '../styles';
import SyncDashboardState, {
  getDashboardContextLocalStorage,
} from '../components/SyncDashboardState';

export const DashboardPageIdContext = createContext('');

const DashboardBuilder = lazy(
  () =>
    import(
      /* webpackChunkName: "DashboardContainer" */
      /* webpackPreload: true */
      'src/dashboard/components/DashboardBuilder/DashboardBuilder'
    ),
);

const originalDocumentTitle = document.title;

type PageProps = {
  idOrSlug: string;
};

// TODO: move to Dashboard.jsx when it's refactored to functional component
const selectRelevantDatamask = createSelector(
  (state: RootState) => state.dataMask, // the first argument accesses relevant data from global state
  dataMask => getRelevantDataMask(dataMask, 'ownState'), // the second parameter conducts the transformation
);

const selectChartConfiguration = (state: RootState) =>
  state.dashboardInfo.metadata?.chart_configuration;
const selectNativeFilters = (state: RootState) => state.nativeFilters.filters;
const selectDataMask = (state: RootState) => state.dataMask;
const selectAllSliceIds = (state: RootState) => state.dashboardState.sliceIds;
// TODO: move to Dashboard.jsx when it's refactored to functional component
const selectActiveFilters = createSelector(
  [
    selectChartConfiguration,
    selectNativeFilters,
    selectDataMask,
    selectAllSliceIds,
  ],
  (chartConfiguration, nativeFilters, dataMask, allSliceIds) => ({
    ...getActiveFilters(),
    ...getAllActiveFilters({
      // eslint-disable-next-line camelcase
      chartConfiguration,
      nativeFilters,
      dataMask,
      allSliceIds,
    }),
  }),
);

export const DashboardPage: FC<PageProps> = ({ idOrSlug }: PageProps) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const history = useHistory();
  const dashboardPageId = useMemo(() => nanoid(), []);
  const hasDashboardInfoInitiated = useSelector<RootState, Boolean>(
    ({ dashboardInfo }) =>
      dashboardInfo && Object.keys(dashboardInfo).length > 0,
  );
  const { addDangerToast } = useToasts();
  const { result: dashboard, error: dashboardApiError } =
    useDashboard(idOrSlug);
  const { result: charts, error: chartsApiError } =
    useDashboardCharts(idOrSlug);
  const {
    result: datasets,
    error: datasetsApiError,
    status,
  } = useDashboardDatasets(idOrSlug);
  const isDashboardHydrated = useRef(false);

  const error = dashboardApiError || chartsApiError;
  const readyToRender = Boolean(dashboard && charts);
  const { dashboard_title, css, id = 0 } = dashboard || {};

  useEffect(() => {
    // mark tab id as redundant when user closes browser tab - a new id will be
    // generated next time user opens a dashboard and the old one won't be reused
    const handleTabClose = () => {
      const dashboardsContexts = getDashboardContextLocalStorage();
      setItem(LocalStorageKeys.DashboardExploreContext, {
        ...dashboardsContexts,
        [dashboardPageId]: {
          ...dashboardsContexts[dashboardPageId],
          isRedundant: true,
        },
      });
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [dashboardPageId]);

  useEffect(() => {
    dispatch(setDatasetsStatus(status));
  }, [dispatch, status]);

  useEffect(() => {
    // eslint-disable-next-line consistent-return
    async function getDataMaskApplied() {
      const permalinkKey = getUrlParam(URL_PARAMS.permalinkKey);
      const nativeFilterKeyValue = getUrlParam(URL_PARAMS.nativeFiltersKey);
      const isOldRison = getUrlParam(URL_PARAMS.nativeFilters);

      let dataMask = nativeFilterKeyValue || {};
      // activeTabs is initialized with undefined so that it doesn't override
      // the currently stored value when hydrating
      let activeTabs: string[] | undefined;
      if (permalinkKey) {
        const permalinkValue = await getPermalinkValue(permalinkKey);
        if (permalinkValue) {
          ({ dataMask, activeTabs } = permalinkValue.state);
        }
      } else if (nativeFilterKeyValue) {
        dataMask = await getFilterValue(id, nativeFilterKeyValue);
      }
      if (isOldRison) {
        dataMask = isOldRison;
      }

      if (readyToRender) {
        if (!isDashboardHydrated.current) {
          isDashboardHydrated.current = true;
        }
        dispatch(
          hydrateDashboard({
            history,
            dashboard,
            charts,
            activeTabs,
            dataMask,
          }),
        );
      }
      return null;
    }
    if (id) getDataMaskApplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToRender]);

  useEffect(() => {
    if (dashboard_title) {
      document.title = dashboard_title;
    }
    return () => {
      document.title = originalDocumentTitle;
    };
  }, [dashboard_title]);

  useEffect(() => {
    if (typeof css === 'string') {
      // returning will clean up custom css
      // when dashboard unmounts or changes
      return injectCustomCss(css);
    }
    return () => { };
  }, [css]);

  useEffect(() => {
    if (datasetsApiError) {
      addDangerToast(
        t('Error loading chart datasources. Filters may not work correctly.'),
      );
    } else {
      dispatch(setDatasources(datasets));
    }
  }, [addDangerToast, datasets, datasetsApiError, dispatch]);

  const relevantDataMask = useSelector(selectRelevantDatamask);
  const activeFilters = useSelector(selectActiveFilters);

  // Navigation blocking for unsaved changes
  const hasUnsavedChanges = useSelector<RootState, boolean>(
    state => !!state.dashboardState.hasUnsavedChanges,
  );
  const editMode = useSelector<RootState, boolean>(
    state => !!state.dashboardState.editMode,
  );
  const dashboardInfo = useSelector<RootState, any>(
    state => state.dashboardInfo,
  );
  const layout = useSelector<RootState, any>(
    state => state.dashboardLayout.present,
  );
  const dashboardState = useSelector<RootState, any>(
    state => state.dashboardState,
  );

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const unblockRef = useRef<(() => void) | null>(null);

  // Set up navigation blocking
  useEffect(() => {
    if (editMode && hasUnsavedChanges) {
      // Block navigation when in edit mode with unsaved changes
      // history.block() returns an unblock function
      unblockRef.current = history.block((location, action) => {
        // Only block if navigating to a different route
        if (location.pathname !== history.location.pathname) {
          setPendingNavigation(location.pathname);
          setShowUnsavedModal(true);
          // Return false to prevent navigation (this prevents browser prompt)
          // We'll handle navigation manually via our modal
          return '';
        }
        // Allow navigation within the same route (e.g., hash changes)
        return true;
      });
    } else {
      // Unblock navigation when not in edit mode or no unsaved changes
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
    }

    return () => {
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
    };
  }, [editMode, hasUnsavedChanges, history]);

  // Handle Save action
  const handleSave = useMemo(
    () => () => {
      if (!dashboardInfo?.id) {
        return;
      }

      setIsSaving(true);
      const currentColorNamespace =
        dashboardInfo?.metadata?.color_namespace ||
        dashboardState.colorNamespace;
      const currentColorScheme =
        dashboardInfo?.metadata?.color_scheme || dashboardState.colorScheme;
      const dashboardTitle =
        layout[DASHBOARD_HEADER_ID]?.meta?.text || dashboardInfo.dashboard_title;

      const data = {
        certified_by: dashboardInfo.certified_by,
        certification_details: dashboardInfo.certification_details,
        css: dashboardState.css || '',
        dashboard_title: dashboardTitle,
        last_modified_time: dashboardInfo.last_modified_time,
        owners: dashboardInfo.owners,
        roles: dashboardInfo.roles,
        slug: dashboardInfo.slug,
        metadata: {
          ...dashboardInfo?.metadata,
          color_namespace: currentColorNamespace,
          color_scheme: currentColorScheme,
          positions: layout,
          refresh_frequency: dashboardState.shouldPersistRefreshFrequency
            ? dashboardState.refreshFrequency
            : dashboardInfo.metadata?.refresh_frequency,
        },
      };

      // Temporarily unblock to allow navigation after save
      const currentUnblock = unblockRef.current;
      if (currentUnblock) {
        currentUnblock();
        unblockRef.current = null;
      }

      dispatch(
        saveDashboardRequest(data, dashboardInfo.id, SAVE_TYPE_OVERWRITE),
      )
        .then(() => {
          setIsSaving(false);
          setShowUnsavedModal(false);
          // Proceed with navigation after save
          const navPath = pendingNavigation;
          setPendingNavigation(null);
          if (navPath) {
            history.push(navPath);
          }
        })
        .catch(() => {
          // Save failed or requires confirmation - keep modal open
          setIsSaving(false);
          // Don't navigate if save failed
        });
    },
    [dashboardInfo, layout, dashboardState, dispatch, history, pendingNavigation],
  );

  // Handle Discard action
  const handleDiscard = useMemo(
    () => () => {
      // Temporarily unblock to allow navigation
      const currentUnblock = unblockRef.current;
      if (currentUnblock) {
        currentUnblock();
        unblockRef.current = null;
      }

      // Clear unsaved changes flag
      dispatch(setUnsavedChanges(false));
      setShowUnsavedModal(false);
      // Proceed with navigation
      const navPath = pendingNavigation;
      setPendingNavigation(null);
      if (navPath) {
        history.push(navPath);
      }
    },
    [dispatch, history, pendingNavigation],
  );

  // Handle Cancel action
  const handleCancel = useMemo(
    () => () => {
      setShowUnsavedModal(false);
      setPendingNavigation(null);
    },
    [],
  );

  if (error) throw error; // caught in error boundary

  const globalStyles = useMemo(
    () => [
      filterCardPopoverStyle(theme),
      headerStyles(theme),
      chartContextMenuStyles(theme),
      focusStyle(theme),
      chartHeaderStyles(theme),
    ],
    [theme],
  );

  if (error) throw error; // caught in error boundary

  const DashboardBuilderComponent = useMemo(() => <DashboardBuilder />, []);
  return (
    <>
      <Global styles={globalStyles} />
      {readyToRender && hasDashboardInfoInitiated ? (
        <>
          <SyncDashboardState dashboardPageId={dashboardPageId} />
          <DashboardPageIdContext.Provider value={dashboardPageId}>
            <DashboardContainer
              activeFilters={activeFilters}
              ownDataCharts={relevantDataMask}
            >
              {DashboardBuilderComponent}
            </DashboardContainer>
          </DashboardPageIdContext.Provider>
          <UnsavedChangesModal
            show={showUnsavedModal}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onCancel={handleCancel}
            primaryButtonLoading={isSaving}
          />
        </>
      ) : (
        <Loading />
      )}
    </>
  );
};

export default DashboardPage;
