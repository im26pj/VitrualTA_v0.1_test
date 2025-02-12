import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const SetVtuber = (): JSX.Element => {
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    return (
        <div className="bg-[#6683d2] flex justify-center w-full h-screen overflow-hidden p-4">
                <style>{`
                     @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
                    .font-Inknut_Antiqua-Regular {
                     font-family: 'Inknut Antiqua', serif;
                      }
                    `}</style>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
                .font-kavoon {
                    font-family: 'Kavoon', cursive;
                }
                `}
            </style>
            <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
                <div className="text-white text-3xl font-kavoon mr-auto cursor-pointer" onClick={() => handleNavigate("/choose")}>
                    Virtual TA
                </div>
                <img
                    className="w-16 h-16 object-cover rounded-full border-2 border-white ml-auto cursor-pointer"onClick={() => handleNavigate("/signin")}
                    alt="Profile"
                    src="https://c.animaapp.com/iiDcfYsY/img/2021781015212021@2x.png"
                />
            </div>
            <div className="bg-[#6683d2] max-w-screen-xl w-full flex flex-row items-center justify-between">
                {/* 左側區域 (預留空間) */}
                <div className="w-[600px] h-full bg-transparent"></div>

                {/* 右側按鈕區域，調整位置往上靠 */}
                <div className="flex flex-col items-center w-full max-w-md gap-4">
                    {/* Outfits 按鈕 */}
                    <div className="w-full h-[80px] flex items-center justify-center bg-[#d9d9d9] rounded-[20px]">
                        <div className="text-black text-xl sm:text-2xl font-normal font-Inknut_Antiqua-Regular">Outfits</div>
                    </div>

                    {/* Skin Color 按鈕 */}
                    <div className="w-full h-[80px] flex items-center justify-center bg-[#d9d9d9] rounded-[20px]">
                        <div className="text-black text-xl sm:text-2xl font-normal font-Inknut_Antiqua-Regular">Skin Color</div>
                    </div>

                    {/* Hair Color 按鈕 */}
                    <div className="w-full h-[80px] flex items-center justify-center bg-[#d9d9d9] rounded-[20px]">
                        <div className="text-black text-xl sm:text-2xl font-normal font-Inknut_Antiqua-Regular">Hair Color</div>
                    </div>

                    {/* Voices 按鈕 */}
                    <div className="w-full h-[80px] flex items-center justify-center bg-[#d9d9d9] rounded-[20px]">
                        <div className="text-black text-xl sm:text-2xl font-normal font-Inknut_Antiqua-Regular">Voices</div>
                    </div>
                </div>
            </div>
        </div>
    );
};