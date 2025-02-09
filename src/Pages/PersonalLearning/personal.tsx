import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const PersonalLearning = (): JSX.Element => {
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
    <div className="bg-[#6683d2] flex flex-col justify-center items-center min-h-screen">
      <div className="bg-[#6683d2] w-full max-w-[1440px] h-full min-h-[1024px] relative p-4">
        <div className="absolute w-full max-w-[1440px] h-[191px] top-0 left-0 bg-[#b5d1e1] rounded-b-[var(--shape-corner-extra-large)]">
          <img
            className="absolute w-[140px] h-[140px] top-[25px] right-[25px] object-cover"
            alt="Element"
            src="https://c.animaapp.com/qsOI3aZQ/img/2021781015212021@2x.png"
          />

          <div
            className="absolute top-[24px] left-[33px] font-kavoon font-normal text-white text-[40px] tracking-[0] leading-[normal] whitespace-nowrap z-10 cursor-pointer"
            onClick={() => handleNavigate("/choose")}
          >
            Virtual TA
          </div>

          <div className="absolute top-[62px] left-[338px] bg-[#d9d9d9] rounded-[28px] p-4">
            <div className="font-normal text-black text-[28px] tracking-[0] leading-[normal]">
              Group Learning
            </div>
          </div>

          <div className="absolute top-[62px] left-[682px] bg-[#d9d9d9] rounded-[28px] p-4">
            <div className="font-normal text-black text-[28px] tracking-[0] leading-[normal]">
              Learning outcomes tracking
            </div>
          </div>
        </div>

        <div className="absolute w-full max-w-[426px] h-auto min-h-[700px] top-[260px] right-0 bg-white rounded-[50px] p-4">
          <div className="w-full h-20 bg-[#d9d9d9] rounded-[28px] p-4 flex items-center justify-between">
            <div className="font-normal text-[#000000b2] text-5xl tracking-[0] leading-[normal]">
              #
            </div>
            <img
              className="w-[30px] h-[35px]"
              alt="Polygon"
              src="https://c.animaapp.com/qsOI3aZQ/img/polygon-1.svg"
            />
          </div>

          <p className="mt-4 font-normal text-black text-[28px] tracking-[0] leading-[normal]">
            What can I do for you?
          </p>
        </div>

        <img
          className="absolute w-full max-w-[792px] h-auto top-[260px] left-0"
          alt="Element"
          src="https://c.animaapp.com/qsOI3aZQ/img/53783794637-44b575bb56-b-removebg-preview.png"
        />
      </div>
    </div>
  );
};
