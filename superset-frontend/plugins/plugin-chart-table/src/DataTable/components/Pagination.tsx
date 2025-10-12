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
import { CSSProperties, forwardRef, memo, Ref } from 'react';
import { styled } from '@superset-ui/core';

export interface PaginationProps {
  pageCount: number; // number of pages
  currentPage?: number; // index of current page, zero-based
  maxPageItemCount?: number;
  ellipsis?: string; // content for ellipsis item
  onPageChange: (page: number) => void; // `page` is zero-based
  style?: CSSProperties;
}

// first, ..., prev, current, next, ..., last
const MINIMAL_PAGE_ITEM_COUNT = 7;

// Styled components to match the main pagination style
const PaginationList = styled.ul`
  display: inline-block;
  margin: 16px 0;
  padding: 0;

  li {
    display: inline;
    margin: 0 4px;

    span, a {
      padding: 8px 12px;
      text-decoration: none;
      background-color: ${({ theme }) => theme.colors.grayscale.light5};
      border-radius: ${({ theme }) => theme.borderRadius}px;
      color: inherit;
      cursor: pointer;
      border: none;

      &:hover,
      &:focus {
        z-index: 2;
        color: ${({ theme }) => theme.colors.grayscale.dark1};
        background-color: ${({ theme }) => theme.colors.grayscale.light3};
      }
    }

    &.active {
      span, a {
        z-index: 3;
        color: ${({ theme }) => theme.colors.grayscale.light5};
        cursor: default;
        background-color: ${({ theme }) => theme.colors.primary.base};

        &:focus {
          outline: none;
        }
      }
    }

    &.disabled {
      span {
        background-color: transparent;
        cursor: default;
        opacity: 0.5;

        &:focus {
          outline: none;
        }

        &:hover {
          background-color: transparent;
        }
      }
    }

    &.dt-pagination-ellipsis {
      span {
        cursor: default;
        &:hover {
          background-color: ${({ theme }) => theme.colors.grayscale.light5};
        }
      }
    }
  }
`;

const PaginationContainer = styled.div`
  &.dt-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

/**
 * Generate numeric page items around current page.
 *   - Always include first and last page
 *   - Add ellipsis if needed
 */
export function generatePageItems(
  total: number,
  current: number,
  width: number,
) {
  if (width < MINIMAL_PAGE_ITEM_COUNT) {
    throw new Error(
      `Must allow at least ${MINIMAL_PAGE_ITEM_COUNT} page items`,
    );
  }
  if (width % 2 === 0) {
    throw new Error(`Must allow odd number of page items`);
  }
  if (total < width) {
    return [...new Array(total).keys()];
  }
  const left = Math.max(
    0,
    Math.min(total - width, current - Math.floor(width / 2)),
  );
  const items: (string | number)[] = new Array(width);
  for (let i = 0; i < width; i += 1) {
    items[i] = i + left;
  }
  // replace non-ending items with placeholders
  if (typeof items[0] === 'number' && items[0] > 0) {
    items[0] = 0;
    items[1] = 'prev-more';
  }
  const lastItem = items[items.length - 1];
  if (typeof lastItem === 'number' && lastItem < total - 1) {
    items[items.length - 1] = total - 1;
    items[items.length - 2] = 'next-more';
  }
  return items;
}

export default memo(
  forwardRef(function Pagination(
    {
      style,
      pageCount,
      currentPage = 0,
      maxPageItemCount = 9,
      onPageChange,
    }: PaginationProps,
    ref: Ref<HTMLDivElement>,
  ) {
    const pageItems = generatePageItems(
      pageCount,
      currentPage,
      maxPageItemCount,
    );
    return (
      <PaginationContainer ref={ref} className="dt-pagination" style={style}>
        <PaginationList role="navigation">
          {/* Previous button */}
          <li className={currentPage === 0 ? 'disabled' : undefined}>
            <span
              role="button"
              tabIndex={currentPage === 0 ? -1 : 0}
              onClick={e => {
                e.preventDefault();
                if (currentPage > 0) onPageChange(currentPage - 1);
              }}
            >
              «
            </span>
          </li>
          
          {/* Page numbers */}
          {pageItems.map(item =>
            typeof item === 'number' ? (
              // actual page number
              <li
                key={item}
                className={currentPage === item ? 'active' : undefined}
              >
                <span
                  role="button"
                  tabIndex={currentPage === item ? -1 : 0}
                  onClick={e => {
                    e.preventDefault();
                    if (currentPage !== item) onPageChange(item);
                  }}
                >
                  {item + 1}
                </span>
              </li>
            ) : (
              <li key={item} className="dt-pagination-ellipsis">
                <span>…</span>
              </li>
            ),
          )}
          
          {/* Next button */}
          <li className={currentPage === pageCount - 1 ? 'disabled' : undefined}>
            <span
              role="button"
              tabIndex={currentPage === pageCount - 1 ? -1 : 0}
              onClick={e => {
                e.preventDefault();
                if (currentPage < pageCount - 1) onPageChange(currentPage + 1);
              }}
            >
              »
            </span>
          </li>
        </PaginationList>
      </PaginationContainer>
    );
  }),
);
