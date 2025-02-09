import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const SignUp = (): JSX.Element => {
    const navigate = useNavigate();
    
    const handleNavigate = (path: string) => {
        navigate(path);
    };

    return (
        <div className="bg-[#6683d2] flex flex-row justify-center w-full">
            <div className="bg-[#6683d2] w-[1440px] h-[1024px]">
                <div className="relative w-[1352px] h-[928px] top-[20px] left-[88px]">
                    <div className="absolute w-[1265px] h-[857px] top-0 left-0 bg-white rounded-[36px] overflow-hidden">
                        <div className="absolute top-[43px] left-[70px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                            Full Name:
                        </div>

                        <div className="absolute top-[146px] left-[70px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                            Account:
                        </div>

                        <div className="absolute top-[249px] left-[70px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                            Password:
                        </div>

                        <div className="absolute top-[352px] left-[70px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                            Check Password:
                        </div>

                        <div className="w-[895px] h-20 top-[30px] left-[332px] bg-[#d9d9d980] absolute rounded-[28px]" />

                        <div className="w-[920px] h-20 top-[130px] left-[307px] bg-[#d9d9d980] absolute rounded-[28px]" />

                        <div className="w-[895px] h-20 top-[230px] left-[332px] bg-[#d9d9d980] absolute rounded-[28px]" />

                        <div className="w-[745px] h-20 top-[337px] left-[482px] bg-[#d9d9d980] absolute rounded-[28px]" />

                        <div className="w-[971px] h-20 top-[437px] left-64 bg-[#d9d9d980] absolute rounded-[28px]" />

                        <div className="absolute top-[455px] left-[70px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                            Gmail:
                        </div>

                        <div className="absolute w-[626px] h-[116px] top-[648px] left-[169px] rounded-[28px]">
                            <div className="w-[626px] h-[116px] top-0 left-0 bg-[#d9d9d9] absolute rounded-[28px]" />

                            <div className="absolute top-[33px] left-[230px] [font-family:'Inknut_Antiqua-Regular',Helvetica] font-normal text-black text-[40px] tracking-[0] leading-[normal]">
                                Sign up
                            </div>
                        </div>
                    </div>

                    <img
                        className="absolute w-[459px] h-[351px] top-[550px] left-[893px] object-cover"
                        alt="Pixeltrue plan"
                        src="https://c.animaapp.com/U6DmsIFF/img/pixeltrue-plan-1-1@2x.png"
                    />
                </div>
            </div>
        </div>
    );
};
