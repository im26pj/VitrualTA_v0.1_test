import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clearAuthToken } from "../../utils/auth";

export const GroupPage = () => {
  const { groupName } = useParams();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleBack = () => {
    navigate("/studying-group");
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleSignOut = () => {
    clearAuthToken();
    navigate('/signin');
  };

  const menuItems = [
    { label: "Account Management", path: "/member-area" },
    { label: "Learning System", path: "/chatroom" },
    { label: "Group Studying", path: "/studying-group" },
    { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
    { label: "Setting Vtuber", path: "/setvtuber" },
    { label: "Sign Out", onClick: handleSignOut, className: "text-red-600" }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="bg-[#6683d2] min-h-screen w-full flex flex-col items-center px-6 pt-24 relative">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon { font-family: 'Kavoon', cursive; }
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular { font-family: 'Inknut Antiqua', serif; }
        `}
      </style>

      <div className="w-full bg-[#B5D1E1] py-6 px-8 flex justify-between items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px] z-10">
        <div className="text-white text-4xl font-kavoon cursor-pointer" onClick={handleBack}>Virtual TA</div>
        <div className="text-white text-4xl font-kavoon">{groupName}</div>
        <div className="relative">
          <img
            className="w-[70px] h-[70px] object-cover cursor-pointer"
            alt="User Icon"
            src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
            onClick={handleDropdownToggle}
          />
          {showDropdown && (
            <div className="absolute top-[80px] right-0 w-64 bg-gray-300 rounded-lg shadow-md z-20">
              <ul className="py-2">
                {menuItems.map((item, i) => (
                  <li
                    key={i}
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

      <div className="mt-20 w-full max-w-md flex flex-col gap-6">
        <button className="bg-[#E3E3E3] py-4 rounded-xl text-xl font-Inknut_Antiqua-Regular">
          Add Teaching Materials
        </button>
        <button className="bg-[#E3E3E3] py-4 rounded-xl text-xl font-Inknut_Antiqua-Regular">
          Share Teaching Materials
        </button>
      </div>

      {/* Floating Back Button */}
      <button
        onClick={handleBack}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white text-black rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-gray-200"
        title="Back to Groups"
      >
        ↩
      </button>
    </div>
  );
};
