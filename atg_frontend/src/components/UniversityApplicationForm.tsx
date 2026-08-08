import { useState } from "react";
import universityApplicationApi from "../api/universityApplicationApi";

interface UniversityApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UniversityApplicationForm({ onSuccess, onCancel }: UniversityApplicationFormProps) {
  const [formData, setFormData] = useState({
    universityName: "",
    programName: "",
    applicationStatus: "pending",
    submissionDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        universityName: formData.universityName,
        programName: formData.programName,
        applicationStatus: formData.applicationStatus,
        submissionDate: formData.submissionDate ? new Date(formData.submissionDate).toISOString() : undefined,
      };

      await universityApplicationApi.create(data as any);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">University Name *</label>
        <input
          type="text"
          name="universityName"
          value={formData.universityName}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          placeholder="e.g., Harvard University"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Program Name *</label>
        <input
          type="text"
          name="programName"
          value={formData.programName}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          placeholder="e.g., Master of Computer Science"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          name="applicationStatus"
          value={formData.applicationStatus}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Submission Date</label>
        <input
          type="date"
          name="submissionDate"
          value={formData.submissionDate}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Application"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
