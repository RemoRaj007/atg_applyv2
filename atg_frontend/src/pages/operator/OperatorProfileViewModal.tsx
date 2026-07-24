import { useState, useEffect } from 'react';
import { userProfileApi } from '../../api/userProfileApi';
import type { FullUserProfile } from '../../api/userProfileApi';
import { X, FileText, Download, Briefcase, Clock, Users, TrendingUp } from 'lucide-react';

// ─── Experience Time Calculator Helpers ─────────────────────────────────────
function calcMonths(startDate: string, endDate?: string, isCurrent?: boolean): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = (isCurrent || !endDate) ? new Date() : new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function formatDuration(totalMonths: number): string {
  if (totalMonths <= 0) return '< 1 mo';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.join(' ') || '< 1 mo';
}

function calcExperienceSummary(experiences: any[]) {
  const byRole = experiences.map(exp => ({
    exp,
    months: calcMonths(exp.startDate, exp.endDate, exp.isCurrent),
  }));
  const totalMonths = byRole.reduce((sum, r) => sum + r.months, 0);
  const currentJobs = experiences.filter(e => e.isCurrent).length;
  return { totalMonths, byRole, currentJobs };
}

export default function OperatorProfileViewModal({
  userId,
  onClose,
  fitScore,
  fitReason
}: {
  userId: number;
  onClose: () => void;
  fitScore?: number | null;
  fitReason?: string | null;
}) {
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [dynamicProfile, setDynamicProfile] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userProfileApi.getProfile(userId),
      import('../../api/profileApi').then(({ profileApi }) => profileApi.getValues(userId))
    ]).then(([profileData, dynamicData]) => {
      setProfile(profileData);
      setDynamicProfile(dynamicData);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg text-center text-gray-500">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const viewFile = (url: string) => {
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    window.open(`${backendUrl}${url}`, '_blank');
  };

  const expSummary = profile.experiences ? calcExperienceSummary(profile.experiences) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">User Profile: {profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 bg-gray-50">

          {/* Fit Score Banner if provided */}
          {fitScore !== undefined && fitScore !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">

              </div>
              <div className="space-y-1 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Application Match Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-800">{fitScore}% Fit Score</span>
                </div>
                {fitReason && (
                  <p className="text-sm text-blue-700 leading-relaxed font-medium bg-white/60 p-2.5 rounded-lg border border-blue-100 mt-2">
                    {fitReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Personal Info */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div><span className="text-gray-500 block">First Name</span>{profile.profile?.firstName || '-'}</div>
              <div><span className="text-gray-500 block">Last Name</span>{profile.profile?.lastName || '-'}</div>
              <div><span className="text-gray-500 block">Gender</span>{profile.profile?.gender || '-'}</div>
              <div><span className="text-gray-500 block">Date of Birth</span>{profile.profile?.dob?.substring(0, 10) || '-'}</div>
              <div><span className="text-gray-500 block">Nationality</span>{profile.profile?.currentNationality || '-'}</div>
              <div><span className="text-gray-500 block">Disability</span>{profile.profile?.disability ? 'Yes' : 'No'}</div>
            </div>
          </section>

          {/* Seeking Job Roles */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" /> Seeking Job Roles
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.userJobRoles && profile.userJobRoles.length > 0 ? (
                profile.userJobRoles.map(jr => (
                  <span key={jr.id} className="font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs border border-blue-100">
                    {jr.jobRole?.name || 'Unknown'}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm italic">Not specified</span>
              )}
            </div>
          </section>

          {/* Work Experience */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> Work Experience
            </h3>
            {expSummary && expSummary.totalMonths > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg max-w-max">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Total Calculated Experience:</span>
                <span className="text-xs font-bold text-blue-800">{formatDuration(expSummary.totalMonths)}</span>
                <span className="text-xs text-gray-500">({profile.experiences.length} role{profile.experiences.length > 1 ? 's' : ''})</span>
              </div>
            )}
            <div className="space-y-6">
              {profile.experiences && profile.experiences.length > 0 ? (
                profile.experiences.map(exp => {
                  const months = calcMonths(exp.startDate, exp.endDate, exp.isCurrent);
                  return (
                    <div key={exp.id} className="border-l-2 pl-4 border-blue-500 relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{exp.jobTitle}</h4>
                          <p className="text-xs font-semibold text-gray-600">{exp.employer}{exp.location ? ` • ${exp.location}` : ''}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${exp.isCurrent
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                          {formatDuration(months)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {exp.startDate?.substring(0, 7)} — {exp.isCurrent ? 'Present' : exp.endDate?.substring(0, 7)}
                        {exp.employmentType && ` (${exp.employmentType})`}
                      </p>
                      {exp.responsibilities && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{exp.responsibilities}</p>}
                      {exp.achievements && <p className="text-xs text-gray-600 mt-1 italic">✦ {exp.achievements}</p>}
                    </div>
                  );
                })
              ) : (
                <span className="text-gray-400 text-sm italic">Not provided</span>
              )}
            </div>
          </section>

          {/* Professional References */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> References
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.references && profile.references.length > 0 ? (
                profile.references.map(ref => (
                  <div key={ref.id} className="border rounded-lg p-4 text-xs bg-gray-50 border-gray-200">
                    <p className="font-bold text-gray-800 text-sm">{ref.refName}</p>
                    {ref.position && <p className="text-gray-600 mt-0.5">{ref.position}</p>}
                    {ref.organization && <p className="text-gray-500">{ref.organization}</p>}
                    <p className="italic text-gray-400 mt-1">{ref.relationship}</p>
                    {ref.email && <p className="mt-2 text-gray-600"><strong>Email:</strong> {ref.email}</p>}
                    {ref.phone && <p className="text-gray-600"><strong>Phone:</strong> {ref.phone}</p>}
                  </div>
                ))
              ) : (
                <span className="text-gray-400 text-sm italic">No references added yet</span>
              )}
            </div>
          </section>

          {/* Phones */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Phone Information</h3>
            <div className="space-y-2">
              {profile.phones?.map(p => (
                <div key={p.id} className="bg-gray-50 p-2 rounded border">
                  <strong>{p.phoneType}:</strong> {p.phoneNumber}
                </div>
              ))}
              {(!profile.phones || profile.phones.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
            </div>
          </section>

          {/* Addresses */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Addresses</h3>
            <div className="space-y-2">
              {profile.addresses?.map(a => (
                <div key={a.id} className="bg-gray-50 p-2 rounded border text-sm">
                  {a.address}, {a.city}, {a.state}, {a.country} ({a.postalCode})
                </div>
              ))}
              {(!profile.addresses || profile.addresses.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
            </div>
          </section>

          {/* Academic Qualifications */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Academic Qualifications</h3>
            <div className="space-y-2">
              {profile.academicQualifications?.map(aq => (
                <div key={aq.id} className="bg-gray-50 p-3 rounded border text-sm">
                  <p><strong>{aq.degreeLevel}</strong> - {aq.mainField}</p>
                  <p className="text-gray-500">{aq.university} ({aq.fromDate?.substring(0, 4)} - {aq.toDate?.substring(0, 4)})</p>
                </div>
              ))}
              {(!profile.academicQualifications || profile.academicQualifications.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
            </div>
          </section>

          {/* Languages */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Languages</h3>
            <div className="space-y-2">
              {profile.languages?.map(l => (
                <div key={l.id} className="bg-gray-50 p-2 rounded border text-sm">
                  <strong>{l.language}:</strong> {l.level}
                </div>
              ))}
              {(!profile.languages || profile.languages.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
            </div>
          </section>

          {/* IT Skills & Other Qualifications */}
          <section className="bg-white p-6 rounded-lg border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">IT Skills</h3>
              <div className="space-y-2">
                {profile.itSkills?.map(s => (
                  <div key={s.id} className="bg-gray-50 p-2 rounded border text-sm whitespace-pre-wrap">{s.description}</div>
                ))}
                {(!profile.itSkills || profile.itSkills.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Other Qualifications</h3>
              <div className="space-y-2">
                {profile.otherQualifications?.map(q => (
                  <div key={q.id} className="bg-gray-50 p-2 rounded border text-sm whitespace-pre-wrap">{q.description}</div>
                ))}
                {(!profile.otherQualifications || profile.otherQualifications.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
              </div>
            </div>
          </section>

          {/* Dynamic Job Profile Columns */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Custom Job Profile (Dynamic)</h3>
            {(!dynamicProfile || dynamicProfile.length === 0) ? (
              <span className="text-gray-400 text-sm italic">Not provided</span>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dynamicProfile?.map((pv: any, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <span className="block text-xs font-bold text-gray-500 mb-1">{pv.column?.label || `Field ${pv.columnId}`}</span>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {pv.column?.inputType === 'file' ? (
                        pv.value ? (
                          <button onClick={() => viewFile(pv.value)} className="text-blue-600 hover:underline">View Attached File</button>
                        ) : <span className="italic text-gray-400">Not provided</span>
                      ) : pv.value || <span className="italic text-gray-400">Not provided</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Documents */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Documents & Files</h3>
            <div className="space-y-3">
              {profile.documents?.map(d => (
                <div key={d.id} className="flex justify-between items-center border p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-500 w-5 h-5" />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm capitalize">{d.docType}</p>
                      <p className="text-xs text-gray-500">{d.fileName} ({(d.fileSize / 1024).toFixed(2)} KB)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => viewFile(d.fileUrl)}
                    className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors text-sm font-semibold"
                  >
                    <Download className="w-4 h-4" /> View Document
                  </button>
                </div>
              ))}
              {(!profile.documents || profile.documents.length === 0) && <span className="text-gray-400 text-sm italic">Not provided</span>}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
