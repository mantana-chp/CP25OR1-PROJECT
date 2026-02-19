import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Info } from 'lucide-react-native'

interface InfoButtonProps {
  onPress: () => void
}

export const InfoButton: React.FC<InfoButtonProps> = ({ onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.infoButton}>
      <View style={styles.infoBadge}>
        <Info size={24} color='#FFFFFF' strokeWidth={3} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
