import Button from '@/presentation/components/button'
import InputText from '@/presentation/components/input'
import MainLayout from '@/presentation/components/main-layout'

export default function NewsPage() {
  return (
    <MainLayout pageTitle="ข่าวสารและบทความ">
      <div className="bg-gray-100 p-4 rounded-lg shadow-md">News Page</div>
      <Button variant="primary" size="md">
        ดูรายละเอียด
      </Button>
      <InputText placeholder="กรอกข้อมูล" error="ลอง" />
    </MainLayout>
  )
}
