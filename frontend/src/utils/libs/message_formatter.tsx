import React from 'react'
import { StyleSheet, Text, TextStyle, View } from 'react-native'

export interface MessageFormatStyles {
  messageText: TextStyle
  userText?: TextStyle
  aiText?: TextStyle
}

/**
 * Format inline text with bold markdown support (**text**)
 */
export const formatInlineText = (
  text: string,
  styles: MessageFormatStyles,
  isUser: boolean
): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={internalStyles.bold}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    return part
  })
}

/**
 * Format a complete message with support for:
 * - Numbered lists (1., 2., etc.)
 * - Bullet points (*, -)
 * - Bold text (**text**)
 * - Paragraphs with proper spacing
 */
export const formatMessage = (
  text: string,
  styles: MessageFormatStyles,
  isUser: boolean
): React.ReactNode[] => {
  const lines = text.split('\n')
  const formattedElements: React.ReactNode[] = []

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) {
      formattedElements.push(
        <View key={`space-${index}`} style={{ height: 8 }} />
      )
      return
    }

    // Handle numbered lists (1., 2., etc.)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/)
    if (numberedMatch) {
      const [, number, content] = numberedMatch
      formattedElements.push(
        <View key={index} style={internalStyles.listItem}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
              internalStyles.bold
            ]}
          >
            {number}.{' '}
          </Text>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
              internalStyles.listContent
            ]}
          >
            {formatInlineText(content, styles, isUser)}
          </Text>
        </View>
      )
      return
    }

    // Handle bullet points (*, -)
    const bulletMatch = trimmedLine.match(/^[*\-]\s+(.*)$/)
    if (bulletMatch) {
      const content = bulletMatch[1]
      formattedElements.push(
        <View key={index} style={internalStyles.listItem}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText
            ]}
          >
            •{' '}
          </Text>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
              internalStyles.listContent
            ]}
          >
            {formatInlineText(content, styles, isUser)}
          </Text>
        </View>
      )
      return
    }

    // Regular paragraph
    formattedElements.push(
      <Text
        key={index}
        style={[
          styles.messageText,
          isUser ? styles.userText : styles.aiText,
          internalStyles.paragraph
        ]}
      >
        {formatInlineText(trimmedLine, styles, isUser)}
      </Text>
    )
  })

  return formattedElements
}

const internalStyles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingLeft: 8
  },
  listContent: {
    flex: 1,
    flexWrap: 'wrap'
  },
  paragraph: {
    marginVertical: 4
  },
  bold: {
    fontFamily: 'Prompt_500Medium'
  }
})
