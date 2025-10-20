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
import { useEffect, useRef } from 'react';

const DEFAULT_TITLE = 'Superset';

/**
 * Custom hook to manage document title with blur/focus behavior
 *
 * This hook sets the browser tab title to a custom value when provided,
 * and resets it to "Superset" when the window loses focus (user switches tabs).
 * When the window regains focus, it restores the custom title.
 *
 * @param title - The title to set for the document. If null/undefined, uses default.
 *
 * @example
 * // In a dashboard component
 * useDocumentTitle(dashboardName);
 *
 * @example
 * // In an explore component
 * useDocumentTitle(chartName || DEFAULT_TITLE);
 */
export function useDocumentTitle(title: string | null | undefined) {
  const originalDocumentTitle = useRef(document.title);
  const currentTitle = useRef<string | null>(null);

  useEffect(() => {
    // Update the title when it changes
    if (title) {
      document.title = title;
      currentTitle.current = title;
    } else {
      document.title = DEFAULT_TITLE;
      currentTitle.current = DEFAULT_TITLE;
    }

    // Handle window blur/focus events
    const handleBlur = () => {
      document.title = DEFAULT_TITLE;
    };

    const handleFocus = () => {
      if (currentTitle.current) {
        document.title = currentTitle.current;
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Cleanup: restore original title and remove event listeners
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.title = originalDocumentTitle.current;
    };
  }, [title]);
}
