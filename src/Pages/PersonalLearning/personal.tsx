import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const PersonalLearning = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="bg-[#6683d2] flex flex-col justify-center items-center min-h-screen w-full">
      <div className="bg-[#6683d2] w-full max-w-screen-xl h-full min-h-screen relative p-4 flex flex-col items-center">
        {/* Header */}
        <div className="w-full bg-[#b5d1e1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
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
          <div className="text-white text-3xl font-kavoon mr-auto cursor-pointer" onClick={() => handleNavigate("/choose")}>
            Virtual TA
          </div>
          <div className="text-black text-2xl bg-[#d9d9d9] rounded-[28px] px-6 py-2 mx-4 font-Inknut_Antiqua-Regular">Group Learning</div>
          <div className="text-black text-2xl bg-[#d9d9d9] rounded-[28px] px-6 py-2 font-Inknut_Antiqua-Regular">Learning outcomes tracking</div>
          <img className="w-16 h-16 object-cover rounded-full ml-auto cursor-pointer" onClick={() => handleNavigate("/signin")} alt="Profile" src="https://c.animaapp.com/qsOI3aZQ/img/2021781015212021@2x.png" />
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row justify-between items-center w-full mt-32 px-4">
          <img className="w-full md:w-1/2 max-w-lg h-auto" alt="Element" src="https://c.animaapp.com/qsOI3aZQ/img/53783794637-44b575bb56-b-removebg-preview.png" />
          <div className="w-full max-w-md bg-white rounded-[50px] p-6 shadow-lg h-[550px] flex flex-col">
          <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>
            <p className="text-black text-2xl mb-4 font-Inknut_Antiqua-Regular">What can I do for you?</p>
            <div className="mt-auto w-full bg-[#d9d9d9] rounded-[28px] p-4 flex items-center justify-between">
              <div className="font-normal text-[#000000b2] text-5xl">#</div>
              <input 
              type="text" 
              className="ml-2 flex-1 bg-transparent focus:outline-none text-lg"
              placeholder="Type your message..."
            />
              <img className="w-[30px] h-[35px]" alt="Polygon" src="https://c.animaapp.com/qsOI3aZQ/img/polygon-1.svg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
