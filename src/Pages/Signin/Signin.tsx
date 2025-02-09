import React, { JSX } from "react";
import { useNavigate } from "react-router-dom";

export const Signin = (): JSX.Element => {
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    return (
        <div className="bg-[#6582d2] flex flex-row justify-around w-full h-[100vh] overflow-hidden">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
                .font-kavoon {
                    font-family: 'Kavoon', cursive;
                }
                `}
            </style>
                    
            <div className="absolute w-[218px] h-[42px] top-[24px] left-[33px] font-kavoon font-normal text-white text-[40px] tracking-[0] leading-[normal] whitespace-nowrap z-10 cursor-pointer"
                onClick={() => handleNavigate("/choose")}
            >
                Virtual TA
            </div>
            <div className="bg-[#6582d2] w-[1440px] h-[1024px] relative ">
                {/*這邊是左邊大框框*/ }
                <div className="absolute w-[587px] h-[885px] top-0 left-[130px]">
                <img
                    className="absolute w-[450px] h-[550px] top-[140px] left-[0px]"
                    alt="Learning culture"
                    src="https://c.animaapp.com/7g5KY5M2/img/learning-culture-vark-learning-styles.png"
                />
                <img
                    className="absolute w-[150px] h-[200px] top-0 left-[5px] object-cover"
                    alt="Gummy coding"
                    src="https://c.animaapp.com/7g5KY5M2/img/gummy-coding-1@2x.png"
                />
                </div>
                {/*這邊是右大框框*/ }
                <div className="absolute w-[587px] h-[885px] top-[70px] left-[767px]">
                    {/*右邊框框不含沙發*/}
                    <div className="absolute w-[530px] h-[630px] top-0 left-[35px] bg-[#b5d1e1] rounded-[var(--shape-corner-extra-large)]" />
                    <img
                        className="absolute w-[520px] h-[450px] top-[215px] left-6"
                        alt="Gummy bedroom"
                        src="https://c.animaapp.com/7g5KY5M2/img/gummy-bedroom-1.png"
                    />
                    <div className="absolute w-[148px] top-[35px] left-[78px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Account
                    </div>
                    <input
                        className="top-[90px] absolute w-[458px] h-10 left-[78px] border-b-2 border-black bg-transparent outline-none text-black text-[32px]"
                        type="text"
                        placeholder=""
                    />
                    <div className="absolute w-[182px] top-[160px] left-[78px] [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-[32px] tracking-[0] leading-[normal]">
                        Password
                    </div>
                    <input
                        className="top-[215px] absolute w-[458px] h-10 left-[78px] border-b-2 border-black bg-transparent outline-none text-black text-[32px]"
                        type="password"
                        placeholder=""
                    />
                    <button
                        className="absolute w-[410px] h-[65px] top-[350px] left-[95px] bg-[#d9d9d9f2] rounded-[16px] flex items-center justify-center [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-2xl tracking-[0] leading-[normal] cursor-pointer"
                        onClick={() => handleNavigate("/signup")}
                    >
                        Sign up
                    </button>
                    <button
                        className="absolute w-[410px] h-[65px] top-[475px] left-[95px] bg-[#d9d9d9f2] rounded-[16px] flex items-center justify-center [font-family:'Inknut_Antiqua',Helvetica] font-normal text-black text-2xl tracking-[0] leading-[normal] cursor-pointer"
                        onClick={() => handleNavigate("/second")}
                    >
                        Sign in
                    </button>
                </div>
            </div>
        </div>
    );
};