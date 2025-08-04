// src/components/ReportCard.tsx

import React from "react";
import {CARD_EFFECT, STROKE_EFFECT} from "../constants/tailwind";
import {useNavigate} from "react-router-dom";

type Props = {
  id: string;
  title: string;
  created: string;
};

const ProjectCard: React.FC<Props> = ({ id, title, created }) => {
  const navigate = useNavigate();

  return (
    <div className={STROKE_EFFECT}>
      <div className={`${CARD_EFFECT} w-full h-[150px] backdrop-blur-xl`}>
        <div className="flex items-center gap-5">
          <div>
            <div className="font-semibold text-2xl text-white drop-shadow-md ">{title}</div>
          </div>
        </div>


        <div className="flex justify-between items-center text-white/70 text-sm">
          <span className="hidden mini:block">{created}</span>
          <div className={`${STROKE_EFFECT} ml-auto`}>
            <button
                onClick={() => navigate(`/chat/${id}`)}
                className="font-medium px-4 py-1 bg-gradient-button backdrop-blur-50 bg-opacity-30 rounded-full text-[#22122F] text-sm hover:bg-opacity-50 hover:scale-105 hover:shadow-xl transition-all duration-300">
              Open
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
