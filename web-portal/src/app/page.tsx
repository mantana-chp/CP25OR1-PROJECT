import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-black mb-8">
          PetCare Admin Portal
        </h1>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-md"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
