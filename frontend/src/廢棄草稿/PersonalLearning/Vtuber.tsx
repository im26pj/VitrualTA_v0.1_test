import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const PersonalLearning = () => {
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
          onClick={() => handleNavigate("/choose2")}
        >
          Virtual TA
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-white text-2xl md:text-4xl font-kavoon">
            Vtuber
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

        {/* Main Content */}
<div className="flex flex-col md:flex-row justify-center items-center w-full mt-32 md:mt-38 px-4 gap-20">
  <img
    className="w-full md:w-1/2 max-w-lg h-auto"
    alt="Element"
    src="https://c.animaapp.com/qsOI3aZQ/img/53783794637-44b575bb56-b-removebg-preview.png"
  />

  {/* 對話框區塊 */}
  <div className="w-full max-w-md mt-6">
    {/* 白色背景框 */}
    <div className="bg-white rounded-[50px] p-6 shadow-lg h-[550px] w-full flex flex-col justify-end">
      {/* 文字訊息放在輸入框上面 */}
      <p className="text-black text-3xl font-Inknut_Antiqua-Regular mb-3 text-center">
        What can I do for you?
      </p>

      {/* 灰色輸入框 */}
      <div className="w-full bg-[#d9d9d9] rounded-[28px] p-4 flex items-center justify-between">
        <div className="font-normal text-[#000000b2] text-5xl">#</div>
        <input
          type="text"
          className="ml-2 flex-1 bg-transparent focus:outline-none text-lg"
          placeholder="Type your message..."
        />
        <img
          className="w-[30px] h-[35px]"
          alt="Polygon"
          src="https://c.animaapp.com/qsOI3aZQ/img/polygon-1.svg"
        />
      </div>
    </div>
  </div>
</div>
</div>
  );
};
