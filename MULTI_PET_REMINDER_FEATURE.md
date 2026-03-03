# Multi-Pet Reminder Creation Feature

## Overview

This feature allows users to create the same reminder for multiple pets simultaneously by selecting them from a horizontal, avatar-based pet selector. Users can easily add or remove pets from the selection.

## User Experience

### Visual Design

- **Horizontal ScrollView**: Selected pets are displayed in a horizontal scrollable list
- **Pet Avatars**: 64x64 circular avatars with pet profile images or placeholder icons
- **Pet Names**: Displayed below each avatar (12px font)
- **Remove Button**: Red X button (22x22) positioned at top-right of each avatar
- **Add Button**: Dashed-border circle with "+" icon to add more pets

### When to Use Multi-Pet Selection

- Creating the same reminder (e.g., "Monthly Flea Treatment") for multiple pets
- Setting up general care reminders that apply to all pets
- Scheduling appointment reminders for multiple pets

### Restrictions

- **Edit Mode**: Pet selection is locked when editing existing reminders (cannot change pet association)
- **No Vaccine Schedules**: Vaccine schedules are automatically disabled when 2+ pets are selected (too complex for multi-pet)
- **No Attachments in Multi**: Attachments not supported in multi-pet mode (requires per-pet configuration)

## UI Components

### Pet Selector with Avatar Display

A horizontal scrollable list showing selected pets with avatars:

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {selectedPets.map((pet) => (
    <View key={pet.id} style={styles.selectedPetItem}>
      <View style={styles.petAvatarWrapper}>
        {pet.profile_image_url ? (
          <Image source={{ uri: pet.profile_image_url }} />
        ) : (
          <View style={styles.placeholderAvatar}>
            <MaterialCommunityIcons name="dog" size={32} color="white" />
          </View>
        )}
        <TouchableOpacity
          style={styles.removePetButton}
          onPress={() => handleRemovePet(pet.id)}
        >
          <MaterialCommunityIcons name="close" size={14} color="white" />
        </TouchableOpacity>
      </View>
      <Text>{pet.pet_name}</Text>
    </View>
  ))}

  {/* Add More Pets Button */}
  <TouchableOpacity onPress={handleOpenModal}>
    <View style={styles.addPetWrapper}>
      <Text style={styles.addPetIcon}>+</Text>
    </View>
    <Text>เพิ่มสัตว์เลี้ยง</Text>
  </TouchableOpacity>
</ScrollView>
```

**Visual Features:**

- 64x64 circular avatars with 8px margin between items
- Remove button: 22x22 red circle (#ef4444) with white X icon, positioned at top-right (-4, -4)
- Add button: 64x64 dashed border circle (#5FA7D1) with "+" icon, blue background (#F0F8FF)
- Pet names: 12px Prompt_400Regular, centered below avatar
- Horizontal gap: 12px between items

### Selection Modal

Modal for selecting/deselecting additional pets:

**Features:**

- Checkbox UI for each pet in the list
- Shows pet avatar, name, species, and breed
- Selected pets have blue background (#E8F4F8)
- Checkboxes: 24x24, blue when selected (#5FA7D1)
- Modal footer with Cancel and Confirm buttons
- Confirm button shows count: "ยืนยัน (X)"

## Implementation Details

### State Management

```typescript
// Pet selection state (supports single or multiple pets)
const [selectedPetIds, setSelectedPetIds] = useState<string[]>([])

// Initialize with first pet in create mode
useEffect(() => {
  if (!isEditMode && selectedPetIds.length === 0 && formik.values.petId) {
    setSelectedPetIds([formik.values.petId])
  }
}, [isEditMode, formik.values.petId])
```

### Pet Selection Handlers

```typescript
// Single mode handler
const handleSelectPet = (petId: string) => {
  formik.setFieldValue('petId', petId)
  setDuplicateError(null)
}

