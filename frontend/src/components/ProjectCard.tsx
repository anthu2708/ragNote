// src/components/ProjectCard.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrashIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

type Props = {
  id: string;
  title: string;
  created: string;
  onDelete?: (id: string) => void;
};

const ProjectCard: React.FC<Props> = ({ id, title, created, onDelete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const open = () => navigate(`/chat/${id}`);

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
      setMenuOpen(false);
      setConfirming(false);
    }
  };

  return (
    <article
      className="
        group relative h-[150px]
        rounded-2xl bg-black/35 backdrop-blur
        ring-1 ring-white/10 shadow-lg
        transition hover:bg-black/45 hover:shadow-xl
        p-4 flex flex-col text-white
      "
    >
      {/* menu (góc phải trên) */}
      <div className="absolute right-2 top-2">
        <button
          aria-label="More"
          onClick={() => setMenuOpen((v) => !v)}
          className="
            opacity-0 group-hover:opacity-100 transition
            grid place-items-center h-8 w-8 rounded-lg
            bg-white/10 hover:bg-white/15 ring-1 ring-white/10
          "
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>

        {menuOpen && (
          <div
            className="
              absolute right-0 mt-2 w-44 rounded-xl overflow-hidden
              bg-black/70 backdrop-blur ring-1 ring-white/10 shadow-xl
            "
          >
            {!confirming ? (
              <>
                <button
                  onClick={open}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
                >
                  Open
                </button>
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-red-300"
                >
                  Delete…
                </button>
              </>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <div className="text-xs text-white/80">Delete this project?</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={deleting}
                    onClick={handleDelete}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs ring-1 ring-white/10 disabled:opacity-60"
                  >
                    {deleting ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                  <button
                    disabled={deleting}
                    onClick={() => setConfirming(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs ring-1 ring-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* tiêu đề (trên cùng, rõ ràng) */}
      <h3
        className="text-lg md:text-xl font-semibold pr-10 line-clamp-2 leading-snug"
        title={title}
      >
        {title}
      </h3>

      {/* footer: created (trái) + CTA Open (phải) */}
      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-xs text-white/75 bg-white/10 rounded-full px-2 py-1 ring-1 ring-white/10">{created}</span>
        <button
          onClick={open}
          className="
            bg-violet-500 hover:bg-violet-600 text-white
            text-sm font-medium px-4 py-1.5 rounded-full transition
            ring-1 ring-white/10 shadow
          "
        >
          Open
        </button>
      </div>
    </article>
  );
};

export default ProjectCard;
