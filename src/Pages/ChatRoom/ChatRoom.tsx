import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const ChatRoom = (): JSX.Element => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen px-4 md:px-8">
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
      <div className="bg-[#6683d2] w-full max-w-screen-xl min-h-screen relative flex flex-col items-center justify-center">
        {/* Header */}
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
          <div className="text-white text-3xl font-kavoon mr-auto cursor-pointer"onClick={() => handleNavigate("/choose")}>
            Virtual TA
          </div>
          <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
            <button className="bg-gray-300 px-6 py-2 rounded-2xl text-lg md:text-xl font-Inknut_Antiqua-Regular"onClick={() => handleNavigate("/setvtuber")}>
              Vtuber
            </button>
            <button className="bg-gray-300 px-6 py-2 rounded-2xl text-lg md:text-xl font-Inknut_Antiqua-Regular" onClick={() => handleNavigate("/progress")}>
              Check learning progress
            </button>
          </div>
          <img
            className="w-16 h-16 object-cover rounded-full border-2 border-white ml-auto cursor-pointer" onClick={() => handleNavigate("/signin")}
            alt="Profile"
            src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
          />
        </div>

        {/* Chat Box */}
        <div className="relative w-full max-w-[900px] mx-auto bg-white rounded-3xl p-6 shadow-lg mt-6 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mt-4">
            <img
              className="w-[200px] lg:w-[300px] h-auto"
              alt="Pixeltrue data"
              src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
            />
            <p className="text-lg lg:text-2xl text-black font-semibold text-center mt-4 font-Inknut_Antiqua-Regular">
              What can I do for you?
            </p>
          </div>
          <div className="w-full h-12 bg-[#d9d9d9] rounded-2xl flex items-center px-4 mt-6">
            <span className="text-gray-700 text-lg">#</span>
            <input
              type="text"
              className="ml-2 flex-1 bg-transparent focus:outline-none text-lg"
              placeholder="Type your message..."
            />
            <img
              className="w-6 h-6 ml-2 cursor-pointer"
              src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
              alt="Send"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
