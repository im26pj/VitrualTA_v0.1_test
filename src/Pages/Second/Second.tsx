import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";
export const Second = (): JSX.Element => {

  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };    
  const handleNavigate = (path: string) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full h-[100vh] bg-[#6582d2] overflow-hidden">
        <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
            font-family: 'Kavoon', cursive;
          }
        `}
      </style>
      <div className="relative w-[1440px] h-[1024px]">
        <div className="absolute w-[218px] h-[42px] top-[24px] left-[33px] font-kavoon font-normal text-white text-[40px] tracking-[0] leading-[normal] whitespace-nowrap z-10 cursor-pointer"
            onClick={() => handleNavigate("/choose")}
        >
            Virtual TA
        </div>

        <img
          className="w-[167px] h-[273px] top-[35px] right-0 absolute object-cover"
          alt="Bonbon line"
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-4@2x.png"
        />

        <img
          className="w-[273px] h-[167px] top-[680px] bottom-[77px] left-[446px] absolute object-cover"
          alt="Bonbon line"
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-2@2x.png"
        />

        <img
          className="w-[273px] h-[167px] top-[50px] left-[810px] absolute object-cover"
          alt="Bonbon line"
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-3@2x.png"
        />

        <img
          className="w-[167px] h-[273px] top-7 left-[241px] absolute object-cover"
          alt="Bonbon line"
          src="https://c.animaapp.com/hvfbqNfn/img/bonbon-line-molecular-formula-4@2x.png"
        />

        <div className="left-[130px] absolute w-[538px] h-[550px] top-[140px] bg-[#b5d1e1] rounded-[28px]" />

        <div className="left-[810px] absolute w-[538px] h-[550px] top-[140px] bg-[#b5d1e1] rounded-[28px]" />

        <div className="absolute w-[396px] top-[610px] left-[380px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
          Personal Stutying
        </div>

        <img
          className="absolute w-[544px] h-[564px] top-[300px] left-[645px] object-cover"
          alt="Gummy notebook"
          src="https://c.animaapp.com/hvfbqNfn/img/gummy-notebook-1.png"
        />

        <div className="absolute top-[610px] left-[1100px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
          Group Stutying
        </div>

        <img
          className="absolute w-[446px] h-[250px] top-[450px] left-[-35px] object-cover"
          alt="Gummy green school"
          src="https://c.animaapp.com/hvfbqNfn/img/gummy-green-school-bag-ready-for-studying-time-1@2x.png"
        />

        <div className="absolute w-[520px] h-[300px] top-[35px] left-[980px]">
          <div className="flex w-[520px] h-[90px] items-center gap-[25px] px-5 py-0 relative bg-[#d9d9d9] rounded-[28px]">
            <div className="relative w-fit mt-[-1.00px] text-black text-[40px] tracking-[0] leading-[normal]">
              Select
            </div>

            <img
              className="relative w-[46.77px] h-[39px] cursor-pointer"
              alt="Polygon"
              src="https://c.animaapp.com/ffsYqFjp/img/polygon-3-2.svg"
              onClick={handleDropdownToggle}
            />
          </div>
        </div>

      </div>



      {showDropdown && (
        <div className="absolute left-[980px] top-[130px] mt-3 w-[520px] space-y-2 rounded-lg border border-gray-100 bg-[#d9d9d9] p-2 text-[40px] shadow-lg">
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/signin")}
          >
           Account Management
          </button>
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/personal-learning")}
          >
            Learning System
          </button>
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/personal-learning")}
          >
            Setting Vtuber
          </button>     
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/personal-learning")}
          >
            Learning outcome tracking
          </button>           
        </div>
      )}     


    </div>
  );
};
