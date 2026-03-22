import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import { useFormik } from 'formik'
import Modal from '@/src/presentation/components/modal'
import InputText from '@/src/presentation/components/text_input'
import { Activity, Scale, Stethoscope } from 'lucide-react-native'
import React, { useEffect, useMemo } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import { HealthLogFormValues, HealthLogType } from '@/src/domain/pet.domain'
 

const TYPE_OPTIONS: Array<{
  type: HealthLogType
  label: string
  icon: React.ComponentType<any>
}> = [
  { type: 'WEIGHT', label: 'น้ำหนัก', icon: Scale },
  { type: 'SYMPTOMS', label: 'อาการป่วย', icon: Stethoscope },
  { type: 'BEHAVIOR', label: 'พฤติกรรม', icon: Activity }
]

interface HealthLogFormModalProps {
  visible: boolean
  loading?: boolean
  initialWeight?: string
  onClose: () => void
  onSubmit: (values: HealthLogFormValues) => void
}

export default function HealthLogFormModal({
  visible,
  loading = false,
  initialWeight,
  onClose,
  onSubmit
}: HealthLogFormModalProps) {
  const formik = useFormik<HealthLogFormValues>({
    initialValues: {
      type: 'WEIGHT',
      description: '',
      weight: String(initialWeight ?? ''),
      note: ''
    },
    enableReinitialize: true,
    validateOnBlur: false,
    validateOnChange: false,
    validate: (values) => {
      const errors: { description?: string; weight?: string } = {}
      const descriptionText = String(values.description ?? '').trim()
      const weightText = String(values.weight ?? '').trim()

      if (values.type !== 'WEIGHT' && !descriptionText) {
        errors.description = 'กรุณากรอกรายละเอียด'
      }

      if (values.type === 'WEIGHT') {
        const normalizedWeight = weightText.replace(',', '.')
        const parsed = Number(normalizedWeight)
        if (
          !normalizedWeight ||
          Number.isNaN(parsed) ||
          parsed <= 0 ||
          parsed > 300
        ) {
          errors.weight = 'กรุณากรอกน้ำหนักที่ถูกต้อง'
        }
      }

      return errors
    },
    onSubmit: (values) => {
      onSubmit({
        type: values.type,
        description: String(values.description ?? '').trim(),
        weight: String(values.weight ?? '').trim(),
        note: String(values.note ?? '').trim()
      })
    }
  })

  useEffect(() => {
    if (!visible) return

    formik.resetForm({
      values: {
        type: 'WEIGHT',
        description: '',
        weight: String(initialWeight ?? ''),
        note: ''
      }
    })
  }, [visible, initialWeight])

  const descriptionPlaceholder = useMemo(() => {
    if (formik.values.type === 'WEIGHT')
      return 'เช่น น้ำหนักเพิ่มขึ้นจากสัปดาห์ก่อน'
    if (formik.values.type === 'SYMPTOMS')
      return 'เช่น มีอาการไอ จาม หรือเบื่ออาหาร'
    return 'เช่น ซึม ไม่เล่น หรือกระสับกระส่าย'
  }, [formik.values.type])

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
            const active = option.type === formik.values.type

            return (
              <TouchableOpacity
                key={option.type}
                style={[styles.typeButton, active && styles.typeButtonActive]}
                onPress={() => formik.setFieldValue('type', option.type)}
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

        {formik.values.type === 'WEIGHT' && (
          <InputText
            title="น้ำหนัก (กิโลกรัม)"
            value={formik.values.weight}
            placeholder="เช่น 4.8"
            keyboardType="numeric"
            required
            error={formik.errors.weight || null}
            onChangeText={(text) => formik.setFieldValue('weight', text)}
          />
        )}

        <InputText
          title="รายละเอียด"
          value={formik.values.description}
          placeholder={descriptionPlaceholder}
          multiline
          numberOfLines={4}
          required={formik.values.type !== 'WEIGHT'}
          error={formik.errors.description || null}
          onChangeText={(text) => formik.setFieldValue('description', text)}
        />

        <InputText
          title="หมายเหตุเพิ่มเติม"
          value={formik.values.note}
          placeholder="รายละเอียดที่อยากบันทึกเพิ่มเติม (ไม่บังคับ)"
          multiline
          numberOfLines={3}
          onChangeText={(text) => formik.setFieldValue('note', text)}
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
          onPress={() => formik.handleSubmit()}
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
