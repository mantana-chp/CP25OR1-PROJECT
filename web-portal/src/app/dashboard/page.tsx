import MainLayout from '@/presentation/components/main-layout'
import Link from 'next/link'

export default function Dashboard() {
  return (
    <MainLayout pageTitle="แดชบอร์ด">
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

          {/* Typography Classes Demo */}
          <div className="bg-white rounded-xl shadow-md p-8 border-2 border-light-grey mt-6">
            <h3 className="text-2xl font-semibold mb-6 text-dark-grey">
              Typography Style Classes
            </h3>

            {/* Headings */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Heading Styles
              </h4>
              <div className="space-y-3">
                <h1 className="heading-1">Heading 1 - heading-1</h1>
                <h2 className="heading-2">Heading 2 - heading-2</h2>
                <h3 className="heading-3">Heading 3 - heading-3</h3>
                <h4 className="heading-4">Heading 4 - heading-4</h4>
                <h5 className="heading-5">Heading 5 - heading-5</h5>
                <h6 className="heading-6">Heading 6 - heading-6</h6>
              </div>
            </div>

            {/* Body Text */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Body Text Styles
              </h4>
              <div className="space-y-3">
                <p className="lead-text">
                  Lead text - Used for introductory paragraphs and important
                  content (lead-text)
                </p>
                <p className="large-text">
                  Large text - Slightly larger than normal for emphasis
                  (large-text)
                </p>
                <p className="normal-text">
                  Normal text - Standard body text for most content
                  (normal-text)
                </p>
                <p className="small-text">
                  Small text - For secondary information and captions
                  (small-text)
                </p>
                <p className="tiny-text">
                  Tiny text - For footnotes and legal text (tiny-text)
                </p>
              </div>
            </div>

            {/* Special Styles */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Special Text Styles
              </h4>
              <div className="space-y-3">
                <p className="caption-text">
                  Caption text - For image captions and annotations
                  (caption-text)
                </p>
                <p className="label-text">
                  Label text - For form labels and identifiers (label-text)
                </p>
                <p className="overline-text">
                  Overline text - For section headers (overline-text)
                </p>
                <p className="link-text">
                  Link text - For hyperlinks with hover effects (link-text)
                </p>
                <p className="code-text">
                  const codeText = "For inline code snippets";
                </p>
              </div>
            </div>

            {/* Text Emphasis */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Text Emphasis
              </h4>
              <div className="space-y-3">
                <p className="normal-text bold-text">Bold text (bold-text)</p>
                <p className="normal-text semibold-text">
                  Semibold text (semibold-text)
                </p>
                <p className="normal-text medium-text">
                  Medium text (medium-text)
                </p>
                <p className="normal-text italic-text">
                  Italic text (italic-text)
                </p>
                <p className="normal-text muted-text">
                  Muted text (muted-text)
                </p>
              </div>
            </div>

            {/* Contextual Colors */}
            <div>
              <h4 className="text-lg font-medium mb-4 text-dark-grey">
                Contextual Text Colors
              </h4>
              <div className="space-y-3">
                <p className="normal-text error-text">
                  Error text - For error messages (error-text)
                </p>
                <p className="normal-text success-text">
                  Success text - For success messages (success-text)
                </p>
                <p className="normal-text warning-text">
                  Warning text - For warning messages (warning-text)
                </p>
                <p className="normal-text info-text">
                  Info text - For informational messages (info-text)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  )
}
