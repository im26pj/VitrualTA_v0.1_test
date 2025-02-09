import React from "react";
import { useNavigate } from "react-router-dom";

export const ChatsRoom1 = (): JSX.Element => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen">
      <div className="bg-[#6683d2] max-w-[1024px] w-full h-full relative p-4">
        <div className="w-full bg-[#b5d1e1] rounded-t-3xl py-4 px-4 flex flex-wrap justify-between items-center">
          <div className="text-white text-xl font-bold">Virtual TA</div>
          <div className="bg-[#d9d9d9] rounded-xl px-4 py-2 text-base lg:text-lg text-black font-semibold">
            Vtuber
          </div>
          <div className="bg-[#d9d9d9] rounded-xl px-4 py-2 text-base lg:text-lg text-black font-semibold">
            Group Learning
          </div>
          <div className="bg-[#d9d9d9] rounded-xl px-4 py-2 text-base lg:text-lg text-black font-semibold">
            Learning Outcomes Tracking
          </div>
          <img
            className="w-12 h-12 lg:w-20 lg:h-20 object-cover"
            alt="Element"
            src="https://c.animaapp.com/fB6Gojr5/img/2021781015212021.png"
          />
        </div>

        <div className="relative w-full max-w-[900px] mx-auto bg-white rounded-b-3xl p-6 shadow-lg mt-6 flex flex-col justify-between items-center">
          <div className="flex flex-col items-center mt-4">
            <img
              className="w-[200px] lg:w-[300px] h-auto"
              alt="Pixeltrue data"
              src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
            />
            <p className="text-lg lg:text-2xl text-black font-semibold text-center mt-4">
              What can I do for you?
            </p>
          </div>

          <div className="w-full h-12 bg-[#d9d9d9] rounded-2xl flex items-center px-4 mt-6">
            <span className="text-xl lg:text-2xl text-gray-700">#</span>
          </div>

        </div>
      </div>
      <img
            className="w-8 h-8 lg:w-12 lg:h-12 absolute bottom-0 right-0 object-cover"
            alt="Images removebg"
            src="https://c.animaapp.com/fB6Gojr5/img/images-removebg-preview@2x.png"
          />
    </div>
  );
};
