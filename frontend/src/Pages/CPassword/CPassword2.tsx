import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const CPassword = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [checkPassword, setCheckPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleChangePassword = () => {
    const storedPassword = "1234";

    if (oldPassword !== storedPassword) {
      setMessage("❌ 舊密碼錯誤！");
      return;
    }

    if (newPassword !== checkPassword) {
      setMessage("❌ 新密碼不一致！");
      return;
    }

    if (newPassword.length < 4) {
      setMessage("❌ 密碼至少要 4 個字元！");
      return;
    }

    setMessage("✅ 密碼修改成功！");
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
            Personal information settings
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

   
      {/* Password Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg mt-[160px] font-inknut">
        <div className="mb-4">
          <label className="text-lg font-semibold mb-2 block">Old Password:</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-100 border-none"
          />
        </div>
        <div className="mb-4">
          <label className="text-lg font-semibold mb-2 block">New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-100 border-none"
          />
        </div>
        <div className="mb-6">
          <label className="text-lg font-semibold mb-2 block">Check Password:</label>
          <input
            type="password"
            value={checkPassword}
            onChange={(e) => setCheckPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-100 border-none"
          />
        </div>
        <button
          onClick={handleChangePassword}
          className="w-full bg-gray-300 hover:bg-gray-400 text-lg font-bold py-3 rounded-xl"
        >
          OK
        </button>
        {message && (
          <div className="text-center mt-4 text-base font-semibold text-red-600">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};