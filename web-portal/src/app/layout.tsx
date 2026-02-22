import type { Metadata } from 'next'
import { Prompt } from 'next/font/google'
import './globals.css'

const prompt = Prompt({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin', 'thai'],
  variable: '--font-prompt',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'PetCare Admin Portal',
  description: 'Admin portal for managing news and updates'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${prompt.variable} antialiased`}>{children}</body>
    </html>
  )
}
