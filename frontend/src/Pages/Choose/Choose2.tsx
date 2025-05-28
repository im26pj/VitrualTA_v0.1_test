import React from "react";
import { useNavigate } from "react-router-dom";

export const Choose = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen bg-[#6582d2] flex flex-col items-center justify-center p-4 overflow-auto">
      <style>
        {`
          /* Mobile scrollbar styles */
          @media (max-width: 768px) {
            ::-webkit-scrollbar {
              width: 0;
              background: transparent;
            }

            ::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }

            /* Show scrollbar while scrolling */
            ::-webkit-scrollbar-thumb:active {
              width: 8px;
            }

            * {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
            }
          }

          /* Desktop scrollbar styles */
          @media (min-width: 769px) {
            ::-webkit-scrollbar {
              width: 10px;
            }
            
            ::-webkit-scrollbar-track {
              background: transparent;
            }
            
            ::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }
          }
        `}
      </style>

      {/* 計算機圖片 - 右上角 */}
      <img
        className="absolute top-[25%] right-[30%] w-20 md:w-40"
        src="..\..\..\..\public\pic\gummy-calculator 1.png"
        alt="Calculator"
      />

      {/* 標題 */}
      <h1 className="font-[Kavoon] text-white text-5xl md:text-8xl mb-8 md:mb-12">
        Virtual TA
      </h1>

      {/* 中央按鈕 */}
      <button
        className="bg-[#d9d9d9] text-black font-Inknut_Antiqua-Regular text-lg md:text-xl px-6 py-3 rounded-2xl shadow-md hover:bg-gray-400 mx-4 w-full md:w-auto max-w-xs"
        onClick={() => navigate("/signin")}
      >
        Entry
      </button>

      {/* 算盤圖片 - 左下角 */}
      <img
        className="absolute bottom-[5%] left-[5%] w-24 md:w-48"
          src="..\..\..\..\public\pic\gummy-abacus 1.png"
        alt="Abacus"
      />
    </div>
  );
};