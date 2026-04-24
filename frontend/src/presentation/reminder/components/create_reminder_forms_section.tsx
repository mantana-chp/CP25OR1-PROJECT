import { Plus } from 'lucide-react-native'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { IReminder } from '@/src/domain/reminder.domain'
import Button from '../../components/button'
import PrimaryButton from '../../components/primary_button'
import CreateReminderFormCard, {
  CreateReminderFormHandle
} from './create_reminder_form_card'

type CreateReminderFormsSectionProps = {
  createFormIds: number[]
  pendingScrollToFormIdRef: React.MutableRefObject<number | null>
  scrollViewRef: React.RefObject<ScrollView | null>
  createFormRefs: React.MutableRefObject<
    Record<number, CreateReminderFormHandle | null>
  >
  activePets: any[]
  pets: any[]
  existingReminders: IReminder[]
  defaultPetId: string
  isSubmitting: boolean
  showError: (message: string) => void
  duplicateError: string | null
  onDismissDuplicateError: () => void
  onRemoveForm: (formId: number) => void
  onBack: () => void
  onSubmit: () => void
  onAddForm: () => void
}

export default function CreateReminderFormsSection({
  createFormIds,
  pendingScrollToFormIdRef,
  scrollViewRef,
  createFormRefs,
  activePets,
  pets,
  existingReminders,
  defaultPetId,
  isSubmitting,
  showError,
  duplicateError,
  onDismissDuplicateError,
  onRemoveForm,
  onBack,
  onSubmit,
  onAddForm
}: CreateReminderFormsSectionProps) {
  return (
    <>
      {createFormIds.map((formId, index) => (
        <React.Fragment key={formId}>
          <View
            style={[styles.formCard, styles.createModeFormCard]}
            onLayout={(event) => {
              if (pendingScrollToFormIdRef.current === formId) {
                const y = event.nativeEvent.layout.y
                scrollViewRef.current?.scrollTo({
                  y: Math.max(y - 8, 0),
                  animated: true
                })
                pendingScrollToFormIdRef.current = null
              }
            }}
          >
            <CreateReminderFormCard
              ref={(instance) => {
                createFormRefs.current[formId] = instance
              }}
              index={index}
              totalForms={createFormIds.length}
              activePets={activePets}
              pets={pets}
              existingReminders={existingReminders}
              defaultPetId={defaultPetId}
              isSubmitting={isSubmitting}
              showError={showError}
              onRemove={index > 0 ? () => onRemoveForm(formId) : undefined}
            />

            {index === createFormIds.length - 1 && (
              <>
                {duplicateError && (
                  <View style={styles.duplicateErrorToast}>
                    <Text style={styles.duplicateErrorText}>
                      {duplicateError}
                    </Text>
                    <Pressable onPress={onDismissDuplicateError}>
                      <Text style={styles.duplicateErrorDismiss}>✕</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.createActionsFooter}>
                  <View
                    style={[
                      styles.createActionItem,
                      styles.createActionItemLeft
                    ]}
                  >
                    <Button
                      title="ยกเลิก"
                      onPress={onBack}
                      variant="ghost"
                      size="medium"
                      fullWidth
                      disabled={isSubmitting}
                      style={styles.cancelGhostButton}
                      textStyle={styles.cancelGhostButtonText}
                    />
                  </View>
                  <View style={styles.createActionItem}>
                    <PrimaryButton
                      onPress={onSubmit}
                      title={
                        createFormIds.length === 1
                          ? 'เพิ่ม'
                          : `เพิ่ม (${createFormIds.length})`
                      }
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      loadingText="กำลังเพิ่ม..."
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {index === createFormIds.length - 1 && (
            <View style={styles.addFormContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.addFormButton,
                  pressed && styles.addFormButtonPressed
                ]}
                disabled={isSubmitting}
                onPress={onAddForm}
              >
                {({ pressed }) => (
                  <>
                    <Plus size={18} color={pressed ? '#225877' : '#2E759E'} />
                    <Text
                      style={[
                        styles.addFormText,
                        pressed && styles.addFormTextPressed
                      ]}
                    >
                      เพิ่มเตือนความจำ
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </React.Fragment>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  createModeFormCard: {
    marginTop: 8,
    marginBottom: 8
  },
  duplicateErrorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  duplicateErrorText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#B91C1C',
    flex: 1
  },
  duplicateErrorDismiss: {
    fontSize: 16,
    color: '#B91C1C',
    paddingLeft: 8
  },
  createActionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  createActionItem: {
    flex: 1
  },
  createActionItemLeft: {
    marginRight: 12
  },
  cancelGhostButton: {
    borderWidth: 1,
    borderColor: '#BF1737',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  cancelGhostButtonText: {
    color: '#BF1737',
    fontFamily: 'Prompt_500Medium',
    fontSize: 16
  },
  addFormContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16
  },
  addFormButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  addFormButtonPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD'
  },
  addFormText: {
    color: '#2E759E',
    fontSize: 15,
    fontFamily: 'Prompt_700Bold'
  },
  addFormTextPressed: {
    color: '#225877'
  }
})