// Multi mode handler
const handleSelectPets = (petIds: string[]) => {
  setSelectedPetIds(petIds)
  setDuplicateError(null)
}
```

### Submission Logic

````typescript### Multi-Pet Batch Creation

```typescript// Automatically determine single vs multi-pet submission
onSubmit: async (values) => {
  // Validate pet selection
  if (!isEditMode && selectedPetIds.length === 0) {
    showError('กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว')
    return
  }

  // Handle multi-pet creation (when more than 1 pet selected)
  if (!isEditMode && selectedPetIds.length > 1) {
    await handleMultiPetSubmit(values)
    return
  }

  // Single pet creation/edit (default behavior)
  // ... standard single reminder creation ...
}
````

iHandle pet selection from modal
const handleSelectPets = (petIds: string[]) => {
setSelectedPetIds(petIds)
// Update formik petId to first selected pet for validation
if (petIds.length > 0) {
formik.setFieldValue('petId', petIds[0])
}
// Clear vaccine schedules if multiple pets selected
if (petIds.length > 1 && formik.values.categoryName === 'Vaccination') {
formik.setFieldValue('categoryName', 'General')
setDoses([])
setCustomVaccineName('')
}
}

// Handle removing a pet from selection
const handleRemovePet = (petId: string) => {
if (!disabled && onSelectPets) {
onSelectPets(selectedPetIds.filter(id => id !== petId))
}
let successCount = 0
let failCount = 0

// Create reminder for each selected pet
for (const petId of selectedPetIds) {
try {
const reminderData = {
...formik.values,
petId,
attachments: attachmentIds,
recurrence: recurrenceRule?.type !== 'none' ? recurrenceRule : null
}

      await reminderService.createReminder(reminderData)
      successCount++
    } catch (error) {
      console.error(`Failed to create reminder for pet ${petId}:`, error)
      failCount++
    }

}

setIsSubmitting(false)

// Show results
if (successCount > 0) {
Toast.show({
type: 'success',
text1: `สร้างการแจ้งเตือนสำเร็จ ${successCount} ตัว`,
text2: failCount > 0 ? `ไม่สำเร็จ ${failCount} ตัว` : undefined
})

    // Reset and navigate b (works for both single and multi)

const hasPetSelected = isEditMode
? !!formik.values.petId
: selectedPetIds.length > 0

const canSubmit =
formik.values.reminderName &&
formik.values.reminderDate &&
hasPetSelected &&
(isVaccinationCategory && canUseVaccineSchedule ? allDosesHaveDates : true)

// Disable vaccine schedules when multiple pets selected
const canUseVaccineSchedule =
(/_ ...petTypeCheck... _/) &&
selectedPetIds.length <= 1
})
}
}

````

### Validation

```typescript
// Pet selection validation
const hasPetSelected = isMultiPetMode
  ? selectedPetIds.length > 0
  : !!formik.values.petId

const canSubmit =
  formik.values.reminderName &&
  formik.values.reminderDate &&
  hasPetSelected &&
  (isVaccinationCategory && canUseVaccineSchedule ? allDosesHaveDates : true)
````

leanup on Back Navigation

```typescript
const confirmBack = () => {
  // ... other cleanup ...
  setIsMultiPetMode(false)
  setSelectedPetIds([])
  formik.resetForm()
  router.back()
}
```

## Modified Components

### 1. PetSelector Component

\*\*pets: IPetProfile[]
selectedPetIds?: string[]
onSelectPets?: (petIds: string[]) => void
label?: string
required?: boolean
error?: string
disabled?: boolean
}

```

**Key Features:**
- **Horizontal Avatar Display**: Shows selected pets with circular avatars
- **Remove Buttons**: Red X button (top-right corner of each avatar) to remove pets
- **Add Button**: Dashed-border circle to open selection modal
- **Selection Modal**: Checkbox UI for selecting/deselecting pets
- **Temporary State**: Uses `tempSelectedIds` for modal interaction (allows cancellation)
- **Profile Images**: Shows pet profile images or placeholder dog icon
- **Disabled State**: Gray out and disable when `disabled={true}` (used in edit mode)
- Conditional rendering based on `multiSelect` prop
- Temporary selection state (`tempSelectedIds`) for multi-select modal
- Checkbox UI in multi-select mode
- Confirm/Cancel buttons in modal footer for multi-select
- Display shows count when multiple selected

