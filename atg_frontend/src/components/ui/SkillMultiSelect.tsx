import { useState, useEffect, useRef } from 'react';
import { skillApi, type Skill } from '../../api/skillApi';
import { userProfileApi } from '../../api/userProfileApi';
import { Plus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface SkillMultiSelectProps {
  userSkills: any[]; // UserItSkill or UserOtherQualification
  onUpdate: () => void;
  title?: string;
  entityType?: 'itskills' | 'other' | 'languages';
  category?: 'it' | 'other' | 'language';
}

export default function SkillMultiSelect({ 
  userSkills, 
  onUpdate,
  title = "IT Skills",
  entityType = "itskills",
  category = "it"
}: SkillMultiSelectProps) {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Custom skill states
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customSkillName, setCustomSkillName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    skillApi.list()
      .then((res) => {
        // Only show active skills in the suggestions that match the category
        setAvailableSkills(res.skills.filter(s => s.status === 'active' && s.category === category));
      })
      .catch((err) => console.error("Failed to load skills", err));

    // Click outside to close dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSkill = async (skillName: string) => {
    if (!skillName.trim()) return;
    const isAlreadyAdded = userSkills.some(
      s => s.description.toLowerCase() === skillName.toLowerCase()
    );
    if (isAlreadyAdded) {
      toast.error('Skill already added');
      return;
    }

    try {
      await userProfileApi.addEntity(entityType, { description: skillName.trim() });
      toast.success('Skill added');
      setSearch('');
      setIsOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill');
    }
  };

  const handleCustomSkillSubmit = () => {
    if (!customSkillName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }
    handleAddSkill(customSkillName);
    setIsOtherSelected(false);
    setCustomSkillName('');
  };

  const handleRemoveSkill = async (id: number) => {
    try {
      await userProfileApi.deleteEntity(entityType, id);
      toast.success('Skill removed');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove skill');
    }
  };

  const filteredSkills = availableSkills.filter(
    s => s.name.toLowerCase().includes(search.toLowerCase()) && 
         !userSkills.some(us => us.description.toLowerCase() === s.name.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150" ref={containerRef}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      
      {/* Selected Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {userSkills.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No {title.toLowerCase()} added yet.</p>
        ) : (
          userSkills.map((skill) => (
            <div key={skill.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium">
              {skill.description}
              <button 
                onClick={() => handleRemoveSkill(skill.id)}
                className="text-blue-400 hover:text-blue-900 focus:outline-none ml-1 transition-colors"
                title="Remove Skill"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Input / Dropdown */}
      <div className="relative mt-2">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            className="bg-transparent border-none outline-none w-full text-sm placeholder-gray-400"
            placeholder="Search for an existing skill..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
              setIsOtherSelected(false);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              // Pressing enter should just pick the first matching active skill if available
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredSkills.length > 0) {
                  handleAddSkill(filteredSkills[0].name);
                  setSearch('');
                  setIsOpen(false);
                }
              }
            }}
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-150 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 animate-slideUp">
            {filteredSkills.map(skill => (
              <button
                key={skill.id}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between group"
                onClick={() => {
                  handleAddSkill(skill.name);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                <span>{skill.name}</span>
                <Plus className="w-4 h-4 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
            
            {filteredSkills.length === 0 && search && (
              <div className="px-4 py-2 text-sm text-gray-500">
                No exact matching active skills found.
              </div>
            )}

            <div className="border-t border-gray-100 my-1"></div>
            
            {/* The Other Option */}
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors flex items-center justify-between"
              onClick={() => {
                setIsOpen(false);
                setIsOtherSelected(true);
                setSearch('');
              }}
            >
              <span>Other (Specify custom skill)...</span>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Secondary Input for "Other" Skill */}
      {isOtherSelected && (
        <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl animate-fadeIn shadow-inner">
          <label className="block text-sm font-semibold text-blue-900 mb-2">Please specify your skill name:</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter custom skill..."
              value={customSkillName}
              onChange={(e) => setCustomSkillName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomSkillSubmit();
                }
              }}
              autoFocus
            />
            <button
              onClick={handleCustomSkillSubmit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setIsOtherSelected(false); setCustomSkillName(''); }}
              className="px-3 py-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            This skill will be added to your profile and sent to our team for global approval.
          </p>
        </div>
      )}
    </div>
  );
}
