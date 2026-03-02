import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Modal from './modal'

export interface ActionItem {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  onPress: () => void
  variant?: 'default' | 'success' | 'error'
  disabled?: boolean
}

interface ActionSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  actions: ActionItem[]
  showCancel?: boolean
  cancelText?: string
}

export default function ActionSheet({
  visible,
  onClose,
  title,
  actions,
  showCancel = true,
  cancelText = 'ยกเลิก',
}: ActionSheetProps) {
  const getActionButtonStyle = (variant?: string) => {
    switch (variant) {
      case 'success':
        return styles.successAction
      case 'error':
        return styles.errorAction
      default:
        return styles.defaultAction
    }
  }

  const getActionTextStyle = (variant?: string) => {
    switch (variant) {
      case 'success':
        return styles.successActionText
      case 'error':
        return styles.errorActionText
      default:
        return styles.defaultActionText
    }
  }

  const getIconColor = (variant?: string) => {
    switch (variant) {
      case 'success':
        return '#4CAF50'
      case 'error':
        return '#E53935'
      default:
        return '#225877'
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      variant="default"
      title={title}
      maxWidth={320}
    >
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              getActionButtonStyle(action.variant),
              action.disabled && styles.disabledAction,
            ]}
            onPress={() => {
              if (!action.disabled) {
                action.onPress()
                onClose()
              }
            }}
            disabled={action.disabled}
          >
            {action.icon && (
              <MaterialCommunityIcons
                name={action.icon}
                size={24}
                color={getIconColor(action.variant)}
              />
            )}
            <Text
              style={[
                styles.actionText,
                getActionTextStyle(action.variant),
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}

        {showCancel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelAction]}
            onPress={onClose}
          >
            <Text style={styles.cancelActionText}>{cancelText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
  },
  defaultAction: {
    backgroundColor: '#F5F5F5',
  },
  defaultActionText: {
    color: '#225877',
  },
  successAction: {
    backgroundColor: '#E8F5E9',
  },
  successActionText: {
    color: '#4CAF50',
  },
  errorAction: {
    backgroundColor: '#FFEBEE',
  },
  errorActionText: {
    color: '#E53935',
  },
  cancelAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  disabledAction: {
    opacity: 0.5,
  },
})
