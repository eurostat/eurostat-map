# Improving Coxcomb Custom Data Experience

## Current Problems

1. **Complex API**: Users need to understand internal `time:category` key structure
2. **Eurostat-only focus**: `statCoxcomb` method assumes Eurostat data
3. **Manual setup**: Requires understanding of stat registration, callback timing, etc.
4. **No data format flexibility**: Only works with specific nested structure

## Concrete Solutions (In Priority Order)

### 1. **Enhance `statCoxcomb` Method** ⭐ (Highest Priority)

**Impact**: Maintains backward compatibility while adding custom data support
**Effort**: Medium
**Files**: `src/map-types/composition/map-coxcomb.js`

```javascript
// CURRENT usage (Eurostat only):
.statCoxcomb({
    stat: {
        eurostatDatasetCode: 'tour_ce_omn12',
        filters: { unit: 'NR', TIME: 2023 }
    },
    timeParameter: 'month',
    times: ['M01', 'M02'],
    categoryParameter: 'c_resid',
    categoryCodes: ['DOM', 'FOR']
})

// PROPOSED usage (auto-detects custom data):
.statCoxcomb({
    customData: {
        'FR': { 'Jan': { 'Domestic': 1500, 'Foreign': 800 } }
    },
    times: ['Jan', 'Feb'],
    categoryCodes: ['Domestic', 'Foreign'],
    categoryLabels: ['Domestic tourists', 'Foreign tourists'],
    categoryColors: ['#1b9e77', '#d95f02']
})
```

**Implementation changes**:

- Detect presence of `customData` vs `eurostatDatasetCode`
- Auto-setup stat objects for custom data path
- Handle data transformation in callback
- Auto-calculate totals from categories when needed

### 2. **Add Multiple Data Format Support** ⭐

**Files**: `src/map-types/composition/map-coxcomb.js`

```javascript
// Flat array format
.coxcombData([
    { region: 'FR', time: 'Jan', category: 'Domestic', value: 1500 },
    { region: 'FR', time: 'Jan', category: 'Foreign', value: 800 }
])

// CSV support
.coxcombCSV('data/tourism.csv')

// Simple category-first format
.coxcombSimpleData({
    'Domestic': { 'FR': [1500, 1600, 1800], 'DE': [2200, 2100] },
    'Foreign': { 'FR': [800, 900, 1200], 'DE': [1200, 1300] }
})
```

### 3. **Add `customCoxcomb` Method**

**Impact**: Clean separation of concerns
**Files**: `src/map-types/composition/map-coxcomb.js`

```javascript
.customCoxcomb({
    data: customDataObject,
    times: ['Jan', 'Feb', 'Mar'],
    categories: {
        'Domestic': { label: 'Domestic tourists', color: '#1b9e77' },
        'Foreign': { label: 'Foreign tourists', color: '#d95f02' }
    },
    unitText: 'Tourist nights'
})
```

### 4. **Add Helper Utilities to Core Library**

**Files**: `src/utils/coxcomb-helpers.js` (new file)

```javascript
// Export helper functions that users can import
eurostatmap.coxcombHelpers = {
    createWithCustomData: (config) => {
        /* helper function */
    },
    convertFlatData: (flatArray) => {
        /* conversion utility */
    },
    validateCoxcombData: (data) => {
        /* validation */
    },
}
```

### 5. **Improved Error Messages & Validation**

**Current**: Silent failures or cryptic errors
**Proposed**: Clear, actionable error messages

```javascript
// Validate data structure and provide helpful errors:
if (!config.times || !config.times.length) {
    throw new Error('Coxcomb maps require a "times" array. Example: times: ["Jan", "Feb", "Mar"]')
}

if (!config.categoryCodes || !config.categoryCodes.length) {
    throw new Error('Coxcomb maps require "categoryCodes". Example: categoryCodes: ["Domestic", "Foreign"]')
}

if (config.customData) {
    // Validate structure and show examples if invalid
    for (const regionId in config.customData) {
        if (typeof config.customData[regionId] !== 'object') {
            throw new Error(`Invalid data structure for region ${regionId}. Expected: { "${regionId}": { "Jan": { "Domestic": 1500 } } }`)
        }
    }
}
```

## Implementation Timeline

**Phase 1** (Immediate improvement):

- Enhance `statCoxcomb` method to detect and handle `customData` parameter
- Add basic validation and error messages
- Create helper function for users (can be external initially)

**Phase 2** (Additional formats):

- Add flat data format support
- Add CSV support
- Add validation utilities

**Phase 3** (Advanced features):

- Add `customCoxcomb` method for clean API
- Add data transformation utilities
- Enhanced error messages and debugging tools

## Benefits

1. **Much easier onboarding**: Users can get started with custom data in minutes vs hours
2. **Multiple use cases**: Support different data formats that users already have
3. **Better developer experience**: Clear errors, intuitive API
4. **Backward compatible**: Existing Eurostat usage continues to work
5. **Consistent with library patterns**: Similar to how other map types handle custom data

## Working Example Today

The helper function in `test/map-types/coxcomb/custom-data-helper.html` shows how this could work immediately with the current codebase, demonstrating the improved user experience.
