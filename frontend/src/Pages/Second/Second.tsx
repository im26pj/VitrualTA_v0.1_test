import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken } from "../../utils/auth";

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

  const handleSignOut = () => {
    clearAuthToken();
    navigate('/signin');
  };

  const menuItems = [
    { label: "Account Management", path: "/member-area" },
    { label: "Learning System", path: "/chatroom" },
    { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
    { label: "Setting Vtuber", path: "/setvtuber" },
    { label: "Sign Out", onClick: handleSignOut, className: "text-red-600" }
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#6582d2] overflow-x-hidden p-6">
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
          onClick={() => handleNavigate("/second")}
        >
          Virtual TA
        </div>

        {/* Dropdown */}
        <div className="relative z-50">
          <button
            onClick={handleDropdownToggle}
            className="flex items-center justify-between bg-[#d9d9d9] rounded-[20px] px-3 md:px-6 py-2 md:py-3 min-w-[150px] md:min-w-[250px]"
          >
            <span className="text-base md:text-xl font-Inknut_Antiqua-Regular">Select</span>
            <svg
              className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 12L2 6h12z" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute top-[45px] md:top-[60px] right-0 w-48 md:w-64 bg-gray-300 rounded-lg shadow-md z-20">
              <ul className="py-2">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-Inknut_Antiqua-Regular ${item.className || ''}`}
                    onClick={() => item.onClick ? item.onClick() : handleNavigate(item.path)}
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
      <div className="h-[calc(100vh-180px)] md:h-auto overflow-y-auto md:overflow-visible pb-8 md:pb-0 pr-0 -mr-6">
        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4 mx-auto max-w-[1200px] pr-6">
          {/* Personal Studying */}
          <div
            className="w-full md:w-[46%] cursor-pointer hover:scale-105 transition-transform"
            onClick={() => handleNavigate("/chatroom")}
          >
            <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[420px] md:h-[520px] relative shadow-lg">
              <img
                src="/pic/gummy-green-school-bag-ready-for-studying-time-1@2x.png"
                alt="School Bag"
                className="absolute bottom-0 left-0 w-[180px] md:w-[220px] translate-x-[-15%] translate-y-[10%] pointer-events-none"
              />
              <h2 className="absolute bottom-8 right-8 text-2xl md:text-3xl font-Inknut_Antiqua-Regular">
                Personal Studying
              </h2>
            </div>
          </div>

          {/* Group Studying */}
          <div
            className="w-full md:w-[46%] cursor-pointer hover:scale-105 transition-transform"
            onClick={() => handleNavigate("/studying-group")}
          >
            <div className="bg-[#b5d1e1] rounded-[28px] p-6 h-[420px] md:h-[520px] relative shadow-lg">
              <img
                src="/pic/gummy-notebook-1.png"
                alt="Notebook"
                className="absolute bottom-0 left-0 w-[180px] md:w-[220px] translate-x-[-15%] translate-y-[10%] pointer-events-none"
              />
              <h2 className="absolute bottom-8 right-8 text-2xl md:text-3xl font-Inknut_Antiqua-Regular">
                Group Studying
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Decoration */}
      <img
        src="/pic/bonbon-line-molecular-formula-4@2x.png"
        className="absolute top-0 right-0 w-[150px] opacity-30 pointer-events-none"
        alt=""
      />
      <img
        src="/pic/bonbon-line-molecular-formula-2@2x.png"
        className="absolute bottom-0 left-1/3 w-[150px] opacity-30 pointer-events-none"
        alt=""
      />
    </div>
  );
};

export default Second;
