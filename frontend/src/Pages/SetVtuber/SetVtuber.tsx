import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken } from "../../utils/auth";

export const SetVtuber = (): JSX.Element => {
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

  return (
    <div className="bg-[#6683d2] flex flex-col items-center w-full min-h-screen px-4 md:px-8">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}
      </style>

      {/* Header + Dropdown */}
      <div className="w-full relative z-10">
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
          <div
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => handleNavigate("/second")}
          >
            Virtual TA
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-white text-2xl md:text-4xl font-kavoon">
              Set Vtuber
            </div>
            <img
              className="w-[70px] h-[70px] object-cover cursor-pointer"
              alt="User Avatar"
              src="/pic/2021781015212021.png"
              onClick={handleDropdownToggle}
            />
          </div>
        </div>

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="absolute top-[100px] right-8 w-64 bg-gray-300 rounded-lg shadow-md z-20">
            <ul className="py-2">
              {[
                { label: "Account Management", path: "/member-area" },
                { label: "Learning System", path: "/chatroom" },
                { label: "Group Studying", path: "/studying-group" },
                { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
                { label: "Setting Vtuber", path: "/setvtuber" },
                { label: "Sign Out", onClick: handleSignOut, className: "text-red-600" }
              ].map((item, index) => (
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

      {/* Main Content */}
      <div className="flex flex-col md:flex-row items-center justify-center w-full flex-1 mt-28 md:mt-40 px-4 pb-10">
        {/* Left: Character Image */}
        <div className="flex-1 flex justify-center w-[90%] max-w-2xl">
          <img
            className="w-full h-auto"
            alt="Vtuber"
            src="/pic/53783794637-44b575bb56-b-removebg-preview.png"
          />
        </div>

        {/* Right: Buttons - 調整寬度和間距 */}
        <div className="flex flex-col justify-between items-stretch h-[400px] md:h-[550px] w-[90%] md:w-full md:max-w-sm md:ml-4 gap-2 md:gap-4">
          {["Outfits", "Skin color", "Hair color", "Voices", "Character Selection"].map((label, index) => (
            <div
              key={index}
              className="flex-1 flex items-center justify-center bg-[#d9d9d9] rounded-[20px] shadow-md cursor-pointer"
            >
              <div className="text-black text-md md:text-3xl font-Inknut_Antiqua-Regular">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
