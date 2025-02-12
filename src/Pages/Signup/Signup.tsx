import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const SignUp = (): JSX.Element => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6683d2] flex justify-center items-center min-h-screen">
      <div className="bg-white w-[90%] max-w-[1200px] rounded-[36px] p-6 lg:p-10 h-auto min-h-[500px] max-h-[90vh]">
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>
        <div className="grid lg:grid-cols-1">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <label className="text-black text-[20px] lg:text-[40px] font-medium font-Inknut_Antiqua-Regular">Full Name:</label>
              <input
                type="text"
                className="flex-1 h-12 lg:h-20 bg-[#d9d9d980] rounded-[28px] px-4 text-[16px] lg:text-[20px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-black text-[20px] lg:text-[40px] font-medium font-Inknut_Antiqua-Regular">Account:</label>
              <input
                type="text"
                className="flex-1 h-12 lg:h-20 bg-[#d9d9d980] rounded-[28px] px-4 text-[16px] lg:text-[20px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-black text-[20px] lg:text-[40px] font-medium font-Inknut_Antiqua-Regular">Password:</label>
              <input
                type="password"
                className="flex-1 h-12 lg:h-20 bg-[#d9d9d980] rounded-[28px] px-4 text-[16px] lg:text-[20px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-black text-[20px] lg:text-[40px] font-medium font-Inknut_Antiqua-Regular">Check Password:</label>
              <input
                type="password"
                className="flex-1 h-12 lg:h-20 bg-[#d9d9d980] rounded-[28px] px-4 text-[16px] lg:text-[20px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-black text-[20px] lg:text-[40px] font-medium font-Inknut_Antiqua-Regular">Gmail:</label>
              <input
                type="email"
                className="flex-1 h-12 lg:h-20 bg-[#d9d9d980] rounded-[28px] px-4 text-[16px] lg:text-[20px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleNavigate("/signin")}
                className="w-full h-12 lg:h-20 bg-[#d9d9d9] rounded-[28px] text-black text-[20px] lg:text-[40px] font-medium hover:bg-gray-300 font-Inknut_Antiqua-Regular"
              >
                Sign up
              </button>
              <img
                className="w-[80%] max-w-[300px] h-auto"
                alt="Pixeltrue plan"
                src="https://c.animaapp.com/U6DmsIFF/img/pixeltrue-plan-1-1@2x.png"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};