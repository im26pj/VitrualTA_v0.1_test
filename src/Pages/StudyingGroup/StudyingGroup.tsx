import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const StudyingGroup = (): JSX.Element => {
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    return (
        <div className="relative w-full min-h-screen bg-[#6582d2] flex flex-col items-center justify-center p-4">
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

            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 mt-8">
                {/* Left Section */}
                <div className="relative bg-[#b5d1e1] rounded-3xl p-6 flex flex-col items-center cursor-pointer" onClick={() => handleNavigate("/choose")}>
                    <img
                        className="w-full max-w-md aspect-[4/3] object-cover"
                        alt="Pixeltrue teaching"
                        src="https://c.animaapp.com/QJxXI2vx/img/pixeltrue-teaching-1.png"
                    />
                    <button className="mt-6 w-full max-w-sm bg-gray-300 text-black text-lg font-semibold py-3 rounded-2xl font-Inknut_Antiqua-Regular">
                        Create a studying group
                    </button>
                </div>
                
                {/* Right Section */}
                <div className="relative bg-[#b5d1e1] rounded-3xl p-6 flex flex-col items-center cursor-pointer" onClick={() => handleNavigate("/choose")}>
                    <img
                        className="w-full max-w-md aspect-[4/3] object-cover"
                        alt="Pixeltrue web"
                        src="https://c.animaapp.com/QJxXI2vx/img/pixeltrue-web-development-1@2x.png"
                    />
                    <button className="mt-6 w-full max-w-sm bg-gray-300 text-black text-lg font-semibold py-3 rounded-2xl font-Inknut_Antiqua-Regular">
                        Manage a studying group
                    </button>
                </div>
            </div>
        </div>
    );
};
