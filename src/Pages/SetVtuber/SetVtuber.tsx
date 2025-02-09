import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";


export const SetVtuber = (): JSX.Element => {
    const navigate = useNavigate();
    
    const handleNavigate = (path: string) => {
        navigate(path);
    };
    return (
        <div className="bg-[#6683d2] flex flex-row justify-center w-full">
            <div className="bg-[#6683d2] w-[1440px] h-[1024px] relative">
                <div className="absolute w-[380px] h-[105px] top-[252px] left-[974px]">
                    <div className="flex-col items-start top-0 left-0 flex w-[380px] gap-2.5 absolute">
                        <div className="relative self-stretch w-full h-[105px] bg-[#d9d9d9] rounded-[28px]" />
                    </div>
                    <div className="absolute top-[35px] left-[120px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Skin color
                    </div>
                </div>

                <div className="h-[105px] items-center justify-center px-[127px] py-2.5 top-[109px] left-[973px] bg-[#d9d9d9] rounded-[28px] flex w-[380px] gap-2.5 absolute">
                    <div className="relative w-fit [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Outfits
                    </div>
                </div>

                <div className="h-[105px] items-center justify-center px-[99px] py-[11px] top-[407px] left-[973px] bg-[#d9d9d9] rounded-[28px] flex w-[380px] gap-2.5 absolute">
                    <div className="relative w-fit mt-[-1.00px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Hair color
                    </div>
                </div>

                <div className="h-[105px] items-center justify-center px-[127px] py-[11px] top-[562px] left-[973px] bg-[#d9d9d9] rounded-[28px] flex w-[380px] gap-2.5 absolute">
                    <div className="relative w-fit mt-[-1.00px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Voices
                    </div>
                </div>
            </div>
        </div>
    );
};
