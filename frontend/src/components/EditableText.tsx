import React, { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  isTextarea?: boolean;
  className?: string;
}

const EditableText: React.FC<EditableTextProps> = ({ placeholder, value, onChange, isTextarea, className }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    onChange(temp);
  };

  return editing ? (
    isTextarea ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className={`w-full px-5 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 focus:outline-none backdrop-blur-sm resize-none ${className}`}
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={handleBlur}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={`w-full px-5 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 focus:outline-none backdrop-blur-sm ${className}`}
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
      />
    )
  ) : (
    <div
      className={`cursor-text px-5 py-3 rounded-xl text-white bg-white/10 hover:bg-white/20 transition ${className}`}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-white/50 italic">{placeholder}</span>}
    </div>
  );
};

export default EditableText;
