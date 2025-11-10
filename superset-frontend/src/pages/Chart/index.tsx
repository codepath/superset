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
import { useEffect, useRef, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { isEqual, omit } from 'lodash';
import {
  getLabelsColorMap,
  isDefined,
  JsonObject,
  makeApi,
  LabelsColorMapSource,
  t,
  getClientErrorObject,
} from '@superset-ui/core';
import Loading from 'src/components/Loading';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { getUrlParam } from 'src/utils/urlUtils';
import { URL_PARAMS } from 'src/constants';
import getFormDataWithExtraFilters from 'src/dashboard/util/charts/getFormDataWithExtraFilters';
import { getAppliedFilterValues } from 'src/dashboard/util/activeDashboardFilters';
import { getParsedExploreURLParams } from 'src/explore/exploreUtils/getParsedExploreURLParams';
import { hydrateExplore } from 'src/explore/actions/hydrateExplore';
import ExploreViewContainer from 'src/explore/components/ExploreViewContainer';
import { ExploreResponsePayload, SaveActionType, ExplorePageState } from 'src/explore/types';
import { fallbackExploreInitialData } from 'src/explore/fixtures';
import { getItem, LocalStorageKeys } from 'src/utils/localStorageHelpers';
import { getFormDataWithDashboardContext } from 'src/explore/controlUtils/getFormDataWithDashboardContext';
import { getFormDataFromControls } from 'src/explore/controlUtils';
import { QUERY_MODE_REQUISITES } from 'src/explore/constants';
import { mergeExtraFormData } from 'src/dashboard/components/nativeFilters/utils';
import UnsavedChangesModal from 'src/components/UnsavedChangesModal';
import * as saveModalActions from 'src/explore/actions/saveModalActions';
import { Location } from 'history';

const isValidResult = (rv: JsonObject): boolean =>
  rv?.result?.form_data && rv?.result?.dataset;

const hasDatasetId = (rv: JsonObject): boolean =>
  isDefined(rv?.result?.dataset?.id);

const fetchExploreData = async (exploreUrlParams: URLSearchParams) => {
  try {
    const rv = await makeApi<{}, ExploreResponsePayload>({
      method: 'GET',
      endpoint: 'api/v1/explore/',
    })(exploreUrlParams);
    if (isValidResult(rv)) {
      if (hasDatasetId(rv)) {
        return rv;
      }
      // Since there's no dataset id but the API responded with a valid payload,
      // we assume the dataset was deleted, so we preserve some values from previous
      // state so if the user decide to swap the datasource, the chart config remains
      fallbackExploreInitialData.form_data = {
        ...rv.result.form_data,
        ...fallbackExploreInitialData.form_data,
      };
      if (rv.result?.slice) {
        fallbackExploreInitialData.slice = rv.result.slice;
      }
    }
    let message = t('Failed to load chart data');
    const responseError = rv?.result?.message;
    if (responseError) {
      message = `${message}:\n${responseError}`;
    }
    throw new Error(message);
  } catch (err) {
    // todo: encapsulate the error handler
    const clientError = await getClientErrorObject(err);
    throw new Error(
      clientError.message ||
      clientError.error ||
      t('Failed to load chart data.'),
    );
  }
};

const getDashboardPageContext = (pageId?: string | null) => {
  if (!pageId) {
    return null;
  }
  return getItem(LocalStorageKeys.DashboardExploreContext, {})[pageId] || null;
};

const getDashboardContextFormData = () => {
  const dashboardPageId = getUrlParam(URL_PARAMS.dashboardPageId);
  const dashboardContext = getDashboardPageContext(dashboardPageId);
  if (dashboardContext) {
    const sliceId = getUrlParam(URL_PARAMS.sliceId) || 0;
    const {
      colorScheme,
      labelsColor,
      labelsColorMap,
      sharedLabelsColors,
      chartConfiguration,
      nativeFilters,
      filterBoxFilters,
      dataMask,
      dashboardId,
    } = dashboardContext;
    const dashboardContextWithFilters = getFormDataWithExtraFilters({
      chart: { id: sliceId },
      filters: getAppliedFilterValues(sliceId, filterBoxFilters),
      nativeFilters,
      chartConfiguration,
      dataMask,
      colorScheme,
      labelsColor,
      labelsColorMap,
      sharedLabelsColors,
      sliceId,
      allSliceIds: [sliceId],
      extraControls: {},
    });
    Object.assign(dashboardContextWithFilters, {
      dashboardId,
    });
    return dashboardContextWithFilters;
  }
  return null;
};

const retainQueryModeRequirements = (hiddenFormData: any) =>
  Object.keys(hiddenFormData ?? {}).filter(
    key => !QUERY_MODE_REQUISITES.has(key),
  );

export default function ExplorePage() {
  console.log('🔵 EXPLORE PAGE LOADED - This should appear immediately');
  console.log('[Explore] Component rendered/loaded');
  const [isLoaded, setIsLoaded] = useState(false);
  const isExploreInitialized = useRef(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const history = useHistory();

  // Get explore state to detect unsaved changes
  const explore = useSelector<any, ExplorePageState['explore']>(
    state => state.explore || ({} as ExplorePageState['explore']),
  );
  const charts = useSelector<any, ExplorePageState['charts']>(
    state => state.charts || {},
  );
  const dataMask = useSelector<any, any>(
    state => state.dataMask || {},
  );

  // Compute current form_data (same logic as ExploreViewContainer)
  const currentFormData = useMemo(() => {
    if (!explore.controls || !explore.datasource) {
      return null;
    }
    const { controls, slice, hiddenFormData } = explore;
    const hasQueryMode = !!controls.query_mode?.value;
    const fieldsToOmit = hasQueryMode
      ? retainQueryModeRequirements(hiddenFormData)
      : Object.keys(hiddenFormData ?? {});
    const form_data: any = omit(getFormDataFromControls(controls), fieldsToOmit);
    const slice_id = (form_data.slice_id ?? slice?.slice_id ?? 0) as number;
    form_data.extra_form_data = mergeExtraFormData(
      { ...form_data.extra_form_data },
      {
        ...dataMask[slice_id]?.ownState,
      },
    );
    return form_data;
  }, [explore.controls, explore.slice, explore.hiddenFormData, dataMask]);

  // Get saved form_data (sliceFormData from chart)
  const savedFormData = useMemo(() => {
    if (!currentFormData) {
      return null;
    }
    const slice_id = ((currentFormData as any).slice_id ?? explore.slice?.slice_id ?? 0) as number;
    const chart = charts[slice_id];
    return chart?.sliceFormData || null;
  }, [currentFormData, charts, explore.slice]);

  // Track initial form_data for new charts (no saved state)
  const initialFormDataRef = useRef<any>(null);
  useEffect(() => {
    if (currentFormData && !savedFormData && !initialFormDataRef.current) {
      // Store initial form_data for new charts
      initialFormDataRef.current = JSON.parse(JSON.stringify(currentFormData));
    } else if (savedFormData) {
      // Reset initial form_data ref when chart is saved
      initialFormDataRef.current = null;
    }
  }, [currentFormData, savedFormData]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!currentFormData) {
      console.log('[Explore] No currentFormData, hasUnsavedChanges = false');
      return false;
    }
    const savedData = savedFormData || initialFormDataRef.current;
    if (!savedData) {
      // For new charts without initial data, check if form_data has meaningful content
      // (e.g., has datasource and viz_type)
      const hasContent = !!(
        (currentFormData as any).datasource &&
        (currentFormData as any).viz_type &&
        Object.keys(currentFormData).length > 2
      );
      console.log('[Explore] No saved data, hasContent:', hasContent);
      return hasContent;
    }
    // Compare current form_data with saved/initial form_data
    // Exclude certain fields that change frequently but don't represent user changes
    const fieldsToIgnore = ['url_params', 'extra_form_data'];
    const current = omit(currentFormData, fieldsToIgnore);
    const saved = omit(savedData, fieldsToIgnore);
    const hasChanges = !isEqual(current, saved);
    console.log('[Explore] Comparing form data:', {
      hasChanges,
      currentKeys: Object.keys(current).length,
      savedKeys: Object.keys(saved).length,
    });
    return hasChanges;
  }, [currentFormData, savedFormData]);

  // Navigation blocking state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const unblockRef = useRef<(() => void) | null>(null);

  // Set up navigation blocking
  useEffect(() => {
    console.log('[Explore] Navigation blocking effect:', {
      hasUnsavedChanges,
      currentPath: history.location.pathname,
    });

    if (hasUnsavedChanges) {
      console.log('[Explore] Setting up navigation block');
      // Block navigation when there are unsaved changes
      unblockRef.current = history.block((location: Location, action: string) => {
        console.log('[Explore] Navigation blocked:', {
          from: history.location.pathname,
          to: location.pathname,
          action,
        });
        // Only block if navigating to a different route
        if (location.pathname !== history.location.pathname) {
          setPendingNavigation(location.pathname);
          setShowUnsavedModal(true);
          // Return empty string to prevent navigation (this prevents browser prompt)
          // We'll handle navigation manually via our modal
          return '';
        }
        // Allow navigation within the same route (e.g., hash changes)
        return true;
      });
    } else {
      console.log('[Explore] Unblocking navigation');
      // Unblock navigation when no unsaved changes
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
    }

    return () => {
      if (unblockRef.current) {
        console.log('[Explore] Cleaning up navigation block');
        unblockRef.current();
        unblockRef.current = null;
      }
    };
  }, [hasUnsavedChanges, history]);

  // Handle Save action - open save modal
  const handleSave = useMemo(
    () => () => {
      // Open the save modal (ExploreViewContainer will handle the actual save)
      dispatch(saveModalActions.setSaveChartModalVisibility(true));
      // Close unsaved changes modal
      setShowUnsavedModal(false);
      // Note: Navigation will be handled after save completes
      // The save modal will handle navigation after successful save
    },
    [dispatch],
  );

  // Handle Discard action - allow navigation without saving
  const handleDiscard = useMemo(
    () => () => {
      // Temporarily unblock to allow navigation
      const currentUnblock = unblockRef.current;
      if (currentUnblock) {
        currentUnblock();
        unblockRef.current = null;
      }

      setShowUnsavedModal(false);
      // Proceed with navigation (user explicitly chose to discard changes)
      const navPath = pendingNavigation;
      setPendingNavigation(null);
      if (navPath) {
        history.push(navPath);
      }
    },
    [history, pendingNavigation],
  );

  // Handle Cancel action
  const handleCancel = useMemo(
    () => () => {
      setShowUnsavedModal(false);
      setPendingNavigation(null);
    },
    [],
  );

  // Debug: Log render state
  useEffect(() => {
    console.log('[Explore] Render state:', {
      showUnsavedModal,
      hasUnsavedChanges,
      pendingNavigation,
    });
  }, [showUnsavedModal, hasUnsavedChanges, pendingNavigation]);

  // Handle browser tab close/refresh (like Dashboard does)
  // Only show browser prompt when custom modal is NOT showing
  // This prevents double prompts when user clicks Cancel on custom modal
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
      // Don't show browser prompt if custom modal is already showing
      // The custom modal handles in-app navigation, browser prompt only handles tab close/refresh
      if (hasUnsavedChanges && !showUnsavedModal) {
        const message = t('You have unsaved changes.');
        e.preventDefault();
        e.returnValue = message; // For Chrome
        return message; // For Safari
      }
      return undefined;
    };

    // Only add listener if not in Cypress (as Dashboard does)
    if (!(window as any).Cypress) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (!(window as any).Cypress) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [hasUnsavedChanges, showUnsavedModal]);

  useEffect(() => {
    const exploreUrlParams = getParsedExploreURLParams(location);
    const saveAction = getUrlParam(
      URL_PARAMS.saveAction,
    ) as SaveActionType | null;
    const dashboardContextFormData = getDashboardContextFormData();
    if (!isExploreInitialized.current || !!saveAction) {
      fetchExploreData(exploreUrlParams)
        .then(({ result }) => {
          const formData =
            !isExploreInitialized.current && dashboardContextFormData
              ? getFormDataWithDashboardContext(
                result.form_data,
                dashboardContextFormData,
              )
              : result.form_data;
          dispatch(
            hydrateExplore({
              ...result,
              form_data: formData,
              saveAction,
            }),
          );
        })
        .catch(err => {
          dispatch(hydrateExplore(fallbackExploreInitialData));
          dispatch(addDangerToast(err.message));
        })
        .finally(() => {
          setIsLoaded(true);
          isExploreInitialized.current = true;
        });
    }
    getLabelsColorMap().source = LabelsColorMapSource.Explore;
  }, [dispatch, location]);

  if (!isLoaded) {
    return <Loading />;
  }
  return (
    <>
      <ExploreViewContainer />
      <UnsavedChangesModal
        show={showUnsavedModal}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
        primaryButtonLoading={false}
      />
    </>
  );
}
