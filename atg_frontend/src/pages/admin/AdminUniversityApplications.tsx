import { useEffect, useState } from "react";
import universityApplicationApi from "../../api/universityApplicationApi";
import type { UniversityApplication } from "../../api/universityApplicationApi";

export default function AdminUniversityApplications() {
  const [applications, setApplications] = useState<UniversityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<UniversityApplication>>({});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await universityApplicationApi.listAll();
      setApplications(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: UniversityApplication) => {
    setEditingId(app.id);
    setEditData(app);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await universityApplicationApi.update(editingId, editData);
      setEditingId(null);
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update application");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    try {
      await universityApplicationApi.remove(id);
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete application");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">University Applications</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">University</th>
                <th className="p-3 text-left">Program</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Submission Date</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {editingId === app.id ? (
                      <span className="text-sm">{app.user?.email}</span>
                    ) : (
                      <span className="text-sm">{app.user?.email}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === app.id ? (
                      <input
                        type="text"
                        value={editData.universityName || ""}
                        onChange={(e) => setEditData({ ...editData, universityName: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      app.universityName
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === app.id ? (
                      <input
                        type="text"
                        value={editData.programName || ""}
                        onChange={(e) => setEditData({ ...editData, programName: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      app.programName
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === app.id ? (
                      <select
                        value={editData.applicationStatus || ""}
                        onChange={(e) => setEditData({ ...editData, applicationStatus: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-white text-sm ${
                        app.applicationStatus === "accepted" ? "bg-green-500" :
                        app.applicationStatus === "rejected" ? "bg-red-500" :
                        app.applicationStatus === "submitted" ? "bg-blue-500" :
                        "bg-yellow-500"
                      }`}>
                        {app.applicationStatus}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === app.id ? (
                      <input
                        type="date"
                        value={editData.submissionDate ? editData.submissionDate.split('T')[0] : ""}
                        onChange={(e) => setEditData({ ...editData, submissionDate: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      app.submissionDate ? new Date(app.submissionDate).toLocaleDateString() : "-"
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === app.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(app)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {applications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No university applications found.
          </div>
        )}
      </div>
    </>
  );
}
