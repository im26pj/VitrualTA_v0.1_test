import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Choose = (): JSX.Element => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#6582d2] flex flex-col items-center justify-center p-4">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
        `}
      </style>
      
      {/* 標題 */}
      <div className="mb-10 text-white text-4xl sm:text-6xl md:text-8xl font-kavoon text-center">
        Virtual TA
      </div>

      {/* 導航欄 */}
      <div className="relative w-full max-w-lg">
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>
        <div 
          className="flex items-center justify-between bg-[#d9d9d9] rounded-xl px-5 py-3 shadow-lg cursor-pointer" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="text-black text-xl sm:text-2xl font-Inknut_Antiqua-Regular">Select</div>
          <img
            className="w-8 h-8"
            alt="Polygon"
            src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
          />
        </div>

        {showDropdown && (
          <div className="absolute w-full mt-2 bg-[#d9d9d9] p-4 rounded-lg shadow-lg flex flex-col text-xl sm:text-2xl">
            <button
              className="w-full px-4 py-2 text-black hover:bg-[#2ecbff] rounded-md font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/signin")}
            >
              Sign in
            </button>
            <button
              className="w-full px-4 py-2 text-black hover:bg-[#2ecbff] rounded-md mt-2 font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/personal-learning")}
            >
              Personal Learning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};