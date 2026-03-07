export default function ClaimResult({ result, onReset }) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold text-lg mb-2">
          Submission Error
        </p>
        <p className="text-red-500 text-sm">{result.error}</p>
        <button
          onClick={onReset}
          className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { verdict, claim, payment, dataSources } = result;
  const approved = verdict?.decision === "APPROVED";

  return (
    <div className="space-y-5">
      {/* Decision Banner */}
      <div
        className={`rounded-xl p-6 text-center border-2 ${
          approved
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 text-3xl font-bold mb-2 ${
            approved ? "text-green-600" : "text-red-600"
          }`}
        >
          <span>{approved ? "✓" : "✗"}</span>
          <span>{verdict?.decision}</span>
        </div>
        <div className="text-gray-600 text-sm mt-1">
          Confidence:{" "}
          <span className="font-semibold">{verdict?.confidence}%</span>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 bg-gray-200 rounded-full h-2 w-64 mx-auto">
          <div
            className={`h-2 rounded-full transition-all ${
              approved ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${verdict?.confidence}%` }}
          />
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          AI Reasoning
        </h3>
        {verdict?.note && (
          <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
            ⚠ {verdict.note}
          </p>
        )}
        <p className="text-gray-700 text-sm leading-relaxed">
          {verdict?.reasoning}
        </p>
      </div>

      {/* Risk Flags */}
      {verdict?.risk_flags?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Risk Flags
          </h3>
          <ul className="space-y-1">
            {verdict.risk_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment Status */}
      {approved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
            Payment Status
          </h3>
          {payment?.error ? (
            <p className="text-red-500 text-sm">{payment.error}</p>
          ) : payment ? (
            <div className="space-y-1 text-sm text-green-800">
              <p>
                <span className="font-medium">Amount:</span> $
                {payment.amount?.toLocaleString()} {payment.currency}
              </p>
              <p>
                <span className="font-medium">Transaction ID:</span>{" "}
                <code className="bg-green-100 px-2 py-0.5 rounded text-xs font-mono">
                  {payment.paymentIntentId}
                </code>
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span className="capitalize">{payment.status}</span>
              </p>
              <p className="text-xs text-green-600 mt-2">
                ✦ Test mode — no real money transferred.
              </p>
            </div>
          ) : (
            <p className="text-sm text-green-700">
              Payout approved. Configure STRIPE_SECRET_KEY to enable automatic
              disbursement.
            </p>
          )}
        </div>
      )}

      {/* Data Sources */}
      <details className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer">
        <summary className="text-sm font-semibold text-gray-500 uppercase tracking-wide select-none">
          Data Sources Used ▼
        </summary>
        <div className="mt-4 space-y-4">
          {/* GDACS */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-1">
              GDACS — Global Disaster Alert
            </h4>
            <p className="text-xs text-gray-500">{dataSources?.gdacs?.summary}</p>
            {dataSources?.gdacs?.events?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {dataSources.gdacs.events.map((e, i) => (
                  <li
                    key={i}
                    className="text-xs bg-gray-50 border border-gray-100 rounded px-3 py-2"
                  >
                    <span className="font-medium">{e.name}</span> —{" "}
                    {e.eventType} | Alert:{" "}
                    <span
                      className={
                        e.alertLevel === "Red"
                          ? "text-red-600 font-semibold"
                          : e.alertLevel === "Orange"
                          ? "text-orange-500 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      {e.alertLevel}
                    </span>{" "}
                    | {e.fromDate?.split("T")[0]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* HDX */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-1">
              World Bank — Vulnerability Indicators
            </h4>
            <p className="text-xs text-gray-500">{dataSources?.hdx?.summary}</p>
            {dataSources?.hdx?.indicators && (
              <div className="mt-2 space-y-0.5">
                {Object.entries(dataSources.hdx.indicators).map(([k, v]) => (
                  <p key={k} className="text-xs text-gray-500">
                    <span className="font-medium capitalize">{k.replace(/_/g, ' ')}: </span>
                    {typeof v.value === 'number' ? v.value.toLocaleString() : v.value}
                    {v.year ? ` (${v.year})` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* GDELT */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 mb-1">
              GDELT — News Coverage
            </h4>
            <p className="text-xs text-gray-500">{dataSources?.gdelt?.summary}</p>
            {dataSources?.gdelt?.articles?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {dataSources.gdelt.articles.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-xs text-blue-600 truncate">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {a.title || a.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>

      {/* Claim Summary */}
      <details className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer">
        <summary className="text-sm font-semibold text-gray-500 uppercase tracking-wide select-none">
          Submitted Claim Details ▼
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {Object.entries(claim || {}).map(([k, v]) => (
            <div key={k}>
              <span className="text-gray-400 capitalize text-xs">{k.replace(/([A-Z])/g, " $1")}: </span>
              <span className="text-gray-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
      </details>

      <button
        onClick={onReset}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        Submit Another Claim
      </button>
    </div>
  );
}
