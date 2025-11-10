import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface PetInfoCardProps {
  data: any // Define a proper type based on your data structure
}

export default function PetInfoCard(props: PetInfoCardProps) {
  return (
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
              <Text style={styles.infoText}>{'พันธุ์'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>{'อายุ'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="paw-outline" size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>เพศ {props.data.gender}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="fitness-outline" size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>{props.data.weight}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
  }
})