### 2. Add Reminder Page
**FselectedPetIds: string[]` - Array of selected pet IDs (replaces separate single/multi modes)

**Key Changes:**
- **Removed**: `isMultiPetMode` toggle state and UI
- **Removed**: Multi-pet toggle Switch component
- **Simplified**: Always uses array-based selection (`selectedPetIds`)
- **Auto-detect**: Submission automatically uses multi-pet logic when `selectedPetIds.length > 1`
- **Edit Mode**: Initializes with `[formik.values.petId]` and disables selection
- **Create Mode**: Initializes with first pet, allows adding/removing pets

**Modified Logic:**
- Pet selector always shows horizontal avatar list
- Vaccine schedule disabled when `selectedPetIds.length > 1`
- Validation checks `selectedPetIds.length > 0` in create mode
- Submit button calls `handleMultiPetSubmit` if multiple pets selected
- Vaccine schedule disabled in multi-pet mode
- Validation checks both single and multi-pet selection
// Pet selector styles
selectedPetItem: {
  alignItems: 'center',
  width: 72
},
petAvatarWrapper: {
  width: 64,
  height: 64,
  borderRadius: 32,
  marginBottom: 6,
  position: 'relative'
},
petAvatar: {
  width: '100%',
  height: '100%',
  borderRadius: 32,
  backgroundColor: '#5FA7D1'
},
placeholderAvatar: {
  justifyContent: 'center',
  alignItems: 'center'
},
removePetButton: {
  position: 'absolute',
  top: -4,
  right: -4,
  width: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: '#ef4444',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#fff'
},
selectedPetName:with first pet automatically selected and displayed as avatar

2. **Add More Pets (Optional)**
   - User sees horizontal list with current pet avatar and "+" button
   - Taps "+" button to open selection modal
   - Modal shows all pets with checkboxes
   - User checks additional pets (e.g., Dog 1, Cat 1, Cat 2)
   - Taps "ยืนยัน (3)" button to confirm
   - Selected pets now appear as avatars in horizontal list

3. **Remove Pets (Optional)**
   - User sees X button on top-right of each pet avatar
   - Taps X button on unwanted pet
   - Pet is immediately removed from selection

4. **Fill Reminder Details**
   - Enter reminder name (e.g., "Monthly Flea Treatment")
   - Select date and time
   - Choose category (General, Medication, etc.)
   - Set recurrence if needed
   - **Note**: Vaccination category auto-switches to General if 2+ pets selected

5. **Submit Form**
   - User taps "บันทึกการแจ้งเตือน" button
   - System detects multiple pets and uses batch creation
   - Creates separate reminders for each selected pet
   - Shows success message
  fontSize: 11,
  fontFamily: 'Prompt_400Regular',
  color: '#5FA7D1',
  textAlign: 'center'
multiPetHint: {
  fontSize: 12,
  fontFamily: 'Prompt_400Regular',
  color: '#6b7280',
  marginTop: 2
}
```

## User Flow

1. **Navigate to Add Reminder Page**
   - User clicks "Create Reminder" button
   - Form opens in create mode

2. **Enable Multi-Pet Mode**
   - User toggles "สร้างสำหรับหลายสัตว์เลี้ยง" switch ON
   - If vaccination category was selected, it automatically changes to General
   - Pet selector changes to multi-select mode

3. **Select Multiple Pets**
   - User taps on pet selector
   - Modal opens showing all pets with checkboxes
   - User checks desired pets (e.g., Dog 1, Dog 2, Cat 1)
   - Display shows "กำลังเลือก... (3)" during selection
   - User taps "ยืนยัน (3)" button to confirm

4. **Fill Reminder Details**
   - Enter reminder name (e.g., "Monthly Flea Treatment")
   - Select date and time
   - Choose category (General, Medication, etc.)
   - Set recurrence if needed (not available for Vaccination)

