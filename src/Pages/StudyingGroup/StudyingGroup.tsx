import React, { JSX,useState } from "react";
import { useNavigate } from "react-router-dom";

export const StudyingGroup = (): JSX.Element => {
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
      <div className="bg-[#6683d2] overflow-x-hidden w-[1440px] h-[1024px] relative">
        <div className="absolute w-[753px] h-[833px] top-7 left-[-82px]">
          <div className="absolute w-[218px] top-0 left-[116px] [font-family:'Kavoon',Helvetica] font-normal text-white text-[40px] tracking-[0] leading-[normal] whitespace-nowrap">
            Virtual TA
          </div>

          <div className="w-[538px] h-[658px] top-[175px] left-[215px] bg-[#b5d1e1] absolute rounded-[var(--shape-corner-extra-large)]" />

          <div className="w-[470px] h-[79px] top-[716px] left-[250px] bg-[#d9d9d9cc] absolute rounded-[28px]" />

          <div className="absolute top-[711px] left-[273px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
            Create a studying group
          </div>

          <img
            className="absolute w-[538px] h-[414px] top-[297px] left-[215px] object-cover"
            alt="Pixeltrue teaching"
            src="https://c.animaapp.com/wQdx2d4c/img/pixeltrue-teaching-1.png"
          />

          <img
            className="absolute w-[468px] h-[301px] top-[33px] left-0 object-cover"
            alt="Gummy abacus"
            src="https://c.animaapp.com/wQdx2d4c/img/gummy-abacus-1.png"
          />
        </div>

        <div className="absolute w-[817px] h-[969px] top-[203px] left-[751px]">
          <div className="w-[538px] h-[658px] top-0 left-0 bg-[#b5d1e1] absolute rounded-[var(--shape-corner-extra-large)]" />

          <div className="w-[470px] h-[79px] top-[541px] left-[34px] bg-[#d9d9d9cc] absolute rounded-[28px]" />

          <div className="absolute top-[536px] left-[49px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
            Manage a studying group
          </div>

          <img
            className="absolute w-[450px] h-[479px] top-[69px] left-11 object-cover"
            alt="Pixeltrue web"
            src="https://c.animaapp.com/wQdx2d4c/img/pixeltrue-web-development-1@2x.png"
          />

          <img
            className="absolute w-[497px] h-[545px] top-[424px] left-80 object-cover"
            alt="Gummy calculator"
            src="https://c.animaapp.com/wQdx2d4c/img/gummy-calculator-1@2x.png"
          />
        </div>
      </div>
    </div>
  );
};
