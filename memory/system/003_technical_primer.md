# Technical Primer: Visualization Type Modal Focus Feature

## Overview
This primer covers the essential technologies, concepts, and libraries needed to implement the auto-focus feature for the "Change Visualization Type" modal in Apache Superset.

## Core Technologies

### 1. React Hooks & State Management

#### **useEffect Hook**
```typescript
// Auto-focus search input when modal opens
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []); // Empty dependency array = run once on mount
```

**Key Concepts:**
- **Dependency Array**: `[]` means run once on mount
- **Cleanup**: Return function for cleanup if needed
- **Timing**: Runs after DOM is updated

#### **useRef Hook**
```typescript
const searchInputRef = useRef<HTMLInputElement>();

// In JSX
<Input ref={searchInputRef} />
```

**Key Concepts:**
- **Direct DOM Access**: Bypass React's virtual DOM
- **Mutable Object**: `.current` property can be changed
- **Type Safety**: TypeScript generics for input elements

#### **useState Hook**
```typescript
const [isSearchFocused, setIsSearchFocused] = useState(true);
const [searchInputValue, setSearchInputValue] = useState('');
```

**Key Concepts:**
- **State Updates**: Trigger re-renders
- **Functional Updates**: `setState(prev => prev + 1)`
- **Object State**: Use spread operator for updates

### 2. TypeScript Fundamentals

#### **Interface Definitions**
```typescript
interface VizTypeGalleryProps {
  onChange: (vizType: string | null) => void;
  onDoubleClick: () => void;
  selectedViz: string | null;
  className?: string;
  denyList: string[];
}
```

**Key Concepts:**
- **Optional Properties**: `?` makes properties optional
- **Function Types**: `() => void` for callbacks
- **Union Types**: `string | null` for nullable values

#### **Type Assertions**
```typescript
// Cast required because emotion
ref={searchInputRef as any}
```

**Key Concepts:**
- **Type Casting**: `as any` bypasses type checking
- **Emotion CSS**: Styled components need special handling
- **Ref Types**: HTMLInputElement for input refs

### 3. React Component Patterns

#### **Functional Components**
```typescript
export default function VizTypeGallery(props: VizTypeGalleryProps) {
  // Component logic here
  return <div>JSX content</div>;
}
```

**Key Concepts:**
- **Props Destructuring**: `{ onChange, onDoubleClick } = props`
- **Default Props**: `onChange = noOp` for optional callbacks
- **Return JSX**: Single root element or fragment

#### **Event Handlers**
```typescript
const changeSearch: ChangeEventHandler<HTMLInputElement> = useCallback(
  event => setSearchInputValue(event.target.value),
  []
);
```

**Key Concepts:**
- **Event Types**: `ChangeEventHandler<HTMLInputElement>`
- **useCallback**: Memoize functions to prevent re-renders
- **Dependency Arrays**: Empty `[]` for stable references

### 4. CSS-in-JS with Emotion

#### **Styled Components**
```typescript
const SearchWrapper = styled.div`
  ${({ theme }) => `
    grid-area: search;
    margin-top: ${theme.gridUnit * 3}px;
    margin-bottom: ${theme.gridUnit}px;
  `}
`;
```

**Key Concepts:**
- **Template Literals**: Backticks for CSS strings
- **Theme Access**: `({ theme }) => theme.colors.primary`
- **Grid Layout**: CSS Grid for complex layouts

#### **CSS Props**
```typescript
const InputIconAlignment = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.grayscale.base};
`;
```

**Key Concepts:**
- **Flexbox**: Modern layout system
- **Theme Variables**: Consistent spacing and colors
- **Responsive Design**: Mobile-first approach

### 5. Search Functionality

#### **Fuse.js Integration**
```typescript
const fuse = useMemo(
  () =>
    new Fuse(chartMetadata, {
      ignoreLocation: true,
      threshold: 0.3,
      keys: [
        { name: 'value.name', weight: 4 },
        { name: 'value.tags', weight: 2 },
        'value.description',
      ],
    }),
  [chartMetadata]
);
```

**Key Concepts:**
- **Fuzzy Search**: Approximate string matching
- **Weighted Keys**: Different importance for search fields
- **Threshold**: Sensitivity of search (0.3 = 30% match)
- **useMemo**: Cache expensive computations

#### **Search Results Processing**
```typescript
const searchResults = useMemo(() => {
  if (searchInputValue.trim() === '') {
    return [];
  }
  return fuse
    .search(searchInputValue)
    .map(result => result.item)
    .sort((a, b) => {
      // Custom sorting logic
      return bOrder - aOrder;
    });
}, [searchInputValue, fuse]);
```

**Key Concepts:**
- **Conditional Logic**: Early return for empty search
- **Array Methods**: `.map()`, `.sort()` for data transformation
- **Dependency Arrays**: Re-compute when search input changes

### 6. Modal Management

#### **Modal State**
```typescript
const [showModal, setShowModal] = useState(!!isModalOpenInit);
const [modalKey, setModalKey] = useState(0);

