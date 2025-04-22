import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const MemberArea = (): JSX.Element => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false); // 點選後關閉選單
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
        .font-inknut {
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
             Member Account
          </div>
          <img
            className="w-[70px] h-[70px] object-cover cursor-pointer"
            alt="User Avatar"
            src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
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

             {/* Buttons section */}
      <div className="flex flex-col gap-8 mt-[160px] w-full max-w-md items-center">
        <button
          className="w-full bg-white text-black font-inknut text-lg py-6 rounded-xl shadow-md hover:bg-gray-100"
          onClick={() => handleNavigate("/cpassword")}
        >
          Personal information settings
        </button>

        <button
          className="w-full bg-white text-black font-inknut text-lg py-6 rounded-xl shadow-md hover:bg-gray-100"
          onClick={() => handleNavigate("/payment")}
        >
          Payment management
        </button>
      </div>
      </div>
  );
};
