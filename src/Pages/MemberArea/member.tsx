import React, { JSX, useState } from "react";
import { useNavigate } from "react-router-dom";

export const MemberArea = (): JSX.Element => {
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
        <div className="w-full max-w-[357px] h-auto min-h-[688px] mt-[267px] mx-auto bg-white rounded-[28px]">
          <div className="w-full h-[146px] bg-[#d9d9d9] rounded-t-[28px]" />
          <div className="w-full px-4 py-2 text-center text-black text-[28px] font-normal">
            Personal information settings
          </div>
        </div>

        <div className="w-full max-w-[357px] h-auto min-h-[690px] mt-[267px] mx-auto bg-white rounded-[28px]">
          <div className="w-full h-[146px] bg-[#d9d9d9] rounded-t-[28px]" />
          <div className="w-full px-4 py-2 text-center text-black text-[28px] font-normal">
            Payment management
          </div>
        </div>

        <div className="w-full max-w-[357px] h-auto min-h-[688px] mt-[267px] mx-auto bg-white rounded-[28px]">
          <div className="w-full h-[146px] bg-[#d9d9d9] rounded-t-[28px]" />
        </div>

        <div className="w-full h-[191px] bg-[#b5d1e1] rounded-b-[var(--shape-corner-extra-large)]">
          <div className="w-full px-4 py-2 text-white text-[40px] font-normal">
            Virtual TA
          </div>
          <img
            className="w-[140px] h-[140px] mx-auto object-cover"
            alt="Element"
            src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
          />
        </div>

        <img
          className="w-[88px] h-[77px] mx-auto object-cover"
          alt="Images removebg"
          src="https://c.animaapp.com/iiDcfYsY/img/images-removebg-preview@2x.png"
        />
      </div>
    </div>
  );
};