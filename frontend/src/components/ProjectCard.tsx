// src/components/ProjectCard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  id: string;
  title: string;
  created: string;
};

const ProjectCard: React.FC<Props> = ({ id, title, created }) => {
  const navigate = useNavigate();
  const open = () => navigate(`/chat/${id}`);

  return (
    <article
      className="
        relative h-[150px]
        rounded-2xl bg-black/35 backdrop-blur
        ring-1 ring-white/10 shadow-lg
        transition hover:bg-black/45 hover:shadow-xl
        p-4 flex flex-col text-white
      "
    >
      {/* Thời gian tạo */}
      <div className="absolute right-3 top-3 text-xs text-white/70 bg-white/10 rounded-full px-2 py-1 ring-1 ring-white/10">
        {created}
      </div>

      {/* Tiêu đề */}
      <h3
        className="text-lg md:text-xl font-semibold pr-20 line-clamp-2 leading-snug"
        title={title}
      >
        {title}
      </h3>

      {/* Footer */}
      <div className="mt-auto pt-3 flex items-center justify-between">
        <span className="text-sm text-white/70"></span>

        <button
          onClick={open}
          className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-1 rounded-full transition"
        >
          Open
        </button>
      </div>
    </article>
  );
};

export default ProjectCard;
