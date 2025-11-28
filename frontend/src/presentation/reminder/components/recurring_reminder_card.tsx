import { getCategoryInfo, IReminder } from '@/src/domain/reminder.domain'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import {
  Bone,
  BriefcaseMedical,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Hourglass,
  PawPrint,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag
} from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

interface RecurringInstance {
  id: string
  date: string
  time: string
  instanceNumber: number
  isCompleted: boolean
}

interface RecurringReminderCardProps {
  reminder: IReminder
  instances: RecurringInstance[]
  onToggleInstance?: (instanceId: string) => void
  onPress?: (id: string) => void
  onDelete?: (reminderId: string) => void
}

export default function RecurringReminderCard({
  reminder,
  instances,
  onToggleInstance,
  onPress,
  onDelete
}: RecurringReminderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const translateX = useRef(new Animated.Value(0)).current
  const categoryInfo = getCategoryInfo(reminder?.categoryName || 'General')
  const CategoryIcon = ICON_MAP[categoryInfo.icon] || Tag

  // Get next due date (first incomplete instance)
  const nextInstance = instances.find((inst) => !inst.isCompleted)
  const nextDate = nextInstance
    ? dayjs(nextInstance.date).locale('th')
    : dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = nextDate.year() + 543

  const completedCount = instances.filter((inst) => inst.isCompleted).length
  const totalCount = instances.length

  const formatDate = (dateString: string) => {
    const date = dayjs(dateString).locale('th')
    const formattedDate = `${date.format('วันdddd DD MMM')} ${
      date.year() + 543
    }`
    return formattedDate
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) + ' น.'
  }

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: '#EC4899' }]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: categoryInfo.color + '20' }
              ]}
            >
              <CategoryIcon size={20} color={categoryInfo.color} />
            </View>
            <Text style={styles.title}>{reminder.reminderName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isExpanded ? (
              <ChevronUp size={24} color="#A6A6A6" />
            ) : (
              <ChevronDown size={24} color="#A6A6A6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <PawPrint size={14} color="#2E759E" />
          <Text style={styles.petName}>{reminder.pet_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <BriefcaseMedical size={14} color="#2E759E" />
          <Text style={styles.countText}>
            วัคซีนรวมป้องกันโรคหัด ({totalCount} เข็ม)
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Calendar
            size={14}
            color={completedCount === totalCount ? '#15AD90' : '#FF9531'}
          />
          <Text
            style={[
              styles.nextDueText,
              { color: completedCount === totalCount ? '#15AD90' : '#FF9531' }
            ]}
          >
            {completedCount === totalCount
              ? 'ฉีดวัคซีนครบตามกำหนด'
              : `ฉีดเข้มที่ 1 ใน${nextInstance ? 'อีก' : ''} ${
                  buddhistYear - 2568
                } วัน`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Instances List */}
      {isExpanded && (
        <View style={styles.instancesContainer}>
          {instances.map((instance, index) => (
            <View
              key={instance.id}
              style={[
                styles.instanceRow,
                index === instances.length - 1 && styles.instanceRowLast
              ]}
            >
              <TouchableOpacity
                onPress={() => onToggleInstance?.(instance.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View
                  style={[
                    styles.checkbox,
                    instance.isCompleted && styles.checkboxCompleted
                  ]}
                >
                  {instance.isCompleted && (
                    <View style={styles.checkboxInner} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.instanceLeft}>
                <View style={styles.instanceInfo}>
                  <Text style={styles.instanceDate}>
                    {formatDate(instance.date)}, {formatTime(instance.time)}
                  </Text>
                  <Text style={styles.instanceLabel}>
                    วัคซีนเข้มที่ {instance.instanceNumber}/{totalCount}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.iconTimeContainer,
                  {
                    backgroundColor: instance.isCompleted
                      ? '#E6FFFA'
                      : '#FFF4E6'
                  }
                ]}
              >
                {instance.isCompleted ? (
                  <Check size={20} color="#15AD90" />
                ) : (
                  <Hourglass size={20} color="#FF9531" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    flex: 1
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  petName: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  countText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  nextDueText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium'
  },
  instancesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  instanceRowLast: {
    borderBottomWidth: 0
  },
  instanceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingLeft: 16
  },
  iconTimeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A6A6A6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  checkboxCompleted: {
    borderColor: '#D4B5F5'
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4B5F5'
  },
  instanceInfo: {
    flex: 1,
    gap: 4
  },
  instanceDate: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  instanceLabel: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  }
})
