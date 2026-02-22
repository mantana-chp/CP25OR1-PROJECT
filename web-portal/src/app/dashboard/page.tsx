import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 to-secondary">
      <div className="container-custom py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-primary-900 mb-4">
              PetCare Admin Portal
            </h1>
            <p className="text-xl text-grey">
              Manage news and updates for your mobile app users
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link
              href="/news"
              className="group block p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 border-primary-100 hover:border-primary-400"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-dark-grey group-hover:text-primary-600 transition-colors">
                  News & Updates
                </h2>
              </div>
              <p className="text-grey">
                Create, edit, and manage news articles and updates for mobile
                app users
              </p>
            </Link>

            <div className="p-6 bg-white rounded-xl shadow-md border-2 border-light-grey">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple rounded-lg flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-dark-grey">
                  Analytics
                </h2>
              </div>
              <p className="text-grey">
                View engagement metrics and user statistics (Coming Soon)
              </p>
            </div>
          </div>

          {/* Demo Section - Custom Tailwind Variables */}
          <div className="bg-white rounded-xl shadow-md p-8 border-2 border-light-grey">
            <h3 className="text-2xl font-semibold mb-6 text-dark-grey">
              Custom Theme Demo
            </h3>

            {/* Color Palette */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Color Palette
              </h4>
              <div className="grid grid-cols-5 gap-2">
                <div className="space-y-2">
                  <div className="h-12 bg-primary-300 rounded-md"></div>
                  <div className="h-12 bg-primary-500 rounded-md"></div>
                  <div className="h-12 bg-primary-700 rounded-md"></div>
                  <p className="text-xs text-grey text-center">Primary</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-info-300 rounded-md"></div>
                  <div className="h-12 bg-info-500 rounded-md"></div>
                  <div className="h-12 bg-info-700 rounded-md"></div>
                  <p className="text-xs text-grey text-center">Info</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-success-300 rounded-md"></div>
                  <div className="h-12 bg-success-500 rounded-md"></div>
                  <div className="h-12 bg-success-700 rounded-md"></div>
                  <p className="text-xs text-grey text-center">Success</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-warning-300 rounded-md"></div>
                  <div className="h-12 bg-warning-500 rounded-md"></div>
                  <div className="h-12 bg-warning-700 rounded-md"></div>
                  <p className="text-xs text-grey text-center">Warning</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-danger-300 rounded-md"></div>
                  <div className="h-12 bg-danger-500 rounded-md"></div>
                  <div className="h-12 bg-danger-700 rounded-md"></div>
                  <p className="text-xs text-grey text-center">Danger</p>
                </div>
              </div>
            </div>

            {/* Button Examples */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Button Styles
              </h4>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-md">
                  Primary
                </button>
                <button className="px-6 py-2 bg-info-500 text-white rounded-lg hover:bg-info-600 transition-colors shadow-md">
                  Info
                </button>
                <button className="px-6 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors shadow-md">
                  Success
                </button>
                <button className="px-6 py-2 bg-warning-500 text-white rounded-lg hover:bg-warning-600 transition-colors shadow-md">
                  Warning
                </button>
                <button className="px-6 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors shadow-md">
                  Danger
                </button>
              </div>
            </div>

            {/* Neutral Colors */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Neutral Colors
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <div className="h-12 bg-black rounded-md"></div>
                  <p className="text-xs text-grey text-center">Black</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-dark-purple rounded-md"></div>
                  <p className="text-xs text-grey text-center">Dark Purple</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-purple rounded-md"></div>
                  <p className="text-xs text-grey text-center">Purple</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-light-purple rounded-md"></div>
                  <p className="text-xs text-grey text-center">Light Purple</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-dark-grey rounded-md"></div>
                  <p className="text-xs text-white text-center">Dark Grey</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-grey rounded-md"></div>
                  <p className="text-xs text-white text-center">Grey</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-medium-grey rounded-md"></div>
                  <p className="text-xs text-grey text-center">Medium Grey</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-light-grey rounded-md border border-medium-grey"></div>
                  <p className="text-xs text-grey text-center">Light Grey</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-dark-blue-grey rounded-md"></div>
                  <p className="text-xs text-white text-center">
                    Dark Blue Grey
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-medium-blue-grey rounded-md"></div>
                  <p className="text-xs text-white text-center">
                    Med Blue Grey
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-blue-grey rounded-md"></div>
                  <p className="text-xs text-white text-center">Blue Grey</p>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Typography (Prompt Font)
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-grey">Small text - Prompt font</p>
                <p className="text-base text-dark-grey">
                  Regular text - Prompt font
                </p>
                <p className="text-lg text-dark-grey">
                  Large text - Prompt font
                </p>
                <p className="text-xl font-semibold text-black">
                  Extra large text - Prompt font
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
