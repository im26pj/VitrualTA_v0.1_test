import React, { JSX,useState } from "react";
import { useNavigate } from "react-router-dom";

export const ChatRoom = (): JSX.Element => {
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
    <div className="bg-[#6683d2] flex flex-row justify-center w-full">
      <div className="bg-[#6683d2] w-[1440px] h-[1024px] relative">
        <div className="absolute w-[1366px] h-[764px] top-[260px] left-[70px]">
          <div className="absolute w-[1300px] h-[700px] top-0 left-0 bg-white rounded-[50px]" />

          <div className="w-[1200px] top-[586px] left-[50px] absolute h-20 bg-[#d9d9d9] rounded-[var(--shape-corner-extra-large)]" />

          <img
            className="absolute w-[30px] h-[35px] top-[609px] left-[1192px]"
            alt="Polygon"
            src="https://c.animaapp.com/fB6Gojr5/img/polygon-1.svg"
          />

          <div className="absolute top-[595px] left-[74px] [font-family:'Inder',Helvetica] font-normal text-[#000000b2] text-5xl tracking-[0] leading-[normal]">
            #
          </div>

          <img
            className="absolute w-[440px] h-[354px] top-[262px] left-[882px] object-cover"
            alt="Pixeltrue data"
            src="https://c.animaapp.com/fB6Gojr5/img/pixeltrue-data-analysis-1-1@2x.png"
          />

          <p className="absolute top-[438px] left-[307px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-5xl tracking-[0] leading-[normal]">
            What can I do for you?
          </p>

          <img
            className="absolute w-[88px] h-[77px] top-[687px] left-[1278px] object-cover"
            alt="Images removebg"
            src="https://c.animaapp.com/fB6Gojr5/img/images-removebg-preview@2x.png"
          />
        </div>

        <div className="absolute w-[1440px] h-[191px] top-0 left-0 bg-[#b5d1e1] rounded-[0px_0px_var(--shape-corner-extra-large)_var(--shape-corner-extra-large)]">
          <div className="absolute w-[273px] h-20 top-[62px] left-[447px] bg-[#d9d9d9] rounded-[var(--shape-corner-extra-large)]">
            <div className="absolute top-[3px] left-[13px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[28px] tracking-[0] leading-[normal]">
              Group Learning
            </div>
          </div>

          <div className="absolute w-[218px] top-[19px] left-[35px] [font-family:'Kavoon',Helvetica] font-normal text-white text-[40px] tracking-[0] leading-[normal] whitespace-nowrap">
            Virtual TA
          </div>

          <div className="absolute w-[174px] h-20 top-[62px] left-[253px] rounded-[28px]">
            <div className="w-[174px] top-0 left-0 absolute h-20 bg-[#d9d9d9] rounded-[var(--shape-corner-extra-large)]" />

            <div className="absolute top-[3px] left-8 [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[28px] tracking-[0] leading-[normal]">
              Vtuber
            </div>
          </div>

          <div className="absolute w-[482px] h-20 top-[62px] left-[730px] bg-[#d9d9d9] rounded-[var(--shape-corner-extra-large)]">
            <div className="absolute top-[3px] left-[23px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[28px] tracking-[0] leading-[normal]">
              Learning outcomes tracking
            </div>
          </div>

          <img
            className="absolute w-[140px] h-[140px] top-[26px] left-[1252px] object-cover"
            alt="Element"
            src="https://c.animaapp.com/fB6Gojr5/img/2021781015212021.png"
          />
        </div>
      </div>
    </div>
  );
};
