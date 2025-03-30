import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Payment = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentCard, setCurrentCard] = useState("**** **** **** 1234");
  const [newCard, setNewCard] = useState("");
  const navigate = useNavigate();

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleChangeCard = () => {
    if (newCard.trim() !== "") {
      setCurrentCard(`**** **** **** ${newCard.slice(-4)}`);
      setNewCard("");
      alert("Credit card updated successfully!");
    } else {
      alert("Please enter a valid card number.");
    }
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
          onClick={() => handleNavigate("/choose2")}
        >
          Virtual TA
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-white text-2xl md:text-4xl font-kavoon">
             Payment management
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

       {/* Payment Card Form */}
       <div className="mt-[160px] bg-white p-10 rounded-[28px] shadow-lg w-full max-w-xl mx-auto font-inknut">
        <div className="mb-6">
          <label className="block text-black text-xl font-inknut mb-2">
            Credit Card Number:
          </label>
          <input
            type="text"
            value={currentCard}
            disabled
            className="w-full px-4 py-3 bg-gray-100 rounded-md text-lg text-gray-600 cursor-not-allowed"
          />
        </div>

        <div className="mb-8">
          <label className="block text-black text-xl font-inknut mb-2">
            Change Credit Card:
          </label>
          <input
            type="text"
            placeholder="Enter new credit card number"
            value={newCard}
            onChange={(e) => setNewCard(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 rounded-md text-lg"
          />
        </div>

        <button
          onClick={handleChangeCard}
          className="w-full py-3 bg-gray-300 text-xl font-inknut rounded-xl hover:bg-gray-400"
        >
          OK
        </button>
      </div>
    </div>
  );
};
