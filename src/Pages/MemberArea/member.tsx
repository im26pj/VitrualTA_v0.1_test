import React from "react";
import { useNavigate } from "react-router-dom";

export const MemberArea = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#7EA2E6] flex flex-col items-center w-full min-h-screen relative">
      {/* Header */}
      <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
            .font-kavoon {
              font-family: 'Kavoon', cursive;
            }
          `}
        </style>
        <div className="text-white text-3xl font-kavoon mr-auto cursor-pointer"onClick={() => handleNavigate("/choose")}>Virtual TA</div>
        <div className="text-white text-4xl font-kavoon mx-auto">Member Account</div>
        <img
          className="w-16 h-16 object-cover rounded-full border-2 border-white ml-auto cursor-pointer"onClick={() => handleNavigate("/signin")}
          alt="Profile"
          src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-36 w-full max-w-screen-xl px-4 flex-1">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>
        
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-lg flex flex-col items-center w-full h-[550px]">
          <div className="w-full bg-gray-300 py-4 text-center font-bold rounded-t-lg h-[80px] text-2xl font-Inknut_Antiqua-Regular">
            Personal information settings
          </div>
        </div>

        {/* Payment Management */}
        <div className="bg-white rounded-2xl shadow-lg flex flex-col items-center w-full h-[550px]">
          <div className="w-full bg-gray-300 py-4 text-center font-bold rounded-t-lg h-[80px] text-2xl font-Inknut_Antiqua-Regular">
            Payment management
          </div>
        </div>

        {/* Additional Placeholder */}
        <div className="bg-white rounded-2xl shadow-lg flex flex-col items-center w-full h-[550px]">
          <div className="w-full bg-gray-300 py-4 rounded-t-lg h-[80px] text-2xl font-Inknut_Antiqua-Regular"></div>
        </div>
      </div>

      {/* Footer Icon */}
      <div className="absolute bottom-4 right-4">
        <img
          className="w-12 h-12 md:w-16 md:h-16 cursor-pointer transform transition hover:scale-110"
          alt="Back Icon"
          src="https://c.animaapp.com/iiDcfYsY/img/images-removebg-preview@2x.png"
          onClick={() => handleNavigate("/second")}
        />
      </div>
    </div>
  );
};
