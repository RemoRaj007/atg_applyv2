import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobApi } from '../../api/jobApi';
import Button from '../../components/ui/AtgButton';

export default function OperatorAddJob() {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await jobApi.create({
        company,
        title,
        location,
        source: 'manual',
        deadline: deadline || undefined,
        description: description.trim() || undefined
      });
      navigate('/operator/applications');
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-serif font-bold text-gray-800">Add a job</h1>
        <p className="text-sm text-gray-500 mt-1">Manually add a job to the pipeline for staffing.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-150 shadow-sm p-8 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Backend Engineer"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-action-500 focus:border-action-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company</label>
          <input
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Spotify"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-action-500 focus:border-action-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Remote"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-action-500 focus:border-action-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-action-500 focus:border-action-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the job role, responsibilities, benefits..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-action-500 focus:border-action-500 outline-none text-sm resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Adding...' : 'Add Job'}
        </Button>
      </form>
    </div>
  );
}
