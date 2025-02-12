import React from "react";
import { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const ResultsTracking = (): JSX.Element => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-[#6683d2] flex justify-center w-full min-h-screen p-4">
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
      <div className="bg-[#6683d2] w-full max-w-[1440px] flex flex-col md:flex-row justify-center items-center px-10 gap-10">
        <div
          className="text-white text-4xl font-kavoon cursor-pointer md:absolute top-7 left-8"
          onClick={() => handleNavigate("/choose")}
        >
          Virtual TA
        </div>

        <div className="bg-[#b5d1e1] rounded-3xl p-6 w-full max-w-[538px] flex flex-col items-center">
          <img
            className="w-full h-[400px] object-cover"
            alt="Pixeltrue support"
            src="https://c.animaapp.com/fL0pGeKr/img/pixeltrue-support.png"
          />
          <div className="bg-[#d9d9d9cc] rounded-[28px] w-full mt-6 py-4 text-center">
            <span className="text-black text-2xl font-Inknut_Antiqua-Regular">Online Test Center</span>
          </div>
        </div>

        <div className="bg-[#b5d1e1] rounded-3xl p-6 w-full max-w-[538px] flex flex-col items-center">
          <img
            className="w-full h-[400px] object-cover"
            alt="Pixeltrue plan"
            src="https://c.animaapp.com/eOOMRBWM/img/pixeltrue-plan@2x.png"
          />
          <div className="bg-[#d9d9d9cc] rounded-[28px] w-full mt-6 py-4 text-center">
            <span className="text-black text-2xl font-Inknut_Antiqua-Regular">Learning Outcome Report</span>
          </div>
        </div>
      </div>
    </div>
  );
};