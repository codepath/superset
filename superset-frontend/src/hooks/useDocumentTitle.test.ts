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

import { renderHook } from '@testing-library/react-hooks';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = 'Original Title';
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  test('should set document title to provided value', () => {
    renderHook(() => useDocumentTitle('Test Dashboard'));
    expect(document.title).toBe('Test Dashboard');
  });

  test('should set document title to "Superset" when title is null', () => {
    renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe('Superset');
  });

  test('should set document title to "Superset" when title is undefined', () => {
    renderHook(() => useDocumentTitle(undefined));
    expect(document.title).toBe('Superset');
  });

  test('should update document title when title changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First Title' },
    });

    expect(document.title).toBe('First Title');

    rerender({ title: 'Second Title' });
    expect(document.title).toBe('Second Title');
  });

  test('should reset to "Superset" on window blur event', () => {
    renderHook(() => useDocumentTitle('Dashboard Name'));
    expect(document.title).toBe('Dashboard Name');

    // Simulate window blur (user switches to another tab)
    window.dispatchEvent(new Event('blur'));
    expect(document.title).toBe('Superset');
  });

  test('should restore title on window focus event', () => {
    renderHook(() => useDocumentTitle('Chart Name'));
    expect(document.title).toBe('Chart Name');

    // Simulate window blur
    window.dispatchEvent(new Event('blur'));
    expect(document.title).toBe('Superset');

    // Simulate window focus (user returns to the tab)
    window.dispatchEvent(new Event('focus'));
    expect(document.title).toBe('Chart Name');
  });

  test('should restore original title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Test Title'));
    expect(document.title).toBe('Test Title');

    unmount();
    expect(document.title).toBe('Original Title');
  });

  test('should properly clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useDocumentTitle('Test Title'));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'blur',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'focus',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  test('should handle multiple blur/focus cycles correctly', () => {
    renderHook(() => useDocumentTitle('My Dashboard'));
    expect(document.title).toBe('My Dashboard');

    // First cycle
    window.dispatchEvent(new Event('blur'));
    expect(document.title).toBe('Superset');

    window.dispatchEvent(new Event('focus'));
    expect(document.title).toBe('My Dashboard');

    // Second cycle
    window.dispatchEvent(new Event('blur'));
    expect(document.title).toBe('Superset');

    window.dispatchEvent(new Event('focus'));
    expect(document.title).toBe('My Dashboard');
  });

  test('should maintain updated title through blur/focus after title change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First Title' },
    });

    expect(document.title).toBe('First Title');

    // Update the title
    rerender({ title: 'Updated Title' });
    expect(document.title).toBe('Updated Title');

    // Blur and focus should use the updated title
    window.dispatchEvent(new Event('blur'));
    expect(document.title).toBe('Superset');

    window.dispatchEvent(new Event('focus'));
    expect(document.title).toBe('Updated Title');
  });
});
