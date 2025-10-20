# Sort Descending Checkbox Visibility - Implementation Milestones

**Design Document:** [001_sort_descending_visibility.md](../design/001_sort_descending_visibility.md)  
**Status:** Planning  
**Created:** 2025-10-12

## Overview
This milestone plan implements the conditional visibility of the "Sort Descending" checkbox in the Table Chart control panel. The checkbox will only be visible when a "Sort Query By" metric is selected, improving the user experience by eliminating confusion about non-functional controls.

## Milestone 1: Research and Setup
**Goal:** Understand current implementation and prepare development environment

### Tasks
- [ ] **1.1** Analyze current `order_desc` control implementation in `controlPanel.tsx`
- [ ] **1.2** Review `timeseries_limit_metric` control configuration and data flow
- [ ] **1.3** Examine existing visibility patterns in other chart controls
- [ ] **1.4** Set up development environment with Table Chart plugin
- [ ] **1.5** Create test dataset with metrics for testing

### Verification
- [ ] Can identify the exact location of `order_desc` control configuration
- [ ] Can identify the exact location of `timeseries_limit_metric` control configuration
- [ ] Can run Table Chart in development mode
- [ ] Can create a chart with metrics to test the feature

---

## Milestone 2: Implement Basic Visibility Logic
**Goal:** Add conditional visibility to the "Sort Descending" checkbox

### Tasks
- [ ] **2.1** Update `order_desc` control visibility function in `controlPanel.tsx`
- [ ] **2.2** Add comprehensive validation for `timeseries_limit_metric` value
- [ ] **2.3** Ensure visibility logic works with `isAggMode` condition
- [ ] **2.4** Test with empty metric selection (checkbox should be hidden)
- [ ] **2.5** Test with metric selection (checkbox should be visible)

### Code Changes
```typescript
// In controlPanel.tsx - update order_desc control
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
      return isAggMode({ controls }) && 
             controls?.timeseries_limit_metric?.value && 
             !isEmpty(controls?.timeseries_limit_metric?.value);
    },
    resetOnHide: false,
  },
},
```

### Verification
- [ ] Checkbox is hidden when no metric is selected
- [ ] Checkbox appears when a metric is selected
- [ ] Checkbox disappears when metric is cleared
- [ ] Checkbox remains hidden in raw mode (existing behavior preserved)

---

## Milestone 3: Edge Case Handling
**Goal:** Ensure robust handling of edge cases and data types

### Tasks
- [ ] **3.1** Test with `null` values for `timeseries_limit_metric`
- [ ] **3.2** Test with empty array `[]` for `timeseries_limit_metric`
- [ ] **3.3** Test with single metric selection
- [ ] **3.4** Test with multiple metric selections
- [ ] **3.5** Test checkbox state preservation when metric is cleared and reselected

### Verification
- [ ] Checkbox handles all edge cases correctly
- [ ] No console errors or warnings
- [ ] Checkbox state is preserved appropriately
- [ ] Performance is not impacted by visibility checks

---

## Milestone 4: User Experience Testing
**Goal:** Verify the user experience flows work as expected

### Tasks
- [ ] **4.1** Test complete user flow: select metric → checkbox appears → toggle checkbox → query updates
- [ ] **4.2** Test reverse flow: clear metric → checkbox disappears
- [ ] **4.3** Test with different chart configurations (various metrics, groupby, etc.)
- [ ] **4.4** Verify sort direction is applied correctly when checkbox is visible
- [ ] **4.5** Test keyboard navigation and accessibility

### Verification
- [ ] User can intuitively understand the relationship between controls
- [ ] No confusion about non-functional controls
- [ ] Sort functionality works correctly when controls are visible
- [ ] Accessibility is maintained

---

## Milestone 5: Integration Testing
**Goal:** Ensure the feature works correctly with other Table Chart functionality

### Tasks
- [ ] **5.1** Test with server pagination enabled
- [ ] **5.2** Test with different query modes (aggregate vs raw)
- [ ] **5.3** Test with time-based filtering
- [ ] **5.4** Test with ad-hoc filters
- [ ] **5.5** Test with different data sources

### Verification
- [ ] Feature works with all Table Chart configurations
- [ ] No conflicts with existing functionality
- [ ] Performance is maintained
- [ ] No regression in existing behavior

---

## Milestone 6: Documentation and Cleanup
**Goal:** Document the changes and clean up the implementation

### Tasks
- [ ] **6.1** Add inline code comments explaining the visibility logic
- [ ] **6.2** Update any relevant documentation
- [ ] **6.3** Remove any debugging code or console logs
- [ ] **6.4** Ensure code follows project style guidelines
- [ ] **6.5** Create unit tests for the visibility logic

### Verification
- [ ] Code is well-documented and clean
- [ ] Unit tests cover the new visibility logic
- [ ] No debugging artifacts remain
- [ ] Code passes linting and style checks

---

## Milestone 7: Final Testing and Validation
**Goal:** Comprehensive testing to ensure the feature is ready for production

### Tasks
- [ ] **7.1** Manual testing of all user scenarios
- [ ] **7.2** Cross-browser testing (Chrome, Firefox, Safari)
- [ ] **7.3** Test with different screen sizes and responsive design
- [ ] **7.4** Performance testing with large datasets
- [ ] **7.5** User acceptance testing with stakeholders

### Verification
- [ ] Feature works correctly across all browsers
- [ ] Responsive design is maintained
- [ ] Performance is acceptable
- [ ] Stakeholders approve the user experience

---

## Success Criteria
- [ ] "Sort Descending" checkbox is only visible when a "Sort Query By" metric is selected
- [ ] Checkbox appears/disappears smoothly when metric selection changes
- [ ] Existing functionality is preserved when controls are visible
- [ ] No regression in other Table Chart features
- [ ] User experience is improved with clearer control relationships
- [ ] Code is maintainable and well-tested

## Rollback Plan
If any milestone fails or causes issues:
1. **Immediate:** Revert to previous visibility logic (always show in aggregation mode)
2. **Investigation:** Identify root cause of the issue
3. **Fix:** Address the specific problem and re-test
4. **Re-deploy:** Implement the fix and continue with remaining milestones

## Notes
- Each milestone should be completed and verified before moving to the next
- If issues arise, stop and address them before continuing
- Keep the implementation simple and focused on the core requirement
- Consider future enhancements (like visual grouping) as separate features
