import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Header from '../../components/header_component'
import ReminderCard from '../../reminder/components/reminder_card'
import PetInfoCard from '../components/pet_info_card'

export default function PetProfilePage() {
  return (
    <ScrollView style={styles.container}>
      <Header title="โปรไฟล์สัตว์เลี้ยง" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สัตว์เลี้ยงของฉัน</Text>
        <PetInfoCard data={petData} />
      </View>

      {/* Appointments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>กิจกรรมที่ใกล้เข้ามา</Text>

        <ReminderCard reminder={mockReminder} canDelete={false} />
      </View>
    </ScrollView>
  )
}

const petData = {
  name: 'ร็อคเก็ต',
  gender: 'ชาย',
  breed: 'แมว',
  species: 'เปอร์เซีย',
  age: '3 ปี 4 เดือน', // คำนวณจากวันเกิด
  weight: '8 กิโลกรัม'
}

const mockReminder = {
  id: '1',
  userId: 'user123',
  petId: 'pet456',
  petName: 'ร็อคเก็ต',
  categoryId: 'cat001',
  reminderName: 'อาบน้ำตัดขน',
  description: 'นัดหมายอาบน้ำและตัดขนที่ร้อคเก็ต',
  reminderDate: '2025-09-17',
  reminderTime: '13:30',
  reminderStatus: 'to_do',
  statusUpdatedAt: '2025-09-10T10:00:00Z',
  createdAt: '2025-09-01T08:00:00Z',
  updatedAt: '2025-09-01T08:00:00Z'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    marginBottom: 16,
    fontFamily: 'Prompt_500Medium'
  },
  petIconContainer: {
    alignItems: 'center',
    marginVertical: 10
  },
  petIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#B8D9ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  petIconLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Prompt_400Regular'
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  petAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5BA3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardHeaderText: {
    flex: 1
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Prompt_400Regular'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Prompt_400Regular'
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#5BA3D0',
    marginRight: 12
  },
  appointmentInfo: {
    flex: 1
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  appointmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  appointmentDetailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6
  },
  appointmentRight: {
    marginLeft: 12
  }
})
