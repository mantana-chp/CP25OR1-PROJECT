import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import Modal from '@/src/presentation/components/modal'
import InputText from '@/src/presentation/components/text_input'
import { Activity, Scale, Stethoscope } from 'lucide-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import { HealthLogType } from './health_log_entry_card'

interface HealthLogFormValues {
  type: HealthLogType
  description: string
  weight: string
  note: string
}

interface HealthLogFormModalProps {
  visible: boolean
  loading?: boolean
  initialWeight?: string
  onClose: () => void
  onSubmit: (values: HealthLogFormValues) => void
}

const TYPE_OPTIONS: Array<{
  type: HealthLogType
  label: string
  icon: React.ComponentType<any>
}> = [
  { type: 'WEIGHT', label: 'น้ำหนัก', icon: Scale },
  { type: 'SYMPTOMS', label: 'อาการป่วย', icon: Stethoscope },
  { type: 'BEHAVIOR', label: 'พฤติกรรม', icon: Activity }
]

export default function HealthLogFormModal({
  visible,
  loading = false,
  initialWeight,
  onClose,
  onSubmit
}: HealthLogFormModalProps) {
  const [type, setType] = useState<HealthLogType>('WEIGHT')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{
    description?: string
    weight?: string
  }>({})

  useEffect(() => {
    if (!visible) return

    setType('WEIGHT')
    setDescription('')
    setWeight(initialWeight || '')
    setNote('')
    setErrors({})
  }, [visible, initialWeight])

  const descriptionPlaceholder = useMemo(() => {
    if (type === 'WEIGHT') return 'เช่น น้ำหนักเพิ่มขึ้นจากสัปดาห์ก่อน'
    if (type === 'SYMPTOMS') return 'เช่น มีอาการไอ จาม หรือเบื่ออาหาร'
    return 'เช่น ซึม ไม่เล่น หรือกระสับกระส่าย'
  }, [type])

  const handleSubmit = () => {
    const nextErrors: { description?: string; weight?: string } = {}

    if (!description.trim()) {
      nextErrors.description = 'กรุณากรอกรายละเอียด'
    }

    if (type === 'WEIGHT') {
      const normalizedWeight = weight.trim().replace(',', '.')
      const parsed = Number(normalizedWeight)
      if (
        !normalizedWeight ||
        Number.isNaN(parsed) ||
        parsed <= 0 ||
        parsed > 300
      ) {
        nextErrors.weight = 'กรุณากรอกน้ำหนักที่ถูกต้อง'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      type,
      description: description.trim(),
      weight: weight.trim(),
      note: note.trim()
    })
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={460}
      containerStyle={styles.modalContainer}
    >
      <Text style={styles.title}>บันทึกสุขภาพใหม่</Text>
      <Text style={styles.subtitle}>
        ติดตามน้ำหนัก อาการ และพฤติกรรม เพื่อดูแนวโน้มสุขภาพได้ชัดเจน
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        <Text style={styles.sectionLabel}>ประเภทข้อมูลสุขภาพ</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon
            const active = option.type === type

            return (
              <TouchableOpacity
                key={option.type}
                style={[styles.typeButton, active && styles.typeButtonActive]}
                onPress={() => setType(option.type)}
                activeOpacity={0.85}
              >
                <Icon
                  size={16}
                  color={
                    active ? colors.background.secondary : colors.primary.light
                  }
                  strokeWidth={1.8}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    active && styles.typeButtonTextActive
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {type === 'WEIGHT' && (
          <InputText
            title="น้ำหนัก (กิโลกรัม)"
            value={weight}
            placeholder="เช่น 4.8"
            keyboardType="numeric"
            required
            error={errors.weight || null}
            onChangeText={setWeight}
          />
        )}

        <InputText
          title="รายละเอียด"
          value={description}
          placeholder={descriptionPlaceholder}
          multiline
          numberOfLines={4}
          required
          error={errors.description || null}
          onChangeText={setDescription}
        />

        <InputText
          title="หมายเหตุเพิ่มเติม"
          value={note}
          placeholder="รายละเอียดที่อยากบันทึกเพิ่มเติม (ไม่บังคับ)"
          multiline
          numberOfLines={3}
          onChangeText={setNote}
        />

        <View style={styles.autoTimeHintBox}>
          <Text style={styles.autoTimeHintTitle}>วันเวลาอัตโนมัติ</Text>
          <Text style={styles.autoTimeHintText}>
            ระบบจะบันทึกวันและเวลาปัจจุบันอัตโนมัติเมื่อกดบันทึก
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionRow}>
        <Button
          title="ยกเลิก"
          variant="ghost"
          onPress={onClose}
          style={styles.halfButton}
          disabled={loading}
        />
        <Button
          title="บันทึกข้อมูล"
          onPress={handleSubmit}
          loading={loading}
          style={styles.halfButton}
          disabled={loading}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '90%'
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    textAlign: 'center'
  },
  subtitle: {
    marginTop: spacing[1],
    marginBottom: spacing[3],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal
  },
  scrollArea: {
    maxHeight: 520
  },
  sectionLabel: {
    marginBottom: spacing[2],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600]
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3]
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1]
  },
  typeButtonActive: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light
  },
  typeButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.DEFAULT
  },
  typeButtonTextActive: {
    color: colors.background.secondary
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3]
  },
  halfButton: {
    flex: 1
  },
  autoTimeHintBox: {
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing[2],
    gap: 2
  },
  autoTimeHintTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium
  },
  autoTimeHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal
  }
})
