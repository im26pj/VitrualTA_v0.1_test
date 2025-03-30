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

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div
          className="font-kavoon text-4xl text-white cursor-pointer"
          onClick={() => handleNavigate("/choose2")}
        >
          Virtual TA
        </div>

        {/* Dropdown */}
        <div className="relative z-50">
          <button
            onClick={handleDropdownToggle}
            className="flex items-center justify-between bg-[#d9d9d9] rounded-[20px] px-6 py-3 min-w-[250px]"
          >
            <span className="text-xl font-Inknut_Antiqua-Regular">Select</span>
            <svg
              className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 12L2 6h12z" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute top-[60px] right-0 w-64 bg-gray-300 rounded-lg shadow-md z-20">
              <ul className="py-2">
                {[
                  { label: "Account Management", path: "/member-area" },
                  { label: "Learning System", path: "/chatroom" },
                  { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
                  { label: "Setting Vtuber", path: "/setvtuber" },
                ].map((item, index) => (
                  <li
                    key={index}
                    className="px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-Inknut_Antiqua-Regular"
                    onClick={() => handleNavigate(item.path)}
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

 {/* Main Cards */}
<div className="flex justify-between gap-4 mx-auto max-w-[1200px]">
  {/* Personal Studying */}
  <div
    className="w-[46%] cursor-pointer"
    onClick={() => handleNavigate("/chatroom")}
  >
    <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[520px] relative">
      <img
        src="https://c.animaapp.com/hvfbqNfn/img/gummy-green-school-bag-ready-for-studying-time-1@2x.png"
        alt="School Bag"
        className="absolute bottom-0 left-0 w-[220px] translate-x-[-15%] translate-y-[10%] pointer-events-none"
      />
      <h2 className="absolute bottom-8 right-8 text-3xl font-Inknut_Antiqua-Regular">
        Personal Studying
      </h2>
    </div>
  </div>

  {/* Group Studying */}
  <div
    className="w-[46%] cursor-pointer"
    onClick={() => handleNavigate("/studying-group")}
  >
    <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[520px] relative">
      <img
        src="https://c.animaapp.com/hvfbqNfn/img/gummy-notebook-1.png"
        alt="Notebook"
        className="absolute bottom-0 left-0 w-[220px] translate-x-[-15%] translate-y-[10%] pointer-events-none"
      />
      <h2 className="absolute bottom-8 right-8 text-3xl font-Inknut_Antiqua-Regular">
        Group Studying
      </h2>
    </div>
  </div>
</div>


      {/* Decoration */}
      <img
        src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-4@2x.png"
        className="absolute top-0 right-0 w-[150px] opacity-30 pointer-events-none"
        alt=""
      />
      <img
        src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-2@2x.png"
        className="absolute bottom-0 left-1/3 w-[150px] opacity-30 pointer-events-none"
        alt=""
      />
    </div>
  );
};

export default Second;
