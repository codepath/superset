# Sort Descending Checkbox Visibility Design Document

## Metadata
- **Status:** Draft
- **Author(s):** Development Team
- **Reviewers:** UX Team, Frontend Team
- **Created:** 2025-10-12
- **Updated:** 2025-10-12
- **Implementation PR(s):** TBD

## Overview
The "Sort Descending" checkbox in the Table Chart control panel is currently always visible, regardless of whether a "Sort Query By" metric has been selected. This creates a confusing user experience where users can interact with a control that has no effect when no sort metric is selected. The checkbox should only be visible when a "Sort Query By" metric is selected, making it clear that these two controls work together.

This enhancement improves the user experience by:
- Eliminating confusion about non-functional controls
- Creating a clearer visual relationship between dependent controls
- Following established UI patterns for conditional control visibility

## Goals
- Hide the "Sort Descending" checkbox when no "Sort Query By" metric is selected
- Show the "Sort Descending" checkbox when a "Sort Query By" metric is selected
- Position the checkbox directly below the "Sort Query By" control for visual clarity
- Maintain existing functionality when controls are visible
- Preserve behavior in aggregation mode only

## Proposed Solution

### High-Level Approach
Modify the visibility logic of the "Sort Descending" checkbox to depend on the presence of a selected "Sort Query By" metric. The checkbox will use a dynamic visibility function that checks if `timeseries_limit_metric` has a value, and only show the checkbox when this condition is met.

### Key Components
- **Control Panel Configuration:** Update the `order_desc` control visibility logic
- **Form Data Interface:** Leverage existing `timeseries_limit_metric` field
- **Query Building Logic:** Maintain existing sort behavior when controls are visible

### Simple Architecture Diagram
```
Table Chart Control Panel
├── Sort Query By (timeseries_limit_metric)
│   └── [Metric Selection Dropdown]
└── Sort Descending (order_desc) [VISIBLE ONLY IF METRIC SELECTED]
    └── [Checkbox: Descending/Ascending]
```

## Design Considerations

### 1. Visibility Logic Implementation
**Context:** The checkbox visibility must be tied to the presence of a sort metric selection.

**Options:**
- **Option A:** Simple boolean check on `timeseries_limit_metric` value
  - Pros: Simple implementation, clear logic
  - Cons: May not handle edge cases with empty arrays
- **Option B:** Comprehensive validation including array length and null checks
  - Pros: Handles all edge cases
  - Cons: More complex implementation, potential over-engineering
- **Option C:** Use existing `isAggMode` combined with metric presence
  - Pros: Leverages existing patterns, consistent with current code
  - Cons: May be too restrictive

**Recommendation:** Option B - Comprehensive validation to handle all edge cases properly.

### 2. Control Positioning
**Context:** The checkbox should be visually connected to the "Sort Query By" control.

**Options:**
- **Option A:** Keep current positioning, only change visibility
  - Pros: Minimal changes, no layout disruption
  - Cons: May not improve visual relationship
- **Option B:** Move checkbox to be directly adjacent to sort metric control
  - Pros: Clear visual relationship, better UX
  - Cons: Requires control panel restructuring
- **Option C:** Use visual grouping/grouping controls
  - Pros: Professional appearance, scalable pattern
  - Cons: More complex implementation

**Recommendation:** Option A - Keep current positioning for minimal disruption, focus on visibility logic.

## Lifecycle of Code for Key Use Case

1. **User opens Table Chart:** Control panel renders with initial state
2. **System checks aggregation mode:** `isAggMode` determines if sort controls are relevant
3. **System evaluates metric selection:** `timeseries_limit_metric` value determines checkbox visibility
4. **User selects sort metric:** Checkbox becomes visible with current state
5. **User toggles sort direction:** Checkbox state updates, query rebuilds
6. **User clears sort metric:** Checkbox becomes hidden, sort direction resets

### Error Scenarios
- **If no metrics available:** Checkbox remains hidden (expected behavior)
- **If aggregation mode disabled:** Checkbox remains hidden (existing behavior)
- **If metric selection cleared:** Checkbox becomes hidden, sort direction preserved for next selection

## Detailed Design

### Schema Updates
No database schema changes required. This is a UI-only enhancement.

### API Endpoints
No new API endpoints required. Existing query building logic handles the sort parameters.

### UI Changes
- **Control Panel:** Update `order_desc` control visibility logic
- **User flow:** Checkbox appears/disappears based on metric selection
- **Key interactions:** 
  - Select metric → checkbox appears
  - Clear metric → checkbox disappears
  - Toggle checkbox → sort direction changes

### Services / Business Logic

#### Control Panel Configuration
```typescript
// In controlPanel.tsx
{
  name: 'order_desc',
  config: {
    type: 'CheckboxControl',
    label: t('Sort descending'),
    default: true,
    description: t(
      'If enabled, this control sorts the results/values descending, otherwise it sorts the results ascending.',
    ),
    visibility: ({ controls }: ControlPanelsContainerProps) => {
      // Only show in aggregation mode AND when a sort metric is selected
      return isAggMode({ controls }) && 
             controls?.timeseries_limit_metric?.value && 
             !isEmpty(controls?.timeseries_limit_metric?.value);
    },
    resetOnHide: false,
  },
},
```

#### Query Building Logic
```typescript
// In buildQuery.ts - existing logic remains unchanged
if (sortByMetric) {
  orderby = [[sortByMetric, !orderDesc]];
} else if (metrics?.length > 0) {
  // default to ordering by first metric in descending order
  orderby = [[metrics[0], false]];
}
```

### Data Migration Plan
No data migration required. This is a UI enhancement that doesn't affect stored data.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Checkbox state lost when metric cleared | Medium | Low | Preserve checkbox state in form data, restore on metric reselection |
| Confusion about sort behavior | Low | Low | Clear description text, maintain existing query logic |
| Layout disruption | Low | Low | Keep existing positioning, only change visibility |
| Performance impact | Low | Very Low | Simple boolean check, minimal computational overhead |

### Technical Debt
- Consider future enhancement to group related controls visually
- Potential for more sophisticated control dependency management

## Rollout Plan

### Deployment Strategy
- [ ] Feature flag implementation: Not required (UI-only change)
- [ ] Canary deployment percentage: 100% (low risk)
- [ ] Full rollout criteria: Standard deployment process

### Rollback Plan
Simple code revert if issues arise. No data migration or complex rollback required.

### Monitoring & Alerts
- **Key metrics:** User interaction with sort controls, query performance
- **Alert thresholds:** None required for this UI enhancement
- **Dashboards:** Standard frontend performance monitoring

## Open Questions
1. Should the checkbox state be preserved when the metric is cleared and then reselected?
2. Should we consider grouping the sort controls in a visual container?
3. Are there other chart types that would benefit from similar conditional visibility patterns?

## References
- [Table Chart Control Panel Implementation](superset-frontend/plugins/plugin-chart-table/src/controlPanel.tsx)
- [Query Building Logic](superset-frontend/plugins/plugin-chart-table/src/buildQuery.ts)
- [Shared Controls Pattern](superset-frontend/packages/superset-ui-chart-controls/src/shared-controls/sharedControls.tsx)
