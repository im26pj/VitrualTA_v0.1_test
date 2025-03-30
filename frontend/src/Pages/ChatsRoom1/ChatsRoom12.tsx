import React from "react";
import { useNavigate } from "react-router-dom";

export const ChatsRoom1 = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen px-4 md:px-8">
      {/* 容器 */}
      <div className="bg-[#6683d2] w-full max-w-screen-xl min-h-screen flex flex-col items-center">
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

        {/* Header */}
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px] z-10">
          <div
            className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer"
            onClick={() => handleNavigate("/choose2")}
          >
            Virtual TA
          </div>
        </div>

        {/* Chat Box（加大尺寸 & 增加與 Header 的距離） */}
        <div className="relative w-full max-w-[1100px] bg-white rounded-3xl p-8 md:p-12 shadow-lg mt-32 md:mt-30 flex flex-col items-center mx-auto">
          <img
            className="w-[80%] max-w-[350px] h-auto"
            alt="Pixeltrue data"
            src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
          />
          <p className="text-lg md:text-4xl text-black font-semibold text-center mt-6 font-Inknut_Antiqua-Regular">
            What can I do for you?
          </p>

          {/* Input Box */}
          <div className="w-full max-w-[950px] h-16 bg-[#d9d9d9] rounded-2xl flex items-center px-6 mt-8">
            <span className="text-gray-700 text-2xl">#</span>
            <input
              type="text"
              className="ml-2 flex-1 bg-transparent focus:outline-none text-xl"
              placeholder="Type your message..."
            />
            <img
              className="w-8 h-8 ml-4 cursor-pointer transform rotate-90"
              src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
              alt="Send"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap justify-left gap-6 mt-8 w-full max-w-[950px]">
            <button
              className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/setvtuber")}
            >
              Visualization
            </button>
            <button
              className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/setvtuber")}
            >
              Vtuber
            </button>
            <button
              className="bg-[#d9d9d9] px-8 py-3 rounded-2xl text-xl md:text-2xl font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/mindmap")}
            >
              Mind Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
