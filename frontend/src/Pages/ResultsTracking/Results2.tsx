import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const ResultsTracking = (): JSX.Element => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDropdownToggle = () => setShowDropdown(!showDropdown);

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="bg-[#6683d2] flex flex-col items-center w-full min-h-screen px-4 md:px-8 pb-10">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-inknut {
            font-family: 'Inknut Antiqua', serif;
          }
        `}
      </style>

      {/* Header */}
      <div className="w-full relative z-10">
      <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px] z-10">
        <div
          className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
          onClick={() => handleNavigate("/choose2")}
        >
          Virtual TA
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-white text-2xl md:text-4xl font-kavoon">
            Learning Outcomes
          </div>
          <img
            className="w-[70px] h-[70px] object-cover cursor-pointer"
            alt="User Avatar"
            src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
            onClick={handleDropdownToggle}
          />
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-[100px] right-8 w-64 bg-gray-300 rounded-lg shadow-md z-20">
          <ul className="py-2">
            {[
              { label: "Account Management", path: "/member-area" },
              { label: "Learning System", path: "/chatroom" },
              { label: "Group Studying", path: "/studying-group" },
              { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
              { label: "Setting Vtuber", path: "/setvtuber" },
            ].map((item, index) => (
              <li
                key={index}
                className="px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-inknut"
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {/* Spacer */}
      <div className="h-[120px]" />

      {/* Enlarged Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* Online Test Center */}
        <div
          onClick={() => handleNavigate("/test")}
          className="bg-[#B5D1E1] rounded-3xl p-6 w-[380px] md:w-[420px] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform shadow-lg"
        >
          <img
            src="https://c.animaapp.com/fL0pGeKr/img/pixeltrue-support.png"
            alt="Online Test Center"
            className="h-[400px] object-contain"
          />
          <div className="bg-[#d9d9d9cc] rounded-[28px] w-full mt-6 py-4 text-center">
            <span className="text-black text-2xl font-inknut">
              Online Test Center
            </span>
          </div>
        </div>

        {/* Learning Outcome Report */}
        <div
          onClick={() => handleNavigate("/report")}
          className="bg-[#B5D1E1] rounded-3xl p-6 w-[380px] md:w-[420px] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform shadow-lg"
        >
          <img
            src="https://c.animaapp.com/eOOMRBWM/img/pixeltrue-plan@2x.png"
            alt="Learning Outcome Report"
            className="h-[400px] object-contain"
          />
          <div className="bg-[#d9d9d9cc] rounded-[28px] w-full mt-6 py-4 text-center">
            <span className="text-black text-2xl font-inknut">
              Learning Outcome Report
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
