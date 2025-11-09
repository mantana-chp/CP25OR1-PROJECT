import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function PetProfilePage() {
  const petData = {
    name: 'ร็อคเก็ต',
    gender: 'ชาย',
    breed: 'อบ',
    age: '3 ปี 4 เดือน',
    weight: '8 กิโลกรัม',
    color: 'เทา, เหลือง'
  }

  const appointment = {
    type: 'อาบน้ำตัดขน',
    location: 'ร้อคเก็ต',
    date: '17/09/2568',
    time: '13.30 น.'
  }

  return (
    <ScrollView style={styles.container}>
      {/* Pet Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สัตว์เลี้ยงของฉัน</Text>

        <View style={styles.petIconContainer}>
          <View style={styles.petIcon}>
            <Ionicons name="paw" size={32} color="#5BA3D0" />
          </View>
          <Text style={styles.petIconLabel}>ร็อคเก็ต</Text>
        </View>
      </View>

      {/* Pet Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.petAvatar}>
            <Ionicons name="paw" size={40} color="white" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.petName}>ร็อคเก็ต</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="male" size={14} color="#5BA3D0" />
                <Text style={styles.infoText}>พันธุ์</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color="#5BA3D0" />
                <Text style={styles.infoText}>{petData.age}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="paw-outline" size={14} color="#5BA3D0" />
                <Text style={styles.infoText}>เพศ ผู้</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="fitness-outline" size={14} color="#5BA3D0" />
                <Text style={styles.infoText}>{petData.weight}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Appointments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>กิจกรรมที่ใกล้เข้ามา</Text>

        <TouchableOpacity style={styles.appointmentCard}>
          <View style={styles.appointmentLeft}>
            <View style={styles.radioButton} />
            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentType}>{appointment.type}</Text>
              <View style={styles.appointmentDetails}>
                <Ionicons name="home-outline" size={14} color="#666" />
                <Text style={styles.appointmentDetailText}>
                  {appointment.location}
                </Text>
              </View>
              <View style={styles.appointmentDetails}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.appointmentDetailText}>
                  {appointment.date}, {appointment.time}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.appointmentRight}>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'Prompt_400Regular'
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
