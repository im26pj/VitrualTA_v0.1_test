import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Second = (): JSX.Element => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };    

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#6582d2] overflow-hidden p-6">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
        `}
      </style>
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>
      {/* Header Area */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div 
            className="font-kavoon text-4xl text-white cursor-pointer flex items-center"
            onClick={() => handleNavigate("/choose")}
          >
            Virtual TA
          </div>
        </div>

        {/* Select Dropdown */}
        <div className="relative z-50">
          <button
            onClick={handleDropdownToggle}
            className="flex items-center justify-between gap-4 bg-[#d9d9d9] rounded-[28px] px-6 py-3 min-w-[300px] relative"
          >
            <span className="text-2xl font-Inknut_Antiqua-Regular">Select</span>
            <svg
              className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 12L2 6h12z"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-full bg-[#d9d9d9] rounded-lg shadow-lg py-2">
              <button
                className="w-full text-left px-6 py-2 hover:bg-[#2ecbff] text-xl font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/member-area")}
              >
                Account Management
              </button>
              <button
                className="w-full text-left px-6 py-2 hover:bg-[#2ecbff] text-xl font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/studying-group")}
              >
                Learning System
              </button>
              <button
                className="w-full text-left px-6 py-2 hover:bg-[#2ecbff] text-xl font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/setvtuber")}
              >
                Setting Vtuber
              </button>
              <button
                className="w-full text-left px-6 py-2 hover:bg-[#2ecbff] text-xl font-Inknut_Antiqua-Regular"
                onClick={() => handleNavigate("/personal-learning")}
              >
                Learning outcome tracking
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-between px-4 w-full">
        {/* Personal Studying Card */}
        <div 
          className="w-[45%] cursor-pointer"
          onClick={() => handleNavigate("/chatsroom1")}
        >
          <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[550px] relative">
            <div className="absolute bottom-0 left-0 w-[300px] transform translate-x-[-20%] translate-y-[20%] pointer-events-none">
              <img
                src="https://c.animaapp.com/hvfbqNfn/img/gummy-green-school-bag-ready-for-studying-time-1@2x.png"
                alt="School Bag"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute bottom-8 right-8 z-10">
              <h2 className="text-3xl font-serif font-Inknut_Antiqua-Regular" >Personal Studying</h2>
            </div>
          </div>
        </div>

        {/* Group Studying Card */}
        <div 
          className="w-[45%] cursor-pointer"
          onClick={() => handleNavigate("/studying-group")}
        >
          <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[550px] relative">
            <div className="absolute bottom-0 left-0 w-[300px] transform translate-x-[-20%] translate-y-[20%] pointer-events-none">
              <img
                src="https://c.animaapp.com/hvfbqNfn/img/gummy-notebook-1.png"
                alt="Notebook"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute bottom-8 right-8 z-10">
              <h2 className="text-3xl font-serif font-Inknut_Antiqua-Regular">Group Studying</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Molecular Lines */}
      <div className="absolute top-0 right-0 w-[150px] h-[150px] opacity-30 pointer-events-none">
        <img
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-4@2x.png"
          alt="Molecular decoration"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="absolute bottom-0 left-1/3 w-[150px] h-[150px] opacity-30 pointer-events-none">
        <img
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-2@2x.png"
          alt="Molecular decoration"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default Second;
