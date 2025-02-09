import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Choose = (): JSX.Element => {
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
      <div className="relative w-[1440px] h-[1024px] bg-[#6582d2]">
        {/*導航欄 */}
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

        <div className="absolute w-[471px] h-[350px] top-[340px] left-[100px] text-white text-8xl tracking-[0] leading-[normal] font-kavoon">
          Virtual TA
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-[980px] top-[130px] mt-3 w-[520px] space-y-2 rounded-lg border border-gray-100 bg-[#d9d9d9] p-2 text-[40px] shadow-lg">
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/signin")}
          >
            Sign in
          </button>
          <button
            className="inline-block w-full rounded-md px-2 py-1 text-black hover:bg-[#2ecbff]"
            onClick={() => handleNavigate("/personal-learning")}
          >
            Personal Learning
          </button>
        </div>
      )}
    </div>
  );
};