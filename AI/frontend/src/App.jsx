import { useState } from 'react'
import ClaimForm from './components/ClaimForm'
import ClaimResult from './components/ClaimResult'

function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold text-gray-800">
            Disaster Aid Claim Verifier
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            AI-powered instant verification using GDACS, HDX, and GDELT data
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">
                Verifying claim against live disaster databases...
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Checking GDACS · World Bank · GDELT · Gemini AI
              </p>
              <p className="text-gray-300 text-xs mt-2">
                (May take up to 60s if AI rate limit is hit)
              </p>
            </div>
          ) : result ? (
            <ClaimResult result={result} onReset={() => setResult(null)} />
          ) : (
            <ClaimForm onResult={setResult} onLoading={setLoading} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          For demonstration purposes only · Data sourced from public APIs
        </p>
      </div>
    </div>
  )
}

export default App
