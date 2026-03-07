import { useState } from "react";

const DISASTER_TYPES = [
  { value: "earthquake", label: "Earthquake" },
  { value: "flood", label: "Flood" },
  { value: "cyclone", label: "Cyclone / Hurricane / Typhoon" },
  { value: "volcano", label: "Volcanic Eruption" },
  { value: "drought", label: "Drought" },
  { value: "wildfire", label: "Wildfire" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  "Afghanistan", "Bangladesh", "Brazil", "Cambodia", "Cameroon", "Chad",
  "China", "Colombia", "Democratic Republic of Congo", "Ecuador", "Ethiopia",
  "Ghana", "Guatemala", "Haiti", "Honduras", "India", "Indonesia", "Iran",
  "Iraq", "Kenya", "Laos", "Libya", "Madagascar", "Malawi", "Mali", "Mexico",
  "Mozambique", "Myanmar", "Nepal", "Nigeria", "Pakistan", "Peru",
  "Philippines", "Senegal", "Sierra Leone", "Somalia", "South Sudan",
  "Sudan", "Syria", "Tanzania", "Thailand", "Turkey", "Uganda", "Ukraine",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const INITIAL_STATE = {
  name: "",
  country: "",
  disasterType: "",
  incidentDate: "",
  description: "",
  amount: "",
};

export default function ClaimForm({ onResult, onLoading }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.country) e.country = "Please select a country.";
    if (!form.disasterType) e.disasterType = "Please select a disaster type.";
    if (!form.incidentDate) e.incidentDate = "Incident date is required.";
    else if (new Date(form.incidentDate) > new Date())
      e.incidentDate = "Date cannot be in the future.";
    if (!form.description.trim() || form.description.trim().length < 30)
      e.description = "Please describe the incident (at least 30 characters).";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = "Enter a valid amount greater than 0.";
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onLoading(true);
    try {
      const { submitClaim } = await import("../services/api");
      const result = await submitClaim(form);
      onResult(result);
    } catch (err) {
      onResult({
        error:
          err.response?.data?.error ||
          "An unexpected error occurred. Please try again.",
      });
    } finally {
      onLoading(false);
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const errorCls = "text-red-500 text-xs mt-1";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Full Name */}
      <div>
        <label htmlFor="name" className={labelCls}>
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Ahmad Karim"
          value={form.name}
          onChange={handleChange}
          className={inputCls}
        />
        {errors.name && <p className={errorCls}>{errors.name}</p>}
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className={labelCls}>
          Country of Incident
        </label>
        <select
          id="country"
          name="country"
          value={form.country}
          onChange={handleChange}
          className={inputCls}
        >
          <option value="">Select a country...</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.country && <p className={errorCls}>{errors.country}</p>}
      </div>

      {/* Disaster Type + Date on same row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="disasterType" className={labelCls}>
            Disaster Type
          </label>
          <select
            id="disasterType"
            name="disasterType"
            value={form.disasterType}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="">Select type...</option>
            {DISASTER_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {errors.disasterType && (
            <p className={errorCls}>{errors.disasterType}</p>
          )}
        </div>
        <div>
          <label htmlFor="incidentDate" className={labelCls}>
            Date of Incident
          </label>
          <input
            id="incidentDate"
            name="incidentDate"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={form.incidentDate}
            onChange={handleChange}
            className={inputCls}
          />
          {errors.incidentDate && (
            <p className={errorCls}>{errors.incidentDate}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelCls}>
          Describe Your Situation
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Describe how the disaster affected you, your family, and your livelihood..."
          value={form.description}
          onChange={handleChange}
          className={`${inputCls} resize-none`}
        />
        <p className="text-gray-400 text-xs mt-1">
          {form.description.length} / 500 characters
        </p>
        {errors.description && <p className={errorCls}>{errors.description}</p>}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className={labelCls}>
          Financial Aid Requested (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            max="10000"
            placeholder="e.g. 500"
            value={form.amount}
            onChange={handleChange}
            className={`${inputCls} pl-7`}
          />
        </div>
        {errors.amount && <p className={errorCls}>{errors.amount}</p>}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        Submit Claim for AI Review
      </button>
    </form>
  );
}