const openModal = useCallback(() => {
  setShowModal(true);
}, []);
```

**Key Concepts:**
- **Boolean State**: `showModal` controls visibility
- **Key Prop**: Forces component re-initialization
- **useCallback**: Memoize event handlers

#### **Modal Lifecycle**
```typescript
const onCancel = useCallback(() => {
  setShowModal(false);
  setModalKey(key => key + 1);
  setSelectedViz(initialValue);
}, [initialValue]);
```

**Key Concepts:**
- **State Reset**: Return to initial values
- **Key Increment**: Force re-render of child components
- **Dependency Arrays**: Include all used variables

### 7. Redux State Management

#### **State Structure**
```typescript
interface RootState {
  explore: {
    form_data: FormData;
    slice: Slice | null;
    datasource: Datasource | null;
  };
  charts: {
    [key: string]: ChartState;
  };
}
```

**Key Concepts:**
- **Normalized State**: Flat structure for performance
- **Immutable Updates**: Use spread operator
- **Type Safety**: TypeScript interfaces for state

#### **Action Dispatching**
```typescript
const dispatch = useDispatch();
const formData = useSelector((state: RootState) => state.explore.form_data);

// Dispatch action
dispatch(updateFormData({ viz_type: 'bar_chart' }));
```

**Key Concepts:**
- **useSelector**: Extract state from store
- **useDispatch**: Get dispatch function
- **Action Creators**: Functions that return action objects

### 8. Testing Concepts

#### **React Testing Library**
```typescript
it('Auto-focuses search input when modal opens', async () => {
  await waitForRenderWrapper();
  
  // Open the modal
  userEvent.click(screen.getByText('View all charts'));
  
  // Wait for the modal to open and the search input to be rendered
  const searchInput = await screen.findByTestId(getTestId('search-input'));
  
  // Check that the search input is focused
  expect(searchInput).toHaveFocus();
});
```

**Key Concepts:**
- **Async Testing**: `await` for DOM updates
- **User Events**: `userEvent.click()` simulates user interaction
- **Focus Testing**: `.toHaveFocus()` matcher
- **Test IDs**: `data-test` attributes for reliable selectors

#### **Jest Matchers**
```typescript
expect(searchInput).toHaveFocus();
expect(modal).toBeInTheDocument();
expect(results).toHaveLength(3);
```

**Key Concepts:**
- **Custom Matchers**: `.toHaveFocus()` for accessibility
- **Document Queries**: `.toBeInTheDocument()`
- **Array Length**: `.toHaveLength()` for collections

### 9. Accessibility (a11y)

#### **Focus Management**
```typescript
// Auto-focus search input
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []);
```

**Key Concepts:**
- **Keyboard Navigation**: Focus management for keyboard users
- **Screen Readers**: Focus indicates active element
- **Tab Order**: Logical focus sequence

#### **ARIA Attributes**
```typescript
<Input
  ref={searchInputRef}
  placeholder={t('Search all charts')}
  data-test={`${VIZ_TYPE_CONTROL_TEST_ID}__search-input`}
  aria-label="Search visualization types"
/>
```

**Key Concepts:**
- **aria-label**: Descriptive text for screen readers
- **placeholder**: Hint text for input purpose
- **data-test**: Testing and debugging attributes

### 10. Performance Optimization

#### **useMemo for Expensive Calculations**
```typescript
const searchResults = useMemo(() => {
  // Expensive search operation
  return fuse.search(searchInputValue).map(result => result.item);
}, [searchInputValue, fuse]);
```

**Key Concepts:**
- **Memoization**: Cache expensive computations
- **Dependency Arrays**: Re-compute when dependencies change
- **Performance**: Prevent unnecessary re-renders

#### **useCallback for Event Handlers**
```typescript
const changeSearch = useCallback(
  event => setSearchInputValue(event.target.value),
  []
);
```

**Key Concepts:**
- **Stable References**: Prevent child re-renders
- **Event Handlers**: Memoize functions passed as props
- **Dependency Arrays**: Empty for stable references

## Implementation Checklist

### 1. **Add useEffect Hook**
```typescript
// Auto-focus the search input when the modal opens
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []);
```

### 2. **Update Tests**
```typescript
it('Auto-focuses search input when modal opens', async () => {
  // Test implementation
});
```

### 3. **Verify Accessibility**
- Screen readers get immediate focus
- Keyboard navigation works
- Focus indicators are visible

### 4. **Test Edge Cases**
- Modal opens multiple times
- Search input is already focused
- Component unmounts before focus

## Common Pitfalls

### 1. **Timing Issues**
```typescript
// ❌ Wrong - ref might not be ready
useEffect(() => {
  searchInputRef.current?.focus();
}, []);

// ✅ Correct - check if ref exists
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []);
```

### 2. **Dependency Arrays**
```typescript
// ❌ Wrong - missing dependencies
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, [searchInputRef]); // Unnecessary dependency

// ✅ Correct - empty array for mount-only effect
useEffect(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []);
```

### 3. **Type Safety**
```typescript
// ❌ Wrong - any type
const searchInputRef = useRef<any>();

// ✅ Correct - specific type
const searchInputRef = useRef<HTMLInputElement>();
```

## Debugging Tips

### 1. **Console Logging**
```typescript
useEffect(() => {
  console.log('Modal opened, focusing search input');
  if (searchInputRef.current) {
    searchInputRef.current.focus();
    console.log('Search input focused');
  } else {
    console.log('Search input ref not ready');
  }
}, []);
```

### 2. **React DevTools**
- Check component state
- Verify ref values
- Monitor re-renders

### 3. **Browser DevTools**
- Inspect DOM elements
- Check focus states
- Test keyboard navigation

This primer provides all the essential knowledge needed to implement the auto-focus feature for the visualization type modal in Apache Superset.
