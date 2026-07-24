import { useState } from 'react';

export default function FormMultiSelect({ 
  label, 
  options, 
  values, 
  onChange,
  onCustomAdd
}: { 
  label: string; 
  options: string[]; 
  values: string[]; 
  onChange: (vals: string[]) => void; 
  onCustomAdd?: (val: string) => void;
}) {
  const [otherText, setOtherText] = useState('');
  const [showOther, setShowOther] = useState(false);

  const handleAdd = (val: string) => {
    if (val === 'Other') {
      setShowOther(true);
    } else if (val && !values.includes(val)) {
      onChange([...values, val]);
      setShowOther(false);
    }
  };

  const handleAddOther = () => {
    if (otherText.trim() && !values.includes(otherText.trim())) {
      if (onCustomAdd) {
        onCustomAdd(otherText.trim());
      }
      onChange([...values, otherText.trim()]);
      setOtherText('');
      setShowOther(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">{label}</label>
      
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map(val => (
            <span key={val} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
              {val}
              <button type="button" onClick={() => onChange(values.filter(v => v !== val))} className="text-blue-400 hover:text-blue-900">&times;</button>
            </span>
          ))}
        </div>
      )}

      <select 
        value=""
        onChange={(e) => handleAdd(e.target.value)}
        className="w-full px-2 py-2 border border-gray-250 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="" disabled>Select {label.toLowerCase()}...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="Other">Other (Specify...)</option>
      </select>
      
      {showOther && (
        <div className="flex gap-2 mt-2">
          <input 
            type="text" 
            value={otherText} 
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Specify..."
            className="flex-1 px-2 py-1.5 border border-gray-250 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button type="button" onClick={handleAddOther} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Add</button>
          <button type="button" onClick={() => {setShowOther(false); setOtherText('');}} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}