5. **Submit Form**
   - User taps "บันทึกการแจ้งเตือน" button
   - System creates separate reminders for each selected pet
   - Shows success message with count: "สร้างการแจ้งเตือนสำเร็จ 3 ตัว"
   - Navigates back to calendar/reminder list

6. **View Results**
   - Each pet now has an independent reminder record
   - Reminders appear in calendar for each pet
   - Can be edited/deleted individually

## Edge Cases & Error Handling

### 1. No Pets Selected

```typescript
if (selectedPetIds.length === 0) {
  Toast.show({
    type: 'error',
    text1: 'กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว'
  })
  return
}
```

### 2. Partial Success

```typescript
// If 3/4 reAdd and Remove Pets
1. Start with 1 pet selected
2. Tap "+" button to add more
3. Select 2 additional pets
4. Tap X on one pet avatar to remove
5. **Expected:** Pet removed immediately from horizontal list

### Test 3: Vaccination Category Handling
1. Select 1 pet only
2. Select Vaccination category
3. Add a second pet
4. **Expected:** Category automatically changes to General, vaccine form disappears

### Test 4: Modal Cancellation
1. Tap "+" button to open modal
2. Check 3 pets
3. Click Cancel
4. **Expected:** Selection unchanged, modal closes, original pets still shown

### Test 5: Validation
1. Remove all pets from selection
2. Try to submit
3. **Expected:** Error message "กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว"

### Test 6: Edit Mode Restriction
1. Open existing reminder in edit mode
2. **Expected:** Pet selector shows current pet as disabled avatar, no "+" button, no X buttons

### Test 7: Profile Images
1. Select pet with profile image
2. Select pet without profile image
3. **Expected:** First shows actual image, second shows placeholder dog icon on blue background
// tempSelectedIds is discarded
// selectedPetIds remains unchanged
```

## Testing Scenarios

### Test 1: Basic Multi-Pet Creation

1. Enable multi-pet mode
2. Select 2 pets
3. Fill reminder details
4. Submit
5. **Expected:** 2 separate reminder records created

### Test 2: Toggle Mode Switch

1. Select pet in single mode
2. Enable multi-pet mode
3. **Expected:** Previously selected pet is pre-checked in multi-select

### Test 3: Vaccination Category Handling

1. Select Vaccination category
2. Enable multi-pet mode
3. **Expected:** Category automatically changes to General

### Test 4: Modal Cancellation

1. Enable multi-pet mode
2. Open pet selector
3. Check 3 pets
4. Click Cancel
5. **Expected:** Selection unchanged, modal closes

### Test 5: Validation

1. Enable multi-pet mode
2. Don't select any pets
3. Try to submit
4. **Expected:** Error toast "กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว"

### Test 6: Edit Mode Restriction

1. Open existing reminder in edit mode
2. **Expected:** Multi-pet toggle not visible

### Test 7: Partial Failure Handling

- Simulate API failure for one pet during multi-pet creation
- **Expected:** Shows success count and failure count in toast

## Future Enhancements

1. **Batch Edit**
   - Allow editing multiple reminders simultaneously
   - Useful for changing dates across multiple pets

2. **Template System**
   - Save multi-pet reminder configurations as templates
   - Quick apply templates to new pets

3. **Pet Groups**
   - Create pet groups (e.g., "Indoor Cats", "Large Dogs")
   - Quick select entire group for reminders

4. **Vaccination Support**
   - Advanced handling for multi-dose vaccines in multi-pet mode
   - Automatic schedule coordination across pets

## Technical Notes

- Each reminder is created as a separate database record
- No special linking between reminders created in batch
- Individual reminders can be edited/deleted independently
- Recurrence rules apply independently to each reminder
- Attachments are shared across all created reminders (same file references)

## Localization

All user-facing text is in Thai:

- สร้างสำหรับหลายสัตว์เลี้ยง = "Create for Multiple Pets"
- เลือกแล้ว X ตัว = "Selected X pets"
- ยืนยัน (X) = "Confirm (X)"
- กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว = "Please select at least 1 pet"
- สร้างการแจ้งเตือนสำเร็จ X ตัว = "Successfully created reminders for X pets"
