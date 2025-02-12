import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const Signin = (): JSX.Element => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6582d2] flex flex-col lg:flex-row justify-around items-center w-full min-h-screen p-4">
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
      {/* Header */}
      <div
        className="absolute top-4 left-4 font-kavoon text-white text-3xl cursor-pointer z-10"
        onClick={() => handleNavigate("/choose")}
      >
        Virtual TA
      </div>
      <div className="flex flex-col lg:flex-row items-center justify-center w-full lg:max-w-[1440px]">
        {/* Left Section */}
        <div className="relative flex flex-col items-center lg:items-start mr-4">
          <img
            className="mx-auto w-50 lg:w-[500px] h-auto"
            alt="Learning culture"
            src="https://c.animaapp.com/7g5KY5M2/img/learning-culture-vark-learning-styles.png"
          />
        </div>

        {/* Right Section */}
        <div className="relative w-full max-w-lg lg:max-w-[600px] bg-[#b5d1e1] rounded-2xl shadow-lg p-6 mt-8 lg:mt-0 h-auto lg:h-[550px] ml-4">
          <div className="mb-10 mt-10">
            <label className="block text-lg font-medium text-black mb-2 font-Inknut_Antiqua-Regular">Account</label>
            <input
              type="text"
              className="w-full border-b-2 border-black bg-transparent outline-none text-lg p-2"
              placeholder="Enter your account"
            />
          </div>
          <div className="mb-20">
            <label className="block text-lg font-medium text-black mb-2 font-Inknut_Antiqua-Regular">Password</label>
            <input
              type="password"
              className="w-full border-b-2 border-black bg-transparent outline-none text-lg p-2"
              placeholder="Enter your password"
            />
          </div>
          <button
            className="relative z-20 w-full bg-gray-300 rounded-lg py-3 text-black text-xl font-semibold mb-4 hover:bg-gray-400 font-Inknut_Antiqua-Regular"
            onClick={() => handleNavigate("/signup")}
          >
            Sign up
          </button>
          <button
            className="relative z-20 w-full bg-gray-300 rounded-lg py-3 text-black text-xl font-semibold hover:bg-gray-400 font-Inknut_Antiqua-Regular"
            onClick={() => handleNavigate("/second")}
          >
            Sign in
          </button>
          <div className="absolute w-[520px] h-[450px] top-[215px] left-[50px] z-10">
            <img
              className="w-full h-full"
              alt="Gummy bedroom"
              src="https://c.animaapp.com/7g5KY5M2/img/gummy-bedroom-1.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};